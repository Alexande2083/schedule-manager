import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend,
} from 'recharts';
import { format, parseISO, isToday, isThisWeek, isThisMonth, isThisYear, getDay, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart3, Clock, Flame, TrendingUp, Calendar, CheckCircle2, Target, Zap, Sparkles, Tag, BrainCircuit, Gauge } from 'lucide-react';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';

interface StatisticsPanelProps {
  tasks: Task[];
  projects: Project[];
  onOpenAISummary?: () => void;
}

type Period = 'day' | 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  day: '当天',
  week: '本周',
  month: '本月',
  year: '本年',
};

export function StatisticsPanel({ tasks, projects, onOpenAISummary }: StatisticsPanelProps) {
  const [period, setPeriod] = useState<Period>('week');

  // Filter completed tasks by period
  const completedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.completed) return false;
      const completedDate = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
      switch (period) {
        case 'day': return isToday(completedDate);
        case 'week': return isThisWeek(completedDate, { weekStartsOn: 1 });
        case 'month': return isThisMonth(completedDate);
        case 'year': return isThisYear(completedDate);
        default: return false;
      }
    });
  }, [tasks, period]);

  // === Project Pie Chart Data ===
  const projectStats = useMemo(() => {
    const stats: Record<string, { name: string; value: number; color: string }> = {};
    completedTasks.forEach(t => {
      const pid = t.projectId || 'none';
      const p = projects.find(p => p.id === pid);
      const key = pid;
      if (!stats[key]) {
        stats[key] = { name: p?.name || '未分类', value: 0, color: p?.color || '#9eaab8' };
      }
      stats[key].value += 1;
    });
    return Object.values(stats);
  }, [completedTasks, projects]);

  // === Trend Line Chart Data ===
  const trendData = useMemo(() => {
    const now = new Date();
    let interval: Date[];
    let formatStr: string;

    switch (period) {
      case 'day': {
        // Hourly for today
        const hours = Array.from({ length: 24 }, (_, i) => i);
        return hours.map(h => {
          const count = completedTasks.filter(t => {
            const d = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
            return d.getHours() === h && isToday(d);
          }).length;
          return { label: `${h}:00`, value: count };
        });
      }
      case 'week': {
        interval = eachDayOfInterval({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
        formatStr = 'EEE';
        break;
      }
      case 'month': {
        interval = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
        formatStr = 'd';
        break;
      }
      case 'year': {
        const months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), i, 1);
          return { label: format(d, 'M月', { locale: zhCN }), value: 0 };
        });
        completedTasks.forEach(t => {
          const d = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
          if (d.getFullYear() === now.getFullYear()) {
            months[d.getMonth()].value += 1;
          }
        });
        return months;
      }
      default:
        interval = [];
        formatStr = '';
    }

    return interval.map(d => ({
      label: format(d, formatStr, { locale: zhCN }),
      value: completedTasks.filter(t => {
        const cd = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
        return isSameDay(cd, d);
      }).length,
    }));
  }, [completedTasks, period]);

  // === Pomodoro Stats ===
  const pomodoroStats = useMemo(() => {
    const totalPomodoros = completedTasks.reduce((sum, t) => sum + (t.pomodoros || 0), 0);
    const totalDuration = completedTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgDuration = completedTasks.length > 0 ? Math.round(totalDuration / completedTasks.length) : 0;
    return { totalPomodoros, totalDuration, avgDuration };
  }, [completedTasks]);

  // === Heatmap Data ===
  const heatmapData = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 * 12 }, (_, i) => subDays(now, 7 * 12 - 1 - i));
    return days.map(d => {
      const dayTasks = tasks.filter(t => {
        if (!t.completed) return false;
        const cd = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
        return isSameDay(cd, d);
      });
      const duration = dayTasks.reduce((s, t) => s + (t.duration || 0), 0);
      return {
        date: d,
        duration,
        count: dayTasks.length,
        weekday: getDay(d),
        weekIndex: Math.floor((7 * 12 - 1 - days.indexOf(d)) / 7),
      };
    });
  }, [tasks]);

  // === Time Distribution ===
  const timeDistribution = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(h => {
      const count = completedTasks.filter(t => {
        const d = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
        return d.getHours() === h;
      }).length;
      return { hour: h, count };
    });
  }, [completedTasks]);

  const maxTimeCount = Math.max(...timeDistribution.map(d => d.count), 1);

  // === Tag Distribution ===
  const tagStats = useMemo(() => {
    const stats: Record<string, { name: string; value: number; color: string }> = {};
    completedTasks.forEach(t => {
      const tag = t.tag || 'other';
      if (!stats[tag]) {
        stats[tag] = { name: tag, value: 0, color: '#9eaab8' };
      }
      stats[tag].value += 1;
    });
    return Object.values(stats);
  }, [completedTasks]);

  // === Week-over-Week Comparison ===
  const weekComparisonData = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: thisWeekStart, end: thisWeekEnd });
    return days.map((day) => {
      const current = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const d = new Date(t.completedAt);
        return isSameDay(d, day);
      }).length;

      const lastWeekDay = subWeeks(day, 1);
      const previous = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const d = new Date(t.completedAt);
        return isSameDay(d, lastWeekDay);
      }).length;

      return {
        label: format(day, 'EEE', { locale: zhCN }),
        current,
        previous,
      };
    });
  }, [tasks]);

  // === Efficiency Radar ===
  const efficiencyRadarData = useMemo(() => {
    const now = new Date();
    const recentTasks = tasks.filter(t => {
      const d = t.completedAt ? new Date(t.completedAt) : parseISO(t.date);
      return d >= subDays(now, 30);
    });

    const total = recentTasks.length;
    const completed = recentTasks.filter(t => t.completed).length;
    const withDeadline = recentTasks.filter(t => t.deadline).length;
    const onTime = recentTasks.filter(t => t.completed && t.deadline && t.completedAt && new Date(t.completedAt) <= parseISO(t.deadline)).length;
    const withTime = recentTasks.filter(t => t.time).length;
    const hasPomodoro = recentTasks.filter(t => t.pomodoros > 0).length;

    const completionScore = total > 0 ? Math.round((completed / total) * 100) : 0;
    const deadlineScore = withDeadline > 0 ? Math.round((onTime / withDeadline) * 100) : 0;
    const planningScore = total > 0 ? Math.round(((withTime + hasPomodoro) / total) * 50) : 0;
    const consistencyScore = Math.min(100, Math.round((completed / Math.max(1, 30)) * 100));
    const focusScore = total > 0 ? Math.round((hasPomodoro / total) * 100) : 0;

    return [
      { subject: '完成率', score: completionScore },
      { subject: '按时率', score: deadlineScore },
      { subject: '计划性', score: Math.min(100, planningScore) },
      { subject: '持续性', score: consistencyScore },
      { subject: '专注度', score: focusScore },
    ];
  }, [tasks]);

  // Total stats
  const totalCompletedAll = tasks.filter(t => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((totalCompletedAll / tasks.length) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
      {/* Period Selector + AI Summary */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                period === p
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {onOpenAISummary && (
          <button
            onClick={onOpenAISummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-[var(--app-accent)] to-[#c4a5a0] hover:brightness-110 transition-all shadow-sm"
          >
            <Sparkles size={12} />
            AI 工作总结
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 size={16} />}
          label="完成任务"
          value={completedTasks.length}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<Target size={16} />}
          label="完成率"
          value={`${completionRate}%`}
          color="text-sky-600"
          bg="bg-sky-50"
        />
        <StatCard
          icon={<Flame size={16} />}
          label="番茄钟"
          value={pomodoroStats.totalPomodoros}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="专注时长"
          value={`${Math.round(pomodoroStats.totalDuration / 60)}h`}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie Chart - Project Distribution */}
        <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-[var(--app-accent)]" />
            <h4 className="text-xs font-semibold text-[var(--app-text)]">项目分布</h4>
          </div>
          {projectStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={projectStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {projectStats.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--app-text)',
                  }}
                  formatter={(value: number, name: string) => [`${value}个`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-xs text-[var(--app-text-muted)]">
              暂无完成数据
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2">
            {projectStats.map((s, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-[var(--app-text-secondary)]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[var(--app-accent)]" />
            <h4 className="text-xs font-semibold text-[var(--app-text)]">完成趋势</h4>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--app-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--app-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
                axisLine={{ stroke: 'var(--app-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--app-text)',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--app-accent)"
                strokeWidth={2}
                fill="url(#trendGradient)"
                dot={{ r: 3, fill: 'var(--app-accent)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--app-accent)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-[var(--app-accent)]" />
          <h4 className="text-xs font-semibold text-[var(--app-text)]">84天完成热力图</h4>
          <span className="text-[10px] text-[var(--app-text-muted)] ml-auto">
            日均 {Math.round(pomodoroStats.avgDuration)}分钟
          </span>
        </div>
        <div className="grid grid-cols-12 gap-1 w-full" style={{ height: '150px' }}>
          {Array.from({ length: 12 }, (_, weekIdx) => (
            <div key={weekIdx} className="grid grid-rows-7 gap-1">
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const data = heatmapData.find(d => d.weekIndex === weekIdx && d.weekday === dayIdx);
                const intensity = data ? Math.min(data.duration / 120, 1) : 0;
                return (
                  <div
                    key={dayIdx}
                    className="w-full h-full rounded-sm"
                    style={{
                      backgroundColor: data && data.count > 0
                        ? `rgba(212, 133, 122, ${0.15 + intensity * 0.85})`
                        : 'var(--app-tag-bg)',
                    }}
                    title={data ? `${format(data.date, 'yyyy/M/d')} · ${data.count}个任务 · ${data.duration}分钟` : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-[var(--app-text-muted)]">少</span>
          <div className="flex gap-0.5">
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((o, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(212, 133, 122, ${o})` }} />
            ))}
          </div>
          <span className="text-[10px] text-[var(--app-text-muted)]">多</span>
        </div>
      </div>

      {/* Time Distribution */}
      <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-[var(--app-accent)]" />
          <h4 className="text-xs font-semibold text-[var(--app-text)]">时段分布</h4>
        </div>
        <div className="flex items-end gap-0.5 h-20">
          {timeDistribution.map((d, i) => {
            const height = d.count > 0 ? Math.max(8, (d.count / maxTimeCount) * 100) : 2;
            const isFocus = d.hour >= 9 && d.hour <= 17;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isFocus ? 'bg-[var(--app-accent)]/60' : 'bg-[var(--app-accent)]/25'
                  )}
                  style={{ height: `${height}%` }}
                />
                {d.hour % 4 === 0 && (
                  <span className="text-[9px] text-[var(--app-text-muted)]">{d.hour}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tag Distribution Pie */}
      <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={14} className="text-[var(--app-accent)]" />
          <h4 className="text-xs font-semibold text-[var(--app-text)]">标签分布</h4>
        </div>
        {tagStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={tagStats}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {tagStats.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--app-text)',
                }}
                formatter={(value: number, name: string) => [`${value}个`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-xs text-[var(--app-text-muted)]">
            暂无数据
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {tagStats.map((s, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] text-[var(--app-text-secondary)]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name} ({s.value})
            </div>
          ))}
        </div>
      </div>

      {/* Week-over-Week Comparison */}
      <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit size={14} className="text-[var(--app-accent)]" />
          <h4 className="text-xs font-semibold text-[var(--app-text)]">周对比</h4>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekComparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" opacity={0.5} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
              axisLine={{ stroke: 'var(--app-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--app-text)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', color: 'var(--app-text-secondary)' }}
            />
            <Bar dataKey="current" name="本周" fill="var(--app-accent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="previous" name="上周" fill="var(--app-accent)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Efficiency Radar */}
      <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={14} className="text-[var(--app-accent)]" />
          <h4 className="text-xs font-semibold text-[var(--app-text)]">效率雷达</h4>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={efficiencyRadarData}>
            <PolarGrid stroke="var(--app-border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--app-text-muted)' }}
            />
            <Radar
              name="效率评分"
              dataKey="score"
              stroke="var(--app-accent)"
              fill="var(--app-accent)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)]">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg, color)}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold text-[var(--app-text)]">{value}</div>
        <div className="text-[10px] text-[var(--app-text-muted)]">{label}</div>
      </div>
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
