import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isToday, startOfWeek, endOfWeek, isWithinInterval, isPast } from 'date-fns';
import {
  Flame, CalendarClock, AlertTriangle, Briefcase, Coffee, Flag,
  Plus, X, Check, Eye, Trash2, ChevronDown, ChevronRight, ChevronDown as ChevronDownIcon,
  Monitor, Smartphone, Building2, Car, Users, Home
} from 'lucide-react';
import type { Task, Perspective } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Flame, CalendarClock, AlertTriangle, Briefcase, Coffee, Flag,
  Monitor, Smartphone, Building2, Car, Users, Home, Eye,
};

interface PerspectivesPanelProps {}

export function PerspectivesPanel({}: PerspectivesPanelProps) {
  const tasks = useAppStore(s => s.tasks);
  const perspectives = useAppStore(s => s.perspectives);
  const tags = useAppStore(s => s.tags);
  const setPerspectives = useAppStore(s => s.setPerspectives);
  const [activePerspectiveId, setActivePerspectiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // New perspective form state
  const [newName, setNewName] = useState('');
  const [newFilters, setNewFilters] = useState<Perspective['filters']>({ completed: false, dateRange: 'all' });

  const activePerspective = perspectives.find(p => p.id === activePerspectiveId);

  // Filter tasks by perspective
  const filteredTasks = useMemo(() => {
    if (!activePerspective) return [];
    const f = activePerspective.filters;
    return tasks.filter(t => {
      if (f.completed !== undefined && t.completed !== f.completed) return false;
      if (f.tags && f.tags.length > 0 && !f.tags.includes(t.tag)) return false;
      if (f.projectId && t.projectId !== f.projectId) return false;
      if (f.context && !t.contexts?.includes(f.context)) return false;
      if (f.importance && t.importance !== f.importance) return false;
      if (f.urgency && t.urgency !== f.urgency) return false;
      if (f.hasDeadline !== undefined && f.hasDeadline && !t.deadline) return false;
      if (f.dateRange) {
        const now = new Date();
        const d = parseISO(t.date);
        switch (f.dateRange) {
          case 'today':
            if (!isToday(d)) return false;
            break;
          case 'week':
            if (!isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })) return false;
            break;
          case 'overdue':
            if (!t.deadline) return false;
            if (!isPast(parseISO(t.deadline)) || isToday(parseISO(t.deadline))) return false;
            break;
        }
      }
      return true;
    });
  }, [tasks, activePerspective]);

  // Build tree structure (top-level only, children nested)
  const rootTasks = useMemo(() => {
    const filteredIds = new Set(filteredTasks.map(t => t.id));
    return filteredTasks
      .filter(t => !t.parentId || !filteredIds.has(t.parentId))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.order - b.order;
      });
  }, [filteredTasks]);

  const getChildTasks = useCallback((parentId: string) => {
    return filteredTasks
      .filter(t => t.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }, [filteredTasks]);

  const toggleCollapsed = (id: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeletePerspective = (id: string) => {
    if (window.confirm('确定删除此透视？')) {
      setPerspectives(perspectives.filter(p => p.id !== id));
      if (activePerspectiveId === id) setActivePerspectiveId(null);
    }
  };

  const handleCreatePerspective = () => {
    if (!newName.trim()) return;
    const newPerspective: Perspective = {
      id: `p_${Date.now()}`,
      name: newName.trim(),
      icon: 'Eye',
      filters: { ...newFilters },
    };
    setPerspectives([...perspectives, newPerspective]);
    setNewName('');
    setNewFilters({ completed: false, dateRange: 'all' });
    setShowCreate(false);
  };

  const getDeadlineBadge = (task: Task) => {
    if (!task.deadline) return null;
    const d = parseISO(task.deadline);
    if (isToday(d)) return { text: '今天截止', class: 'bg-red-50 text-red-600' };
    if (isPast(d)) return { text: `逾期`, class: 'bg-red-50 text-red-600' };
    return { text: format(d, 'M/d'), class: 'bg-[var(--app-surface-hover)] text-[var(--app-text-muted)]' };
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {!activePerspective ? (
        /* Perspective Grid */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--app-text)]">透视</h2>
              <p className="text-sm text-[var(--app-text-muted)] mt-0.5">自定义筛选视图，一键切换不同视角</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-all"
            >
              <Plus size={14} />
              新建透视
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {perspectives.map(p => {
              const Icon = ICON_MAP[p.icon] || Eye;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePerspectiveId(p.id)}
                  className="flex flex-col items-start p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-accent)]/30 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[var(--app-surface-hover)] flex items-center justify-center">
                      <Icon size={18} className="text-[var(--app-accent)]" />
                    </div>
                    {p.id.startsWith('p_') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePerspective(p.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--app-text-muted)] hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[var(--app-text)]">{p.name}</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] mt-0.5">
                    {Object.entries(p.filters).map(([k, v]) => {
                      if (v === undefined || v === null) return null;
                      if (k === 'tags' && Array.isArray(v)) return `标签:${v.join(',')}`;
                      if (k === 'dateRange') return `时间:${v}`;
                      if (k === 'completed') return v ? '已完成' : '待办';
                      return `${k}:${String(v)}`;
                    }).filter(Boolean).join(' · ')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Create Perspective Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)]" onClick={() => setShowCreate(false)}>
              <div className="bg-[var(--app-surface)] rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col border border-[var(--app-border)]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
                  <h3 className="text-base font-semibold text-[var(--app-text)]">新建透视</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">名称</label>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="例如：本周重要工作"
                      className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">完成状态</label>
                    <div className="flex gap-2">
                      {[{ v: false, l: '待办' }, { v: true, l: '已完成' }].map(opt => (
                        <button
                          key={String(opt.v)}
                          onClick={() => setNewFilters(prev => ({ ...prev, completed: opt.v }))}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-xs font-medium transition-all border',
                            newFilters.completed === opt.v
                              ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
                              : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                          )}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">时间范围</label>
                    <div className="flex gap-2 flex-wrap">
                      {[{ v: 'all', l: '全部' }, { v: 'today', l: '今天' }, { v: 'week', l: '本周' }, { v: 'overdue', l: '已逾期' }].map(opt => (
                        <button
                          key={opt.v}
                          onClick={() => setNewFilters(prev => ({ ...prev, dateRange: opt.v as Perspective['filters']['dateRange'] }))}
                          className={cn(
                            'px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                            newFilters.dateRange === opt.v
                              ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
                              : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                          )}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">标签筛选</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(tags).map(([key, tag]) => (
                        <button
                          key={key}
                          onClick={() => setNewFilters(prev => {
                            const current = prev.tags || [];
                            const next = current.includes(key) ? current.filter(t => t !== key) : [...current, key];
                            return { ...prev, tags: next.length > 0 ? next : undefined };
                          })}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                            (newFilters.tags || []).includes(key)
                              ? 'text-white border-transparent'
                              : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                          )}
                          style={(newFilters.tags || []).includes(key) ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">重要程度</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewFilters(prev => ({ ...prev, importance: prev.importance === 'important' ? undefined : 'important' }))}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border',
                          newFilters.importance === 'important'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)]'
                        )}
                      >
                        <Flag size={12} />
                        重要
                      </button>
                      <button
                        onClick={() => setNewFilters(prev => ({ ...prev, urgency: prev.urgency === 'urgent' ? undefined : 'urgent' }))}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border',
                          newFilters.urgency === 'urgent'
                            ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)]'
                        )}
                      >
                        <AlertTriangle size={12} />
                        紧急
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--app-border)]">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
                    取消
                  </button>
                  <button
                    onClick={handleCreatePerspective}
                    disabled={!newName.trim()}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all',
                      newName.trim() ? 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]' : 'bg-[var(--app-border)] text-[var(--app-text-placeholder)] cursor-not-allowed'
                    )}
                  >
                    <Check size={14} />
                    创建
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Active Perspective Task List */
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActivePerspectiveId(null)}
                className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
              >
                <ChevronDownIcon size={18} className="rotate-90" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-[var(--app-text)]">{activePerspective.name}</h2>
                <p className="text-sm text-[var(--app-text-muted)]">
                  {filteredTasks.filter(t => !t.completed).length} 个待办 · {filteredTasks.filter(t => t.completed).length} 已完成
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
            {rootTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Eye size={48} className="text-[var(--app-border)] mb-4" />
                <p className="text-sm text-[var(--app-text-muted)]">此透视下没有任务</p>
              </div>
            ) : (
              rootTasks.map(task => (
                <TaskNode
                  key={task.id}
                  task={task}
                  collapsedTasks={collapsedTasks}
                  onToggleCollapsed={toggleCollapsed}
                  getChildTasks={getChildTasks}
                  getDeadlineBadge={getDeadlineBadge}
                  level={0}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Recursive Task Node */
interface TaskNodeProps {
  task: Task;
  collapsedTasks: Set<string>;
  onToggleCollapsed: (id: string) => void;
  getChildTasks: (parentId: string) => Task[];
  getDeadlineBadge: (task: Task) => { text: string; class: string } | null;
  level: number;
}

function TaskNode({
  task, collapsedTasks,
  onToggleCollapsed, getChildTasks, getDeadlineBadge, level,
}: TaskNodeProps) {
  const contexts = useAppStore(s => s.contexts);
  const tags = useAppStore(s => s.tags);
  const projects = useAppStore(s => s.projects);
  const toggleTask = useAppStore(s => s.toggleTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const children = getChildTasks(task.id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedTasks.has(task.id);
  const tagInfo = tags[task.tag] || { label: task.tag, color: '#9ca3af' };
  const project = projects.find(p => p.id === task.projectId);
  const taskContexts = contexts.filter(c => task.contexts?.includes(c.id));
  const deadlineBadge = getDeadlineBadge(task);

  return (
    <div>
      <div
        className={cn(
          'group flex items-start gap-2 p-2.5 rounded-xl border transition-all duration-200 hover:shadow-sm',
          task.completed
            ? 'opacity-60 bg-[var(--app-surface-hover)] border-[var(--app-border)]'
            : 'bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-border-hover)]/30',
          level > 0 && 'ml-6 border-l-2 border-l-[var(--app-accent)]/20'
        )}
      >
        {/* Expand/collapse for parent tasks */}
        {hasChildren ? (
          <button
            onClick={() => onToggleCollapsed(task.id)}
            className="mt-0.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors shrink-0"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => toggleTask(task.id)}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 shrink-0',
            task.completed
              ? 'bg-[#8cc68a] border-[#8cc68a]'
              : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
          )}
        >
          {task.completed && <Check size={12} className="text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-sm font-medium',
            task.completed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
          )}>
            {task.title}
          </span>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Tag */}
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
              style={{ backgroundColor: tagInfo.color }}
            >
              {tagInfo.label}
            </span>

            {/* Project */}
            {project && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--app-text-muted)]">
                {project.name}
              </span>
            )}

            {/* Contexts */}
            {taskContexts.map((ctx) => (
              <span key={ctx.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: ctx.color }}>
                @{ctx.label}
              </span>
            ))}

            {/* Deadline */}
            {deadlineBadge && (
              <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', deadlineBadge.class)}>
                {deadlineBadge.text}
              </span>
            )}

            {/* Subtask count */}
            {hasChildren && (
              <span className="text-[10px] text-[var(--app-text-muted)]">
                {children.filter(c => c.completed).length}/{children.length} 子任务
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => { if (window.confirm('确定删除此任务？')) deleteTask(task.id); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Recursive children */}
      {hasChildren && !isCollapsed && children.map(child => (
        <TaskNode
          key={child.id}
          task={child}
          collapsedTasks={collapsedTasks}
          onToggleCollapsed={onToggleCollapsed}
          getChildTasks={getChildTasks}
          getDeadlineBadge={getDeadlineBadge}
          level={level + 1}
        />
      ))}
    </div>
  );
}
