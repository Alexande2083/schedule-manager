import { useMemo } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInDays, isToday, isPast, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface CountdownPanelProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onOpenEdit: (task: Task) => void;
}

export function CountdownPanel({ tasks, onOpenEdit }: CountdownPanelProps) {
  const countdownTasks = useMemo(() => {
    return tasks
      .filter(t => !t.completed && t.deadline)
      .sort((a, b) => {
        const da = parseISO(a.deadline!);
        const db = parseISO(b.deadline!);
        return da.getTime() - db.getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  const getDeadlineLabel = (deadline: string) => {
    const d = parseISO(deadline);
    if (isToday(d)) return { text: '今天', color: 'text-red-500', bg: 'bg-red-50' };
    if (isTomorrow(d)) return { text: '明天', color: 'text-orange-500', bg: 'bg-orange-50' };
    if (isPast(d)) return { text: `逾期 ${Math.abs(differenceInDays(d, new Date()))} 天`, color: 'text-red-600', bg: 'bg-red-50' };
    const days = differenceInDays(d, new Date());
    if (days <= 3) return { text: `${days} 天后`, color: 'text-orange-500', bg: 'bg-orange-50' };
    if (days <= 7) return { text: `${days} 天后`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: `${days} 天后`, color: 'text-[var(--app-text-muted)]', bg: 'bg-[var(--app-surface-hover)]' };
  };

  if (countdownTasks.length === 0) {
    return (
      <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-3 shadow-sm">
        <div className="flex items-center gap-1.5 mb-2">
          <Timer size={12} className="text-[var(--app-text-muted)]" />
          <h3 className="text-xs font-semibold text-[var(--app-text-secondary)]">倒计时</h3>
        </div>
        <p className="text-[11px] text-[var(--app-text-muted)]">没有设置截止日期的任务</p>
      </div>
    );
  }

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Timer size={12} className="text-[var(--app-accent)]" />
        <h3 className="text-xs font-semibold text-[var(--app-text-secondary)]">倒计时</h3>
        <span className="text-[10px] text-[var(--app-text-muted)] ml-auto">
          {countdownTasks.length} 个任务
        </span>
      </div>

      <div className="space-y-1.5">
        {countdownTasks.map((task) => {
          const label = getDeadlineLabel(task.deadline!);
          return (
            <div
              key={task.id}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className={cn('w-0.5 h-7 rounded-full shrink-0', label.bg.replace('bg-', 'bg-').replace('-50', '-200').replace('/20', '/30'))} />
              <div className="flex-1 min-w-0" onClick={() => onOpenEdit(task)}>
                <p className="text-[11px] font-medium text-[var(--app-text)] truncate group-hover:text-[var(--app-accent)] transition-colors">
                  {task.title}
                </p>
                <p className="text-[9px] text-[var(--app-text-muted)]">
                  截止: {format(parseISO(task.deadline!), 'M月d日', { locale: zhCN })}
                </p>
              </div>
              <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', label.bg, label.color)}>
                {isToday(parseISO(task.deadline!)) && <AlertTriangle size={9} className="inline mr-0.5" />}
                {label.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
