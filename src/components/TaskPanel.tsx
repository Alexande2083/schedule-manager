import { useState, useMemo, useCallback } from 'react';
import { parseISO, startOfWeek, endOfWeek, isWithinInterval, format } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Flame, List, BarChart3 } from 'lucide-react';
import type { Task, DisplayMode, Context } from '@/types';
import type { Project } from '@/types';
import type { TaskTemplate } from '@/hooks/useTaskTemplates';
import { formatDisplayDate, isToday as checkIsToday } from '@/utils/date';
import { cn } from '@/lib/utils';
import { TaskItem } from './TaskItem';
import { AddTaskInput } from './AddTaskInput';
import { GanttChart } from './GanttChart';
import { TaskEditModal } from './TaskEditModal';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { HeatmapPanel } from './HeatmapPanel';
import { CompletionStatsPanel } from './CompletionStatsPanel';
import { TaskTrendChart } from './TaskTrendChart';
import { CompletedTasksList } from './CompletedTasksList';
import { WeatherTimeWidget } from './WeatherTimeWidget';

interface TaskPanelProps {
  tasks: Task[];
  selectedDate: string;
  view: string;
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  filterTag: string | null;
  onFilterTag?: (tag: string | null) => void;
  filterProject?: string | null;
  onSelectDate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, title: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => void;
  onReorderTasks: (tasks: Task[]) => void;
  completedToday: number;
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  contexts?: Context[];
  onOpenEdit?: (task: Task) => void;
  selectedTaskIds?: string[];
  onToggleTaskSelection?: (id: string) => void;
  selectionMode?: boolean;
  templates?: TaskTemplate[];
  onReorderProjects?: (projects: Project[]) => void;
}

