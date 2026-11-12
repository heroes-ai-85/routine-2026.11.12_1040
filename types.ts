export interface RoutineItem {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface LogEntry {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number; // Unix epoch ms
  timeFormatted: string; // HH:mm:ss
  action: string;
  routineId?: string;
  durationMs?: number; // duration since previous entry in milliseconds
  durationFormatted?: string; // e.g. "45분" or "1시간 20분"
  isSleepDuration?: boolean; // true if interval between 잠자리 누움 and 기상
  note?: string;
}

export type DailyLogsMap = Record<string, LogEntry[]>;

export const DEFAULT_ROUTINES: string[] = [
  '기상',
  '아침 시작',
  '아침 끝',
  '양치',
  '점심 시작',
  '점심 끝',
  '양치',
  '저녁 시작',
  '저녁 끝',
  '양치',
  '잠자리 누움',
];

export type AlertSoundMode = 'once' | 'repeat';

export interface AlertSettings {
  soundEnabled: boolean;
  soundMode: AlertSoundMode; // 'once': 1회성 울림, 'repeat': 메인 버튼 누를 때까지 계속 울림
  volume: number; // 0.0 ~ 1.0
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  soundEnabled: true,
  soundMode: 'once',
  volume: 0.8,
};

