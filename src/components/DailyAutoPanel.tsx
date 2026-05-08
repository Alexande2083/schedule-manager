import { useState, memo } from 'react';
import {
  Sparkles, Clock, AlertTriangle, ChevronDown, ChevronUp,
  ListChecks, Zap, ArrowRight, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutoPlan } from '@/hooks/useAutoPlanner';

interface DailyAutoPanelProps {
  plan: AutoPlan;
  onApplySchedule: (schedule: { id: string; time: string }[]) => void;
  onAddSubTasks: (parentId: string, steps: string[]) => void;
  onUpdatePriority: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;
  onReschedule: (id: string, date: string) => void;
}

export const DailyAutoPanel = memo(function DailyAutoPanel({
  plan, onApplySchedule, onAddSubTasks, onUpdatePriority, onReschedule,
}: DailyAutoPanelProps) {
  const [expanded, setExpanded] = useState<string | null>('brief');

  const sections = [
    { id: 'brief',    icon: Sparkles,  label: '今日简报',  color: '#6366f1', count: null },
    { id: 'schedule', icon: Clock,      label: '智能排程',  color: '#22c55e', count: plan.schedule.length },
    { id: 'gaps',     icon: TrendingUp, label: '空闲时间',  color: '#f59e0b', count: plan.gaps.length },
    { id: 'overdue',  icon: AlertTriangle, label: '过期任务', color: '#ef4444', count: plan.overdueTasks.length },
    { id: 'priority', icon: Zap,        label: '优先级建议',color: '#8b5cf6', count: plan.priorityUpdates.length },
    { id: 'breakdown',icon: ListChecks,  label: '任务拆解',  color: '#06b6d4', count: plan.breakdownSuggestions.length },
  ];

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);
  const handleApplySchedule = () => onApplySchedule(plan.schedule.map(s => ({ id: s.id, time: s.time })));
  const handleApplyAllPriorities = () => plan.priorityUpdates.forEach(p => {
    const parts = p.to.split('/');
    onUpdatePriority(p.taskId, parts[0] === '高' ? 'important' : 'normal', parts[1] === '紧急' ? 'urgent' : 'normal');
  });
  const handleRescheduleAllOverdue = () => plan.overdueTasks.forEach(o => onReschedule(o.taskId, o.suggestion));

  return (
    <div className="space-y-2">
      {/* Briefing card */}
      <div className={cn('rounded-card border p-4 transition-colors duration-fast',
        expanded === 'brief' ? 'border-[var(--color-brand)]/30' : 'border-[var(--color-border)]')}
        style={{ background: expanded === 'brief' ? 'rgba(99,102,241,0.04)' : 'var(--color-bg-raised)' }}>
        <button onClick={() => toggle('brief')} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-btn flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[var(--color-text)]">AI 今日简报</span>
          </div>
          {expanded === 'brief' ? <ChevronUp size={14} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)]" />}
        </button>
        {expanded === 'brief' && (
          <div className="pt-3 space-y-2 animate-fade-in">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{plan.morningBrief.greeting}</p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{plan.morningBrief.suggestion}</p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <Stat label="待办" value={plan.morningBrief.totalPending} color="#6366f1" />
              <Stat label="高优" value={plan.morningBrief.highPriority} color="#ef4444" />
              <Stat label="过期" value={plan.morningBrief.overdue} color="#f59e0b" />
              <Stat label="预计" value={plan.morningBrief.estimatedMinutes + 'm'} color="#22c55e" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {plan.schedule.length > 0 && (
                <button onClick={handleApplySchedule} className="btn-primary text-xs"><Zap size={10} />应用排程</button>
              )}
              {plan.overdueTasks.length > 0 && (
                <button onClick={handleRescheduleAllOverdue} className="btn-danger text-xs"><ArrowRight size={10} />全部延期</button>
              )}
              {plan.priorityUpdates.length > 0 && (
                <button onClick={handleApplyAllPriorities} className="btn-ghost text-xs"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <ArrowRight size={10} />应用优先级
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Other sections */}
      {sections.filter(s => s.id !== 'brief').map(({ id, icon: Icon, label, color, count }) => {
        if ((count ?? 0) === 0) return null;
        const isOpen = expanded === id;
        return (
          <div key={id} className={cn('rounded-card border transition-colors duration-fast',
            isOpen ? '' : 'border-[var(--color-border)]')}
            style={{
              background: 'var(--color-bg-raised)',
              borderColor: isOpen ? color + '30' : undefined,
            }}>
            <button onClick={() => toggle(id)} className="flex items-center justify-between w-full px-4 py-3 text-left">
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color }} />
                <span className="text-xs font-medium text-[var(--color-text)]">{label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[var(--color-text-muted)]"
                  style={{ background: 'var(--color-bg-hover)' }}>{count}</span>
              </div>
              {isOpen ? <ChevronUp size={13} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={13} className="text-[var(--color-text-muted)]" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-3 animate-fade-in">
                {id === 'schedule' && (
                  <div className="space-y-1">
                    {plan.schedule.slice(0, 6).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-btn text-xs"
                        style={{ background: 'var(--color-bg)' }}>
                        <span className="font-mono text-[var(--color-brand)] w-10">{item.time}</span>
                        <span className="text-[var(--color-text)] truncate flex-1">{item.title}</span>
                        <span className="text-[var(--color-text-muted)]">{item.duration}m</span>
                      </div>
                    ))}
                    <button onClick={handleApplySchedule} className="btn-primary w-full justify-center mt-2 text-xs"><Zap size={10} />一键应用排程</button>
                  </div>
                )}
                {id === 'gaps' && (
                  <div className="space-y-1">
                    {plan.gaps.map((gap, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-btn text-xs"
                        style={{ background: 'var(--color-bg)' }}>
                        <Clock size={12} className="text-[var(--color-warning)]" />
                        <span className="font-mono text-[var(--color-text)]">{gap.start}–{gap.end}</span>
                        <span className="text-[var(--color-text-muted)] truncate">{gap.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
                {id === 'overdue' && (
                  <div className="space-y-1">
                    {plan.overdueTasks.map(o => (
                      <div key={o.taskId} className="flex items-center gap-2 px-2 py-1.5 rounded-btn text-xs"
                        style={{ background: 'rgba(239,68,68,0.08)' }}>
                        <AlertTriangle size={12} className="text-[var(--color-danger)]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--color-text)] truncate">{o.title}</p>
                          <p className="text-[var(--color-text-muted)]">{o.date} → {o.suggestion}</p>
                        </div>
                        <button onClick={() => onReschedule(o.taskId, o.suggestion)}
                          className="px-2 py-1 rounded text-[10px] font-medium text-white transition-colors duration-fast shrink-0"
                          style={{ background: 'var(--color-danger)' }}>
                          延期
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {id === 'priority' && (
                  <div className="space-y-1">
                    {plan.priorityUpdates.map(p => {
                      const parts = p.to.split('/');
                      return (
                        <div key={p.taskId} className="flex items-center gap-2 px-2 py-1.5 rounded-btn text-xs"
                          style={{ background: 'rgba(139,92,246,0.08)' }}>
                          <Zap size={12} style={{ color: '#8b5cf6' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--color-text)] truncate">{p.title}</p>
                            <p className="text-[var(--color-text-muted)]">{p.from} → {p.to} · {p.reason}</p>
                          </div>
                          <button onClick={() => onUpdatePriority(p.taskId, parts[0] === '高' ? 'important' : 'normal', parts[1] === '紧急' ? 'urgent' : 'normal')}
                            className="px-2 py-1 rounded text-[10px] font-medium text-white transition-colors duration-fast shrink-0"
                            style={{ background: '#8b5cf6' }}>
                            调整
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {id === 'breakdown' && (
                  <div className="space-y-2">
                    {plan.breakdownSuggestions.map(s => (
                      <div key={s.taskId} className="p-2 rounded-btn" style={{ background: 'var(--color-bg)' }}>
                        <p className="text-xs font-medium text-[var(--color-text)] mb-2">{s.title}</p>
                        <div className="space-y-0.5 mb-2">
                          {s.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0"
                                style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>{i + 1}</span>
                              {step}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => onAddSubTasks(s.taskId, s.steps)}
                          className="btn-ghost w-full justify-center text-xs"
                          style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                          <ListChecks size={10} />拆解为子任务
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-btn py-2 px-2 text-center" style={{ background: color + '15' }}>
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] opacity-60" style={{ color }}>{label}</div>
    </div>
  );
}