export function TaskPanel({
  tasks,
  selectedDate,
  view,
  displayMode,
  onChangeDisplayMode,
  filterTag,
  filterProject,
  onFilterTag,
  onSelectDate,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onAddTask,
  onReorderTasks,
  completedToday,
  tags,
  projects,
  contexts,
  onOpenEdit,
  selectedTaskIds,
  onToggleTaskSelection,
  selectionMode,
  templates,
  onReorderProjects,
}: TaskPanelProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // Filter tasks by view/tag/project
  const allFilteredTasks = useMemo(() => {
    let filtered = tasks;

    if (view === 'today') {
      filtered = filtered.filter(t => t.date === selectedDate);
    } else if (view === 'week') {
      const now = new Date();
      filtered = filtered.filter(t =>
        isWithinInterval(parseISO(t.date), {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        })
      );
    } else if (view === 'completed') {
      filtered = filtered.filter(t => t.completed);
    }

    if (filterTag) {
      filtered = filtered.filter(t => t.tag === filterTag);
    }

    if (filterProject) {
      filtered = filtered.filter(t => t.projectId === filterProject);
    }

    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.order - b.order;
    });
  }, [tasks, selectedDate, view, filterTag, filterProject]);

  // Build tree: only root-level tasks (no parent or parent not in filtered set)
  const filteredIds = useMemo(() => new Set(allFilteredTasks.map(t => t.id)), [allFilteredTasks]);
  const rootTasks = useMemo(() => {
    return allFilteredTasks.filter(t => !t.parentId || !filteredIds.has(t.parentId));
  }, [allFilteredTasks, filteredIds]);

  // Get child tasks for a parent
  const getChildTasks = useCallback((parentId: string) => {
    return allFilteredTasks
      .filter(t => t.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }, [allFilteredTasks]);

  const toggleCollapsed = (id: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrevDay = () => {
    const d = parseISO(selectedDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const d = parseISO(selectedDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = allFilteredTasks.findIndex(t => t.id === active.id);
    const newIndex = allFilteredTasks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newFiltered = [...allFilteredTasks];
    const [removed] = newFiltered.splice(oldIndex, 1);
    newFiltered.splice(newIndex, 0, removed);

    const minOrder = Math.min(...newFiltered.map(t => t.order));
    const reorderedWithNewOrders = newFiltered.map((t, idx) => ({
      ...t,
      order: minOrder + idx,
    }));

    const fullTasks = tasks.map(t => {
      const reordered = reorderedWithNewOrders.find(rt => rt.id === t.id);
      return reordered || t;
    });

    onReorderTasks(fullTasks);
  }, [allFilteredTasks, tasks, onReorderTasks]);

  const getTitle = () => {
    if (view === 'today') {
      if (checkIsToday(selectedDate)) return '今天';
      return formatDisplayDate(selectedDate);
    }
    if (view === 'week') return '本周任务';
    if (view === 'completed') return '已完成';
    return '';
  };

  const getSubtitle = () => {
    const count = allFilteredTasks.filter(t => !t.completed).length;
    return `${count} 个待办`;
  };

  const showGantt = view === 'today' && displayMode === 'gantt';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            {view === 'today' && (
              <>
                <button
                  onClick={handlePrevDay}
                  className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-xl font-bold text-[var(--app-text)]">{getTitle()}</h2>
                <button
                  onClick={handleNextDay}
                  className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            {view !== 'today' && (
              <h2 className="text-xl font-bold text-[var(--app-text)]">{getTitle()}</h2>
            )}
          </div>
          <p className="text-sm text-[var(--app-text-muted)] mt-0.5 ml-1">{getSubtitle()}</p>
        </div>

        <div className="flex items-center gap-3">
          {view === 'today' && (
            <div className="flex items-center bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)] p-0.5">
              <button
                onClick={() => onChangeDisplayMode('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    displayMode === 'list'
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                )}
              >
                <List size={13} />
                列表
              </button>
              <button
                onClick={() => onChangeDisplayMode('gantt')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  displayMode === 'gantt'
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                )}
              >
                <BarChart3 size={13} />
                甘特图
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)] text-xs text-[var(--app-text-secondary)]">
            <Flame size={14} className="text-[var(--app-accent)]" />
            <span>今日 {completedToday} 个番茄</span>
          </div>
        </div>
      </div>

      {/* Tag filter bar */}
      {view !== 'completed' && Object.keys(tags).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {Object.entries(tags).map(([key, tag]) => {
            const isActive = filterTag === key;
            return (
              <button
                key={key}
                onClick={() => onFilterTag?.(isActive ? null : key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                  isActive
                    ? 'text-white border-transparent'
                    : 'text-[var(--app-text-secondary)] border-[var(--app-border)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)]'
                )}
                style={isActive ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
              >
                {tag.label}
              </button>
            );
          })}
          {filterTag && (
            <button
              onClick={() => onFilterTag?.(null)}
              className="px-2 py-1 rounded-full text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] border border-[var(--app-border)] transition-all"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* Add Task */}
      {view !== 'completed' && !showGantt && (
        <div className="mb-4">
          <AddTaskInput selectedDate={selectedDate} tags={tags} projects={projects} contexts={contexts} templates={templates} onAdd={onAddTask} />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {view === 'completed' && (
          <div className="space-y-5">
            {/* Row 1: Heatmap */}
            <HeatmapPanel tasks={tasks} />
            {/* Row 2: Completion Ring + Project Bar */}
            <CompletionStatsPanel tasks={tasks} projects={projects} />
            {/* Row 3: Task Trend (Bar + Line) */}
            <TaskTrendChart tasks={tasks} />
            {/* Row 4: Recent Completed Tasks */}
            <CompletedTasksList tasks={tasks} projects={projects} tags={tags} onOpenEdit={onOpenEdit || (() => {})} />
          </div>
        )}
        {showGantt ? (
          <GanttChart
            tasks={tasks}
            projects={projects}
            selectedDate={selectedDate}
            onOpenEdit={onOpenEdit || (() => {})}
            onReorderProjects={onReorderProjects}
          />
        ) : (
          <div className="space-y-2.5">
            {rootTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays size={48} className="text-[var(--app-border)] mb-4" />
                <p className="text-sm text-[var(--app-text-muted)]">
                  {view === 'completed' ? '还没有已完成的任务' : '这一天还没有任务，添加一个吧'}
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={rootTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {rootTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      tags={tags}
                      projects={projects}
                      contexts={contexts}
                      allTasks={tasks}
                      collapsedTasks={collapsedTasks}
                      onToggleCollapsed={toggleCollapsed}
                      onToggle={onToggleTask}
                      onDelete={onDeleteTask}
                      onEdit={onEditTask}
                      onOpenEdit={setEditingTask}
                      getChildTasks={getChildTasks}
                      selected={selectedTaskIds?.includes(task.id)}
                      selectionMode={selectionMode}
                      onToggleSelect={onToggleTaskSelection}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {view === 'today' && <WeatherTimeWidget />}
          </div>
        )}
      </div>

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />
    </div>
  );
}

// Sortable wrapper for TaskItem
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTaskItem({ task, ...props }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 0.98 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem task={task} {...props} />
    </div>
  );
}
