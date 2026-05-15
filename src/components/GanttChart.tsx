import { useMemo, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';

interface GanttTask extends Task {
  startMinutes: number;
  endMinutes: number;
  colIndex: number;
  colTotal: number;
}

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  selectedDate: string;
  onOpenEdit: (task: Task) => void;
  onReorderProjects?: (projects: Project[]) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const TIME_AXIS_WIDTH = 52; // px
const HEADER_HEIGHT = 46;
const MIN_PROJECT_COLUMN_WIDTH = 98; // px — about 8 columns in the current panel width

const ALL_HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Group tasks in a single column that overlap in time */
function groupOverlapping(tasks: GanttTask[]): GanttTask[][] {
  if (tasks.length === 0) return [];
  const sorted = [...tasks].sort((a, b) => a.startMinutes - b.startMinutes);
  const groups: GanttTask[][] = [];
  let currentGroup: GanttTask[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const task = sorted[i];
    const lastEnd = Math.max(...currentGroup.map(t => t.endMinutes));
    if (task.startMinutes < lastEnd) {
      currentGroup.push(task);
    } else {
      groups.push(currentGroup);
      currentGroup = [task];
    }
  }
  groups.push(currentGroup);
  return groups;
}

export function GanttChart({ tasks, projects, selectedDate, onOpenEdit, onReorderProjects }: GanttChartProps) {
  const dayTasks = tasks.filter(t => t.date === selectedDate && t.time);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  const minutesToPercent = (minutes: number) => {
    const relative = minutes - START_HOUR * 60;
    return (relative / TOTAL_MINUTES) * 100;
  };

  // Horizontal wheel scroll handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      const el = e.currentTarget as HTMLDivElement;
      el.scrollLeft += e.deltaY;
    }
  }, []);

  // Drag & drop handlers for project column reordering
  const handleProjectDragStart = (e: React.DragEvent, projectId: string) => {
    if (projectId === 'none') { e.preventDefault(); return; }
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleProjectDrop = (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    if (!draggedProjectId || draggedProjectId === targetProjectId) {
      setDraggedProjectId(null);
      return;
    }
    if (!onReorderProjects) {
      setDraggedProjectId(null);
      return;
    }
    // Reorder projects
    const newProjects = [...projects];
    const draggedIdx = newProjects.findIndex(p => p.id === draggedProjectId);
    const targetIdx = newProjects.findIndex(p => p.id === targetProjectId);
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedProjectId(null);
      return;
    }
    const [removed] = newProjects.splice(draggedIdx, 1);
    newProjects.splice(targetIdx, 0, removed);
    onReorderProjects(newProjects);
    setDraggedProjectId(null);
  };

  // Active projects: only show projects that have timed tasks on the selected day.
  const activeProjects = useMemo(() => {
    const result: (Project | { id: 'none'; name: '未分类'; color: string })[] = [];
    projects.forEach(p => {
      if (dayTasks.some(t => t.projectId === p.id)) {
        result.push(p);
      }
    });
    if (dayTasks.some(t => !t.projectId)) {
      result.push({ id: 'none', name: '未分类', color: '#9ca3af' });
    }
    return result;
  }, [projects, dayTasks]);

  // Grid column definition: time axis + one column per project
  const gridColumns = useMemo(() => {
    return `${TIME_AXIS_WIDTH}px repeat(${activeProjects.length}, minmax(${MIN_PROJECT_COLUMN_WIDTH}px, 1fr))`;
  }, [activeProjects.length]);

  // Group tasks by project, then by time overlap within each column
  const tasksByProject = useMemo(() => {
    const buckets = new Map<string, GanttTask[]>();
    activeProjects.forEach(p => buckets.set(p.id, []));

    dayTasks.forEach((t) => {
      const ganttTask: GanttTask = {
        ...t,
        startMinutes: parseTime(t.time!),
        endMinutes: parseTime(t.time!) + (t.duration || 60),
        colIndex: 0,
        colTotal: 1,
      };
      const pid = t.projectId || 'none';
      if (buckets.has(pid)) {
        buckets.get(pid)!.push(ganttTask);
      } else {
        buckets.get(activeProjects[0]?.id || 'none')?.push(ganttTask);
      }
    });

    const result = new Map<string, GanttTask[]>();
    buckets.forEach((bucket, pid) => {
      const groups = groupOverlapping(bucket);
      const processed: GanttTask[] = [];
      groups.forEach((group) => {
        group.forEach((task, idx) => {
          processed.push({ ...task, colIndex: idx, colTotal: group.length });
        });
      });
      result.set(pid, processed);
    });
    return result;
  }, [dayTasks, activeProjects]);

  // Current time indicator
  const currentTimePx = useMemo(() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes < START_HOUR * 60 || minutes > END_HOUR * 60) return null;
    return minutesToPercent(minutes);
  }, []);

  if (dayTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock size={48} className="text-[var(--app-border)] mb-4" />
        <p className="text-sm text-[var(--app-text-muted)]">
          今天还没有带时间的任务，添加一个带时间的任务来在甘特图上显示
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shadow-sm overflow-hidden flex flex-col h-full min-h-[548px]">
      {/* Single unified scrollable grid — header + body in one container */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden" onWheel={handleWheel}>
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: gridColumns,
            gridTemplateRows: `${HEADER_HEIGHT}px minmax(500px, 1fr)`,
          }}
        >
          {/* ===== Row 0: Sticky Header ===== */}
          {/* Corner cell (sticky top-left) */}
          <div
            className="sticky top-0 left-0 z-30 bg-[var(--app-surface-hover)] border-r border-b border-[var(--app-border)] flex items-center justify-center"
            style={{ height: HEADER_HEIGHT }}
          >
            <Clock size={12} className="text-[var(--app-text-muted)]" />
          </div>
          {/* Project header cells (sticky top) — draggable for reordering */}
          {activeProjects.map(p => (
            <div
              key={`h-${p.id}`}
              className={cn(
                'sticky top-0 z-20 bg-[var(--app-surface-hover)] border-r border-b border-[var(--app-border)] last:border-r-0 grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-1.5 px-2',
                p.id !== 'none' && 'cursor-grab active:cursor-grabbing hover:bg-[var(--app-border)]/30',
                draggedProjectId === p.id && 'opacity-40'
              )}
              style={{ height: HEADER_HEIGHT }}
              title={p.id === 'none' ? `${p.name}` : `拖拽可排序 · ${p.name} (${dayTasks.filter(t => (p.id === 'none' ? !t.projectId : t.projectId === p.id)).length})`}
              draggable={p.id !== 'none'}
              onDragStart={e => handleProjectDragStart(e, p.id)}
              onDragOver={handleProjectDragOver}
              onDrop={e => handleProjectDrop(e, p.id)}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span
                className="text-[10px] text-[var(--app-text-secondary)] text-center leading-[1.15] overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-all',
                }}
              >
                {p.name}
              </span>
              <span className="text-[10px] text-[var(--app-text-muted)] shrink-0">
                {dayTasks.filter(t => (p.id === 'none' ? !t.projectId : t.projectId === p.id)).length}
              </span>
            </div>
          ))}

          {/* ===== Row 1: Body (FIXED HEIGHT, no ResizeObserver) ===== */}
          {/* Time axis column (sticky left) */}
          <div
            className="sticky left-0 z-10 relative bg-[var(--app-surface-hover)] border-r border-[var(--app-border)]"
            style={{ minHeight: 500 }}
          >
            {ALL_HOURS.map((h, i) => {
              const topPercent = minutesToPercent(h * 60);
              const isLast = i === ALL_HOURS.length - 1;
              const isFirst = i === 0;
              return (
                <div
                  key={h}
                  className={cn(
                    'absolute left-0 right-0 flex items-center justify-center text-[10px] text-[var(--app-text-muted)] font-medium leading-none',
                    isLast && 'items-end'
                  )}
                  style={{
                    top: isLast ? undefined : `${topPercent}%`,
                    bottom: isLast ? '4px' : undefined,
                    transform: isLast || isFirst ? 'none' : 'translateY(-50%)',
                  }}
                >
                  {h}点
                </div>
              );
            })}
          </div>

          {/* Project columns — each is a relative container with FIXED HEIGHT */}
          {activeProjects.map(p => {
            const colTasks = tasksByProject.get(p.id) || [];
            return (
              <div
                key={`b-${p.id}`}
                className="relative border-r border-[var(--app-border)] last:border-r-0"
                style={{ minHeight: 500 }}
              >
                {/* Horizontal grid lines */}
                {ALL_HOURS.map((h) => {
                  const topPercent = minutesToPercent(h * 60);
                  return (
                    <div
                      key={`grid-${h}`}
                      className="absolute left-0 right-0 border-b border-[var(--app-border)] opacity-30 pointer-events-none"
                      style={{ top: `${topPercent}%` }}
                    />
                  );
                })}

                {/* Current time line — visible in ALL columns */}
                {currentTimePx !== null && (
                  <div
                    className="absolute left-0 right-0 border-t-[1.5px] border-red-400 z-20 pointer-events-none"
                    style={{ top: `${currentTimePx}%` }}
                  />
                )}

                {/* Task blocks inside this column */}
                {colTasks.map((task) => {
                  const topPercent = minutesToPercent(task.startMinutes);
                  const heightPercent = Math.max(0.8, minutesToPercent(task.endMinutes) - minutesToPercent(task.startMinutes));
                  const colWidth = 100 / task.colTotal;
                  const leftPercent = task.colIndex * colWidth;

                  return (
                    <button
                      key={task.id}
                      onClick={() => onOpenEdit(task)}
                      className="absolute rounded-lg overflow-hidden transition-all duration-200 hover:brightness-110 hover:scale-[1.02] cursor-pointer shadow-sm text-left group"
                      style={{
                        top: `${topPercent}%`,
                        left: `${leftPercent + 3}%`,
                        width: `${colWidth - 6}%`,
                        height: `${heightPercent}%`,
                        backgroundColor: p.color,
                        opacity: task.completed ? 0.48 : 1,
                        minHeight: '28px',
                      }}
                      title={`${task.title} (${task.time} - ${task.duration || 60}分钟)`}
                    >
                      <div className="px-2 py-1 flex flex-col h-full justify-center min-h-0 overflow-hidden">
                        <span className={cn('text-[10px] font-semibold text-white truncate leading-tight', task.completed && 'line-through')}>
                          {task.title}
                        </span>
                        <span className="text-[9px] text-white/80 leading-none mt-0.5">
                          {task.time}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Dependency arrows — SVG overlay */}
                {(() => {
                  const arrows: { from: GanttTask; to: GanttTask }[] = [];
                  colTasks.forEach(toTask => {
                    if (!toTask.dependsOn || toTask.dependsOn.length === 0) return;
                    toTask.dependsOn.forEach(depId => {
                      const fromTask = colTasks.find(t => t.id === depId);
                      if (fromTask) {
                        arrows.push({ from: fromTask, to: toTask });
                      }
                    });
                  });
                  if (arrows.length === 0) return null;
                  return (
                    <svg
                      className="absolute inset-0 pointer-events-none z-10"
                      style={{ width: '100%', height: '100%' }}
                    >
                      {arrows.map(({ from, to }, i) => {
                        const fromTop = minutesToPercent(from.startMinutes) + Math.max(0.8, minutesToPercent(from.endMinutes) - minutesToPercent(from.startMinutes)) / 2;
                        const toTop = minutesToPercent(to.startMinutes);
                        const fromColWidth = 100 / from.colTotal;
                        const toColWidth = 100 / to.colTotal;
                        const fromLeft = (from.colIndex * fromColWidth + fromColWidth / 2) + '%';
                        const toLeft = (to.colIndex * toColWidth + toColWidth / 2) + '%';
                        return (
                          <line
                            key={`dep-${i}`}
                            x1={fromLeft}
                            y1={`${fromTop}%`}
                            x2={toLeft}
                            y2={`${toTop}%`}
                            stroke="var(--app-accent)"
                            strokeWidth={1.5}
                            strokeDasharray="4 2"
                            opacity={0.6}
                          />
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
