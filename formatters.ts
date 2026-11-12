export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(d: Date = new Date(), includeSeconds: boolean = true): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (!includeSeconds) {
    return `${hours}:${minutes}`;
  }
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatKoreanDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${year}년 ${Number(month)}월 ${Number(day)}일 (${dayName})`;
  } catch {
    return dateStr;
  }
}

export function formatDurationKorean(ms: number, includeSeconds: boolean = false): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0 && minutes === 0) {
    return includeSeconds ? `${seconds}초` : '1분 미만';
  }

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}시간`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}분`);
  }
  if (includeSeconds && seconds > 0 && hours === 0) {
    parts.push(`${seconds}초`);
  }

  return parts.join(' ');
}

export function formatStopwatchTime(ms: number): {
  hours: string;
  minutes: string;
  seconds: string;
  rawHours: number;
  rawMinutes: number;
  rawSeconds: number;
} {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    rawHours: hours,
    rawMinutes: minutes,
    rawSeconds: seconds,
  };
}

export function isSleepTransition(prevAction: string | undefined, currentAction: string): boolean {
  if (!prevAction) return false;
  const normalizedPrev = prevAction.trim();
  const normalizedCurrent = currentAction.trim();
  return (
    (normalizedPrev.includes('잠자리') || normalizedPrev.includes('취침') || normalizedPrev.includes('수면')) &&
    (normalizedCurrent.includes('기상') || normalizedCurrent.includes('일어남'))
  );
}

export function isMealEnd(action: string): boolean {
  return /아침.*끝|점심.*끝|저녁.*끝|식사.*끝|밥.*끝/i.test(action.trim());
}

export function isTeethBrushing(action: string): boolean {
  return /양치|치카|이빨|이닦/i.test(action.trim());
}

export function getMealPrefix(action: string): string {
  if (/아침/i.test(action)) return '아침';
  if (/점심/i.test(action)) return '점심';
  if (/저녁/i.test(action)) return '저녁';
  return '식사';
}

export interface TimelineGroupedItem {
  id: string;
  mainLog: import('../types').LogEntry;
  subTeethLog?: import('../types').LogEntry;
  durationFromPrevMs?: number;
  durationFormatted?: string;
  isPostMealInterval?: boolean;
  prevMealName?: string;
  isSleepInterval?: boolean;
}

/**
 * Group logs for timeline display so teeth brushing is nested as a sub-event under its meal end,
 * and post-meal intervals (meal end -> next meal start) accurately measure time since the meal end.
 */
export function groupLogsForTimeline(logs: import('../types').LogEntry[]): TimelineGroupedItem[] {
  if (!logs || logs.length === 0) return [];

  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const result: TimelineGroupedItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Check if this log is teeth brushing and can attach to the immediately preceding meal end
    if (isTeethBrushing(current.action) && result.length > 0) {
      const lastGroup = result[result.length - 1];
      if (isMealEnd(lastGroup.mainLog.action) && !lastGroup.subTeethLog) {
        // Attach this teeth brushing log as sub-event to the meal end card
        lastGroup.subTeethLog = current;
        continue;
      }
    }

    // Normal main log card
    // Calculate interval since the previous main event (or previous meal end)
    let durationFromPrevMs: number | undefined = undefined;
    let durationFormatted: string | undefined = undefined;
    let isPostMeal = false;
    let prevMealName: string | undefined = undefined;
    let isSleep = false;

    if (result.length > 0) {
      const prevGroup = result[result.length - 1];
      const prevMainLog = prevGroup.mainLog;

      if (isMealEnd(prevMainLog.action)) {
        // Previous main event was a meal end!
        // The interval is directly measured from meal end to this action
        const diff = current.timestamp - prevMainLog.timestamp;
        durationFromPrevMs = diff > 0 ? diff : 0;
        durationFormatted = formatDurationKorean(durationFromPrevMs);
        isPostMeal = true;
        prevMealName = getMealPrefix(prevMainLog.action);
      } else {
        const diff = current.timestamp - prevMainLog.timestamp;
        durationFromPrevMs = diff > 0 ? diff : 0;
        durationFormatted = formatDurationKorean(durationFromPrevMs);
      }

      isSleep = isSleepTransition(prevMainLog.action, current.action);
    }

    result.push({
      id: current.id,
      mainLog: current,
      durationFromPrevMs,
      durationFormatted,
      isPostMealInterval: isPostMeal,
      prevMealName,
      isSleepInterval: isSleep,
    });
  }

  return result;
}

/**
 * Determine the effective live timer anchor timestamp and label.
 * If the user just completed a meal end (or teeth brushing after a meal end),
 * the timer continues to measure from the meal end timestamp!
 */
export function getEffectiveTimerAnchor(
  todayLogs: import('../types').LogEntry[],
  lastTimestamp: number | null,
  lastAction: string | null
): {
  anchorTimestamp: number | null;
  label: string;
  subNote?: string;
  isPostMeal: boolean;
} {
  if (!lastTimestamp || !todayLogs || todayLogs.length === 0) {
    return {
      anchorTimestamp: lastTimestamp,
      label: '경과 시간:',
      isPostMeal: false,
    };
  }

  const sorted = [...todayLogs].sort((a, b) => a.timestamp - b.timestamp);
  const latestLog = sorted[sorted.length - 1];

  // Case 1: Latest log is teeth brushing
  if (isTeethBrushing(latestLog.action)) {
    // Look backward for the corresponding meal end
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (isMealEnd(sorted[i].action)) {
        const mealLog = sorted[i];
        const mealPrefix = getMealPrefix(mealLog.action);
        const timeDiff = latestLog.timestamp - mealLog.timestamp;
        const diffText = formatDurationKorean(timeDiff > 0 ? timeDiff : 0);
        return {
          anchorTimestamp: mealLog.timestamp, // Keep meal end as anchor!
          label: `${mealPrefix} 식후 경과:`,
          subNote: `식후 ${diffText}에 양치 완료`,
          isPostMeal: true,
        };
      }
      // If we encounter another major routine like breakfast start, stop
      if (!isTeethBrushing(sorted[i].action)) break;
    }
  }

  // Case 2: Latest log is directly a meal end
  if (isMealEnd(latestLog.action)) {
    const mealPrefix = getMealPrefix(latestLog.action);
    return {
      anchorTimestamp: latestLog.timestamp,
      label: `${mealPrefix} 식후 경과:`,
      subNote: undefined,
      isPostMeal: true,
    };
  }

  // Default: Standard timer from last log
  return {
    anchorTimestamp: lastTimestamp,
    label: '경과 시간:',
    isPostMeal: false,
  };
}

