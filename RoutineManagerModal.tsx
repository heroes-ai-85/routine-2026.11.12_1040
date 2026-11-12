import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Edit2, Check, ListOrdered } from 'lucide-react';
import { RoutineItem } from '../types';
import { getDefaultRoutines } from '../utils/storage';

interface RoutineManagerModalProps {
  isOpen: boolean;
  routines: RoutineItem[];
  onClose: () => void;
  onSaveRoutines: (newRoutines: RoutineItem[]) => void;
}

export const RoutineManagerModal: React.FC<RoutineManagerModalProps> = ({
  isOpen,
  routines,
  onClose,
  onSaveRoutines,
}) => {
  const [items, setItems] = useState<RoutineItem[]>(() => [...routines]);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setItems([...routines]);
      setNewRoutineName('');
      setEditingId(null);
      setEditingText('');
    }
  }, [isOpen, routines]);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoutineName.trim();
    if (!trimmed) return;

    const newItem: RoutineItem = {
      id: `custom-routine-${Date.now()}`,
      name: trimmed,
      isDefault: false,
    };

    setItems([...items, newItem]);
    setNewRoutineName('');
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) {
      alert('최소 1개 이상의 루틴 항목이 필요합니다.');
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...items];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setItems(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const copy = [...items];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setItems(copy);
  };

  const startEdit = (item: RoutineItem) => {
    setEditingId(item.id);
    setEditingText(item.name);
  };

  const saveEdit = (id: string) => {
    const trimmed = editingText.trim();
    if (trimmed) {
      setItems(items.map((it) => (it.id === id ? { ...it, name: trimmed } : it)));
    }
    setEditingId(null);
    setEditingText('');
  };

  const handleResetDefaults = () => {
    setItems(getDefaultRoutines());
  };

  const handleSaveAll = () => {
    onSaveRoutines(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-manager-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 id="routine-manager-title" className="text-lg font-bold text-slate-900 dark:text-white">
              루틴 순서 및 항목 관리
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
        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            메인 버튼을 누를 때마다 아래 순서대로 다음 행동이 표시됩니다. 항목을 추가, 수정, 삭제하거나 순서를 변경할 수 있습니다.
          </p>

          {/* Add New Routine Input */}
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              placeholder="새 루틴 입력 (예: 영양제 복용, 운동, 독서)"
              className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!newRoutineName.trim()}
              className="flex items-center gap-1 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>추가</span>
            </button>
          </form>

          {/* Routine List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl gap-2 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                      {idx + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="저장"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                          title="취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700"
                        title="위로 이동"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === items.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-25 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700"
                        title="아래로 이동"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Name */}
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        title="이름 수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값으로 복원</span>
          </button>

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
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              순서 및 항목 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
