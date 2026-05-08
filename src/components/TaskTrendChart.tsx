import { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface TaskTrendChartProps {
  tasks: Task[];
  /** When true, renders chart only without wrapper card/header — for embedding in Dashboard */
  embedded?: boolean;
}

type ViewMode = 'week' | 'month';

export function TaskTrendChart({ tasks, embedded = false }: TaskTrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const barColor = isDark ? '#7a9bc4' : '#9db3d4';
  const lineColor = isDark ? 'var(--app-accent)' : 'var(--app-accent)';

  const data = useMemo(() => {
    const today = new Date();

    if (viewMode === 'week') {
      // This week: daily data
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      return days.map(day => {
        const s = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const e = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
        const dayTasks = tasks.filter(t => {
          const created = new Date(t.createdAt);
          return created >= s && created <= e;
        });
        return {
          label: format(day, 'EEE', { locale: zhCN }).replace('周', ''),
          fullDate: format(day, 'MM-dd'),
          bar: dayTasks.length,
          line: dayTasks.filter(t => t.completed).length,
        };
      });
    } else {
      // This month: weekly data
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

      return weeks.map((weekStart, idx) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59);

        const weekTasks = tasks.filter(t => {
          const created = new Date(t.createdAt);
          return created >= weekStart && created <= weekEnd;
        });

        return {
          label: `第${idx + 1}周`,
          fullDate: `${format(weekStart, 'MM-dd')}~${format(weekEnd, 'MM-dd')}`,
          bar: weekTasks.length,
          line: weekTasks.filter(t => t.completed).length,
        };
      });
    }
  }, [tasks, viewMode]);

  // Embedded mode: chart only, no wrapper
  if (embedded) {
    return (
      <div>
        {/* View mode toggle */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[var(--app-text-muted)]">
            {viewMode === 'week' ? '每日任务数与完成数' : '每周任务数与完成数'}
          </span>
          <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--app-surface)] border border-[var(--app-border)]">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                viewMode === 'week'
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              )}
            >
              周
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                viewMode === 'month'
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              )}
            >
              月
            </button>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 mb-1.5 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2 rounded-sm" style={{ backgroundColor: barColor }} />
            <span className="text-[var(--app-text-muted)]">设定</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-0.5" style={{ backgroundColor: lineColor }} />
            <span className="text-[var(--app-text-muted)]">完成</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} barSize={20} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
              axisLine={{ stroke: 'var(--app-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'var(--app-text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={18}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--app-text)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'bar' ? '设定任务' : '已完成';
                return [value, label];
              }}
              labelFormatter={(label: string, payload: any[]) => {
                if (payload && payload[0]) {
                  return `${payload[0].payload.fullDate}`;
                }
                return label;
              }}
              cursor={{ fill: 'var(--app-surface-hover)', opacity: 0.5 }}
            />
            <Bar dataKey="bar" fill={barColor} radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="line"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 2.5, fill: lineColor }}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-[var(--app-text)]">
            {viewMode === 'week' ? '本周任务趋势' : '本月任务趋势'}
          </h4>
          <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
            {viewMode === 'week'
              ? '每日设定任务数与完成数'
              : '每周设定任务数与完成数'
            }
          </p>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--app-surface-hover)] border border-[var(--app-border)]">
          <button
            onClick={() => setViewMode('week')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              viewMode === 'week'
                ? 'bg-[var(--app-accent)] text-white'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            )}
          >
            本周
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              viewMode === 'month'
                ? 'bg-[var(--app-accent)] text-white'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            )}
          >
            本月
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: barColor }} />
          <span className="text-[var(--app-text-muted)]">设定任务</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5" style={{ backgroundColor: lineColor }} />
          <span className="text-[var(--app-text-muted)]">已完成</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={data} barSize={28} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--app-text-muted)' }}
            axisLine={{ stroke: 'var(--app-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={22}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--app-text)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, name: string) => {
              const label = name === 'bar' ? '设定任务' : '已完成';
              return [value, label];
            }}
            labelFormatter={(label: string, payload: any[]) => {
              if (payload && payload[0]) {
                return `${payload[0].payload.fullDate}`;
              }
              return label;
            }}
            cursor={{ fill: 'var(--app-surface-hover)', opacity: 0.5 }}
          />
          <Bar dataKey="bar" fill={barColor} radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="line"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor }}
            activeDot={{ r: 5, fill: lineColor }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
