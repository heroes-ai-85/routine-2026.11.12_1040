import React from 'react';
import { Edit2, Clock, FileText, AlertTriangle } from 'lucide-react';
import { LogEntry } from '../types';
import { formatStopwatchTime, formatDurationKorean, groupLogsForTimeline } from '../utils/formatters';

interface TimelineViewProps {
  logs: LogEntry[];
  elapsedMs: number;
  hasStarted: boolean;
  isViewingToday: boolean;
  onEditLog: (log: LogEntry) => void;
  onDeleteLog?: (logId: string) => void;
  isAlert?: boolean;
  alertMessage?: string;
  timerLabel?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  logs,
  elapsedMs,
  hasStarted,
  isViewingToday,
  onEditLog,
  isAlert = false,
  alertMessage,
  timerLabel = '경과 시간:',
}) => {
  const { hours, minutes, seconds, rawHours } = formatStopwatchTime(elapsedMs);

  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
          아직 기록된 일상이 없습니다
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          상단의 둥근 메인 버튼을 누르면 첫 행동과 시간이 자동으로 타임라인에 기록됩니다.
        </p>
      </div>
    );
  }

  // Group logs so teeth brushing belongs to its parent meal block
  const groupedItems = groupLogsForTimeline(logs);
  // Reverse so newest is at the top
  const reversedGroups = [...groupedItems].reverse();

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            오늘 루틴 타임라인
          </h3>
          <span className="text-xs text-slate-400 font-mono font-medium">({logs.length}건 기록)</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          최신 기록 순 (위 → 아래)
        </span>
      </div>

      <div className="space-y-0 relative">
        {/* 1. 최신 기록 위 실시간 '경과 시간' 표기 (식후 경과 시간 앵커 지원) */}
        {hasStarted && isViewingToday && (
          <div className="relative pb-4 pt-1 flex items-center">
            {/* Vertical connector line leading down into the latest record card */}
            <div
              className={`absolute top-2 bottom-0 left-5 sm:left-6 w-0.5 -translate-x-1/2 transition-colors ${
                isAlert ? 'bg-rose-400 dark:bg-rose-600' : 'bg-indigo-300 dark:bg-indigo-800'
              }`}
            />

            {/* Prominent live elapsed timer badge */}
            <div
              className={`relative z-10 flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 shadow-sm ml-4 sm:ml-5 backdrop-blur-xs transition-all flex-wrap ${
                isAlert
                  ? 'border-rose-500 dark:border-rose-500 bg-gradient-to-r from-rose-100/90 via-rose-50/80 to-red-100/90 dark:from-rose-950/90 dark:via-red-900/40 dark:to-rose-950/90 shadow-rose-500/30 animate-pulse'
                  : 'border-indigo-200 dark:border-indigo-700/80 bg-gradient-to-r from-indigo-50 via-white to-indigo-50/70 dark:from-indigo-950/70 dark:via-slate-900 dark:to-indigo-950/70'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-75 ${
                    isAlert ? 'bg-rose-500' : 'bg-indigo-400'
                  }`}
                />
                <Clock
                  className={`w-4 h-4 sm:w-5 sm:h-5 relative shrink-0 ${
                    isAlert ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                />
              </div>

              {/* Dynamic Label: e.g. "아침 식후 경과:" or "경과 시간:" */}
              <span
                className={`text-xs sm:text-sm font-bold ${
                  isAlert ? 'text-rose-900 dark:text-rose-200' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {timerLabel}
              </span>

              {/* Running Stopwatch Timer Display */}
              <span
                className={`font-mono tabular-nums font-extrabold text-base sm:text-xl tracking-tight ${
                  isAlert
                    ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {rawHours > 0 ? `${hours}시간 ` : ''}{minutes}분 {seconds}초
              </span>

              {/* Alert Crisis Badge */}
              {isAlert && alertMessage && (
                <div className="ml-1 sm:ml-2 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] sm:text-xs font-bold shadow-xs flex items-center gap-1 shrink-0 animate-bounce">
                  <AlertTriangle className="w-3 h-3 fill-amber-300 text-rose-700" />
                  <span>{alertMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Reversed Logs List (Newest on top) */}
        {reversedGroups.map((groupItem, revIndex) => {
          const log = groupItem.mainLog;
          const originalIndex = logs.findIndex((l) => l.id === log.id);
          const subTeeth = groupItem.subTeethLog;

          return (
            <React.Fragment key={groupItem.id}>
              {/* Main Log Card: 선명한 테두리와 은은한 그림자로 입체감 강화 */}
              <div className="relative flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 border-slate-300/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                {/* Sub-event: 양치 완료 표기 (식사 카드 맨 '위'에 배치) */}
                {subTeeth && (
                  <div className="mb-2.5 pb-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/80 dark:bg-slate-800/60 px-3 py-2 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base select-none shrink-0" role="img" aria-label="양치">
                        🦷
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          양치 완료
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {subTeeth.timeFormatted.substring(0, 5)}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                          식후 {formatDurationKorean(subTeeth.timestamp - log.timestamp, true)}
                        </span>
                        {subTeeth.note && (
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            · {subTeeth.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLog(subTeeth);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="양치 기록 수정"
                      aria-label="양치 기록 수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Main Card Content Row */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Time Indicator Node */}
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border-2 text-center shadow-2xs ${
                      revIndex === 0
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : groupItem.isSleepInterval
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono font-semibold opacity-75 leading-none">
                      #{originalIndex + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold font-mono tabular-nums leading-tight mt-0.5">
                      {log.timeFormatted.substring(0, 5)}
                    </span>
                  </div>

                  {/* Content Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {log.action}
                      </span>
                      {originalIndex === 0 && (
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                          첫 시작
                        </span>
                      )}
                      {revIndex === 0 && logs.length > 1 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                          최신
                        </span>
                      )}
                    </div>

                    {log.note && (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{log.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit Main Log Button */}
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => onEditLog(log)}
                      className="p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="기록 수정 (삭제는 수정 창 내부에서 가능)"
                      aria-label="기록 수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Between-time elapsed duration: 테두리/화살표 없이 조용한 회색 텍스트로 미니멀화 */}
              {groupItem.durationFormatted && (
                <div className="relative py-2 sm:py-2.5 flex items-center pl-10 sm:pl-12">
                  {/* Vertical connector guide line */}
                  <div className="absolute inset-y-0 left-5 sm:left-6 w-0.5 bg-slate-200 dark:bg-slate-800 -translate-x-1/2" />

                  {/* Subtle quiet text without pill box or downward arrow */}
                  <div className="text-[11px] sm:text-xs font-medium select-none tracking-tight">
                    {groupItem.isSleepInterval ? (
                      <span className="text-indigo-600/90 dark:text-indigo-400 font-semibold">
                        수면 {groupItem.durationFormatted}
                      </span>
                    ) : groupItem.isPostMealInterval ? (
                      <span className="text-emerald-700/90 dark:text-emerald-400 font-semibold">
                        {groupItem.prevMealName ? `${groupItem.prevMealName} 식후` : '식후'} {groupItem.durationFormatted}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        경과 {groupItem.durationFormatted}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
