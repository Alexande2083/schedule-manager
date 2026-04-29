import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Task, Project } from '@/types';

interface CompletionStatsPanelProps {
  tasks: Task[];
  projects: Project[];
}

const THEME_COLORS = ['#d4857a', '#7ec9a8', '#9db3d4', '#e0b87a', '#b8a0d4', '#f0a0a0'];
const DARK_COLORS = ['#d4857a', '#5ab88a', '#7a9bc4', '#c8a060', '#a080c4', '#d08080'];

export function CompletionStatsPanel({ tasks, projects }: CompletionStatsPanelProps) {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

  const { completionPie, projectBar } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const uncompleted = total - completed;

    const pieData = [];
    if (completed > 0) pieData.push({ name: '已完成', value: completed, color: isDark ? DARK_COLORS[0] : THEME_COLORS[0] });
    if (uncompleted > 0) pieData.push({ name: '未完成', value: uncompleted, color: isDark ? 'rgba(255,255,255,0.12)' : 'var(--app-border)' });

    // Completed tasks by project
    const completedTasks = tasks.filter(t => t.completed);
    const projectCounts: Record<string, number> = {};
    completedTasks.forEach(t => {
      const pid = t.projectId || 'none';
      projectCounts[pid] = (projectCounts[pid] || 0) + 1;
    });

    const barData = Object.entries(projectCounts)
      .map(([pid, count]) => {
        if (pid === 'none') return { name: '未分类', count, color: isDark ? DARK_COLORS[1] : THEME_COLORS[1] };
        const p = projects.find(pr => pr.id === pid);
        const idx = projects.findIndex(pr => pr.id === pid) % THEME_COLORS.length;
        return { name: p?.name || pid, count, color: isDark ? DARK_COLORS[idx] : THEME_COLORS[idx] };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { completionPie: pieData, projectBar: barData, total, completed };
  }, [tasks, projects, isDark]);

  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: Completion Rate Ring Chart */}
      <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-[var(--app-text)] mb-2">任务完成率</h4>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={52}
                  strokeWidth={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {completionPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-[var(--app-text)]">{completionRate}%</span>
              <span className="text-[10px] text-[var(--app-text-muted)]">完成率</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {completionPie.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[var(--app-text)]">{item.name}</span>
                <span className="ml-auto font-medium text-[var(--app-text-muted)]">{item.value}</span>
              </div>
            ))}
            <div className="pt-1 border-t border-[var(--app-border)] flex items-center gap-2 text-xs">
              <span className="text-[var(--app-text-muted)]">总计</span>
              <span className="ml-auto font-medium text-[var(--app-text)]">{tasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Completed by Project Bar Chart */}
      <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-[var(--app-text)] mb-2">已完成任务 · 项目分布</h4>
        {projectBar.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-[var(--app-text-muted)]">
            暂无已完成任务
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={projectBar} barSize={20}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--app-text-muted)' }}
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
                cursor={{ fill: 'var(--app-surface-hover)', opacity: 0.5 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {projectBar.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
