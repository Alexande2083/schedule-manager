import { useMemo } from 'react';
import { format, startOfYear, differenceInCalendarDays, addDays } from 'date-fns';
import { Trophy, Flame, CheckCircle2, TrendingUp } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface HeatmapPanelProps {
  tasks: Task[];
  compact?: boolean;
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
const CELL = 14;
const GAP = 3;

// Compact mode uses smaller cells
const COMPACT_CELL = 8;
const COMPACT_GAP = 2;

/** 根据连续天数和总完成数生成成就描述 */
function getAchievement(total: number, streak: number, maxStreak: number) {
  if (total === 0) return { emoji: '🎯', title: '开始吧', desc: '完成第一个任务' };
  if (total >= 100) return { emoji: '🏆', title: '任务大师', desc: `已累计完成 ${total} 个任务` };
  if (total >= 50) return { emoji: '⭐', title: '效率达人', desc: `已累计完成 ${total} 个任务` };
  if (streak >= 14) return { emoji: '🔥', title: '势不可挡', desc: `连续 ${streak} 天完成任务` };
  if (streak >= 7) return { emoji: '💪', title: '坚持之星', desc: `连续 ${streak} 天完成任务` };
  if (streak >= 3) return { emoji: '👍', title: '良好开始', desc: `连续 ${streak} 天完成任务` };
  if (maxStreak >= 5) return { emoji: '✨', title: '渐入佳境', desc: `最长连续 ${maxStreak} 天` };
  return { emoji: '🌟', title: '继续加油', desc: '保持每天的完成习惯' };
}

export function HeatmapPanel({ tasks, compact }: HeatmapPanelProps) {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const palette = isDark ? LEVEL_COLORS_DARK : LEVEL_COLORS;

  const { weeks, monthHeaders, stats, achievement } = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed);
    const today = new Date();
    const start = startOfYear(today);
    const totalDays = differenceInCalendarDays(today, start) + 1;

    const days: { date: Date; count: number }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(start, i);
      const s = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const e = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      const count = completedTasks.filter(t => {
        const ct = t.completedAt ? new Date(t.completedAt) : new Date(t.date);
        return ct >= s && ct <= e;
      }).length;
      days.push({ date, count });
    }

    const w: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }

    const headers: { label: string; startWeek: number; span: number }[] = [];
    let prevMonth = -1;
    w.forEach((week, wi) => {
      const firstDay = week[0];
      if (firstDay.date.getMonth() !== prevMonth) {
        prevMonth = firstDay.date.getMonth();
        headers.push({ label: format(firstDay.date, 'M月'), startWeek: wi, span: 0 });
      }
      if (headers.length > 0) {
        headers[headers.length - 1].span++;
      }
    });

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

    // Weekly average
    const weeksWithActivity = w.filter(wk => wk.some(d => d.count > 0)).length;
    const weeklyAvg = weeksWithActivity > 0 ? (total / weeksWithActivity).toFixed(1) : '0';

    return {
      weeks: w,
      monthHeaders: headers,
      stats: { total, currStreak, maxStr, weeklyAvg },
      achievement: getAchievement(total, currStreak, maxStr),
    };
  }, [tasks]);

  // ─── SVG-based responsive heatmap (compact mode for Dashboard) ───
  if (compact) {
    const cellSize = COMPACT_CELL;
    const gapSize = COMPACT_GAP;
    const colW = cellSize + gapSize;
    const labelW = 16;
    const svgW = labelW + weeks.length * colW;
    const svgH = 12 + 7 * (cellSize + gapSize) + 14; // 12 for month header, 14 for legend

    return (
      <div className="w-full h-full flex flex-col">
        {/* Stats row — compact inline */}
        <div className="flex items-center gap-4 mb-2 text-[12px]">
          {[
            { icon: CheckCircle2, label: '总完成', value: stats.total, color: '#40c463' },
            { icon: Flame, label: '连续', value: `${stats.currStreak}天`, color: '#e87a30' },
            { icon: Trophy, label: '最长', value: `${stats.maxStr}天`, color: '#d4857a' },
            { icon: TrendingUp, label: '周均', value: stats.weeklyAvg, color: '#5b8def' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <item.icon size={13} style={{ color: item.color }} />
              <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
              <span className="text-[var(--app-text-muted)]">{item.label}</span>
            </div>
          ))}
        </div>

        {/* SVG Heatmap — fills remaining space */}
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMinYMin meet"
          className="w-full max-h-[150px]"
        >
          {/* Month headers */}
          {monthHeaders.map((m, i) => (
            <text
              key={i}
              x={labelW + m.startWeek * colW}
              y={9}
              fontSize={7}
              fill="var(--app-text-muted)"
            >
              {m.label}
            </text>
          ))}

          {/* Day labels (only Mon/Wed/Fri) */}
          {[1, 3, 5].map(di => (
            <text
              key={`d-${di}`}
              x={0}
              y={12 + di * (cellSize + gapSize) + cellSize * 0.75}
              fontSize={6}
              fill="var(--app-text-muted)"
            >
              {SHORT_DAYS[di]}
            </text>
          ))}

          {/* Heatmap cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              let level = 0;
              if (day.count >= 6) level = 4;
              else if (day.count >= 4) level = 3;
              else if (day.count >= 2) level = 2;
              else if (day.count >= 1) level = 1;

              return (
                <rect
                  key={`${wi}-${di}`}
                  x={labelW + wi * colW}
                  y={12 + di * (cellSize + gapSize)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={palette[level]}
                >
                  <title>{`${format(day.date, 'yyyy-MM-dd')}: 完成 ${day.count} 个任务`}</title>
                </rect>
              );
            })
          )}

          {/* Legend */}
          <text x={svgW - 72} y={svgH - 3} fontSize={6} fill="var(--app-text-muted)">少</text>
          {[0, 1, 2, 3, 4].map((level, i) => (
            <rect
              key={`leg-${level}`}
              x={svgW - 64 + i * (cellSize + 1)}
              y={svgH - cellSize - 5}
              width={cellSize}
              height={cellSize}
              rx={1}
              fill={palette[level]}
            />
          ))}
          <text x={svgW - 64 + 5 * (cellSize + 1) + 1} y={svgH - 3} fontSize={6} fill="var(--app-text-muted)">多</text>
        </svg>
      </div>
    );
  }

  // ─── Full mode (original layout, used standalone) ───
  const colTotalWidth = CELL + GAP;

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-5 shadow-sm">
      {/* 成就徽章 */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--app-border)]">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: 'var(--app-accent)', opacity: 0.12 }}
        >
          <span style={{ filter: 'none' }}>{achievement.emoji}</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--app-text)]">{achievement.title}</div>
          <div className="text-[11px] text-[var(--app-text-muted)]">{achievement.desc}</div>
        </div>
        {stats.total > 0 && (
          <div className="text-right">
            <div className="text-xl font-bold text-[var(--app-accent)] tabular-nums">{stats.total}</div>
            <div className="text-[10px] text-[var(--app-text-muted)]">已完成</div>
          </div>
        )}
      </div>

      {/* 统计卡片列 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { icon: CheckCircle2, label: '总完成', value: stats.total, color: '#40c463' },
          { icon: Flame, label: '当前连续', value: `${stats.currStreak}天`, color: '#e87a30' },
          { icon: Trophy, label: '最长连续', value: `${stats.maxStr}天`, color: '#d4857a' },
          { icon: TrendingUp, label: '周均完成', value: stats.weeklyAvg, color: '#5b8def' },
        ].map((item, i) => (
          <div key={i} className="rounded-lg p-2.5 text-center transition-all hover:scale-[1.02]"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}
          >
            <item.icon size={14} className="mx-auto mb-1" style={{ color: item.color }} />
            <div className="text-base font-bold tabular-nums" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="text-[9px] text-[var(--app-text-muted)] mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 热力图 */}
      <div className="overflow-x-auto pb-2">
        <div style={{ width: '100%', minWidth: 24 + weeks.length * colTotalWidth }}>
          <div className="flex mb-1" style={{ paddingLeft: 24 }}>
            {monthHeaders.map((m, i) => (
              <div key={i} className="text-[10px] text-[var(--app-text-muted)] shrink-0"
                style={{ width: m.span * colTotalWidth }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            <div className="flex flex-col shrink-0 mr-1" style={{ gap: GAP }}>
              {SHORT_DAYS.map((d, i) => (
                <div key={i} style={{ height: CELL }} className="flex items-center justify-center">
                  <span className="text-[9px] text-[var(--app-text-muted)]">{d}</span>
                </div>
              ))}
            </div>

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
                      <div key={di}
                        className={cn(
                          'cursor-pointer transition-all hover:ring-1 hover:ring-[var(--app-text)] shrink-0',
                          level > 0 && 'heatmap-cell-pop'
                        )}
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: palette[level],
                          animationDelay: level > 0 ? `${wi * 18 + di * 5}ms` : undefined,
                        }}
                        title={`${format(day.date, 'yyyy-MM-dd')}: 完成 ${day.count} 个任务`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--app-text-muted)]">
            <span>少</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level}
                style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: palette[level] }}
              />
            ))}
            <span>多</span>
          </div>
        </div>
      </div>
    </div>
  );
}
