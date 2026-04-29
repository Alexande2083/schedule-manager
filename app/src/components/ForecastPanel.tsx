import { useMemo } from 'react';
import { format, parseISO, addDays, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle2, Flag } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface ForecastPanelProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onSelectDate: (date: string) => void;
}

export function ForecastPanel({ tasks, onToggleTask, onSelectDate }: ForecastPanelProps) {
  // Generate next 7 days
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  // Get tasks for each day
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTasks = tasks
        .filter(t => {
          // Include tasks that are on this date OR have deadline on this date
          if (t.date === dateStr && !t.completed) return true;
          if (t.deadline === dateStr && !t.completed) return true;
          return false;
        })
        .sort((a, b) => {
          // Sort: pinned first, then by time, then by order
          if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
          if (a.time && b.time) return a.time.localeCompare(b.time);
          if (a.time) return -1;
          if (b.time) return 1;
          return a.order - b.order;
        });
      map[dateStr] = dayTasks;
    });
    return map;
  }, [tasks, days]);

  const getDayLabel = (day: Date) => {
    if (isToday(day)) return '今天';
    if (isTomorrow(day)) return '明天';
    return format(day, 'EEE', { locale: zhCN });
  };

  const getDeadlineStatus = (task: Task) => {
    if (!task.deadline) return null;
    const d = parseISO(task.deadline);
    const diff = differenceInDays(d, new Date());
    if (diff < 0) return { text: `逾期 ${Math.abs(diff)} 天`, color: 'text-red-500', bg: 'bg-red-50' };
    if (diff === 0) return { text: '今天截止', color: 'text-red-500', bg: 'bg-red-50' };
    if (diff === 1) return { text: '明天截止', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { text: `${diff}天后截止`, color: 'text-[var(--app-text-muted)]', bg: 'bg-[var(--app-surface-hover)]' };
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="mb-3">
        <h2 className="text-xl font-bold text-[var(--app-text)]">预测</h2>
        <p className="text-sm text-[var(--app-text-muted)] mt-0.5">未来 7 天任务概览</p>
      </div>

      <div className="space-y-3">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[dateStr] || [];
          const isToday_ = isToday(day);
          const total = dayTasks.length;
          const urgent = dayTasks.filter(t => t.urgency === 'urgent').length;
          const important = dayTasks.filter(t => t.importance === 'important').length;

          return (
            <div
              key={dateStr}
              className={cn(
                'rounded-xl border overflow-hidden transition-all',
                isToday_
                  ? 'border-[var(--app-accent)]/30 bg-[var(--app-surface)] shadow-sm'
                  : 'border-[var(--app-border)] bg-[var(--app-surface)]'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[var(--app-surface-hover)] transition-colors',
                  isToday_ && 'bg-[var(--app-accent)]/5'
                )}
                onClick={() => onSelectDate(dateStr)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex flex-col items-center justify-center text-xs font-bold',
                    isToday_
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'bg-[var(--app-surface-hover)] text-[var(--app-text)]'
                  )}>
                    <span>{format(day, 'd')}</span>
                    <span className="text-[8px] font-normal opacity-80">{format(day, 'M月')}</span>
                  </div>
                  <div>
                    <span className={cn(
                      'text-sm font-semibold',
                      isToday_ ? 'text-[var(--app-accent)]' : 'text-[var(--app-text)]'
                    )}>
                      {getDayLabel(day)}
                    </span>
                    {total > 0 && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[var(--app-text-muted)]">{total} 个任务</span>
                        {urgent > 0 && <span className="text-[10px] text-orange-500 font-medium">{urgent} 紧急</span>}
                        {important > 0 && <span className="text-[10px] text-red-500 font-medium">{important} 重要</span>}
                      </div>
                    )}
                  </div>
                </div>
                <Calendar size={14} className="text-[var(--app-text-muted)]" />
              </div>

              {/* Tasks list */}
              {total > 0 ? (
                <div className="px-3 pb-2 space-y-1">
                  {dayTasks.map(task => {
                    const deadlineStatus = getDeadlineStatus(task);
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-[var(--app-surface-hover)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/20 transition-all group"
                      >
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className={cn(
                            'mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                            task.completed
                              ? 'bg-[var(--app-success)] border-[var(--app-success)]'
                              : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
                          )}
                        >
                          {task.completed && <CheckCircle2 size={10} className="text-white" />}
                        </button>

                        <div className="flex-1 min-w-0" onClick={() => onSelectDate(task.date)}>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'text-xs font-medium truncate',
                              task.completed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
                            )}>
                              {task.title}
                            </span>
                            {task.pinned && <Flag size={10} className="text-[var(--app-accent)] shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {task.time && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[var(--app-text-muted)]">
                                <Clock size={8} />
                                {task.time}
                              </span>
                            )}
                            {deadlineStatus && (
                              <span className={cn('text-[9px] font-medium px-1 py-0.5 rounded', deadlineStatus.bg, deadlineStatus.color)}>
                                {deadlineStatus.text}
                              </span>
                            )}
                            {task.importance === 'important' && (
                              <span className="text-[9px] text-red-600 font-medium">重要</span>
                            )}
                            {task.urgency === 'urgent' && (
                              <span className="text-[9px] text-orange-600 font-medium">紧急</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 pb-3 text-[11px] text-[var(--app-text-muted)]">
                  没有安排的任务
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
