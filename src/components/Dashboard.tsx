import { useMemo, memo, useCallback, useState } from 'react';
import {
  CheckCircle2, Clock,
  ChevronLeft, ChevronRight, List, BarChart3,
  Sun, Moon, Cloud, Zap, ArrowRight, Target,
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
import type { ScheduledTask, WeeklyPlanData } from '@/hooks/useLearningSystem';
import { useAppStore } from '@/store';

interface DashboardProps {
  onOpenEdit: (task: Task) => void;
  completedToday: number;
  templates?: TaskTemplate[];
  onGenerateSchedule?: (date: string) => ScheduledTask[];
  onGeneratePlan?: (goal: string) => WeeklyPlanData;
  pendingTodayCount: number;
}

export const Dashboard = memo(function Dashboard({
  onOpenEdit, completedToday, templates,
  onGenerateSchedule, onGeneratePlan, pendingTodayCount,
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

  // ─── Inline Smart Scheduler state ───
  const [schedulerResult, setSchedulerResult] = useState<ScheduledTask[] | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);

  const handleRunScheduler = () => {
    if (!onGenerateSchedule) return;
    setSchedulerLoading(true);
    setTimeout(() => {
      setSchedulerResult(onGenerateSchedule(selectedDate));
      setSchedulerLoading(false);
    }, 300);
  };

  // ─── Inline Weekly Plan state ───
  const [planGoal, setPlanGoal] = useState('');
  const [planResult, setPlanResult] = useState<WeeklyPlanData | null>(null);
  const [planGenerating, setPlanGenerating] = useState(false);

  const handleGeneratePlan = () => {
    if (!onGeneratePlan || !planGoal.trim()) return;
    setPlanGenerating(true);
    setTimeout(() => {
      setPlanResult(onGeneratePlan(planGoal.trim()));
      setPlanGenerating(false);
    }, 300);
  };

  const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const totalSchedulerMinutes = schedulerResult?.reduce((sum, t) => sum + t.duration, 0) || 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      {/* ── Page Title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Today</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {pendingTasks.length} pending · {completedToday} completed · {completionRate}% done
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handlePrevDay} className="btn-ghost"><ChevronLeft size={16} /></button>
          <button onClick={handleNextDay} className="btn-ghost"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* ── Row 1: Task List (primary) + Calendar sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tasks — 2/3 width */}
        <div className="xl:col-span-2 card" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg">所有任务</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{pendingTasks.length} pending · {completedTasks.length} completed</p>
            </div>
            <div className="flex items-center gap-2">
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
                    filterTag === key ? 'text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]')}
                  style={filterTag === key ? { background: tag.color } : undefined}>
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
            <GanttChart tasks={tasks} projects={projects} selectedDate={selectedDate} onOpenEdit={onOpenEdit} onReorderProjects={onReorderProjects} />
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
            <h2 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">日历</h2>
            <CalendarPanel tasks={tasks} selectedDate={selectedDate} onSelectDate={onSelectDate} tags={tags} />
          </div>
          {/* Compact time blocks */}
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
        </div>
      </div>

      {/* ── Row 2: Auto Planner + Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Auto Planner + Smart Scheduler + Weekly Plan */}
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

          <div className="border-t border-[var(--color-border)] px-6 py-4 space-y-3">
              {/* Scheduler */}
              <div className="rounded-card border border-[var(--color-border)] p-4"
                style={{ background: 'var(--color-bg-raised)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#22c55e' }}>
                      <Zap size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text)]">智能排程</span>
                    {schedulerResult && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">{schedulerResult.length}项 · {totalSchedulerMinutes}min</span>
                    )}
                  </div>
                  <button
                    onClick={handleRunScheduler}
                    disabled={schedulerLoading || pendingTodayCount === 0}
                    className="px-3 py-1.5 rounded text-[10px] font-medium text-white transition-colors duration-fast shrink-0"
                    style={{ background: schedulerLoading ? '#86d6a0' : '#22c55e' }}
                  >
                    {schedulerLoading ? '分析中...' : `排程 (${pendingTodayCount})`}
                  </button>
                </div>
                {schedulerResult && schedulerResult.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {schedulerResult.map((task) => {
                      const TimeIcon = (() => {
                        const h = task.time.split(':')[0];
                        if (['08','09','10','11'].includes(h)) return Sun;
                        if (['12','13','14','15','16','17'].includes(h)) return Cloud;
                        return Moon;
                      })();
                      return (
                        <div key={task.id} className="flex items-center gap-2 px-2 py-1 rounded text-[11px]" style={{ background: 'var(--color-bg)' }}>
                          <TimeIcon size={10} className="text-[var(--color-text-muted)]" />
                          <span className="font-mono text-[var(--color-brand)] w-9 shrink-0">{task.time}</span>
                          <span className="text-[var(--color-text)] truncate flex-1">{task.title}</span>
                          <span className="text-[var(--color-text-muted)]">{task.duration}m</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {schedulerResult && schedulerResult.length === 0 && (
                  <p className="text-[11px] text-[var(--color-text-muted)] text-center py-2">暂无排程建议</p>
                )}
              </div>

              {/* Weekly Plan */}
              <div className="rounded-card border border-[var(--color-border)] p-4"
                style={{ background: 'var(--color-bg-raised)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#8b5cf6' }}>
                    <Target size={12} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text)]">周计划</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    value={planGoal}
                    onChange={e => setPlanGoal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGeneratePlan()}
                    placeholder="输入目标，AI拆分到每天"
                    className="input text-xs flex-1"
                    style={{ height: '32px' }}
                  />
                  <button
                    onClick={handleGeneratePlan}
                    disabled={planGenerating || !planGoal.trim()}
                    className="px-3 py-1.5 rounded text-[10px] font-medium text-white transition-colors duration-fast shrink-0"
                    style={{ background: planGenerating ? '#b09beb' : '#8b5cf6' }}
                  >
                    {planGenerating ? '生成中' : '生成计划'} <ArrowRight size={10} className="inline ml-0.5" />
                  </button>
                </div>
                {planResult && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {planResult.days.slice(0, 7).map((dayPlan, i) => (
                      <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded text-[11px]" style={{ background: 'var(--color-bg)' }}>
                        <span className="text-[var(--color-brand)] font-medium w-8 shrink-0">{DAY_LABELS[i] || `D${i+1}`}</span>
                        <span className="text-[var(--color-text)]">{dayPlan.focusArea || dayPlan.dayLabel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* Right: Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
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
      </div>
    </div>
  );
});
