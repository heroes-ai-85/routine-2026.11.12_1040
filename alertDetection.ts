import { LogEntry } from '../types';

export type AlertType = 'NONE' | 'BRUSH_TEETH' | 'NEXT_MEAL_PREP' | 'SLEEP_PREP';

export interface AlertStatus {
  isAlert: boolean;
  type: AlertType;
  message: string;
  detail: string;
  targetActionName?: string;
  overdueMinutes: number;
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const THREE_HOURS_THIRTY_MIN_MS = 3.5 * 60 * 60 * 1000; // 210 minutes

/**
 * Check if a routine name represents meal finish
 */
export function isMealEnd(name: string): boolean {
  return /아침.*끝|점심.*끝|저녁.*끝|식사.*끝|밥.*끝/i.test(name.trim());
}

/**
 * Check if a routine name represents teeth brushing
 */
export function isTeethBrushing(name: string): boolean {
  return /양치|치카|이빨|이닦/i.test(name.trim());
}

/**
 * Check if a routine name represents sleep / going to bed
 */
export function isSleepAction(name: string): boolean {
  return /잠자리|취침|수면|잠자기/i.test(name.trim());
}

/**
 * Check if a routine name represents lunch start
 */
export function isLunchStart(name: string): boolean {
  return /점심.*시작|점심.*식사/i.test(name.trim());
}

/**
 * Check if a routine name represents dinner start
 */
export function isDinnerStart(name: string): boolean {
  return /저녁.*시작|저녁.*식사/i.test(name.trim());
}

/**
 * Evaluate alert status based on today's logs, current time, and active routine state
 */
export function checkRoutineAlert(
  todayLogs: LogEntry[],
  lastTimestamp: number | null,
  elapsedMs: number,
  currentRoutineName: string
): AlertStatus {
  if (!todayLogs || todayLogs.length === 0 || !lastTimestamp) {
    return {
      isAlert: false,
      type: 'NONE',
      message: '',
      detail: '',
      overdueMinutes: 0,
    };
  }

  const now = Date.now();

  // Find the most recent meal finish log
  let latestMealLog: LogEntry | null = null;
  let latestMealIndex = -1;

  for (let i = todayLogs.length - 1; i >= 0; i--) {
    if (isMealEnd(todayLogs[i].action)) {
      latestMealLog = todayLogs[i];
      latestMealIndex = i;
      break;
    }
  }

  // If no meal was finished yet today, no post-meal alert
  if (!latestMealLog) {
    return {
      isAlert: false,
      type: 'NONE',
      message: '',
      detail: '',
      overdueMinutes: 0,
    };
  }

  const msSinceMeal = now - latestMealLog.timestamp;
  const isBreakfast = /아침/i.test(latestMealLog.action);
  const isLunch = /점심/i.test(latestMealLog.action);
  const isDinner = /저녁/i.test(latestMealLog.action);

  // Check if teeth brushing occurred AFTER this meal
  let brushedAfterMeal = false;
  // Check if lunch start occurred after this meal
  let lunchStartedAfterMeal = false;
  // Check if dinner start occurred after this meal
  let dinnerStartedAfterMeal = false;
  // Check if sleep occurred after this meal
  let sleepAfterMeal = false;

  for (let i = latestMealIndex + 1; i < todayLogs.length; i++) {
    const act = todayLogs[i].action;
    if (isTeethBrushing(act)) brushedAfterMeal = true;
    if (isLunchStart(act)) lunchStartedAfterMeal = true;
    if (isDinnerStart(act)) dinnerStartedAfterMeal = true;
    if (isSleepAction(act)) sleepAfterMeal = true;
  }

  // Condition 1: Post-meal teeth brushing alert (30 minutes elapsed without teeth brushing)
  // If <= 3 hours 30 mins, teeth brushing is the immediate urgent alert
  if (!brushedAfterMeal && msSinceMeal >= THIRTY_MINUTES_MS && msSinceMeal < THREE_HOURS_THIRTY_MIN_MS) {
    const overdueMin = Math.floor(msSinceMeal / 60000);
    return {
      isAlert: true,
      type: 'BRUSH_TEETH',
      message: '양치할 시간!',
      detail: `${latestMealLog.action} 후 ${overdueMin}분이 경과했습니다. 양치를 해주세요!`,
      targetActionName: '양치',
      overdueMinutes: overdueMin,
    };
  }

  // Condition 2: Post-dinner sleep prep (3h 30m after dinner without going to bed)
  if (isDinner && msSinceMeal >= THREE_HOURS_THIRTY_MIN_MS && !sleepAfterMeal) {
    const overdueHours = (msSinceMeal / (3600 * 1000)).toFixed(1);
    return {
      isAlert: true,
      type: 'SLEEP_PREP',
      message: '잘 준비할 시간!',
      detail: `저녁 식사 후 ${overdueHours}시간이 지났습니다. 잠자리에 들 준비를 해주세요!`,
      targetActionName: '잠자리 누움',
      overdueMinutes: Math.floor(msSinceMeal / 60000),
    };
  }

  // Condition 3: Post-breakfast or post-lunch next meal prep (3h 30m after meal)
  if (isBreakfast && msSinceMeal >= THREE_HOURS_THIRTY_MIN_MS && !lunchStartedAfterMeal) {
    const overdueHours = (msSinceMeal / (3600 * 1000)).toFixed(1);
    return {
      isAlert: true,
      type: 'NEXT_MEAL_PREP',
      message: '점심 준비할 시간!',
      detail: `아침 식사 후 ${overdueHours}시간이 지났습니다. 점심 식사를 준비해 주세요!`,
      targetActionName: '점심 시작',
      overdueMinutes: Math.floor(msSinceMeal / 60000),
    };
  }

  if (isLunch && msSinceMeal >= THREE_HOURS_THIRTY_MIN_MS && !dinnerStartedAfterMeal) {
    const overdueHours = (msSinceMeal / (3600 * 1000)).toFixed(1);
    return {
      isAlert: true,
      type: 'NEXT_MEAL_PREP',
      message: '저녁 준비할 시간!',
      detail: `점심 식사 후 ${overdueHours}시간이 지났습니다. 저녁 식사를 준비해 주세요!`,
      targetActionName: '저녁 시작',
      overdueMinutes: Math.floor(msSinceMeal / 60000),
    };
  }

  // Fallback: If 3.5h elapsed and teeth brushing still wasn't done, remind teeth brushing if no other action occurred
  if (!brushedAfterMeal && msSinceMeal >= THIRTY_MINUTES_MS) {
    const overdueMin = Math.floor(msSinceMeal / 60000);
    return {
      isAlert: true,
      type: 'BRUSH_TEETH',
      message: '양치할 시간!',
      detail: `${latestMealLog.action} 후 양치가 아직 기록되지 않았습니다.`,
      targetActionName: '양치',
      overdueMinutes: overdueMin,
    };
  }

  return {
    isAlert: false,
    type: 'NONE',
    message: '',
    detail: '',
    overdueMinutes: 0,
  };
}
