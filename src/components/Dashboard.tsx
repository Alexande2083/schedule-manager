import { useMemo, memo, useCallback } from 'react';
import {
  CheckCircle2, Clock, Sparkles,
  ChevronLeft, ChevronRight, List, BarChart3,
  Sun, Moon, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, DisplayMode } from '@/types';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { AddTaskInput } from './AddTaskInput';
import { TaskItem } from './TaskItem';
import { GanttChart } from './GanttChart';
import { WeatherTimeWidget } from './WeatherTimeWidget';
import { CalendarPanel } from './CalendarPanel';
import { DailyAutoPanel } from './DailyAutoPanel';
import { TaskTrendChart } from './TaskTrendChart';
import { CompletionStatsPanel } from './CompletionStatsPanel';
import { HeatmapPanel } from './HeatmapPanel';
import type { TaskTemplate } from '@/hooks/useTaskTemplates';

interface DashboardProps {
  tasks: Task[];
  selectedDate: string;
  view: 'today' | 'week';
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  filterTag: string | null;
  onFilterTag?: (tag: string | null) => void;
  onSelectDate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, title: string) => void;
  onEditFullTask: (id: string, updates: Partial<Task>) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => void;
  onReorderTasks: (tasks: Task[]) => void;
  onOpenEdit: (task: Task) => void;
  completedToday: number;
  tags: Record<string, { label: string; color: string }>;
  projects: import('@/types').Project[];
  contexts?: import('@/types').Context[];
  templates?: TaskTemplate[];
  onReorderProjects?: (projects: import('@/types').Project[]) => void;
  onApplySchedule?: (updates: { id: string; time: string }[]) => void;
  onAddSubTasks?: (parentId: string, steps: string[]) => void;
  onUpdatePriority?: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;
  onReschedule?: (id: string, date: string) => void;
}

