import { useState, useMemo } from 'react';
import { X, CheckCircle2, Clock, Flame, Target, Zap, Star } from 'lucide-react';
import { useAppStore } from '@/store';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pomodoroCompletedToday: number;
  onOpenReview?: () => void;
}

export function DailyReviewModal({
  isOpen, onClose, pomodoroCompletedToday, onOpenReview,
}: DailyReviewModalProps) {
  const tasks = useAppStore(s => s.tasks);
  const date = useAppStore(s => s.selectedDate);
  const [note, setNote] = useState('');

  const stats = useMemo(() => {
    const todayTasks = tasks.filter(t => t.date === date);
    const completed = todayTasks.filter(t => t.completed);
    const pending = todayTasks.filter(t => !t.completed);
    const overdue = todayTasks.filter(t =>
      !t.completed && t.deadline && parseISO(t.deadline) < new Date()
    );
    const pinned = todayTasks.filter(t => t.pinned && !t.completed);

    // Count by tag
    const tagCounts: Record<string, number> = {};
    completed.forEach(t => {
      tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1;
    });

    return { total: todayTasks.length, completed: completed.length, pending: pending.length, overdue: overdue.length, pinned: pinned.length, tagCounts, completedTasks: completed };
  }, [tasks, date]);

  if (!isOpen) return null;

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const isGoodDay = completionRate >= 70;
  const needsAttention = stats.overdue > 0 || stats.pending > 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)]" onClick={onClose}>
      <div
        className="glass-panel bg-[var(--app-surface)] rounded-xl shadow-2xl w-[440px] max-h-[90vh] flex flex-col border border-[var(--app-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <Star size={20} className={cn(
              isGoodDay ? 'text-yellow-500' : 'text-[var(--app-text-muted)]'
            )} />
            <h3 className="text-base font-semibold text-[var(--app-text)]">
              {isToday(parseISO(date)) ? '今日回顾' : `${format(parseISO(date), 'M月d日')} 回顾`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mood summary */}
          <div className={cn(
            'p-3 rounded-xl text-center',
            isGoodDay ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          )}>
            <p className="text-sm font-medium">
              {isGoodDay
                ? '🎉 不错的一天！完成率超过 70%'
                : needsAttention
                  ? '📋 还有些任务待处理，加油！'
                  : '💪 继续努力！'
              }
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon={<CheckCircle2 size={14} />} label="已完成" value={stats.completed} color="text-green-600" />
            <StatCard icon={<Target size={14} />} label="完成率" value={`${completionRate}%`} color={isGoodDay ? 'text-green-600' : 'text-amber-600'} />
            <StatCard icon={<Clock size={14} />} label="待完成" value={stats.pending} color="text-blue-600" />
            <StatCard icon={<Flame size={14} />} label="番茄钟" value={pomodoroCompletedToday} color="text-orange-600" />
          </div>

          {/* Overdue warning */}
          {stats.overdue > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-red-500" />
                <span className="text-xs font-medium text-red-700">
                  {stats.overdue} 个任务已逾期，建议尽快处理
                </span>
              </div>
            </div>
          )}

          {/* Completed tasks list */}
          {stats.completedTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--app-text)] mb-2">今日完成</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {stats.completedTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-50/50">
                    <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                    <span className="text-xs text-green-800 line-through">{t.title}</span>
                    {t.pomodoros > 0 && (
                      <span className="text-[10px] text-green-500 ml-auto">{t.pomodoros}🍅</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick note */}
          <div>
            <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">
              一句话心得
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今天有什么想记录的..."
              className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[var(--app-border)]">
          <button
            onClick={() => { onOpenReview?.(); onClose(); }}
            className="px-3 py-2 rounded-lg text-xs font-medium text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 transition-all"
          >
            查看详细回顾
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-all"
          >
            好的
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center p-2.5 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)]">
      <div className={cn('flex items-center gap-1 mb-1', color)}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-[10px] text-[var(--app-text-muted)]">{label}</span>
    </div>
  );
}
