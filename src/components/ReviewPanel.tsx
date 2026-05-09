import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import { CheckCircle2, AlertTriangle, Clock, RotateCcw, Trash2, Eye } from 'lucide-react';
import type { Task } from '@/types';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface ReviewPanelProps {}

export function ReviewPanel({}: ReviewPanelProps) {
  const tasks = useAppStore(s => s.tasks);
  const checklists = useAppStore(s => s.checklists);
  const projects = useAppStore(s => s.projects);
  const tags = useAppStore(s => s.tags);
  const toggleTask = useAppStore(s => s.toggleTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'stale' | 'overdue' | 'pinned'>('all');

  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);

  // Calculate stale tasks (not updated for 7+ days)
  const staleThreshold = subDays(new Date(), 7);

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'stale':
        return pendingTasks.filter(t => new Date(t.createdAt) < staleThreshold && !t.pinned);
      case 'overdue':
        return pendingTasks.filter(t => t.deadline && parseISO(t.deadline) < new Date());
      case 'pinned':
        return pendingTasks.filter(t => t.pinned);
      default:
        return pendingTasks;
    }
  }, [pendingTasks, filter, staleThreshold]);

  // Group by checklist
  const tasksByChecklist = useMemo(() => {
    const map: Record<string, Task[]> = {};
    checklists.forEach(c => {
      if (c.archived) return;
      map[c.id] = filteredTasks.filter(t => t.checklistId === c.id);
    });
    // Ungrouped tasks
    map['ungrouped'] = filteredTasks.filter(t => !t.checklistId || !checklists.some(c => c.id === t.checklistId && !c.archived));
    return map;
  }, [filteredTasks, checklists]);

  // Group by project
  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {};
    projects.forEach(p => {
      map[p.id] = filteredTasks.filter(t => t.projectId === p.id);
    });
    map['ungrouped'] = filteredTasks.filter(t => !t.projectId);
    return map;
  }, [filteredTasks, projects]);

  const [groupBy, setGroupBy] = useState<'checklist' | 'project'>('checklist');
  const groups = groupBy === 'checklist' ? tasksByChecklist : tasksByProject;
  const groupLabels = groupBy === 'checklist'
    ? (id: string) => checklists.find(c => c.id === id)?.name || '未分类'
    : (id: string) => projects.find(p => p.id === id)?.name || '未分类';
  const groupColors = groupBy === 'checklist'
    ? (id: string) => tags[checklists.find(c => c.id === id)?.defaultTag || 'work']?.color || '#9eaab8'
    : (id: string) => projects.find(p => p.id === id)?.color || '#9eaab8';

  const handleReview = (id: string) => {
    setReviewedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReviewAll = (ids: string[]) => {
    setReviewedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const getTaskStatus = (task: Task) => {
    const daysSinceCreated = differenceInDays(new Date(), new Date(task.createdAt));
    if (task.deadline && parseISO(task.deadline) < new Date()) return { label: '已逾期', color: 'text-red-500', bg: 'bg-red-50' };
    if (daysSinceCreated > 14) return { label: '长期未动', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (daysSinceCreated > 7) return { label: '建议关注', color: 'text-[var(--app-text-muted)]', bg: 'bg-[var(--app-surface-hover)]' };
    return { label: '正常', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  const totalPending = pendingTasks.length;
  const totalStale = pendingTasks.filter(t => new Date(t.createdAt) < staleThreshold && !t.pinned).length;
  const totalOverdue = pendingTasks.filter(t => t.deadline && parseISO(t.deadline) < new Date()).length;
  const totalPinned = pendingTasks.filter(t => t.pinned).length;

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--app-text)]">回顾检查</h2>
            <p className="text-sm text-[var(--app-text-muted)] mt-0.5">定期检查任务，防止遗漏</p>
          </div>
          <button
            onClick={() => setReviewedIds(new Set())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <SummaryCard label="待办总数" value={totalPending} active={filter === 'all'} onClick={() => setFilter('all')} />
        <SummaryCard label="置顶关注" value={totalPinned} active={filter === 'pinned'} onClick={() => setFilter('pinned')} color="text-[var(--app-accent)]" />
        <SummaryCard label="长期未动" value={totalStale} active={filter === 'stale'} onClick={() => setFilter('stale')} color="text-amber-600" />
        <SummaryCard label="已逾期" value={totalOverdue} active={filter === 'overdue'} onClick={() => setFilter('overdue')} color="text-red-500" />
      </div>

      {/* Group by toggle */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[var(--app-text-muted)]">分组:</span>
        <button
          onClick={() => setGroupBy('checklist')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
            groupBy === 'checklist' ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)]'
          )}
        >
          按清单
        </button>
        <button
          onClick={() => setGroupBy('project')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
            groupBy === 'project' ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)]'
          )}
        >
          按项目
        </button>
        <span className="text-[10px] text-[var(--app-text-muted)] ml-auto">
          已回顾 {reviewedIds.size} / {filteredTasks.length}
        </span>
      </div>

      {/* Task groups */}
      <div className="space-y-3">
        {Object.entries(groups).map(([groupId, groupTasks]) => {
          if (groupTasks.length === 0) return null;
          const allReviewed = groupTasks.every(t => reviewedIds.has(t.id));
          const groupName = groupLabels(groupId);
          const groupColor = groupColors(groupId);

          return (
            <div key={groupId} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--app-border)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: groupColor }} />
                  <span className="text-sm font-semibold text-[var(--app-text)]">{groupName}</span>
                  <span className="text-[10px] text-[var(--app-text-muted)] bg-[var(--app-tag-bg)] px-1.5 py-0.5 rounded-full">
                    {groupTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!allReviewed && (
                    <button
                      onClick={() => handleReviewAll(groupTasks.map(t => t.id))}
                      className="text-[10px] text-[var(--app-accent)] hover:underline transition-colors"
                    >
                      全部标记已阅
                    </button>
                  )}
                  {allReviewed && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 size={10} />
                      已回顾
                    </span>
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div className="p-2 space-y-1">
                {groupTasks.map(task => {
                  const status = getTaskStatus(task);
                  const isReviewed = reviewedIds.has(task.id);
                  const daysOld = differenceInDays(new Date(), new Date(task.createdAt));

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-lg border transition-all',
                        isReviewed
                          ? 'border-emerald-200 bg-emerald-50/50 opacity-70'
                          : 'border-[var(--app-border)] bg-[var(--app-surface-hover)] hover:border-[var(--app-accent)]/20'
                      )}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          'mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                          task.completed
                            ? 'bg-[var(--app-success)] border-[var(--app-success)]'
                            : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
                        )}
                      >
                        {task.completed && <CheckCircle2 size={10} className="text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'text-xs font-medium truncate',
                            isReviewed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
                          )}>
                            {task.title}
                          </span>
                          {task.pinned && <AlertTriangle size={10} className="text-[var(--app-accent)] shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={cn('text-[9px] font-medium px-1 py-0.5 rounded', status.bg, status.color)}>
                            {status.label}
                          </span>
                          <span className="text-[9px] text-[var(--app-text-muted)]">
                            {daysOld} 天前创建
                          </span>
                          {task.deadline && (
                            <span className="text-[9px] text-[var(--app-text-muted)]">
                              截止 {format(parseISO(task.deadline), 'M/d')}
                            </span>
                          )}
                          {task.time && (
                            <span className="flex items-center gap-0.5 text-[9px] text-[var(--app-text-muted)]">
                              <Clock size={8} />
                              {task.time}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => handleReview(task.id)}
                          className={cn(
                            'p-1 rounded transition-all',
                            isReviewed
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-[var(--app-text-muted)] hover:text-[var(--app-accent)]'
                          )}
                          title={isReviewed ? '取消标记' : '标记已阅'}
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('确定删除此任务？')) deleteTask(task.id);
                          }}
                          className="p-1 rounded text-[var(--app-text-muted)] hover:text-red-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, active, onClick, color }: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start p-2.5 rounded-xl border transition-all text-left',
        active
          ? 'border-[var(--app-accent)]/30 bg-[var(--app-surface)]'
          : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-hover)]'
      )}
    >
      <span className={cn('text-lg font-bold', color || 'text-[var(--app-text)]')}>{value}</span>
      <span className="text-[10px] text-[var(--app-text-muted)]">{label}</span>
    </button>
  );
}
