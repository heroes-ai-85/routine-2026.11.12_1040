import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Globe, QrCode } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function getSharedAppUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-pre-53uf2dorvfsgsi4axbq2g4-437994362535.asia-northeast1.run.app';
  }
  const origin = window.location.origin;
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  if (origin.includes('run.app')) {
    return origin;
  }
  return 'https://ais-pre-53uf2dorvfsgsi4axbq2g4-437994362535.asia-northeast1.run.app';
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const sharedUrl = getSharedAppUrl();

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sharedUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = sharedUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-link-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 id="share-link-title" className="text-base font-bold text-slate-900 dark:text-white">
                공개 앱 링크 (누구나 접속 가능)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                별도 로그인 없이 다른 기기나 사람에게 공유할 수 있는 링크
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">공유 전용 URL (Shared App)</span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                공개 열람 가능
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all shadow-2xs">
              {sharedUrl}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사되었습니다!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>링크 복사하기</span>
                </>
              )}
            </button>

            <a
              href={sharedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>새 창에서 열기</span>
            </a>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="font-semibold text-slate-700 dark:text-slate-300">💡 링크 활용 팁</p>
            <p>• 이 링크는 AI Studio 계정이 없는 사람도 스마트폰이나 PC 웹 브라우저에서 바로 열 수 있습니다.</p>
            <p>• 모바일 브라우저에서 '홈 화면에 추가'를 누르면 앱처럼 설치하여 원터치로 사용할 수 있습니다.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
