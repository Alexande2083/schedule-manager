import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Target, Flame, TrendingUp, Clock, Sparkles, Zap,
  CheckCircle2, Calendar, ArrowRight, Brain,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { HeatmapPanel } from './HeatmapPanel';
import type { Task, Context } from '@/types';
import type { ScheduledTask, WeeklyPlanData } from '@/hooks/useLearningSystem';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────

interface WeeklyAnalyticsProps {
  tasks: Task[];
  tags: Record<string, { label: string; color: string }>;
  contexts?: Context[];
  learning: {
    profile: import('@/hooks/useLearningSystem').UserProfile;
    timeSlotStats: import('@/hooks/useLearningSystem').TimeSlotStats;
    tagStats: import('@/hooks/useLearningSystem').TagStats;
    weeklyTrend: number[];
    optimizationTips: string[];
    generateWeeklyPlan: (goal: string) => WeeklyPlanData;
    generateSmartSchedule: (date: string) => ScheduledTask[];
  };
  habits: ReturnType<typeof import('@/hooks/useHabits').useHabits>;
  onSelectDate: (date: string) => void;
}

const DAY_LABELS_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DAY_LABELS_SHORT = ['一', '二', '三', '四', '五', '六', '日'];

// Tag → display label map
const TAG_LABEL_MAP: Record<string, string> = {
  work: '深度工作', meeting: '会议', personal: '个人', important: '重要任务',
  shopping: '购物', study: '学习',
};

const COLOR_PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Helpers ─────────────────────────────────────

function getTagLabel(tag: string): string {
  return TAG_LABEL_MAP[tag] || tag;
}

// ─── Component ────────────────────────────────────

