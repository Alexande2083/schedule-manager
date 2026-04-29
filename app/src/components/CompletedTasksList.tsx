import { useMemo, useState } from 'react';
import { CheckCircle2, CalendarDays, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { Task, Project } from '@/types';

interface CompletedTasksListProps {
  tasks: Task[];
  projects: Project[];
  onOpenEdit: (task: Task) => void;
}

export function CompletedTasksList({ tasks, projects, onOpenEdit }: CompletedTasksListProps) {
  const [expanded, setExpanded] = useState(false);

  const recentCompleted = useMemo(() => {
    return tasks
      .filter(t => t.completed)
      .sort((a, b) => {
        const aTime = a.completedAt || a.createdAt;
        const bTime = b.completedAt || b.createdAt;
        return bTime - aTime;
      })
      .slice(0, expanded ? 50 : 5);
  }, [tasks, expanded]);

  if (recentCompleted.length === 0) return null;

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-[#40c463]" />
          <h4 className="text-sm font-semibold text-[var(--app-text)]">最近完成的任务</h4>
          <span className="text-[10px] text-[var(--app-text-muted)] bg-[var(--app-surface-hover)] px-1.5 py-0.5 rounded-full">
            {tasks.filter(t => t.completed).length}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
        >
          {expanded ? (
            <>收起 <ChevronUp size={12} /></>
          ) : (
            <>展开 <ChevronDown size={12} /></>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        {recentCompleted.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const completedDate = task.completedAt
            ? new Date(task.completedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
            : task.date;

          return (
            <button
              key={task.id}
              onClick={() => onOpenEdit(task)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left hover:bg-[var(--app-surface-hover)] transition-colors"
            >
              <CheckCircle2 size={14} className="text-[#8cc68a] shrink-0" />
              <span className="text-xs text-[var(--app-text-muted)] line-through truncate flex-1">
                {task.title}
              </span>
              {project && (
                <span className="text-[10px] text-[var(--app-text-muted)] flex items-center gap-1 shrink-0">
                  <FolderOpen size={8} style={{ color: project.color }} />
                  {project.name}
                </span>
              )}
              <span className="text-[10px] text-[var(--app-text-muted)] flex items-center gap-1 shrink-0">
                <CalendarDays size={8} />
                {completedDate}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
