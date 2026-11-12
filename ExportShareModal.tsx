import React, { useState, useMemo } from 'react';
import { X, Download, Mail, Copy, Check, FileSpreadsheet, FileText, Database } from 'lucide-react';
import { LogEntry, RoutineItem } from '../types';
import {
  downloadCsvFile,
  downloadExcelXml,
  downloadTextFile,
  downloadJsonBackup,
  generateExportTextReport,
  createMailtoLink,
} from '../utils/export';
import { formatKoreanDate } from '../utils/formatters';

interface ExportShareModalProps {
  isOpen: boolean;
  activeDateStr: string;
  dailyLogs: Record<string, LogEntry[]>;
  routines: RoutineItem[];
  onClose: () => void;
}

type ExportRangeMode = 'current' | 'all' | 'range' | 'custom';

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  isOpen,
  activeDateStr,
  dailyLogs,
  routines,
  onClose,
}) => {
  const availableDates = useMemo(() => {
    return Object.keys(dailyLogs)
      .filter((date) => (dailyLogs[date] || []).length > 0)
      .sort();
  }, [dailyLogs]);

  const [rangeMode, setRangeMode] = useState<ExportRangeMode>('current');
  const [startDate, setStartDate] = useState<string>(availableDates[0] || activeDateStr);
  const [endDate, setEndDate] = useState<string>(activeDateStr);
  const [selectedDates, setSelectedDates] = useState<string[]>([activeDateStr]);
  const [copied, setCopied] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const { filteredLogs, scopeTitle, filePrefix } = useMemo(() => {
    let datesToInclude: string[] = [];
    let title = '';
    let prefix = '';

    if (rangeMode === 'current') {
      datesToInclude = [activeDateStr];
      title = `${formatKoreanDate(activeDateStr)}`;
      prefix = activeDateStr;
    } else if (rangeMode === 'all') {
      datesToInclude = availableDates;
      title = `전체 기간 (${availableDates.length}일간)`;
      prefix = `전체_${availableDates[0] || ''}_${availableDates[availableDates.length - 1] || ''}`;
    } else if (rangeMode === 'range') {
      datesToInclude = availableDates.filter((d) => d >= startDate && d <= endDate);
      title = `${startDate} ~ ${endDate}`;
      prefix = `${startDate}_${endDate}`;
    } else if (rangeMode === 'custom') {
      datesToInclude = selectedDates;
      title = `선택된 ${selectedDates.length}개 일자`;
      prefix = `선택_${selectedDates.length}일`;
    }

    const aggregated: LogEntry[] = [];
    datesToInclude.forEach((d) => {
      const dayLogs = dailyLogs[d] || [];
      aggregated.push(...dayLogs);
    });

    aggregated.sort((a, b) => a.timestamp - b.timestamp);

    return {
      filteredLogs: aggregated,
      scopeTitle: title,
      filePrefix: prefix || '기록',
    };
  }, [rangeMode, activeDateStr, availableDates, startDate, endDate, selectedDates, dailyLogs]);

  const reportText = useMemo(() => {
    return generateExportTextReport(scopeTitle, filteredLogs);
  }, [scopeTitle, filteredLogs]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  const handleSendMail = () => {
    const link = createMailtoLink(scopeTitle, filteredLogs, recipientEmail.trim());
    window.location.href = link;
  };

  const toggleCustomDate = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter((d) => d !== date));
    } else {
      setSelectedDates([...selectedDates, date].sort());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 id="export-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
              기록 내보내기 & 공유
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              오늘 및 과거 날짜 기록을 선택하여 엑셀, 텍스트, 메일로 전송합니다
            </p>
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
          {/* 1. Date Range / Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              내보낼 기간 선택
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setRangeMode('current')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  rangeMode === 'current'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                선택한 날짜
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('range')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  rangeMode === 'range'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                기간 지정
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('all')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  rangeMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                전체 기록
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('custom')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  rangeMode === 'custom'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                직접 선택
              </button>
            </div>

            {rangeMode === 'range' && (
              <div className="flex items-center gap-2 mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-500 mb-1">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-medium px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <span className="text-slate-400 mt-4">~</span>
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-500 mb-1">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-medium px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            )}

            {rangeMode === 'custom' && (
              <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
                  <span>날짜 목록 ({availableDates.length}일)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDates(
                        selectedDates.length === availableDates.length ? [] : [...availableDates]
                      )
                    }
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {selectedDates.length === availableDates.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                {availableDates.map((date) => {
                  const isChecked = selectedDates.includes(date);
                  const count = (dailyLogs[date] || []).length;
                  return (
                    <label
                      key={date}
                      className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCustomDate(date)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {formatKoreanDate(date)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{count}건</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>선택 범위: <strong className="text-slate-800 dark:text-slate-200">{scopeTitle}</strong></span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                총 {filteredLogs.length}건
              </span>
            </div>
          </div>

          {/* 2. Download File Format Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              파일 다운로드
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Excel XML */}
              <button
                type="button"
                onClick={() => downloadExcelXml(filePrefix, scopeTitle, filteredLogs)}
                disabled={filteredLogs.length === 0}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>엑셀 (.xls)</span>
              </button>

              {/* CSV */}
              <button
                type="button"
                onClick={() => downloadCsvFile(filePrefix, filteredLogs)}
                disabled={filteredLogs.length === 0}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-200 font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>CSV 파일</span>
              </button>

              {/* TXT */}
              <button
                type="button"
                onClick={() => downloadTextFile(filePrefix, scopeTitle, filteredLogs)}
                disabled={filteredLogs.length === 0}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span>텍스트 (.txt)</span>
              </button>

              {/* JSON Full Backup */}
              <button
                type="button"
                onClick={() => downloadJsonBackup(dailyLogs, routines)}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 font-semibold text-xs transition-colors cursor-pointer"
                title="언제든 100% 원본 그대로 복원할 수 있는 백업 파일"
              >
                <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>전체 백업 (.json)</span>
              </button>
            </div>
          </div>

          {/* 3. Email Share Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>이메일로 바로 보내기</span>
              </label>
              <span className="text-[11px] text-slate-400">선택된 기간 리포트 자동 첨부</span>
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="받는 사람 이메일 (선택)"
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendMail}
                disabled={filteredLogs.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>메일 작성</span>
              </button>
            </div>
          </div>

          {/* 4. Text Preview & Copy */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                리포트 미리보기
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>전체 복사하기</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
              {reportText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
