import { useState, useRef, useMemo } from 'react';
import {
  Trash2, Clock, Tag, GripVertical, FolderOpen, Flag,
  AlertTriangle, Calendar, ChevronDown, ChevronRight, Square, CheckSquare,
  Monitor, Smartphone, Building2, Car, Users, Home, Link2, Check
} from 'lucide-react';
import { format, parseISO, isToday, isPast, differenceInDays } from 'date-fns';
import type { Task, Context } from '@/types';
import type { Project } from '@/types';
import { cn } from '@/lib/utils';

const CONTEXT_ICONS: Record<string, React.ElementType> = {
  Monitor, Smartphone, Building2, Car, Users, Home,
};

interface TaskItemProps {
  task: Task;
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  contexts?: Context[];
  allTasks?: Task[];
  collapsedTasks?: Set<string>;
  onToggleCollapsed?: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onOpenEdit: (task: Task) => void;
  getChildTasks?: (parentId: string) => Task[];
  level?: number;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function TaskItem({
  task, tags, projects, contexts, allTasks, collapsedTasks, onToggleCollapsed,
  onToggle, onDelete, onEdit, onOpenEdit, getChildTasks, level = 0,
  selected, selectionMode, onToggleSelect,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const tagInfo = tags[task.tag] || { label: task.tag, color: '#9ca3af' };
  const project = projects.find(p => p.id === task.projectId);
  // Multi-context support
  const taskContexts = contexts?.filter(c => task.contexts?.includes(c.id)) || [];

  // Get child tasks
  const children = getChildTasks ? getChildTasks(task.id) : [];
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedTasks?.has(task.id) ?? false;

  const getDeadlineInfo = () => {
    if (!task.deadline) return null;
    const d = parseISO(task.deadline);
    if (isToday(d)) return { text: '今天截止', color: 'text-red-500', bg: 'bg-red-50' };
    if (isPast(d)) return { text: `逾期 ${Math.abs(differenceInDays(d, new Date()))} 天`, color: 'text-red-600', bg: 'bg-red-50' };
    const days = differenceInDays(d, new Date());
    if (days === 0) return { text: '今天截止', color: 'text-red-500', bg: 'bg-red-50' };
    if (days === 1) return { text: '明天截止', color: 'text-orange-500', bg: 'bg-orange-50' };
    if (days <= 3) return { text: `${days}天后截止`, color: 'text-orange-500', bg: 'bg-orange-50' };
    return { text: `${format(d, 'M/d')}`, color: 'text-[var(--app-text-muted)]', bg: 'bg-[var(--app-surface-hover)]' };
  };

  const deadlineInfo = getDeadlineInfo();

  // Dependency status
  const dependencyTasks = useMemo(() => {
    if (!task.dependsOn || task.dependsOn.length === 0) return [];
    return (allTasks || []).filter(t => task.dependsOn!.includes(t.id));
  }, [task.dependsOn, allTasks]);

  const allDepsCompleted = dependencyTasks.length > 0 && dependencyTasks.every(t => t.completed);
  const waitingCount = dependencyTasks.filter(t => !t.completed).length;

  const handleDoubleClick = () => {
    if (!task.completed) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(task.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  const handleClickContent = () => {
    if (isEditing) return;
    onOpenEdit(task);
  };

  return (
    <div>
      {/* Selection checkbox */}
      {selectionMode && (
        <button
          onClick={() => onToggleSelect?.(task.id)}
          className="float-left mt-3.5 mr-2 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] transition-colors"
        >
          {selected ? <CheckSquare size={18} className="text-[var(--app-accent)]" /> : <Square size={18} />}
        </button>
      )}

      <div
        className={cn(
          'group flex items-start gap-3 p-3.5 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] hover:border-[var(--app-border-hover)]/30 transition-all duration-200 hover:shadow-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
          task.completed && 'opacity-55 bg-[var(--app-surface-hover)]',
          level > 0 && 'ml-7 border-l-[3px] border-l-[var(--app-accent)]/25'
        )}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={() => onToggleCollapsed?.(task.id)}
            className="mt-0.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors shrink-0"
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
        ) : (
          <div className="w-3.5 shrink-0" />
        )}

        {/* Drag handle */}
        <div
          className="mt-0.5 cursor-grab active:cursor-grabbing text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors shrink-0"
        >
          <GripVertical size={15} />
        </div>

        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            'mt-0.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-200 shrink-0 bg-white',
            task.completed
              ? 'border-[var(--app-accent)]/40'
              : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
          )}
          aria-label={task.completed ? '标记未完成' : '标记完成'}
        >
          {task.completed && <Check size={13} strokeWidth={3} className="text-[var(--app-accent)]" />}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full text-sm font-medium text-[var(--app-text)] bg-transparent outline-none border-b border-[var(--app-accent)]"
            />
          ) : (
            <div
              onDoubleClick={handleDoubleClick}
              onClick={handleClickContent}
              className="cursor-pointer"
            >
              <span
                className={cn(
                  'text-sm font-medium leading-relaxed transition-all duration-300',
                  task.completed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
                )}
              >
                {task.title}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {task.time && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--app-text-muted)]">
                <Clock size={10} />
                {task.time} · {task.duration || 60}min
              </span>
            )}

            {/* Tag */}
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: tagInfo.color }}
            >
              <Tag size={8} className="mr-0.5" />
              {tagInfo.label}
            </span>

            {/* Project */}
            {project && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--app-text-muted)]">
                <FolderOpen size={9} style={{ color: project.color }} />
                {project.name}
              </span>
            )}

            {/* Contexts (multi-select) */}
            {taskContexts.map((ctx) => {
              const CtxIcon = CONTEXT_ICONS[ctx.icon] || Monitor;
              return (
                <span
                  key={ctx.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: ctx.color }}
                >
                  <CtxIcon size={8} />
                  @{ctx.label}
                </span>
              );
            })}

            {/* Importance */}
            {task.importance === 'important' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600">
                <Flag size={8} />
                重要
              </span>
            )}

            {/* Urgency */}
            {task.urgency === 'urgent' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-600">
                <AlertTriangle size={8} />
                紧急
              </span>
            )}

            {/* Deadline */}
            {deadlineInfo && (
              <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium', deadlineInfo.bg, deadlineInfo.color)}>
                <Calendar size={8} />
                {deadlineInfo.text}
              </span>
            )}

            {/* Repeat */}
            {task.repeat && task.repeat !== 'none' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600">
                重复
              </span>
            )}

            {/* Subtask count */}
            {hasChildren && (
              <span className="text-[11px] text-[var(--app-text-muted)]">
                {children.filter(c => c.completed).length}/{children.length} 子任务
              </span>
            )}

            {/* Dependency status */}
            {dependencyTasks.length > 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                  allDepsCompleted
                    ? 'bg-green-50 text-green-600'
                    : 'bg-amber-50 text-amber-600'
                )}
                title={dependencyTasks.map(t => t.title).join('、')}
              >
                <Link2 size={8} />
                {allDepsCompleted
                  ? '依赖已完成'
                  : `等待 ${waitingCount} 个依赖`
                }
              </span>
            )}

            {task.pomodoros > 0 && (
              <span className="text-[11px] text-[var(--app-accent)] font-medium">
                {task.pomodoros} 番茄
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0 self-start"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Recursive children */}
      {hasChildren && !isCollapsed && children.map(child => (
        <TaskItem
          key={child.id}
          task={child}
          tags={tags}
          projects={projects}
          contexts={contexts}
          allTasks={allTasks}
          collapsedTasks={collapsedTasks}
          onToggleCollapsed={onToggleCollapsed}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
          onOpenEdit={onOpenEdit}
          getChildTasks={getChildTasks}
          level={level + 1}
        />
      ))}
    </div>
  );
}
