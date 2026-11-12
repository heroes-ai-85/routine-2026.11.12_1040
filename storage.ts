import { DailyLogsMap, DEFAULT_ROUTINES, RoutineItem } from '../types';

const STORAGE_KEYS = {
  ROUTINES: 'one_touch_routines_v2',
  LOGS: 'one_touch_daily_logs_v2',
  CURRENT_INDEX: 'one_touch_current_index_v2',
  LAST_TIMESTAMP: 'one_touch_last_timestamp_v2',
  LAST_ACTION: 'one_touch_last_action_v2',
  ALERT_SETTINGS: 'one_touch_alert_settings_v1',
};

export function getDefaultRoutines(): RoutineItem[] {
  return DEFAULT_ROUTINES.map((name, idx) => ({
    id: `routine-${idx + 1}-${name}`,
    name,
    isDefault: true,
  }));
}

export function loadRoutines(): RoutineItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTINES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load routines from storage:', e);
  }
  const defaults = getDefaultRoutines();
  saveRoutines(defaults);
  return defaults;
}

export function saveRoutines(routines: RoutineItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  } catch (e) {
    console.error('Failed to save routines:', e);
  }
}

export function loadDailyLogs(): DailyLogsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load daily logs:', e);
  }
  return {};
}

export function saveDailyLogs(logs: DailyLogsMap): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save daily logs:', e);
  }
}

export function loadCurrentRoutineIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX);
    if (raw !== null) {
      const idx = parseInt(raw, 10);
      if (!isNaN(idx) && idx >= 0) return idx;
    }
  } catch (e) {
    console.error('Failed to load current index:', e);
  }
  return 0; // Starts with 0 ('기상')
}

export function saveCurrentRoutineIndex(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, String(index));
  } catch (e) {
    console.error('Failed to save current routine index:', e);
  }
}

export function loadLastLogMetadata(): { lastTimestamp: number | null; lastAction: string | null } {
  try {
    const rawTime = localStorage.getItem(STORAGE_KEYS.LAST_TIMESTAMP);
    const rawAction = localStorage.getItem(STORAGE_KEYS.LAST_ACTION);
    return {
      lastTimestamp: rawTime ? parseInt(rawTime, 10) : null,
      lastAction: rawAction || null,
    };
  } catch (e) {
    console.error('Failed to load last log metadata:', e);
    return { lastTimestamp: null, lastAction: null };
  }
}

export function saveLastLogMetadata(timestamp: number, action: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_TIMESTAMP, String(timestamp));
    localStorage.setItem(STORAGE_KEYS.LAST_ACTION, action);
  } catch (e) {
    console.error('Failed to save last log metadata:', e);
  }
}

export function loadAlertSettings(): import('../types').AlertSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERT_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
          soundMode: parsed.soundMode === 'repeat' ? 'repeat' : 'once',
          volume: typeof parsed.volume === 'number' ? parsed.volume : 0.8,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load alert settings:', e);
  }
  return {
    soundEnabled: true,
    soundMode: 'once',
    volume: 0.8,
  };
}

export function saveAlertSettings(settings: import('../types').AlertSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALERT_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save alert settings:', e);
  }
}

