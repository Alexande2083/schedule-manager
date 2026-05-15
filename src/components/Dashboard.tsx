import { useMemo, memo, useCallback, useState } from 'react';
import {
  Check, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, List, BarChart3,
  Sun, Moon, Cloud,
  CircleDot, Trophy, Timer, LayoutGrid, Siren, Flag, Zap, Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import { format, parseISO } from 'date-fns';
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
import type { ScheduledTask } from '@/hooks/useLearningSystem';
import { useAppStore } from '@/store';

interface DashboardProps {
  onOpenEdit: (task: Task) => void;
  completedToday: number;
  templates?: TaskTemplate[];
  onGenerateSchedule?: (date: string) => ScheduledTask[];
  pendingTodayCount: number;
}

export const Dashboard = memo(function Dashboard({
  onOpenEdit, completedToday, templates,
  pendingTodayCount,
}: DashboardProps) {
  const allTasks = useAppStore(s => s.tasks);
  const selectedDate = useAppStore(s => s.selectedDate);
  const displayMode = useAppStore(s => s.displayMode);
  const onChangeDisplayMode = useAppStore(s => s.setDisplayMode);
  const filterTag = useAppStore(s => s.filterTag);
  const onFilterTag = useAppStore(s => s.setFilterTag);
  const onSelectDate = useAppStore(s => s.setSelectedDate);
  const onToggleTask = useAppStore(s => s.toggleTask);
  const onDeleteTask = useAppStore(s => s.deleteTask);
  const onEditTask = useAppStore(s => s.editTask);
  const onAddTask = useAppStore(s => s.addTask);
  const tags = useAppStore(s => s.tags);
  const projects = useAppStore(s => s.projects);
  const contexts = useAppStore(s => s.contexts);
  const onReorderProjects = useAppStore(s => s.setProjects);
  const onApplySchedule = useAppStore(s => s.applySchedule);
  const onAddSubTasks = useAppStore(s => s.addSubTasks);
  const onUpdatePriority = useAppStore(s => s.updatePriority);
  const onReschedule = useAppStore(s => s.reschedule);
  const [tagline, setTagline] = useState(() => localStorage.getItem('dashboard-tagline') || '把今天的事放在一个清楚的工作台里');

  // Apply context + project filters (same logic as previous App.tsx)
  const filterContext = useAppStore(s => s.filterContext);
  const filterProject = useAppStore(s => s.filterProject);
  const tasks = useMemo(() => {
    let result = allTasks;
    if (filterContext.length > 0) {
      result = result.filter(t => {
        if (t.contexts && t.contexts.some(c => filterContext.includes(c))) return true;
        if (t.parentId) {
          const parent = allTasks.find(pt => pt.id === t.parentId);
          if (parent?.contexts && parent.contexts.some(c => filterContext.includes(c))) return true;
        }
        return false;
      });
    }
    if (filterProject) {
      result = result.filter(t => t.projectId === filterProject || (!t.projectId && filterProject === 'none'));
    }
    return result;
  }, [allTasks, filterContext, filterProject]);

  // DEBUG: static fallback — remove to re-enable useAutoPlanner
  const autoPlan = {
    schedule: [], gaps: [], breakdownSuggestions: [], priorityUpdates: [], overdueTasks: [],
    morningBrief: { totalPending: 0, highPriority: 0, overdue: 0, estimatedMinutes: 0, suggestion: '', greeting: '欢迎回来' },
    scheduleReason: '',
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.date === selectedDate);
    if (filterTag) filtered = filtered.filter(t => t.tag === filterTag);
    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.order - b.order;
    });
  }, [tasks, selectedDate, filterTag]);

  const pendingTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);
  const completionRate = filteredTasks.length > 0
    ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;
  const selectedDateLabel = useMemo(() => {
    const date = parseISO(selectedDate);
    return `${format(date, 'M月d日')} · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}`;
  }, [selectedDate]);
  const plannedMinutes = useMemo(() =>
    pendingTasks.reduce((sum, task) => sum + (task.duration || 0), 0),
    [pendingTasks]
  );

  const handlePrevDay = () => {
    const d = parseISO(selectedDate); d.setDate(d.getDate() - 1);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };
  const handleNextDay = () => {
    const d = parseISO(selectedDate); d.setDate(d.getDate() + 1);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };

  const showGantt = displayMode === 'gantt';
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

  const quadrantGroups = useMemo(() => {
    const base = [
      { key: 'important-urgent', title: '重要紧急', tint: '#fee2e2', icon: Siren, iconColor: '#ef4444', tasks: [] as Task[] },
      { key: 'important-normal', title: '重要不紧急', tint: '#fef3c7', icon: Flag, iconColor: '#d97706', tasks: [] as Task[] },
      { key: 'normal-urgent', title: '紧急不重要', tint: '#ede9fe', icon: Zap, iconColor: '#7c3aed', tasks: [] as Task[] },
      { key: 'normal-normal', title: '不重要不紧急', tint: '#dcfce7', icon: Leaf, iconColor: '#16a34a', tasks: [] as Task[] },
    ];
    filteredTasks.forEach(task => {
      if (task.importance === 'important' && task.urgency === 'urgent') base[0].tasks.push(task);
      else if (task.importance === 'important') base[1].tasks.push(task);
      else if (task.urgency === 'urgent') base[2].tasks.push(task);
      else base[3].tasks.push(task);
    });
    return base;
  }, [filteredTasks]);

  const summaryCards = [
    {
      label: '待办',
      value: pendingTasks.length,
      icon: CircleDot,
      className: 'from-rose-50 to-orange-50 text-rose-600 border-rose-100',
    },
    {
      label: '已完成',
      value: completedToday,
      icon: Trophy,
      className: 'from-emerald-50 to-teal-50 text-emerald-600 border-emerald-100',
    },
    {
      label: '预计',
      value: plannedMinutes || 0,
      suffix: 'min',
      icon: Timer,
      className: 'from-sky-50 to-indigo-50 text-sky-600 border-sky-100',
    },
  ];

  return (
    <div className="px-4 py-4 md:p-6 max-w-[1600px] mx-auto space-y-5 md:space-y-6 animate-fade-in">
      {/* ── Page Title ── */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-4 py-4 shadow-sm md:px-5">
        <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
          <button onClick={handlePrevDay} className="btn-ghost h-9 w-9 justify-self-start" aria-label="前一天"><ChevronLeft size={16} /></button>
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">今日中心</p>
            <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--color-text)] md:text-3xl">{selectedDateLabel}</h1>
              <button onClick={handleNextDay} className="btn-ghost h-8 w-8" aria-label="后一天"><ChevronRight size={16} /></button>
            </div>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              onBlur={() => localStorage.setItem('dashboard-tagline', tagline.trim() || '把今天的事放在一个清楚的工作台里')}
              className="mt-1 w-full bg-transparent text-center text-xs text-[var(--color-text-muted)] outline-none transition-colors focus:text-[var(--color-text)] sm:text-left"
              aria-label="今日中心说明"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={cn('rounded-xl border bg-gradient-to-br px-3 py-2.5 shadow-sm', card.className)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-medium opacity-80">{card.label}</p>
                  <Icon size={13} className="opacity-75" />
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {card.value}<span className="ml-0.5 text-[10px] font-medium opacity-70">{card.suffix}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 1: Task List (primary) + Calendar sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tasks — 2/3 width */}
        <div
          className={cn(
            'xl:col-span-2 card dashboard-primary-card',
            showGantt && 'flex flex-col min-h-[720px]'
          )}
          style={{ padding: 'var(--space-6)' }}
        >
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">今日任务</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{pendingTasks.length} 个待办 · {completedTasks.length} 个完成 · {completionRate}%</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
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
            </div>
          </div>

          {/* Tag filter */}
          {Object.keys(tags).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {Object.entries(tags).map(([key, tag]) => (
                <button key={key} onClick={() => onFilterTag(filterTag === key ? null : key)}
                  className={cn('badge transition-colors duration-fast',
                    filterTag === key ? 'text-white' : 'border-transparent hover:brightness-95')}
                  style={filterTag === key
                    ? { background: tag.color }
                    : { background: `${tag.color}22`, color: tag.color }}>
                  {tag.label}
                </button>
              ))}
              {filterTag && (
                <button onClick={() => onFilterTag(null)} className="badge bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  × 清除
                </button>
              )}
            </div>
          )}

          {/* Add Task */}
          {!showGantt && <div className="mb-4"><AddTaskInput selectedDate={selectedDate} tags={tags} projects={projects} contexts={contexts} templates={templates} onAdd={onAddTask} /></div>}

          {/* Task List */}
          {showGantt ? (
            <div className="flex-1 min-h-[548px]">
              <GanttChart tasks={tasks} projects={projects} selectedDate={selectedDate} onOpenEdit={onOpenEdit} onReorderProjects={onReorderProjects} />
            </div>
          ) : rootTasks.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">暂无任务</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">在上方输入框添加今天的任务</p>
            </div>
          ) : (
            <div className="space-y-1">
              {rootTasks.map(task => (
                <div key={task.id} className="animate-fade-in">
                  <TaskItem
                    task={task} tags={tags} projects={projects} contexts={contexts} allTasks={filteredTasks}
                    onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={onEditTask}
                    onOpenEdit={onOpenEdit} getChildTasks={getChildTasks}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: Calendar + Weather */}
        <div className="space-y-4">
          <div className="card overflow-hidden" style={{ padding: 0 }}>
            <WeatherTimeWidget />
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <CalendarPanel tasks={tasks} selectedDate={selectedDate} onSelectDate={onSelectDate} tags={tags} />
          </div>
          {/* Compact time blocks */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={13} className="text-[var(--color-brand)]" />排程
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
        </div>
      </div>

      {/* ── Row 2: Auto Planner + Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Auto Planner + Quadrants */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="p-6">
            <DailyAutoPanel
              plan={autoPlan}
              onApplySchedule={onApplySchedule}
              onAddSubTasks={onAddSubTasks}
              onUpdatePriority={onUpdatePriority}
              onReschedule={onReschedule}
            />
          </div>

          <div className="border-t border-[var(--color-border)] px-6 py-4">
            <div className="rounded-card border border-[var(--color-border)] p-4" style={{ background: 'var(--color-bg-raised)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <LayoutGrid size={14} />
                </div>
                <span className="text-xs font-semibold text-[var(--color-text)]">四象限</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{pendingTodayCount} 个待办</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quadrantGroups.map(group => {
                  const GroupIcon = group.icon;
                  return (
                  <div key={group.key} className="min-h-[120px] rounded-xl border p-3" style={{ background: group.tint, borderColor: 'rgba(15,23,42,0.08)' }}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <GroupIcon size={13} style={{ color: group.iconColor }} />
                        {group.title}
                      </p>
                      <span className="text-[10px] text-slate-500">{group.tasks.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.tasks.length === 0 ? (
                        <p className="text-[11px] text-slate-400">暂无任务</p>
                      ) : group.tasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-2 rounded-lg bg-white/55 px-2 py-1.5">
                          <button
                            onClick={() => onToggleTask(task.id)}
                            className={cn(
                              'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 bg-white',
                              task.completed ? 'border-[var(--color-brand)]/40' : 'border-slate-300 hover:border-slate-400'
                            )}
                            aria-label={task.completed ? '标记未完成' : '标记完成'}
                          >
                            {task.completed && <Check size={10} strokeWidth={3} className="text-[var(--color-brand)]" />}
                          </button>
                          <button
                            onClick={() => onOpenEdit(task)}
                            className={cn('min-w-0 flex-1 truncate text-left text-[11px] text-slate-700', task.completed && 'line-through text-slate-400')}
                          >
                            {task.title}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">完成趋势</p>
            <TaskTrendChart tasks={tasks} embedded />
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">完成统计</p>
            <CompletionStatsPanel tasks={filteredTasks} projects={projects} />
          </div>
          <div className="card sm:col-span-2" style={{ padding: 'var(--space-4)' }}>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">活跃热力图</p>
            <HeatmapPanel tasks={tasks} compact />
          </div>
        </div>
      </div>
    </div>
  );
});
