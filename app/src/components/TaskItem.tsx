import { useState, useRef } from 'react';
import {
  Check, Trash2, Clock, Tag, GripVertical, FolderOpen, Flag,
  AlertTriangle, Calendar, ChevronDown, ChevronRight, Square, CheckSquare,
  Monitor, Smartphone, Building2, Car, Users, Home
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
  task, tags, projects, contexts, collapsedTasks, onToggleCollapsed,
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
          className="float-left mt-3.5 mr-2 text-[var(--app-text-muted)] hover:text-[#d4857a] transition-colors"
        >
          {selected ? <CheckSquare size={18} className="text-[#d4857a]" /> : <Square size={18} />}
        </button>
      )}

      <div
        className={cn(
          'glass-panel group flex items-start gap-2 p-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] hover:border-[var(--app-border-hover)]/30 transition-all duration-200 hover:shadow-sm',
          task.completed && 'opacity-60 bg-[var(--app-surface-hover)]',
          level > 0 && 'ml-6 border-l-2 border-l-[var(--app-accent)]/20'
        )}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={() => onToggleCollapsed?.(task.id)}
            className="mt-0.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors shrink-0"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Drag handle */}
        <div
          className="mt-0.5 cursor-grab active:cursor-grabbing text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors shrink-0"
        >
          <GripVertical size={16} />
        </div>

        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 shrink-0',
            task.completed
              ? 'bg-[#8cc68a] border-[#8cc68a]'
              : 'border-[var(--app-border)] hover:border-[#d4857a]'
          )}
        >
          {task.completed && <Check size={12} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full text-sm font-medium text-[var(--app-text)] bg-transparent outline-none border-b border-[#d4857a]"
            />
          ) : (
            <div
              onDoubleClick={handleDoubleClick}
              onClick={handleClickContent}
              className="cursor-pointer"
            >
              <span
                className={cn(
                  'text-sm font-medium transition-all duration-300',
                  task.completed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
                )}
              >
                {task.title}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.time && (
              <span className="flex items-center gap-1 text-xs text-[var(--app-text-muted)]">
                <Clock size={10} />
                {task.time} · {task.duration || 60}min
              </span>
            )}

            {/* Tag */}
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: tagInfo.color }}
            >
              <Tag size={8} className="mr-1" />
              {tagInfo.label}
            </span>

            {/* Project */}
            {project && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--app-text-muted)]">
                <FolderOpen size={8} style={{ color: project.color }} />
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
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                <Flag size={8} />
                重要
              </span>
            )}

            {/* Urgency */}
            {task.urgency === 'urgent' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
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
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                重复
              </span>
            )}

            {/* Subtask count */}
            {hasChildren && (
              <span className="text-[10px] text-[var(--app-text-muted)]">
                {children.filter(c => c.completed).length}/{children.length} 子任务
              </span>
            )}

            {task.pomodoros > 0 && (
              <span className="text-xs text-[#d4857a] font-medium">
                {task.pomodoros} 番茄
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0"
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
