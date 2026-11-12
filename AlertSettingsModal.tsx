import React, { useState } from 'react';
import { X, Bell, BellRing, Volume2, VolumeX, Play, Square, Check, AlertTriangle, Clock } from 'lucide-react';
import { AlertSettings, AlertSoundMode } from '../types';
import { soundService } from '../utils/soundService';

interface AlertSettingsModalProps {
  isOpen: boolean;
  settings: AlertSettings;
  onClose: () => void;
  onSaveSettings: (newSettings: AlertSettings) => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundEnabled);
  const [soundMode, setSoundMode] = useState<AlertSoundMode>(settings.soundMode);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      soundService.stopLoopAlert();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      soundService.previewChime(settings.volume || 0.8, () => {
        setIsPlayingPreview(false);
      });
    }
  };

  const handleSave = () => {
    soundService.stopLoopAlert();
    setIsPlayingPreview(false);
    onSaveSettings({
      ...settings,
      soundEnabled,
      soundMode,
    });
    onClose();
  };

  const handleModalClose = () => {
    soundService.stopLoopAlert();
    setIsPlayingPreview(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 id="alert-settings-title" className="text-base font-bold text-slate-900 dark:text-white">
                알림 소리 및 경고 설정
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                특정 시간 경과 시 시각 점멸 및 사운드 제어
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. 알림 소리 ON/OFF 토글 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  soundEnabled
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  경고 알림 소리
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {soundEnabled ? '경고 상황 발생 시 디지털 차임벨 재생' : '소리 없이 화면 점멸만 표시'}
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                soundEnabled ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. 알림 재생 방식 선택 (1회성 vs 메인 버튼 누를 때까지 반복) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              알림 소리 울림 방식
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: 1회성 울림 */}
              <button
                type="button"
                onClick={() => setSoundMode('once')}
                className={`p-3.5 rounded-2xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  soundMode === 'once'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-500 dark:border-rose-500 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">1회성 울림</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/70 px-1.5 py-0.5 rounded">
                      기본
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    기준 시간 초과 시 1회 맑은 차임벨이 울리고 종료됩니다.
                  </p>
                </div>
                {soundMode === 'once' && (
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Option 2: 메인 버튼 누를 때까지 계속 울림 */}
              <button
                type="button"
                onClick={() => setSoundMode('repeat')}
                className={`p-3.5 rounded-2xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  soundMode === 'repeat'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-500 dark:border-rose-500 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">메인 버튼 누를 때까지 계속 울림</span>
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/70 px-1.5 py-0.5 rounded">
                      주의 강조
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    원형 메인 버튼을 눌러 행동을 기록할 때까지 주기적으로 알림음이 반복됩니다.
                  </p>
                </div>
                {soundMode === 'repeat' && (
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 3. 알림소리 미리듣기 버튼 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-2xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  디지털 차임벨 사운드
                </div>
                <div className="text-[11px] text-slate-500">부드럽고 명확한 화음 멜로디</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlayingPreview
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPlayingPreview ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>재생 중...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>소리 미리듣기</span>
                </>
              )}
            </button>
          </div>

          {/* 4. 자동 경고 조건 안내 카드 */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>자동 작동 경고 조건</span>
            </div>
            <ul className="text-[11px] text-amber-800/90 dark:text-amber-300/80 space-y-1 list-disc list-inside">
              <li>
                <span className="font-semibold">식사 끝 후 30분</span> 지나도록 양치 안 눌렀을 때: <b>양치 알림</b>
              </li>
              <li>
                <span className="font-semibold">아침/점심 끝 후 3시간 30분</span> 경과 시: <b>다음 식사 준비 알림</b>
              </li>
              <li>
                <span className="font-semibold">저녁 끝 후 3시간 30분</span> 지나도록 잠자리 안 누르면: <b>잘 준비 알림</b>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleModalClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
};
