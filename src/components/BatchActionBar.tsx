import { Check, Trash2, CalendarDays, X } from 'lucide-react';
import type { Task } from '@/types';

interface BatchActionBarProps {
  selectedIds: string[];
  allTasks: Task[];
  onBatchComplete: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchChangeDate: (ids: string[], date: string) => void;
  onClearSelection: () => void;
}

export function BatchActionBar({
  selectedIds, allTasks, onBatchComplete, onBatchDelete, onBatchChangeDate, onClearSelection,
}: BatchActionBarProps) {
  if (selectedIds.length === 0) return null;

  const selectedTasks = allTasks.filter(t => selectedIds.includes(t.id));
  const allCompleted = selectedTasks.every(t => t.completed);

  return (
    <div className="glass-panel fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg">
      <span className="text-xs text-[var(--app-text-muted)] px-2 shrink-0">
        已选 {selectedIds.length}
      </span>
      <div className="w-px h-4 bg-[var(--app-border)] mx-1" />
      <button
        onClick={() => onBatchComplete(selectedIds)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all shrink-0"
      >
        <Check size={14} />
        {allCompleted ? '标记未完成' : '完成'}
      </button>
      <button
        onClick={() => {
          const today = new Date().toISOString().split('T')[0];
          onBatchChangeDate(selectedIds, today);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--app-text)] bg-[var(--app-surface-hover)] hover:bg-[var(--app-border)] transition-all shrink-0"
      >
        <CalendarDays size={14} />
        移到今天
      </button>
      <button
        onClick={() => { if (confirm(`确定删除选中的 ${selectedIds.length} 个任务吗？`)) onBatchDelete(selectedIds); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all shrink-0"
      >
        <Trash2 size={14} />
        删除
      </button>
      <div className="w-px h-4 bg-[var(--app-border)] mx-1" />
      <button
        onClick={onClearSelection}
        className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
