import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sun,
  Moon,
  Settings,
  SlidersHorizontal,
  Share2,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  UserCheck,
  BellRing,
  Globe,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AlertSettings, LogEntry, RoutineItem } from './types';
import {
  loadRoutines,
  saveRoutines,
  loadDailyLogs,
  saveDailyLogs,
  loadCurrentRoutineIndex,
  saveCurrentRoutineIndex,
  loadLastLogMetadata,
  saveLastLogMetadata,
  loadAlertSettings,
  saveAlertSettings,
} from './utils/storage';
import {
  getTodayDateString,
  formatTime,
  formatDurationKorean,
  formatKoreanDate,
  isSleepTransition,
  getEffectiveTimerAnchor,
  isMealEnd,
  isTeethBrushing,
} from './utils/formatters';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  syncDailyLogToCloud,
  syncConfigToCloud,
  loadAllLogsFromCloud,
  loadConfigFromCloud,
} from './firebase';
import { soundService } from './utils/soundService';
import { checkRoutineAlert, AlertStatus } from './utils/alertDetection';
import { RoundMainButton } from './components/RoundMainButton';
import { TimelineView } from './components/TimelineView';
import { EditLogModal } from './components/EditLogModal';
import { RoutineManagerModal } from './components/RoutineManagerModal';
import { ExportShareModal } from './components/ExportShareModal';
import { ImportDataModal } from './components/ImportDataModal';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { ShareLinkModal } from './components/ShareLinkModal';