export const Dashboard = memo(function Dashboard({
  tasks, selectedDate, view, displayMode, onChangeDisplayMode,
  filterTag, onFilterTag, onSelectDate,
  onToggleTask, onDeleteTask, onEditTask,
  onAddTask, onOpenEdit,
  completedToday, tags, projects, contexts, templates, onReorderProjects,
  onApplySchedule, onAddSubTasks, onUpdatePriority, onReschedule,
}: DashboardProps) {
  const isTodayView = view === 'today';

  // DEBUG: static fallback — remove to re-enable useAutoPlanner
  const autoPlan = {
    schedule: [], gaps: [], breakdownSuggestions: [], priorityUpdates: [], overdueTasks: [],
    morningBrief: { totalPending: 0, highPriority: 0, overdue: 0, estimatedMinutes: 0, suggestion: '', greeting: '欢迎回来' },
    scheduleReason: '',
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (isTodayView) {
      filtered = filtered.filter(t => t.date === selectedDate);
    } else {
      const now = new Date();
      filtered = filtered.filter(t =>
        isWithinInterval(parseISO(t.date), {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        })
      );
    }
    if (filterTag) filtered = filtered.filter(t => t.tag === filterTag);
    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.order - b.order;
    });
  }, [tasks, selectedDate, view, filterTag]);

  const pendingTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);
  const completionRate = filteredTasks.length > 0
    ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;

  const handlePrevDay = () => {
    if (!isTodayView) return;
    const d = parseISO(selectedDate); d.setDate(d.getDate() - 1);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };
  const handleNextDay = () => {
    if (!isTodayView) return;
    const d = parseISO(selectedDate); d.setDate(d.getDate() + 1);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };

  const showGantt = isTodayView && displayMode === 'gantt';
  const filteredIds = useMemo(() => new Set(filteredTasks.map(t => t.id)), [filteredTasks]);
  const rootTasks = useMemo(() =>
    filteredTasks.filter(t => !t.parentId || !filteredIds.has(t.parentId)),
    [filteredTasks, filteredIds]
  );
  const getChildTasks = useCallback((parentId: string) =>
    filteredTasks.filter(t => t.parentId === parentId).sort((a, b) => a.order - b.order),
    [filteredTasks]
  );

  const timeBlocks = useMemo(() => {
    const blocks = [
      { label: '上午', icon: Sun, range: '06:00–12:00', color: 'amber', tasks: [] as Task[] },
      { label: '下午', icon: Cloud, range: '12:00–18:00', color: 'sky', tasks: [] as Task[] },
      { label: '晚上', icon: Moon, range: '18:00–24:00', color: 'indigo', tasks: [] as Task[] },
    ];
    pendingTasks.filter(t => t.time).forEach(t => {
      const hour = parseInt(t.time!.split(':')[0]);
      if (hour < 12) blocks[0].tasks.push(t);
      else if (hour < 18) blocks[1].tasks.push(t);
      else blocks[2].tasks.push(t);
    });
    return blocks;
  }, [pendingTasks]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      {/* ── Page Title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">{isTodayView ? 'Today' : '本周概览'}</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {isTodayView
              ? `${pendingTasks.length} pending · ${completedToday} completed · ${completionRate}% done`
              : `${pendingTasks.length} pending`}
          </p>
        </div>
        {isTodayView && (
          <div className="flex items-center gap-1">
            <button onClick={handlePrevDay} className="btn-ghost"><ChevronLeft size={16} /></button>
            <button onClick={handleNextDay} className="btn-ghost"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* ── Row: Auto Planner + Time Blocks ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Auto Planner (Level 1) — Today only */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="p-6">
            {isTodayView ? (
              <DailyAutoPanel
                plan={autoPlan}
                onApplySchedule={onApplySchedule || (() => {})}
                onAddSubTasks={onAddSubTasks || (() => {})}
                onUpdatePriority={onUpdatePriority || (() => {})}
                onReschedule={onReschedule || (() => {})}
              />
            ) : (
              <div className="py-8 text-center">
                <Sparkles size={28} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">切换到 Today 视图查看自动规划</p>
              </div>
            )}
          </div>
        </div>

        {/* Time Blocks + Weather + Calendar (Level 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Time Blocks */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={13} className="text-[var(--color-brand)]" />时间安排
            </h2>
            <div className="space-y-3">
              {timeBlocks.map((block, idx) => {
                const Icon = block.icon;
                const colors: Record<string, string> = {
                  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                };
                return (
                  <div key={block.label} className="flex gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn('w-7 h-7 rounded-btn flex items-center justify-center border', colors[block.color])}>
                        <Icon size={13} />
                      </div>
                      {idx < 2 && <div className="w-px flex-1 bg-[var(--color-border)]" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--color-text)]">{block.label}</span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">{block.range}</span>
                      </div>
                      {block.tasks.length > 0 ? block.tasks.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-fast">
                          <span className="w-1 h-1 rounded-full" style={{ background: tags[t.tag]?.color || '#6366f1' }} />
                          <span className="truncate flex-1">{t.title}</span>
                          <span className="text-[var(--color-text-muted)]">{t.time}</span>
                        </div>
                      )) : <p className="text-[11px] text-[var(--color-text-muted)]">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weather */}
          <div className="card overflow-hidden" style={{ padding: 0 }}>
            <WeatherTimeWidget />
          </div>

          {/* Calendar — full width on small */}
          <div className="card sm:col-span-2" style={{ padding: 'var(--space-4)' }}>
            <h2 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">日历</h2>
            <CalendarPanel tasks={tasks} selectedDate={selectedDate} onSelectDate={onSelectDate} tags={tags} />
          </div>
        </div>
      </div>

      {/* ── Row: Analytics (Level 2) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">完成趋势</p>
          <TaskTrendChart tasks={tasks} embedded />
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">完成统计</p>
          <CompletionStatsPanel tasks={filteredTasks} projects={projects} />
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">活跃热力图</p>
          <HeatmapPanel tasks={tasks} compact />
        </div>
      </div>

      {/* ── Tasks (Level 1) ── */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg">所有任务</h2>
            <p className="text-xs text-[var(--color-text-muted)]">{pendingTasks.length} pending · {completedTasks.length} completed</p>
          </div>
          <div className="flex items-center gap-2">
            {isTodayView && (
              <div className="flex items-center bg-[var(--color-bg)] rounded-btn border border-[var(--color-border)] p-0.5">
                <button onClick={() => onChangeDisplayMode('list')}
                  className={cn('px-3 py-1.5 rounded-btn text-xs font-medium transition-colors duration-fast',
                    displayMode === 'list' ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')}>
                  <List size={12} className="inline mr-1" />列表
                </button>
                <button onClick={() => onChangeDisplayMode('gantt')}
                  className={cn('px-3 py-1.5 rounded-btn text-xs font-medium transition-colors duration-fast',
                    displayMode === 'gantt' ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')}>
                  <BarChart3 size={12} className="inline mr-1" />甘特图
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tag filter */}
        {Object.keys(tags).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {Object.entries(tags).map(([key, tag]) => (
              <button key={key} onClick={() => onFilterTag?.(filterTag === key ? null : key)}
                className={cn('badge transition-colors duration-fast',
                  filterTag === key ? 'text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')}
                style={filterTag === key ? { background: tag.color } : undefined}>
                {tag.label}
              </button>
            ))}
            {filterTag && (
              <button onClick={() => onFilterTag?.(null)} className="badge bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                × 清除
              </button>
            )}
          </div>
        )}

        {/* Add Task */}
        {!showGantt && <div className="mb-4"><AddTaskInput selectedDate={selectedDate} tags={tags} projects={projects} contexts={contexts} templates={templates} onAdd={onAddTask} /></div>}

        {/* Task List */}
        {showGantt ? (
          <GanttChart tasks={tasks} projects={projects} selectedDate={selectedDate} onOpenEdit={onOpenEdit || (() => {})} onReorderProjects={onReorderProjects} />
        ) : rootTasks.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">暂无任务</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{isTodayView ? '在上方输入框添加今天的任务' : '本周暂无任务'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rootTasks.map(task => (
              <div key={task.id} className="animate-fade-in">
                <TaskItem
                  task={task} tags={tags} projects={projects} contexts={contexts} allTasks={filteredTasks}
                  onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={onEditTask}
                  onOpenEdit={onOpenEdit || (() => {})} getChildTasks={getChildTasks}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
