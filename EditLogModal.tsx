import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Trash2, Check } from 'lucide-react';
import { LogEntry, RoutineItem } from '../types';

interface EditLogModalProps {
  log: LogEntry | null;
  isOpen: boolean;
  routines: RoutineItem[];
  onClose: () => void;
  onSave: (updatedLog: LogEntry) => void;
  onDelete: (logId: string) => void;
}

export const EditLogModal: React.FC<EditLogModalProps> = ({
  log,
  isOpen,
  routines,
  onClose,
  onSave,
  onDelete,
}) => {
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Parse existing timestamp safely
  const logDate = log ? new Date(log.timestamp) : new Date();
  const [hours, setHours] = useState<string>(() => (log ? String(logDate.getHours()).padStart(2, '0') : '00'));
  const [minutes, setMinutes] = useState<string>(() => (log ? String(logDate.getMinutes()).padStart(2, '0') : '00'));
  const [selectedAction, setSelectedAction] = useState<string>(() => (log ? log.action : ''));
  const [customAction, setCustomAction] = useState<string>('');
  const [note, setNote] = useState<string>(() => (log ? (log.note || '') : ''));
  const [error, setError] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    if (log) {
      const d = new Date(log.timestamp);
      setHours(String(d.getHours()).padStart(2, '0'));
      setMinutes(String(d.getMinutes()).padStart(2, '0'));
      setSelectedAction(log.action);
      setCustomAction('');
      setNote(log.note || '');
      setError('');
      setIsConfirmingDelete(false);
    }
  }, [log]);

  if (!isOpen || !log) return null;

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    if (rawVal.length > 2) {
      const trimmed = rawVal.slice(-2);
      setHours(trimmed);
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
      return;
    }
    setHours(rawVal);
    if (rawVal.length === 2) {
      setTimeout(() => {
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
      }, 10);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    if (rawVal.length > 2) {
      setMinutes(rawVal.slice(-2));
      return;
    }
    setMinutes(rawVal);
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && minutes === '') {
      hourInputRef.current?.focus();
      hourInputRef.current?.select();
    }
  };

  const handleAdjustMinutes = (delta: number) => {
    const currentH = parseInt(hours, 10) || 0;
    const currentM = parseInt(minutes, 10) || 0;
    const d = new Date(log.timestamp);
    d.setHours(currentH, currentM + delta);
    setHours(String(d.getHours()).padStart(2, '0'));
    setMinutes(String(d.getMinutes()).padStart(2, '0'));
  };

  const handleSave = () => {
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (isNaN(h) || h < 0 || h > 23) {
      setError('시간(0~23)을 올바르게 숫자로 입력해 주세요.');
      return;
    }
    if (isNaN(m) || m < 0 || m > 59) {
      setError('분(0~59)을 올바르게 숫자로 입력해 주세요.');
      return;
    }

    const actionToUse = customAction.trim() || selectedAction.trim();
    if (!actionToUse) {
      setError('행위 내용을 선택하거나 입력해 주세요.');
      return;
    }

    // Build new timestamp maintaining original date and seconds
    const origSeconds = new Date(log.timestamp).getSeconds();
    const updatedDate = new Date(log.timestamp);
    updatedDate.setHours(h, m, origSeconds, 0);

    const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(origSeconds).padStart(2, '0')}`;

    const updatedLog: LogEntry = {
      ...log,
      timestamp: updatedDate.getTime(),
      timeFormatted,
      action: actionToUse,
      note: note.trim() || undefined,
    };

    onSave(updatedLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 id="edit-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
              기록 수정
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* 1. Time Input Section (Keyboard numeric entry) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              기록 시간 (터치 시 전체선택, 2자리 입력 시 자동이동)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5">
                <input
                  ref={hourInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={hours}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onChange={handleHoursChange}
                  className="w-14 text-center text-2xl font-bold font-mono text-slate-900 dark:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg selection:bg-indigo-200 dark:selection:bg-indigo-900"
                  placeholder="00"
                  aria-label="시간 (시)"
                />
                <span className="text-slate-400 font-bold text-xl mx-2">:</span>
                <input
                  ref={minuteInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={minutes}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onChange={handleMinutesChange}
                  onKeyDown={handleMinuteKeyDown}
                  className="w-14 text-center text-2xl font-bold font-mono text-slate-900 dark:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg selection:bg-indigo-200 dark:selection:bg-indigo-900"
                  placeholder="00"
                  aria-label="분 (분)"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>수정 완료</span>
              </button>
            </div>

            {/* Quick Nudge Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-10)}
                className="flex-1 py-1 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                -10분
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-5)}
                className="flex-1 py-1 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                -5분
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(5)}
                className="flex-1 py-1 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                +5분
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(10)}
                className="flex-1 py-1 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                +10분
              </button>
            </div>
          </div>

          {/* 2. Action Selection Section (Order list of available actions) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                행위 내용 선택 (순서대로 나열)
              </label>
              <span className="text-xs text-slate-400">클릭하여 선택</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
              {routines.map((routine, idx) => {
                const isSelected = selectedAction === routine.name && !customAction;
                return (
                  <button
                    key={`${routine.id}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedAction(routine.name);
                      setCustomAction('');
                    }}
                    className={`py-2 px-3 text-xs font-medium rounded-xl text-left flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    <span className="truncate">{routine.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Action Direct Input */}
            <div className="mt-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                또는 직접 새로운 행위 입력
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="예: 간식 먹음, 운동 시작, 독서"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {customAction && (
                  <button
                    type="button"
                    onClick={() => setCustomAction('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Optional Memo / Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              메모 (선택 사항)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="특이사항이나 세부 내용 기록"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
              <button
                type="button"
                onClick={() => {
                  onDelete(log.id);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>정말 삭제</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>기록 삭제</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              수정 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