export default function App() {
  // Theme state: light mode default
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') === 'dark';
  });

  // Firebase auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Settings dropdown menu state
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Hidden date input ref for opening calendar picker on date click
  const datePickerInputRef = useRef<HTMLInputElement>(null);

  // Master routines list
  const [routines, setRoutines] = useState<RoutineItem[]>(() => loadRoutines());

  // Current routine index (next action to record)
  const [currentRoutineIndex, setCurrentRoutineIndex] = useState<number>(() => {
    const saved = loadCurrentRoutineIndex();
    const rList = loadRoutines();
    return saved < rList.length ? saved : 0;
  });

  // Daily logs mapped by YYYY-MM-DD
  const [dailyLogs, setDailyLogs] = useState<Record<string, LogEntry[]>>(() => loadDailyLogs());

  // Active view date string (YYYY-MM-DD)
  const [viewDateStr, setViewDateStr] = useState<string>(() => getTodayDateString());

  // Last log metadata for active stopwatch
  const [lastLogMeta, setLastLogMeta] = useState<{
    lastTimestamp: number | null;
    lastAction: string | null;
  }>(() => loadLastLogMetadata());

  // Live elapsed milliseconds since last log
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // Modals state
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [isRoutineManagerOpen, setIsRoutineManagerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);

  // Alert settings & active alarm session
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => loadAlertSettings());
  const activeAlertSessionRef = useRef<string | null>(null);

  // Today string for comparison
  const todayDateStr = getTodayDateString();
  const isViewingToday = viewDateStr === todayDateStr;

  // Initialize Web Audio unlock on first user gesture
  useEffect(() => {
    soundService.initUnlock();
    return () => {
      soundService.stopLoopAlert();
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        try {
          // Merge cloud data with local data
          const cloudLogs = await loadAllLogsFromCloud(user.uid);
          const cloudConfig = await loadConfigFromCloud(user.uid);

          const localLogs = loadDailyLogs();
          const mergedLogs: Record<string, LogEntry[]> = { ...localLogs };

          Object.keys(cloudLogs).forEach((date) => {
            const localEntries = mergedLogs[date] || [];
            const cloudEntries = cloudLogs[date] || [];
            const localTimestamps = new Set(localEntries.map((e) => e.timestamp));
            const newCloudEntries = cloudEntries.filter((e) => !localTimestamps.has(e.timestamp));
            mergedLogs[date] = [...localEntries, ...newCloudEntries].sort((a, b) => a.timestamp - b.timestamp);
          });

          setDailyLogs(mergedLogs);
          saveDailyLogs(mergedLogs);

          // If cloud has config, apply
          if (cloudConfig?.routines && cloudConfig.routines.length > 0) {
            setRoutines(cloudConfig.routines);
            saveRoutines(cloudConfig.routines);
          }
          if (typeof cloudConfig?.currentRoutineIndex === 'number') {
            setCurrentRoutineIndex(cloudConfig.currentRoutineIndex);
            saveCurrentRoutineIndex(cloudConfig.currentRoutineIndex);
          }
          if (cloudConfig?.lastTimestamp) {
            setLastLogMeta({
              lastTimestamp: cloudConfig.lastTimestamp,
              lastAction: cloudConfig.lastAction || null,
            });
            saveLastLogMetadata(cloudConfig.lastTimestamp, cloudConfig.lastAction || '');
          }

          // Also push any local days not in cloud to cloud
          for (const d of Object.keys(mergedLogs)) {
            await syncDailyLogToCloud(user.uid, d, mergedLogs[d]);
          }
        } catch (e) {
          console.error('Error during initial cloud sync:', e);
        } finally {
          setIsSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Close settings dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    if (isSettingsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsMenuOpen]);

  // Sync theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [isDark]);

  // Effective timer anchor and label (keeps meal end as anchor even after teeth brushing!)
  const effectiveTimer = getEffectiveTimerAnchor(
    dailyLogs[viewDateStr] || [],
    lastLogMeta.lastTimestamp,
    lastLogMeta.lastAction
  );

  // Live stopwatch timer ticker
  useEffect(() => {
    const updateElapsed = () => {
      const anchor = effectiveTimer.anchorTimestamp;
      if (anchor) {
        const diff = Date.now() - anchor;
        setElapsedMs(diff > 0 ? diff : 0);
      } else {
        setElapsedMs(0);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [effectiveTimer.anchorTimestamp]);

  // Today's active logs
  const currentLogs = dailyLogs[viewDateStr] || [];

  // Current action name to display on the round button
  const currentRoutine = routines[currentRoutineIndex] || routines[0] || { name: '기상' };
  const nextRoutineIndex = (currentRoutineIndex + 1) % (routines.length || 1);
  const nextRoutine = routines[nextRoutineIndex] || routines[0] || { name: '아침 시작' };

  // Calculate live crisis alert state for today
  const todayLogs = dailyLogs[todayDateStr] || [];
  const activeAlert: AlertStatus = isViewingToday
    ? checkRoutineAlert(
        todayLogs,
        lastLogMeta.lastTimestamp,
        elapsedMs,
        currentRoutine.name
      )
    : {
        isAlert: false,
        type: 'NONE',
        message: '',
        detail: '',
        overdueMinutes: 0,
      };

  // Sound triggering effect for crisis alert
  useEffect(() => {
    if (activeAlert.isAlert && isViewingToday) {
      const alertKey = `${activeAlert.type}-${lastLogMeta.lastTimestamp}`;
      if (activeAlertSessionRef.current !== alertKey) {
        activeAlertSessionRef.current = alertKey;
        if (alertSettings.soundEnabled) {
          if (alertSettings.soundMode === 'repeat') {
            soundService.startLoopAlert(7000, alertSettings.volume);
          } else {
            soundService.playChime(alertSettings.volume);
          }
        }
      }
    } else {
      if (activeAlertSessionRef.current !== null) {
        activeAlertSessionRef.current = null;
        soundService.stopLoopAlert();
      }
    }
  }, [
    activeAlert.isAlert,
    activeAlert.type,
    isViewingToday,
    lastLogMeta.lastTimestamp,
    alertSettings.soundEnabled,
    alertSettings.soundMode,
    alertSettings.volume,
  ]);

  // Play subtle audio click using Web Audio API for tactile feedback
  const playTactileSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Audio might be blocked before first user gesture
    }
  }, []);

  // Handle Main Button Click (Record Action)
  const handleRecordAction = () => {
    // Silence any running sound alert and clear session
    soundService.stopLoopAlert();
    activeAlertSessionRef.current = null;

    const now = new Date();
    const todayStr = getTodayDateString(now);
    const nowMs = now.getTime();
    const actionName = currentRoutine.name;

    playTactileSound();

    let durationMs: number | undefined = undefined;
    let durationFormatted: string | undefined = undefined;
    let isSleep = false;

    // Calculate duration since previous relevant log
    if (lastLogMeta.lastTimestamp) {
      const existingToday = dailyLogs[todayStr] || [];
      // If current action is teeth brushing, anchor is the meal end
      if (isTeethBrushing(actionName)) {
        let mealAnchor = lastLogMeta.lastTimestamp;
        for (let i = existingToday.length - 1; i >= 0; i--) {
          if (isMealEnd(existingToday[i].action)) {
            mealAnchor = existingToday[i].timestamp;
            break;
          }
        }
        durationMs = nowMs - mealAnchor;
      } else if (lastLogMeta.lastAction && isTeethBrushing(lastLogMeta.lastAction)) {
        // If previous action was teeth brushing, anchor back to the meal end!
        let mealAnchor = lastLogMeta.lastTimestamp;
        for (let i = existingToday.length - 1; i >= 0; i--) {
          if (isMealEnd(existingToday[i].action)) {
            mealAnchor = existingToday[i].timestamp;
            break;
          }
        }
        durationMs = nowMs - mealAnchor;
      } else {
        durationMs = nowMs - lastLogMeta.lastTimestamp;
      }

      if (durationMs < 0) durationMs = 0;
      durationFormatted = formatDurationKorean(durationMs);
      isSleep = isSleepTransition(lastLogMeta.lastAction || undefined, actionName);
    }

    const newLog: LogEntry = {
      id: `log-${nowMs}-${Math.random().toString(36).substring(2, 7)}`,
      dateStr: todayStr,
      timestamp: nowMs,
      timeFormatted: formatTime(now, true),
      action: actionName,
      routineId: currentRoutine.id,
      durationMs,
      durationFormatted,
      isSleepDuration: isSleep,
    };

    // Update daily logs
    const existingForToday = dailyLogs[todayStr] || [];
    const updatedTodayLogs = [...existingForToday, newLog];
    const updatedMap = {
      ...dailyLogs,
      [todayStr]: updatedTodayLogs,
    };

    setDailyLogs(updatedMap);
    saveDailyLogs(updatedMap);

    // Save last log metadata for live timer
    saveLastLogMetadata(nowMs, actionName);
    setLastLogMeta({ lastTimestamp: nowMs, lastAction: actionName });

    // Advance to next routine index in sequence
    const nextIdx = (currentRoutineIndex + 1) % routines.length;
    setCurrentRoutineIndex(nextIdx);
    saveCurrentRoutineIndex(nextIdx);

    // Sync to Cloud Firestore if logged in
    if (currentUser) {
      syncDailyLogToCloud(currentUser.uid, todayStr, updatedTodayLogs);
      syncConfigToCloud(currentUser.uid, routines, nextIdx, nowMs, actionName);
    }

    // Ensure viewDateStr is today so the user sees their new entry immediately
    setViewDateStr(todayStr);
  };

  // Re-calculate all log durations within a date if timestamps are edited or deleted
  const recalculateDailyLogs = (logs: LogEntry[]): LogEntry[] => {
    const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map((item, idx) => {
      if (idx === 0) {
        return {
          ...item,
          durationMs: undefined,
          durationFormatted: undefined,
        };
      }

      // If this item is teeth brushing, measure directly from its preceding meal end
      if (isTeethBrushing(item.action)) {
        for (let p = idx - 1; p >= 0; p--) {
          if (isMealEnd(sorted[p].action)) {
            const diff = item.timestamp - sorted[p].timestamp;
            const validDiff = diff > 0 ? diff : 0;
            return {
              ...item,
              durationMs: validDiff,
              durationFormatted: formatDurationKorean(validDiff),
              isSleepDuration: false,
            };
          }
        }
      }

      // For any non-teeth brushing item: if previous item was teeth brushing, skip back to the meal end before it!
      let anchorLog = sorted[idx - 1];
      if (isTeethBrushing(anchorLog.action)) {
        for (let p = idx - 2; p >= 0; p--) {
          if (isMealEnd(sorted[p].action)) {
            anchorLog = sorted[p];
            break;
          }
        }
      }

      const diff = item.timestamp - anchorLog.timestamp;
      const validDiff = diff > 0 ? diff : 0;
      return {
        ...item,
        durationMs: validDiff,
        durationFormatted: formatDurationKorean(validDiff),
        isSleepDuration: isSleepTransition(anchorLog.action, item.action),
      };
    });
  };

  // Save edited log entry
  const handleSaveEditedLog = (updatedLog: LogEntry) => {
    const existing = dailyLogs[viewDateStr] || [];
    const updatedList = existing.map((l) => (l.id === updatedLog.id ? updatedLog : l));
    const recalculated = recalculateDailyLogs(updatedList);

    const updatedMap = {
      ...dailyLogs,
      [viewDateStr]: recalculated,
    };

    setDailyLogs(updatedMap);
    saveDailyLogs(updatedMap);

    if (recalculated.length > 0) {
      const last = recalculated[recalculated.length - 1];
      if (viewDateStr === getTodayDateString()) {
        saveLastLogMetadata(last.timestamp, last.action);
        setLastLogMeta({ lastTimestamp: last.timestamp, lastAction: last.action });
      }
    }

    // Sync to Cloud
    if (currentUser) {
      syncDailyLogToCloud(currentUser.uid, viewDateStr, recalculated);
    }
  };

  // Delete log entry directly (Option 1: revert main button ONLY if latest log was deleted)
  const handleDeleteLog = (logId: string) => {
    // 1. Locate which date this log belongs to
    let dateToUse = viewDateStr;
    let existingList = dailyLogs[dateToUse] || [];
    let targetIndex = existingList.findIndex((l) => l.id === logId);

    // If not found in current viewDateStr, search all dates in dailyLogs
    if (targetIndex === -1) {
      for (const [dKey, dList] of Object.entries(dailyLogs)) {
        const foundIdx = dList.findIndex((l) => l.id === logId);
        if (foundIdx !== -1) {
          dateToUse = dKey;
          existingList = dList;
          targetIndex = foundIdx;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      console.warn('Target log not found for deletion:', logId);
      setEditingLog(null);
      return;
    }

    const targetLog = existingList[targetIndex];
    // Check if it was the latest (last) log of that date
    const isLatestLog = targetIndex === existingList.length - 1;

    const updatedList = existingList.filter((l) => l.id !== logId);
    const recalculated = recalculateDailyLogs(updatedList);

    const updatedMap = {
      ...dailyLogs,
      [dateToUse]: recalculated,
    };

    setDailyLogs(updatedMap);
    saveDailyLogs(updatedMap);
    setEditingLog(null);

    const todayStr = getTodayDateString();
    let nextIndexToSave = currentRoutineIndex;

    if (dateToUse === todayStr) {
      if (isLatestLog) {
        // Only revert main button if the deleted entry was the most recent log of today
        if (targetLog) {
          const foundIndex = routines.findIndex((r) => r.name === targetLog.action);
          if (foundIndex !== -1) {
            nextIndexToSave = foundIndex;
            setCurrentRoutineIndex(foundIndex);
            saveCurrentRoutineIndex(foundIndex);
          }
        }

        if (recalculated.length > 0) {
          const last = recalculated[recalculated.length - 1];
          saveLastLogMetadata(last.timestamp, last.action);
          setLastLogMeta({ lastTimestamp: last.timestamp, lastAction: last.action });
          if (currentUser) {
            syncConfigToCloud(currentUser.uid, routines, nextIndexToSave, last.timestamp, last.action);
          }
        } else {
          localStorage.removeItem('one_touch_last_timestamp_v2');
          localStorage.removeItem('one_touch_last_action_v2');
          setLastLogMeta({ lastTimestamp: null, lastAction: null });
          setCurrentRoutineIndex(0);
          saveCurrentRoutineIndex(0);
          if (currentUser) {
            syncConfigToCloud(currentUser.uid, routines, 0, null, null);
          }
        }
      } else {
        // Middle or earlier log deleted: keep main button routine index unchanged!
        if (currentUser) {
          syncConfigToCloud(currentUser.uid, routines, nextIndexToSave, lastLogMeta.lastTimestamp, lastLogMeta.lastAction);
        }
      }
    }

    // Sync to Cloud
    if (currentUser) {
      syncDailyLogToCloud(currentUser.uid, dateToUse, recalculated);
    }
  };

  // Save modified routines sequence
  const handleSaveRoutines = (newRoutines: RoutineItem[]) => {
    setRoutines(newRoutines);
    saveRoutines(newRoutines);

    let idx = currentRoutineIndex;
    if (currentRoutineIndex >= newRoutines.length) {
      idx = 0;
      setCurrentRoutineIndex(0);
      saveCurrentRoutineIndex(0);
    }

    if (currentUser) {
      syncConfigToCloud(currentUser.uid, newRoutines, idx, lastLogMeta.lastTimestamp, lastLogMeta.lastAction);
    }
  };

  // Manual reset of sequence back to start (기상)
  const handleResetSequence = () => {
    setCurrentRoutineIndex(0);
    saveCurrentRoutineIndex(0);
    setIsSettingsMenuOpen(false);
    if (currentUser) {
      syncConfigToCloud(currentUser.uid, routines, 0, lastLogMeta.lastTimestamp, lastLogMeta.lastAction);
    }
  };

  // Google Login handler
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      setIsSettingsMenuOpen(false);
    } catch (err: unknown) {
      console.error('Google login failed:', err);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await logoutUser();
    setIsSettingsMenuOpen(false);
  };

  // Import / Restore complete handler
  const handleImportComplete = async (
    importedDailyLogs: Record<string, LogEntry[]>,
    importedRoutines?: RoutineItem[],
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    let finalLogs: Record<string, LogEntry[]> = {};

    if (mode === 'replace') {
      finalLogs = { ...importedDailyLogs };
    } else {
      finalLogs = { ...dailyLogs };
      Object.keys(importedDailyLogs).forEach((date) => {
        const existingEntries = finalLogs[date] || [];
        const newEntries = importedDailyLogs[date] || [];
        const existingTimestamps = new Set(existingEntries.map((e) => e.timestamp));
        const nonDuplicateNew = newEntries.filter((e) => !existingTimestamps.has(e.timestamp));
        const combined = [...existingEntries, ...nonDuplicateNew];
        finalLogs[date] = recalculateDailyLogs(combined);
      });
    }

    setDailyLogs(finalLogs);
    saveDailyLogs(finalLogs);

    if (importedRoutines && importedRoutines.length > 0) {
      setRoutines(importedRoutines);
      saveRoutines(importedRoutines);
    }

    const todayLogs = finalLogs[getTodayDateString()];
    if (todayLogs && todayLogs.length > 0) {
      const last = todayLogs[todayLogs.length - 1];
      saveLastLogMetadata(last.timestamp, last.action);
      setLastLogMeta({ lastTimestamp: last.timestamp, lastAction: last.action });
    }

    // Sync all restored logs to Cloud if logged in
    if (currentUser) {
      for (const d of Object.keys(finalLogs)) {
        await syncDailyLogToCloud(currentUser.uid, d, finalLogs[d]);
      }
    }

    alert('데이터 복원이 성공적으로 완료되었습니다.');
  };

  // Date Navigation handlers in Top Bar
  const handlePrevDay = () => {
    const d = new Date(viewDateStr);
    d.setDate(d.getDate() - 1);
    setViewDateStr(getTodayDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(viewDateStr);
    d.setDate(d.getDate() + 1);
    setViewDateStr(getTodayDateString(d));
  };

  const handleOpenCalendar = () => {
    if (datePickerInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          datePickerInputRef.current.showPicker();
        } else {
          datePickerInputRef.current.focus();
        }
      } catch {
        datePickerInputRef.current.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 
        Top Header Bar:
        - 날짜 요일 표기 + 이전날/다음날 넘겨보기 + 날짜 클릭 시 달력 열기
        - 우측에 클라우드 동기화 상태 + 라이트/다크 모드 + 톱니바퀴 설정 메뉴
      */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Left Zone: Date Navigation & Calendar Trigger */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={handlePrevDay}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="이전 날짜"
              aria-label="이전 날짜로 이동"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Clickable Date Button that opens Calendar */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={handleOpenCalendar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer group"
                title="날짜 클릭하여 달력에서 선택"
              >
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">{formatKoreanDate(viewDateStr)}</span>
              </button>

              {/* Native Date Input Picker connected via ref */}
              <input
                ref={datePickerInputRef}
                type="date"
                value={viewDateStr}
                onChange={(e) => {
                  if (e.target.value) setViewDateStr(e.target.value);
                }}
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full cursor-pointer"
                aria-label="날짜 달력 선택"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="다음 날짜"
              aria-label="다음 날짜로 이동"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isViewingToday && (
              <button
                onClick={() => setViewDateStr(todayDateStr)}
                className="ml-1 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer shrink-0"
              >
                오늘
              </button>
            )}
          </div>

          {/* Right Zone: Cloud Sync, Theme Toggle & Settings Gear Menu */}
          <div className="flex items-center gap-1 shrink-0 relative" ref={settingsMenuRef}>
            {/* Cloud Status Pill */}
            {currentUser ? (
              <div
                className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold"
                title={`${currentUser.email || '구글 계정'} 클라우드 자동 동기화 활성`}
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>클라우드 저장됨</span>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer"
                title="클라우드 로그인 (Google)"
                aria-label="클라우드 로그인"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}

            {/* View Mode Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label="화면 모드 전환"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Gear Icon (톱니바퀴) */}
            <button
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              className={`p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ${
                isSettingsMenuOpen ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : ''
              }`}
              title="설정 및 메뉴"
              aria-label="메뉴 열기"
              aria-expanded={isSettingsMenuOpen}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Settings Dropdown Menu */}
            {isSettingsMenuOpen && (
              <div className="absolute right-0 top-12 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                {/* Cloud Login / Account Section */}
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  {currentUser ? (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-slate-400">클라우드 계정</div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {currentUser.email}
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="로그아웃"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Google 로그인 (클라우드 연동)</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsRoutineManagerOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>루틴 관리</span>
                </button>

                <button
                  onClick={() => {
                    setIsAlertSettingsOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <BellRing className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>알림 소리 및 경고 설정</span>
                </button>

                <button
                  onClick={() => {
                    setIsExportModalOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>기록 내보내기 / 메일</span>
                </button>

                <button
                  onClick={() => {
                    setIsImportModalOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>데이터 불러오기 (백업 복원)</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  onClick={handleResetSequence}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>다음 루틴 '기상' 리셋</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* 1. 메인 버튼 */}
        <section aria-label="메인 일상 기록 버튼">
          <RoundMainButton
            currentRoutineName={currentRoutine.name}
            nextRoutineName={nextRoutine.name}
            onRecord={handleRecordAction}
            isAlert={activeAlert.isAlert}
            alertMessage={activeAlert.message}
          />
        </section>

        {/* 2. 오늘 루틴 타임라인 */}
        <section aria-label="오늘 루틴 타임라인">
          <TimelineView
            logs={currentLogs}
            elapsedMs={elapsedMs}
            hasStarted={lastLogMeta.lastTimestamp !== null}
            isViewingToday={isViewingToday}
            onEditLog={(log) => setEditingLog(log)}
            onDeleteLog={handleDeleteLog}
            isAlert={activeAlert.isAlert}
            alertMessage={activeAlert.message}
            timerLabel={effectiveTimer.label}
          />
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="py-5 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>원터치 일상 기록기</p>
      </footer>

      {/* Modals */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          isOpen={true}
          routines={routines}
          onClose={() => setEditingLog(null)}
          onSave={handleSaveEditedLog}
          onDelete={handleDeleteLog}
        />
      )}

      {isRoutineManagerOpen && (
        <RoutineManagerModal
          isOpen={true}
          routines={routines}
          onClose={() => setIsRoutineManagerOpen(false)}
          onSaveRoutines={handleSaveRoutines}
        />
      )}

      {isAlertSettingsOpen && (
        <AlertSettingsModal
          isOpen={true}
          settings={alertSettings}
          onClose={() => setIsAlertSettingsOpen(false)}
          onSaveSettings={(newSettings) => {
            setAlertSettings(newSettings);
            saveAlertSettings(newSettings);
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportShareModal
          isOpen={true}
          activeDateStr={viewDateStr}
          dailyLogs={dailyLogs}
          routines={routines}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {isImportModalOpen && (
        <ImportDataModal
          isOpen={true}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