export function WeeklyAnalytics({
  tasks, tags, learning, habits, onSelectDate,
}: WeeklyAnalyticsProps) {
  const [planGoal, setPlanGoal] = useState('');
  const [planResult, setPlanResult] = useState<WeeklyPlanData | null>(null);

  // ─── This week's tasks ───
  const weekTasks = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return tasks.filter(t => isWithinInterval(parseISO(t.date), { start: ws, end: we }));
  }, [tasks]);

  const completed = weekTasks.filter(t => t.completed);
  const pending = weekTasks.filter(t => !t.completed);
  const completionRate = weekTasks.length > 0
    ? Math.round((completed.length / weekTasks.length) * 100) : 0;

  // ─── Module 1: Weekly Goals ───
  const weeklyGoals = useMemo(() => {
    // Top incomplete important tasks this week
    return pending
      .filter(t => t.importance === 'important' || t.pinned)
      .slice(0, 5)
      .map((t, i) => ({
        id: t.id,
        title: t.title,
        tag: t.tag,
        deadline: t.deadline,
        projectId: t.projectId,
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      }));
  }, [pending]);

  const handleAIGoals = () => {
    const goal = planGoal.trim() || '提升本周效率';
    setPlanResult(learning.generateWeeklyPlan(goal));
  };

  // ─── Module 3: Time Allocation ───
  const timeAllocation = useMemo(() => {
    const entries = Object.entries(learning.tagStats);
    if (entries.length === 0) return { pieData: [], total: 0 };
    const total = entries.reduce((s, [, v]) => s + v.total, 0);
    const pieData = entries
      .filter(([, v]) => v.total > 0)
      .map(([tag, v], i) => ({
        name: getTagLabel(tag),
        value: v.total,
        rate: v.rate,
        color: tags[tag]?.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { pieData, total };
  }, [learning.tagStats, tags]);

  // ─── Module 4: Productivity Trends ───
  const trendData = useMemo(() => {
    // Last 8 weeks → labels + data
    return learning.weeklyTrend.map((v, i) => ({
      label: `W${i + 1}`,
      value: v,
    }));
  }, [learning.weeklyTrend]);

  // ─── Module 5: Free Time ───
  const freeTimeSlots = useMemo(() => {
    const slots: { day: string; label: string; suggestion: string }[] = [];
    const today = new Date();
    const ws = startOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(today, { weekStartsOn: 1 }) });

    days.forEach((day, i) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTasks = weekTasks.filter(t => t.date === dateStr && t.time);
      const usedHours = new Set(dayTasks.map(t => parseInt(t.time!.split(':')[0])));

      // Find gaps > 2 hours
      let gapStart = -1;
      for (let h = 8; h <= 20; h++) {
        if (!usedHours.has(h) && !usedHours.has(h + 1)) {
          if (gapStart === -1) gapStart = h;
        } else {
          if (gapStart !== -1 && h - gapStart >= 2) {
            slots.push({
              day: DAY_LABELS_FULL[i],
              label: `${String(gapStart).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:00`,
              suggestion: h <= 12 ? '适合深度工作' : h <= 17 ? '适合学习或会议' : '适合复盘规划',
            });
          }
          gapStart = -1;
        }
      }
    });
    return slots.slice(0, 5);
  }, [weekTasks]);

  // ─── Module 6: Weekly Review ───
  const reviewData = useMemo(() => {
    // Best day
    const dayCounts: Record<number, { completed: number; total: number }> = {};
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(now, { weekStartsOn: 1 }) });

    days.forEach((_, i) => { dayCounts[i] = { completed: 0, total: 0 }; });

    weekTasks.forEach(t => {
      const taskDate = parseISO(t.date);
      const dayIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === format(taskDate, 'yyyy-MM-dd'));
      if (dayIdx >= 0) {
        dayCounts[dayIdx].total++;
        if (t.completed) dayCounts[dayIdx].completed++;
      }
    });

    let bestDayIdx = 0;
    let bestDayRate = 0;
    Object.entries(dayCounts).forEach(([k, v]) => {
      const rate = v.total > 0 ? v.completed / v.total : 0;
      if (rate > bestDayRate) { bestDayRate = rate; bestDayIdx = Number(k); }
    });

    // Average focus time
    const withDuration = completed.filter(t => t.duration && t.duration > 0);
    const avgFocus = withDuration.length > 0
      ? Math.round(withDuration.reduce((s, t) => s + (t.duration || 60), 0) / withDuration.length)
      : 0;

    // Procrastination window (evening tasks completion rate)
    const evening = weekTasks.filter(t => t.time && parseInt(t.time.split(':')[0]) >= 18);
    const eveningCompleted = evening.filter(t => t.completed).length;
    const eveningRate = evening.length > 0 ? Math.round(eveningCompleted / evening.length * 100) : 100;

    return {
      bestDay: DAY_LABELS_FULL[bestDayIdx],
      bestDayRate: Math.round(bestDayRate * 100),
      avgFocus,
      eveningRate,
      totalPomodoros: completed.reduce((s, t) => s + (t.pomodoros || 0), 0),
      streak: habits.logs ? Object.keys(habits.logs).length : 0,
    };
  }, [weekTasks, completed, habits]);

  // ─── Module 7: Week Timeline ───
  const weekTimeline = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(now, { weekStartsOn: 1 }) });

    return days.map((day, i) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTasks = weekTasks.filter(t => t.date === dateStr);
      // Find dominant tag
      const tagCount: Record<string, number> = {};
      dayTasks.forEach(t => { tagCount[t.tag] = (tagCount[t.tag] || 0) + 1; });
      const dominant = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
      return {
        date: dateStr,
        label: DAY_LABELS_SHORT[i],
        dayLabel: DAY_LABELS_FULL[i],
        count: dayTasks.length,
        completed: dayTasks.filter(t => t.completed).length,
        dominantTag: dominant?.[0] || 'work',
        dominantLabel: dominant ? getTagLabel(dominant[0]) : '无任务',
      };
    });
  }, [weekTasks]);

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const textMuted = 'var(--color-text-muted)';
  const textSecondary = 'var(--color-text-secondary)';
  const textColor = 'var(--color-text)';
  const borderColor = 'var(--color-border)';

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl" style={{ color: textColor }}>本周分析</h1>
          <p className="text-xs mt-1" style={{ color: textMuted }}>
            {format(new Date(), 'M月d日')} · {completionRate}% 完成 · {weekTasks.length} 个任务
          </p>
        </div>
      </div>

      {/* ══════ Module 1: Weekly Goals ══════ */}
      <Section title="本周目标" icon={Target}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Goal cards */}
          {weeklyGoals.map((goal, i) => (
            <div
              key={goal.id}
              className="rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-md"
              style={{
                background: 'var(--color-bg-raised)',
                borderColor: goal.color + '30',
                borderLeft: `3px solid ${goal.color}`,
              }}
            >
              <div className="w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center"
                style={{ borderColor: goal.color, background: goal.color + '15' }}>
                <div className="w-2 h-2 rounded-sm" style={{ background: goal.color, opacity: 0.3 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: textColor }}>{goal.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: goal.color + '20', color: goal.color }}>
                    {getTagLabel(goal.tag)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: textMuted }}>
                {i + 1}/{weeklyGoals.length}
              </span>
            </div>
          ))}
          {/* AI goal card */}
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2 min-h-[80px]"
            style={{ background: 'var(--color-bg-raised)', borderColor, borderStyle: 'dashed' }}>
            <div className="flex gap-2 w-full">
              <input
                value={planGoal}
                onChange={e => setPlanGoal(e.target.value)}
                placeholder="输入周目标..."
                className="input text-xs flex-1"
                style={{ height: '30px' }}
                onKeyDown={e => e.key === 'Enter' && handleAIGoals()}
              />
              <button onClick={handleAIGoals}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-white transition-all shrink-0"
                style={{ background: 'var(--color-brand)' }}>
                <Sparkles size={12} className="inline mr-0.5" />生成
              </button>
            </div>
          </div>
        </div>
        {planResult && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {planResult.days.slice(0, 7).map((d, i) => (
              <div key={i} className="rounded-lg border p-2 text-center"
                style={{ background: 'var(--color-bg)', borderColor }}>
                <p className="text-[10px]" style={{ color: 'var(--color-brand)' }}>{DAY_LABELS_SHORT[i]}</p>
                <p className="text-[9px] mt-0.5" style={{ color: textMuted }}>
                  {d.focusArea || d.tasks[0]?.title?.slice(0, 12) || '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ══════ Module 2: Weekly Heatmap ══════ */}
      <Section title="活跃热力图" icon={Flame}>
        <div className="overflow-x-auto -mx-2" style={{ touchAction: 'pan-x' }}>
          <div className="min-w-[600px]">
            <HeatmapPanel tasks={tasks} />
          </div>
        </div>
      </Section>

      {/* ══════ Module 3 + 4: Time Allocation + Trends ─ two column on desktop ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 3: Time Allocation */}
        <Section title="时间分配" icon={Clock} noPad>
          <div className="grid grid-cols-2 gap-2 p-4 pb-0">
            {timeAllocation.pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: 'var(--color-bg)' }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] truncate flex-1" style={{ color: textColor }}>{item.name}</span>
                <span className="text-[11px] font-mono font-medium" style={{ color: textSecondary }}>{item.value}</span>
              </div>
            ))}
          </div>
          {/* Donut chart */}
          <div className="h-[190px]">
            {timeAllocation.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeAllocation.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    strokeWidth={2}
                    stroke={isDark ? '#1a1a2e' : '#fff'}
                  >
                    {timeAllocation.pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-raised)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: textColor,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: textMuted }}>暂无数据</p>
              </div>
            )}
          </div>
        </Section>

        {/* Module 4: Productivity Trends */}
        <Section title="效率趋势" icon={TrendingUp}>
          <div className="h-[190px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: textMuted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-raised)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: textColor,
                    }}
                  />
                  <Bar dataKey="value" fill="var(--color-brand)" radius={[4, 4, 0, 0]} opacity={0.5} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-brand)' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: textMuted }}>完成更多任务后显示趋势</p>
              </div>
            )}
          </div>
          {/* AI tips */}
          <div className="px-4 pb-3 space-y-1">
            {learning.optimizationTips.slice(0, 2).map((tip, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: textSecondary }}>
                <Brain size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ══════ Module 5: Free Time Suggestions ══════ */}
      <Section title="空闲时间建议" icon={Zap} accent>
        {freeTimeSlots.length === 0 ? (
          <p className="text-xs" style={{ color: textMuted }}>暂无长空闲时段 — 日程安排很充实！</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {freeTimeSlots.map((slot, i) => (
              <div key={i}
                className="rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)',
                  borderColor: 'rgba(139,92,246,0.2)',
                }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <Zap size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: textColor }}>{slot.day} · {slot.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-accent-purple)' }}>{slot.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ══════ Module 6 + 7: Review + Timeline ─ two column ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 6: Weekly Review */}
        <Section title="周报总结" icon={CheckCircle2}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <ReviewCard icon={CheckCircle2} label="完成率" value={`${completionRate}%`} color={completionRate >= 70 ? '#22c55e' : '#f59e0b'} />
              <ReviewCard icon={Target} label="最有效日" value={reviewData.bestDay} color="#6366f1" />
              <ReviewCard icon={Clock} label="平均专注" value={`${reviewData.avgFocus}min`} color="#06b6d4" />
              <ReviewCard icon={Flame} label="番茄钟" value={`${reviewData.totalPomodoros}个`} color={reviewData.totalPomodoros > 0 ? '#f59e0b' : textMuted} />
            </div>
            {/* Behavioral insight */}
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), transparent)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <Brain size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: textColor }}>AI 行为洞察</p>
                <p className="text-[11px] leading-relaxed" style={{ color: textSecondary }}>
                  {reviewData.eveningRate < 50
                    ? `晚上完成率仅 ${reviewData.eveningRate}%，建议把重要任务往前挪。`
                    : `晚上也能高效完成任务（${reviewData.eveningRate}% 完成率），节奏不错。`}
                  {learning.profile.preferredTime === 'morning' ? ' 你是晨型人，上午是你的黄金时段。' :
                    learning.profile.preferredTime === 'afternoon' ? ' 你是下午型选手，下午产出最高。' :
                    ' 你习惯在晚上工作，注意别熬夜。'}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Module 7: Week Timeline */}
        <Section title="本周节奏" icon={Calendar}>
          <div className="space-y-2">
            {weekTimeline.map((day, i) => {
              const tagColor = tags[day.dominantTag]?.color || COLOR_PALETTE[i % COLOR_PALETTE.length];
              return (
                <button
                  key={i}
                  onClick={() => onSelectDate(day.date)}
                  className="flex items-center gap-3 w-full py-2 px-3 rounded-lg transition-all hover:shadow-sm text-left"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <div className="w-10 text-center shrink-0">
                    <p className="text-[10px]" style={{ color: textMuted }}>{day.label}</p>
                    <p className="text-sm font-semibold" style={{ color: textColor }}>{format(parseISO(day.date), 'd')}</p>
                  </div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
                    {day.count > 0 && (
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (day.completed / Math.max(day.count, 1)) * 100)}%`,
                          background: tagColor,
                          opacity: 0.7,
                        }} />
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: tagColor + '20', color: tagColor }}>
                    {day.dominantLabel}
                  </span>
                  <span className="text-[10px] shrink-0 w-7 text-right" style={{ color: textMuted }}>
                    {day.completed}/{day.count}
                  </span>
                  <ArrowRight size={12} style={{ color: textMuted }} />
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────

/** Section wrapper */
function Section({
  title, icon: Icon, children, noPad, accent,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  noPad?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn('rounded-2xl border overflow-hidden', noPad ? 'p-0' : 'p-4 md:p-5')}
      style={{
        background: 'var(--color-bg-raised)',
        borderColor: accent ? 'rgba(139,92,246,0.25)' : 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} style={{ color: accent ? '#8b5cf6' : 'var(--color-brand)' }} />
        <h2 className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

/** Small review stat card */
function ReviewCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-3 flex items-center gap-2.5"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: color + '15' }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{value}</p>
      </div>
    </div>
  );
}
