import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Task, Project } from '@/types';

interface CompletionStatsPanelProps {
  tasks: Task[];
  projects: Project[];
}

const PROJECT_BAR_OPACITIES = [1, 0.82, 0.68, 0.54, 0.42, 0.32];

export function CompletionStatsPanel({ tasks, projects }: CompletionStatsPanelProps) {
  const { completionPie, projectBar } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const uncompleted = total - completed;

    const pieData = [];
    if (completed > 0) pieData.push({ name: '已完成', value: completed, color: 'var(--app-accent)' });
    if (uncompleted > 0) pieData.push({ name: '未完成', value: uncompleted, color: 'var(--app-border)' });

    // Completed tasks by project
    const completedTasks = tasks.filter(t => t.completed);
    const projectCounts: Record<string, number> = {};
    completedTasks.forEach(t => {
      const pid = t.projectId || 'none';
      projectCounts[pid] = (projectCounts[pid] || 0) + 1;
    });

    const barData = Object.entries(projectCounts)
      .map(([pid, count], idx) => {
        if (pid === 'none') return { name: '未分类', count, opacity: PROJECT_BAR_OPACITIES[idx % PROJECT_BAR_OPACITIES.length] };
        const p = projects.find(pr => pr.id === pid);
        return { name: p?.name || pid, count, opacity: PROJECT_BAR_OPACITIES[idx % PROJECT_BAR_OPACITIES.length] };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { completionPie: pieData, projectBar: barData, total, completed };
  }, [tasks, projects]);

  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Top: Completion Rate Ring Chart */}
      <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-3 shadow-sm">
        <h4 className="text-xs font-semibold text-[var(--app-text)] mb-2">任务完成率</h4>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={24}
                  outerRadius={36}
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
              <span className="text-sm font-bold text-[var(--app-text)]">{completionRate}%</span>
              <span className="text-[9px] text-[var(--app-text-muted)]">完成率</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {completionPie.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[var(--app-text)]">{item.name}</span>
                <span className="ml-auto font-medium text-[var(--app-text-muted)]">{item.value}</span>
              </div>
            ))}
            <div className="pt-1 border-t border-[var(--app-border)] flex items-center gap-2 text-[11px]">
              <span className="text-[var(--app-text-muted)]">总计</span>
              <span className="ml-auto font-medium text-[var(--app-text)]">{tasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Completed by Project Bar Chart */}
      <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-3 shadow-sm">
        <h4 className="text-xs font-semibold text-[var(--app-text)] mb-2">已完成任务 · 项目分布</h4>
        {projectBar.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[11px] text-[var(--app-text-muted)]">
            暂无已完成任务
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={projectBar} barSize={16}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'var(--app-text-muted)' }}
                axisLine={{ stroke: 'var(--app-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--app-text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={20}
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
                cursor={{ fill: 'var(--app-surface-hover)', opacity: 0.5 }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {projectBar.map((entry, i) => (
                  <Cell key={i} fill="var(--app-accent)" fillOpacity={entry.opacity} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
