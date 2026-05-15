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
    weeklyTrend: { day: string; value: number }[];
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

function getTagLabel(tag: string, tags?: Record<string, { label: string; color: string }>): string {
  return tags?.[tag]?.label || TAG_LABEL_MAP[tag] || tag;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function roundUpToStep(minutes: number, step = 15): number {
  return Math.ceil(minutes / step) * step;
}

function getFreeTimeSuggestion(start: number, end: number): string {
  const duration = end - start;
  if (duration >= 180 && start < 12 * 60) return '适合安排深度工作';
  if (duration >= 150 && start >= 14 * 60 && start < 18 * 60) return '适合处理学习或项目推进';
  if (duration >= 120 && end <= 12 * 60) return '适合专注处理重要任务';
  if (start >= 18 * 60) return '适合复盘、整理和明日规划';
  if (duration < 120) return '适合处理零散待办';
  return '适合安排一段完整任务';
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
        name: getTagLabel(tag, tags),
        value: v.total,
        rate: v.rate,
        color: tags[tag]?.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { pieData, total };
  }, [learning.tagStats, tags]);

  const timeAllocationSummary = useMemo(() => {
    if (timeAllocation.pieData.length === 0 || timeAllocation.total === 0) {
      return {
        title: 'AI 时间观察',
        points: ['本周还没有形成明显分配，完成一些任务后会自动总结投入方向。'],
      };
    }

    const top = timeAllocation.pieData[0];
    const second = timeAllocation.pieData[1];
    const topShare = Math.round((top.value / timeAllocation.total) * 100);
    const balanceText = topShare >= 70
      ? `${top.name} 占比 ${topShare}%，本周精力非常集中。`
      : topShare >= 45
        ? `${top.name} 是主线，占比 ${topShare}%，节奏比较清晰。`
        : `时间分布较均衡，${top.name} 占比 ${topShare}%。`;
    const suggestion = second
      ? `可以给 ${second.name} 预留一个固定时段，避免被主线任务挤掉。`
      : topShare >= 70
        ? '建议保留一段恢复时间，避免连续消耗。'
        : '继续保持当前节奏，周末做一次轻复盘就够。';

    return {
      title: 'AI 时间观察',
      points: [balanceText, suggestion],
    };
  }, [timeAllocation]);

  // ─── Module 4: Productivity Trends ───
  const trendData = useMemo(() => {
    return learning.weeklyTrend.map(d => ({
      label: d.day,
      value: d.value,
    }));
  }, [learning.weeklyTrend]);

  // ─── Module 5: Free Time ───
  const freeTimeSlots = useMemo(() => {
    const slots: { day: string; label: string; suggestion: string }[] = [];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const ws = startOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(today, { weekStartsOn: 1 }) });
    const WORK_START = 8 * 60;
    const WORK_END = 20 * 60;
    const TASK_BUFFER = 10;
    const MIN_GAP = 90;

    days.forEach((day, i) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (dateStr < todayStr) return;

      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      const windowStart = dateStr === todayStr
        ? Math.max(WORK_START, roundUpToStep(currentMinutes))
        : WORK_START;
      if (windowStart >= WORK_END) return;

      const busyRanges = weekTasks
        .filter(t => t.date === dateStr && t.time)
        .map(t => {
          const start = timeToMinutes(t.time!);
          const end = start + (t.duration || 60);
          return {
            start: Math.max(WORK_START, start - TASK_BUFFER),
            end: Math.min(WORK_END, end + TASK_BUFFER),
          };
        })
        .filter(range => range.end > windowStart && range.start < WORK_END)
        .sort((a, b) => a.start - b.start);

      const mergedRanges: { start: number; end: number }[] = [];
      busyRanges.forEach(range => {
        const last = mergedRanges[mergedRanges.length - 1];
        if (!last || range.start > last.end) {
          mergedRanges.push({ ...range });
        } else {
          last.end = Math.max(last.end, range.end);
        }
      });

      let cursor = windowStart;
      [...mergedRanges, { start: WORK_END, end: WORK_END }].forEach(range => {
        const gapStart = Math.max(cursor, windowStart);
        const gapEnd = Math.min(range.start, WORK_END);
        if (gapEnd - gapStart >= MIN_GAP) {
          slots.push({
            day: DAY_LABELS_FULL[i],
            label: `${minutesToTime(gapStart)} - ${minutesToTime(gapEnd)}`,
            suggestion: getFreeTimeSuggestion(gapStart, gapEnd),
          });
        }
        cursor = Math.max(cursor, range.end);
      });

      if (slots.length >= 5) {
        return;
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
        dominantLabel: dominant ? getTagLabel(dominant[0], tags) : '无任务',
      };
    });
  }, [weekTasks, tags]);

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
                    {getTagLabel(goal.tag, tags)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: textMuted }}>
                {i + 1}/{weeklyGoals.length}
              </span>
            </div>
          ))}
          {/* AI goal card */}
          <div className="rounded-xl border p-4 flex flex-col items-center justify-center gap-2 min-h-[80px] lg:col-start-3"
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
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.85fr)] gap-4">
          <div className="space-y-4 min-w-0">
            <div className="overflow-x-auto" style={{ touchAction: 'pan-x' }}>
              <HeatmapPanel tasks={tasks} />
            </div>
            <div
              className="rounded-xl border p-3 md:p-4"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-brand-ghost)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} style={{ color: 'var(--color-brand)' }} />
                <h3 className="text-xs font-medium" style={{ color: textMuted }}>空闲时间建议</h3>
              </div>
              {freeTimeSlots.length === 0 ? (
                <p className="text-xs" style={{ color: textMuted }}>暂无长空闲时段，日程安排很充实！</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {freeTimeSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-brand-ghost), transparent)',
                        borderColor: 'var(--color-brand-ghost)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--color-brand-ghost)', color: 'var(--color-brand)' }}
                      >
                        <Zap size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: textColor }}>{slot.day} · {slot.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-brand)' }}>{slot.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <WeeklyReviewContent
            completionRate={completionRate}
            reviewData={reviewData}
            learning={learning}
            tagStats={learning.tagStats}
            timeSlotStats={learning.timeSlotStats}
            textColor={textColor}
            textSecondary={textSecondary}
            textMuted={textMuted}
          />
        </div>
      </Section>

      {/* ══════ Module 3 + 7: Time Allocation + Week Timeline ─ two column on desktop ══════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Module 3: Time Allocation */}
        <Section title="时间分配" icon={Clock} noPad>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3 p-4 md:p-5 pt-0 md:pt-0">
            <div className="space-y-2 self-center">
              {timeAllocation.pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--color-bg)' }}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-[11px] truncate flex-1" style={{ color: textColor }}>{item.name}</span>
                  <span className="text-[11px] font-mono font-medium" style={{ color: textSecondary }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="h-[240px]">
              {timeAllocation.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={timeAllocation.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
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
            <div
              className="md:col-span-2 rounded-xl border p-4 flex gap-3 items-start animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-ghost), transparent)',
                borderColor: 'var(--color-brand-ghost)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-brand-ghost)', color: 'var(--color-brand)' }}
              >
                <Brain size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold mb-1" style={{ color: textColor }}>{timeAllocationSummary.title}</p>
                <div className="space-y-1">
                  {timeAllocationSummary.points.map((point, i) => (
                    <p key={i} className="text-[11px] leading-relaxed" style={{ color: textSecondary }}>
                      {point}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Module 7: Week Timeline */}
        <Section title="本周节奏" icon={Calendar} noPad>
          <div className="space-y-1.5 p-4 md:p-5 pt-0 md:pt-0">
            {weekTimeline.map((day, i) => {
              const progress = Math.min(100, (day.completed / Math.max(day.count, 1)) * 100);
              return (
                <button
                  key={i}
                  onClick={() => onSelectDate(day.date)}
                  className="flex items-center gap-3 w-full py-1.5 px-3 rounded-lg transition-all hover:shadow-sm text-left"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <div className="w-9 text-center shrink-0">
                    <p className="text-[10px]" style={{ color: textMuted }}>{day.label}</p>
                    <p className="text-sm font-semibold" style={{ color: textColor }}>{format(parseISO(day.date), 'd')}</p>
                  </div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
                    {day.count > 0 && (
                      <div
                        className="h-full rounded-full weekly-rhythm-fill"
                        style={{
                          width: `${progress}%`,
                          background: 'var(--color-brand)',
                          opacity: 0.75,
                          animationDelay: `${i * 55}ms`,
                        }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'var(--color-brand-ghost)', color: 'var(--color-brand)' }}
                  >
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

      {/* ══════ Module 4: Productivity Trends ══════ */}
      <div>
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
    </div>
  );
}

// ─── Sub-components ──────────────────────────────

function WeeklyReviewContent({
  completionRate, reviewData, learning, tagStats, timeSlotStats, textColor, textSecondary, textMuted,
}: {
  completionRate: number;
  reviewData: { bestDay: string; avgFocus: number; eveningRate: number; totalPomodoros: number };
  learning: WeeklyAnalyticsProps['learning'];
  tagStats: WeeklyAnalyticsProps['learning']['tagStats'];
  timeSlotStats: WeeklyAnalyticsProps['learning']['timeSlotStats'];
  textColor: string;
  textSecondary: string;
  textMuted: string;
}) {
  const slotLabels: Record<string, string> = { morning: '上午', afternoon: '下午', evening: '晚上' };

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <CheckCircle2 size={13} style={{ color: 'var(--color-brand)' }} />
        <h3 className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: textMuted }}>周报总结</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ReviewCard icon={CheckCircle2} label="完成率" value={`${completionRate}%`} color={completionRate >= 70 ? '#22c55e' : '#f59e0b'} />
        <ReviewCard icon={Target} label="最有效日" value={reviewData.bestDay} color="#6366f1" />
        <ReviewCard icon={Clock} label="平均专注" value={`${reviewData.avgFocus}min`} color="#06b6d4" />
        <ReviewCard icon={Flame} label="番茄钟" value={`${reviewData.totalPomodoros}个`} color={reviewData.totalPomodoros > 0 ? '#f59e0b' : textMuted} />
      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MiniAnalysis title="时段效率分析">
          {(Object.entries(timeSlotStats) as [keyof typeof timeSlotStats, { total: number; completed: number; rate: number }][]).map(([slot, data], i) => (
            <MiniRate key={slot} label={slotLabels[slot]} value={`${data.rate}%`} sub={`${data.completed}/${data.total}`} rate={data.rate} delay={i * 70} />
          ))}
        </MiniAnalysis>
        <MiniAnalysis title="标签完成率">
          {Object.entries(tagStats).sort(([, a], [, b]) => b.rate - a.rate).slice(0, 4).map(([tag, data], i) => (
            <MiniRate key={tag} label={data.label || tag} value={`${data.rate}%`} sub={`${data.completed}/${data.total}`} rate={data.rate} delay={i * 70} />
          ))}
        </MiniAnalysis>
      </div>
    </div>
  );
}

function MiniAnalysis({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: 'var(--color-bg-raised)', borderColor: 'var(--color-border)' }}>
      <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MiniRate({ label, value, sub, rate, delay = 0 }: { label: string; value: string; sub: string; rate: number; delay?: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
        <div
          className="h-full rounded-full bg-[var(--color-brand)] weekly-analysis-fill"
          style={{ width: `${rate}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <p className="mt-0.5 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
    </div>
  );
}

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
      className={cn('rounded-xl border overflow-hidden', noPad ? 'p-0' : 'p-4 md:p-5')}
      style={{
        background: 'var(--color-bg-raised)',
        borderColor: accent ? 'rgba(139,92,246,0.25)' : 'var(--color-border)',
      }}
    >
      <div className={cn('flex items-center gap-2 mb-3', noPad && 'px-4 pt-4 md:px-5 md:pt-5')}>
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
