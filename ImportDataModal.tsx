import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { LogEntry, RoutineItem } from '../types';
import { formatKoreanDate } from '../utils/formatters';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (
    importedDailyLogs: Record<string, LogEntry[]>,
    importedRoutines?: RoutineItem[],
    mode?: 'merge' | 'replace'
  ) => void;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed data preview
  const [parsedDailyLogs, setParsedDailyLogs] = useState<Record<string, LogEntry[]> | null>(null);
  const [parsedRoutines, setParsedRoutines] = useState<RoutineItem[] | undefined>(undefined);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('merge');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setParsedDailyLogs(null);
    setParsedRoutines(undefined);

    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        parseJsonFile(text);
      } else if (fileName.endsWith('.csv')) {
        parseCsvFile(text);
      } else {
        // Try parsing JSON first, then CSV
        try {
          parseJsonFile(text);
        } catch {
          parseCsvFile(text);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        '파일을 읽는 도중 오류가 발생했습니다. 올바른 .json 또는 .csv 파일인지 확인해 주세요.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const parseJsonFile = (text: string) => {
    const data = JSON.parse(text);

    let logsMap: Record<string, LogEntry[]> = {};
    let routinesList: RoutineItem[] | undefined = undefined;

    if (data.dailyLogs && typeof data.dailyLogs === 'object') {
      logsMap = data.dailyLogs;
      if (Array.isArray(data.routines)) {
        routinesList = data.routines;
      }
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      logsMap = data;
    } else {
      throw new Error('유효하지 않은 백업 JSON 구조입니다.');
    }

    const dateKeys = Object.keys(logsMap);
    if (dateKeys.length === 0) {
      throw new Error('JSON 파일 내에 기록된 일상 데이터가 없습니다.');
    }

    setParsedDailyLogs(logsMap);
    setParsedRoutines(routinesList);
  };

  const parseCsvFile = (text: string) => {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length <= 1) {
      throw new Error('CSV 파일 내에 데이터가 존재하지 않습니다.');
    }

    const logsMap: Record<string, LogEntry[]> = {};

    // Header check
    // Expected: 순번,날짜,기록시간,행위내용,소요시간,수면여부,메모
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV regex splitter matching quoted strings
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' && (c === 0 || line[c - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

      if (parts.length >= 4) {
        const dateStr = parts[1]; // YYYY-MM-DD
        const timeFormatted = parts[2]; // HH:mm:ss
        const action = parts[3];
        const durationFormatted = parts[4] || '';
        const isSleep = parts[5] === '수면' || action.includes('수면');
        const note = parts[6] || undefined;

        if (dateStr && timeFormatted && action) {
          // Parse timestamp from dateStr and timeFormatted
          const [y, m, d] = dateStr.split('-').map(Number);
          const [hh, mm, ss] = timeFormatted.split(':').map(Number);
          const dateObj = new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0);

          const entry: LogEntry = {
            id: `imported-${dateObj.getTime()}-${Math.random().toString(36).substring(2, 6)}`,
            dateStr,
            timestamp: dateObj.getTime(),
            timeFormatted,
            action,
            durationFormatted: durationFormatted !== '첫 시작' ? durationFormatted : undefined,
            isSleepDuration: isSleep,
            note,
          };

          if (!logsMap[dateStr]) logsMap[dateStr] = [];
          logsMap[dateStr].push(entry);
        }
      }
    }

    const dates = Object.keys(logsMap);
    if (dates.length === 0) {
      throw new Error('CSV에서 날짜와 행위 내용을 파싱할 수 없습니다.');
    }

    // Sort each day's entries by timestamp
    dates.forEach((d) => {
      logsMap[d].sort((a, b) => a.timestamp - b.timestamp);
    });

    setParsedDailyLogs(logsMap);
  };

  const handleConfirmImport = () => {
    if (!parsedDailyLogs) return;
    onImportComplete(parsedDailyLogs, parsedRoutines, mergeMode);
    onClose();
  };

  // Stats calculation
  const totalDates = parsedDailyLogs ? Object.keys(parsedDailyLogs).length : 0;
  const totalLogsCount = parsedDailyLogs
    ? Object.values(parsedDailyLogs).reduce((acc, list) => acc + list.length, 0)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 id="import-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
              데이터 불러오기 (백업 복원)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            이전에 내보내기 했던 <strong>백업 파일(.json)</strong> 또는 <strong>CSV 파일(.csv)</strong>을 선택하면 과거 기록을 현재 브라우저로 안전하게 복원합니다.
          </p>

          {/* File Upload Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto mb-2.5">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              {selectedFile ? selectedFile.name : '백업 파일 선택 (.json 또는 .csv)'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                : '클릭하여 내보냈던 백업 파일을 업로드하세요'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedDailyLogs && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>데이터 확인 완료: 총 {totalDates}일치 ({totalLogsCount}건 기록)</span>
              </div>

              {parsedRoutines && (
                <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>루틴 목록({parsedRoutines.length}개 항목)도 함께 감지되었습니다.</span>
                </div>
              )}

              {/* Date List Sample */}
              <div className="max-h-28 overflow-y-auto pr-1 space-y-1 text-xs">
                {Object.keys(parsedDailyLogs).map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between py-1 px-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatKoreanDate(date)}
                    </span>
                    <span className="font-mono text-slate-400">
                      {parsedDailyLogs[date].length}건
                    </span>
                  </div>
                ))}
              </div>

              {/* Merge Mode Selection */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  복원 방식 선택
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMergeMode('merge')}
                    className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                      mergeMode === 'merge'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <div>기존 기록과 합치기</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      기존 기록을 유지하며 새 기록 추가
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMergeMode('replace')}
                    className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                      mergeMode === 'replace'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <div>기존 기록 덮어쓰기</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      백업 파일의 내용으로 완전히 교체
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!parsedDailyLogs || isProcessing}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>기록 복원 완료</span>
          </button>
        </div>
      </div>
    </div>
  );
};
