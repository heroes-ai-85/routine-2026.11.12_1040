import React from 'react';
import { RotateCw, AlertTriangle } from 'lucide-react';

interface RoundMainButtonProps {
  currentRoutineName: string;
  nextRoutineName: string;
  onRecord: () => void;
  isAlert?: boolean;
  alertMessage?: string;
}

export const RoundMainButton: React.FC<RoundMainButtonProps> = ({
  currentRoutineName,
  nextRoutineName,
  onRecord,
  isAlert = false,
  alertMessage,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-2">
      <div className="relative flex items-center justify-center">
        {/* Soft decorative background aura - red pulsating in alert mode */}
        <div
          className={`absolute -inset-5 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
            isAlert
              ? 'bg-gradient-to-tr from-rose-600/50 via-red-500/40 to-rose-700/50 animate-pulse scale-110'
              : 'bg-gradient-to-tr from-indigo-500/20 to-blue-500/20'
          }`}
        />

        {/* Dynamic pinging ripple when in alert crisis mode */}
        {isAlert && (
          <div className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
        )}

        <div
          className={`absolute -inset-1.5 rounded-full pointer-events-none transition-colors ${
            isAlert ? 'bg-rose-500/20' : 'bg-indigo-500/10'
          }`}
        />

        <button
          type="button"
          onClick={onRecord}
          className={`relative w-52 h-52 sm:w-60 sm:h-60 rounded-full text-white flex flex-col items-center justify-center text-center p-5 focus:outline-none cursor-pointer select-none group transform transition-all duration-150 ease-out active:scale-95 hover:scale-[1.02] ${
            isAlert
              ? 'bg-gradient-to-b from-rose-600 via-rose-500 to-red-700 shadow-2xl shadow-rose-600/60 border-4 border-rose-200 dark:border-rose-400 animate-pulse focus:ring-4 focus:ring-rose-500/50'
              : 'bg-gradient-to-b from-indigo-600 via-indigo-600 to-blue-700 shadow-xl shadow-indigo-600/30 border-4 border-indigo-200/40 dark:border-indigo-400/30 focus:ring-4 focus:ring-indigo-500/40'
          }`}
          aria-label={
            isAlert
              ? `경고 상태: ${alertMessage || currentRoutineName} 기록하여 알림 해제`
              : `현재 루틴 ${currentRoutineName} 기록하기`
          }
        >
          {/* Inner ring effect */}
          <div className="absolute inset-1.5 rounded-full border border-white/20 pointer-events-none" />

          {/* Urgent crisis badge if alert is active */}
          {isAlert && (
            <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs text-[11px] sm:text-xs font-black tracking-wide flex items-center gap-1 shadow-xs animate-bounce">
              <AlertTriangle className="w-3.5 h-3.5 fill-amber-300 text-rose-700" />
              <span>알림 발생</span>
            </div>
          )}

          {/* Action Label */}
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm px-2 break-keep">
            {isAlert && alertMessage ? alertMessage : currentRoutineName}
          </span>

          {/* Subtitle / Next hint */}
          <div
            className={`mt-2.5 sm:mt-3 text-xs font-medium flex items-center gap-1 transition-opacity ${
              isAlert
                ? 'text-rose-100 font-semibold'
                : 'text-indigo-100/90 opacity-90 group-hover:opacity-100'
            }`}
          >
            {isAlert ? (
              <span>터치하여 기록 & 알림 해제</span>
            ) : (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>다음: {nextRoutineName}</span>
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
