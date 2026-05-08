import { useMemo, useState } from 'react';
import { CheckCircle2, FolderOpen, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Task, Project } from '@/types';

interface CompletedTasksListProps {
  tasks: Task[];
  projects: Project[];
  tags: Record<string, { label: string; color: string }>;
  onOpenEdit: (task: Task) => void;
}

export function CompletedTasksList({ tasks, projects, tags, onOpenEdit }: CompletedTasksListProps) {
  const [expanded, setExpanded] = useState(false);

  // Group tasks by completion date
  const { groupedTasks, totalCompleted } = useMemo(() => {
    const completed = tasks.filter(t => t.completed)
      .sort((a, b) => {
        const aTime = a.completedAt || a.createdAt;
        const bTime = b.completedAt || b.createdAt;
        return bTime - aTime;
      });

    const limit = expanded ? completed.length : 20;
    const sliced = completed.slice(0, limit);

    // Group by date
    const groups: Record<string, Task[]> = {};
    sliced.forEach(t => {
      const dateKey = t.completedAt
        ? format(new Date(t.completedAt), 'yyyy-MM-dd')
        : t.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    return { groupedTasks: groups, totalCompleted: completed.length };
  }, [tasks, expanded]);

  const dateKeys = Object.keys(groupedTasks);

  if (dateKeys.length === 0) return null;

  const getDateLabel = (dateKey: string) => {
    const d = parseISO(dateKey);
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    if (dateKey === today) return '今天';
    if (dateKey === yesterday) return '昨天';
    return format(d, 'M月d日 EEEE', { locale: zhCN });
  };

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-5 shadow-sm">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#40c463]" />
          <h4 className="text-sm font-semibold text-[var(--app-text)]">完成记录</h4>
          <span className="text-[10px] text-[var(--app-text-muted)] bg-[var(--app-accent)]/10 text-[var(--app-accent)] px-1.5 py-0.5 rounded-full">
            {totalCompleted} 项
          </span>
        </div>
        <div className="flex items-center gap-3">
          {totalCompleted > 20 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
            >
              {expanded ? (
                <>收起 <ChevronUp size={12} /></>
              ) : (
                <>展开全部 <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 时间线 */}
      <div className="relative">
        {/* 垂直轴线 */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px"
          style={{ backgroundColor: 'var(--app-border)' }}
        />

        <div className="space-y-5">
          {dateKeys.map((dateKey) => {
            const tasksInGroup = groupedTasks[dateKey];
            return (
              <div key={dateKey}>
                {/* 日期标题 */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 relative z-10"
                    style={{ backgroundColor: 'var(--app-accent)', opacity: 0.12 }}
                  >
                    <CheckCircle2 size={12} className="text-[var(--app-accent)]" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--app-text)]">{getDateLabel(dateKey)}</span>
                  <span className="text-[10px] text-[var(--app-text-muted)]">{tasksInGroup.length} 项</span>
                </div>

                {/* 该日期的任务 */}
                <div className="ml-[34px] space-y-1">
                  {tasksInGroup.map((task) => {
                    const tagInfo = tags[task.tag] || { label: task.tag, color: '#9ca3af' };
                    const project = projects.find(p => p.id === task.projectId);
                    const completedTime = task.completedAt
                      ? format(new Date(task.completedAt), 'HH:mm')
                      : null;

                    return (
                      <button
                        key={task.id}
                        onClick={() => onOpenEdit(task)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left
                          hover:bg-[var(--app-surface-hover)] transition-all duration-200 group"
                      >
                        {/* 状态图标 */}
                        <CheckCircle2 size={13} className="text-[#8cc68a] shrink-0" />

                        {/* 任务标题 */}
                        <span className="text-xs text-[var(--app-text-muted)] line-through truncate flex-1">
                          {task.title}
                        </span>

                        {/* 标签 */}
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white shrink-0"
                          style={{ backgroundColor: tagInfo.color, opacity: 0.7 }}
                        >
                          {tagInfo.label}
                        </span>

                        {/* 项目 */}
                        {project && (
                          <span className="text-[9px] text-[var(--app-text-muted)] flex items-center gap-0.5 shrink-0">
                            <FolderOpen size={8} style={{ color: project.color }} />
                            {project.name}
                          </span>
                        )}

                        {/* 完成时间 */}
                        {completedTime && (
                          <span className="text-[9px] text-[var(--app-text-muted)] flex items-center gap-0.5 shrink-0">
                            <Clock size={8} />
                            {completedTime}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
