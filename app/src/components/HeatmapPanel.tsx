import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { Task } from '@/types';

interface HeatmapPanelProps {
  tasks: Task[];
}

const LEVEL_COLORS = [
  'var(--app-border)',
  '#9be9a8',
  '#40c463',
  '#30a14e',
  '#216e39',
];

const LEVEL_COLORS_DARK = [
  'rgba(139, 148, 158, 0.15)',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
];

const SHORT_DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKS = 13;
const CELL = 14; // px per cell
const GAP = 3;  // px gap

export function HeatmapPanel({ tasks }: HeatmapPanelProps) {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const palette = isDark ? LEVEL_COLORS_DARK : LEVEL_COLORS;

  const { weeks, monthHeaders, stats } = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed);
    const totalDays = WEEKS * 7;
    const today = new Date();

    // Build days oldest-first
    const days: { date: Date; count: number }[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const s = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const e = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      const count = completedTasks.filter(t => {
        const ct = t.completedAt ? new Date(t.completedAt) : new Date(t.date);
        return ct >= s && ct <= e;
      }).length;
      days.push({ date, count });
    }

    // Group into weeks (columns)
    const w: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }

    // Month headers — find which week each month starts on
    const headers: { label: string; startWeek: number; span: number }[] = [];
    let prevMonth = -1;
    w.forEach((week, wi) => {
      const firstDay = week[0];
      if (firstDay.date.getMonth() !== prevMonth) {
        prevMonth = firstDay.date.getMonth();
        headers.push({
          label: format(firstDay.date, 'M月'),
          startWeek: wi,
          span: 0,
        });
      }
      // Increase span of the current month header
      if (headers.length > 0) {
        headers[headers.length - 1].span++;
      }
    });

    // Stats
    const total = completedTasks.length;
    let currStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) currStreak++;
      else break;
    }
    let maxStr = 0, cs = 0;
    for (const d of days) {
      if (d.count > 0) { cs++; maxStr = Math.max(maxStr, cs); }
      else cs = 0;
    }

    return { weeks: w, monthHeaders: headers, stats: { total, currStreak, maxStr } };
  }, [tasks]);

  const colTotalWidth = CELL + GAP;

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--app-text)]">90天完成热力图</h3>
          <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
            过去 {WEEKS} 周的任务完成情况
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#40c463' }}>{stats.total}</div>
            <div className="text-[var(--app-text-muted)]">总完成</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#30a14e' }}>{stats.currStreak}</div>
            <div className="text-[var(--app-text-muted)]">当前连续</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#216e39' }}>{stats.maxStr}</div>
            <div className="text-[var(--app-text-muted)]">最长连续</div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: 24 + WEEKS * colTotalWidth }}>

          {/* Month headers row — each spans its weeks, no overlap */}
          <div className="flex mb-1" style={{ paddingLeft: 24 }}>
            {monthHeaders.map((m, i) => (
              <div
                key={i}
                className="text-[10px] text-[var(--app-text-muted)] shrink-0"
                style={{ width: m.span * colTotalWidth }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {/* Day labels */}
            <div className="flex flex-col shrink-0 mr-1" style={{ gap: GAP }}>
              {SHORT_DAYS.map((d, i) => (
                <div key={i} style={{ height: CELL }} className="flex items-center justify-center">
                  <span className="text-[9px] text-[var(--app-text-muted)]">{d}</span>
                </div>
              ))}
            </div>

            {/* Week columns — square blocks */}
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day, di) => {
                    let level = 0;
                    if (day.count >= 6) level = 4;
                    else if (day.count >= 4) level = 3;
                    else if (day.count >= 2) level = 2;
                    else if (day.count >= 1) level = 1;
                    return (
                      <div
                        key={di}
                        className="cursor-pointer transition-all hover:ring-1 hover:ring-[var(--app-text)] shrink-0"
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: palette[level],
                        }}
                        title={`${format(day.date, 'yyyy-MM-dd')}: 完成 ${day.count} 个任务`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--app-text-muted)]">
            <span>少</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 2,
                  backgroundColor: palette[level],
                }}
              />
            ))}
            <span>多</span>
          </div>
        </div>
      </div>
    </div>
  );
}
