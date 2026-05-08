import { useState } from 'react';
import { Sparkles, Clock, ChevronDown, ChevronUp, Zap, Sun, Moon, Cloud } from 'lucide-react';
import type { ScheduledTask } from '@/hooks/useLearningSystem';
import { format } from 'date-fns';

interface SmartSchedulerProps {
  date: string;
  onGenerate: (date: string) => ScheduledTask[];
  pendingCount: number;
}

const TIME_ICONS: Record<string, React.ElementType> = {
  '08': Sun, '09': Sun, '10': Sun, '11': Sun,
  '12': Cloud, '13': Cloud, '14': Cloud, '15': Cloud, '16': Cloud, '17': Cloud,
  '18': Moon, '19': Moon, '20': Moon, '21': Moon, '22': Moon,
};

export function SmartScheduler({ date, onGenerate, pendingCount }: SmartSchedulerProps) {
  const [schedule, setSchedule] = useState<ScheduledTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setSchedule(onGenerate(date));
      setLoading(false);
    }, 500);
  };

  const dateLabel = format(new Date(date + 'T12:00:00'), 'M月d日 EEEE');
  const totalMinutes = schedule?.reduce((sum, t) => sum + t.duration, 0) || 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-btn flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl" style={{ color: 'var(--color-text)' }}>智能排程</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>根据优先度和工作习惯自动规划日程</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock size={20} style={{ color: 'var(--color-brand)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{dateLabel}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{pendingCount} 个待办</p>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading || pendingCount === 0} className="btn-primary">
            {loading ? (
              <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中...</>
            ) : (
              <><Sparkles size={14} />生成排程</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {schedule && schedule.length > 0 && (
        <div>
          <div className="relative pl-8">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5" style={{ background: 'var(--color-border)' }} />
            {schedule.map((task, idx) => {
              const hour = task.time.split(':')[0];
              const TimeIcon = TIME_ICONS[hour] || Clock;
              const isExpanded = expanded === idx;
              return (
                <div key={task.id} className="relative pb-4 last:pb-0">
                  <div className="absolute -left-[21px] w-3 h-3 rounded-full border-2 z-10 mt-1.5"
                    style={{ background: 'var(--color-bg-raised)', borderColor: 'var(--color-brand)' }} />
                  <div className="card p-3" style={{ padding: 'var(--space-3)' }}
                    onClick={() => setExpanded(isExpanded ? null : idx)}>
                    <div className="flex items-start gap-3">
                      <TimeIcon size={14} style={{ color: 'var(--color-brand)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{task.title}</span>
                          <span className="badge" style={{ background: 'var(--color-brand-ghost)', color: 'var(--color-brand)' }}>{task.duration}m</span>
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{task.time}</span>
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{task.reason}</p>
                          </div>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="card p-4 mt-4" style={{ padding: 'var(--space-4)' }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>预计总时长</span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {schedule && schedule.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>该日期没有待办任务</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>添加一些任务后再来排程</p>
        </div>
      )}
    </div>
  );
}
