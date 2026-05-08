import { useState } from 'react';
import { Calendar, Target, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { WeeklyPlanData } from '@/hooks/useLearningSystem';

interface WeeklyPlanProps {
  onGenerate: (goal: string) => WeeklyPlanData;
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function WeeklyPlan({ onGenerate }: WeeklyPlanProps) {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<WeeklyPlanData | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!goal.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      setPlan(onGenerate(goal.trim()));
      setGenerating(false);
    }, 600);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-btn flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
          <Calendar size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl" style={{ color: 'var(--color-text)' }}>周计划</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>输入目标，AI 拆解到每一天</p>
        </div>
      </div>

      {/* Goal Input */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          placeholder="例如：完成项目文档、学习高级特性"
          className="input flex-1"
        />
        <button onClick={handleGenerate} disabled={generating || !goal.trim()} className="btn-primary">
          {generating ? (
            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中</>
          ) : (
            <>生成计划 <ArrowRight size={14} /></>
          )}
        </button>
      </div>

      {/* Results */}
      {plan && (
        <>
          <div className="card p-4 mb-4" style={{ padding: 'var(--space-4)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} style={{ color: 'var(--color-brand)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{plan.weekLabel}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{plan.summary.advice}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {plan.summary.focusAreas.map((f, i) => (
                <span key={i} className="badge" style={{ background: 'var(--color-brand-ghost)', color: 'var(--color-brand)' }}>{f}</span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {plan.days.map((day, idx) => (
              <div key={idx} className="card" style={{ padding: 0 }}>
                <button
                  onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                  className="flex items-center justify-between w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold min-w-[32px]" style={{ color: 'var(--color-text)' }}>
                      {DAY_LABELS[idx]}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {day.focusArea}
                    </span>
                  </div>
                  {expandedDay === idx
                    ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} />
                    : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
                  }
                </button>
                {expandedDay === idx && (
                  <div className="px-4 pb-3 space-y-1">
                    {day.tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs"
                        style={{ background: 'var(--color-bg)' }}>
                        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--color-brand)' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{t.title}</span>
                        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{t.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!plan && !generating && (
        <div className="card p-8 text-center">
          <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>输入你的周目标开始规划</p>
        </div>
      )}
    </div>
  );
}
