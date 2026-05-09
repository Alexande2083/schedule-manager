import { useState, useMemo } from 'react';
import {
  Plus, X, Check, Pin, PinOff, Bell,
  Trash2, ChevronDown,
  Archive, FileDown,
} from 'lucide-react';
import { format, parseISO, isToday, isPast, differenceInDays } from 'date-fns';
import type { Task, Checklist } from '@/types';
import { useAppStore } from '@/store';
import { getToday } from '@/utils/date';
import { cn } from '@/lib/utils';

interface ChecklistPanelProps {
  onOpenEdit: (task: Task) => void;
  onExportArchive: () => void;
}

function getDeadlineLabel(deadline: string) {
  const d = parseISO(deadline);
  if (isToday(d)) return { text: '今天截止', color: 'text-red-500' };
  if (isPast(d)) return { text: `逾期 ${Math.abs(differenceInDays(d, new Date()))} 天`, color: 'text-red-500' };
  const days = differenceInDays(d, new Date());
  if (days === 1) return { text: '明天', color: 'text-orange-500' };
  if (days <= 3) return { text: `${days}天后截止`, color: 'text-orange-500' };
  if (days <= 7) return { text: `${days}天后`, color: 'text-amber-600' };
  return { text: `${format(d, 'M/d')}`, color: 'text-[var(--app-text-muted)]' };
}

export function ChecklistPanel({
  onOpenEdit, onExportArchive,
}: ChecklistPanelProps) {
  const tasks = useAppStore(s => s.tasks);
  const checklists = useAppStore(s => s.checklists);
  const tags = useAppStore(s => s.tags);
  const addTask = useAppStore(s => s.addTask);
  const toggleTask = useAppStore(s => s.toggleTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const togglePin = useAppStore(s => s.togglePin);
  const setChecklists = useAppStore(s => s.setChecklists);
  const reorderTasksStore = useAppStore(s => s.reorderTasks);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});

  // Ensure all non-archived checklists are expanded by default
  const isExpanded = (id: string) => {
    if (expandedLists[id] !== undefined) return expandedLists[id];
    return true;
  };

  const toggleExpand = (id: string) => {
    setExpandedLists(prev => ({ ...prev, [id]: !isExpanded(id) }));
  };

  const handleAddToList = (checklistId: string, checklistTag: string) => {
    const text = newTaskInputs[checklistId]?.trim();
    if (!text) return;
    addTask({
      title: text,
      completed: false,
      date: getToday(),
      tag: checklistTag,
      duration: 30,
      pinned: false,
      checklistId,
      importance: 'normal',
      urgency: 'normal',
      pomodoros: 0,
    });
    setNewTaskInputs(prev => ({ ...prev, [checklistId]: '' }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, checklistId: string, checklistTag: string) => {
    if (e.key === 'Enter') handleAddToList(checklistId, checklistTag);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
  };

  const handleDrop = (e: React.DragEvent, targetId: string, tasksInList: Task[]) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const draggedIndex = tasksInList.findIndex(t => t.id === draggedId);
    const targetIndex = tasksInList.findIndex(t => t.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }
    const newList = [...tasksInList];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, removed);
    // Reassign orders
    const minOrder = Math.min(...newList.map(t => t.order));
    const reordered = newList.map((t, idx) => ({ ...t, order: minOrder + idx }));
    // Replace in full tasks
    const fullTasks = tasks.map(t => reordered.find(rt => rt.id === t.id) || t);
    reorderTasksStore(fullTasks);
    setDraggedId(null);
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const tagKeys = Object.keys(tags);
    const newList: Checklist = {
      id: `c_${Date.now()}`,
      name: newListName.trim(),
      defaultTag: tagKeys[0] || 'work',
      order: checklists.length,
      archived: false,
    };
    setChecklists([...checklists, newList]);
    setNewListName('');
    setShowAddList(false);
  };

  const handleDeleteList = (id: string) => {
    if (!window.confirm('删除此清单？清单内的任务不会被删除。')) return;
    setChecklists(checklists.filter(c => c.id !== id));
  };

  const handleArchiveList = (id: string) => {
    setChecklists(checklists.map(c => c.id === id ? { ...c, archived: true } : c));
  };

  const activeChecklists = useMemo(() => checklists.filter(c => !c.archived), [checklists]);

  const tasksByList = useMemo(() => {
    const map: Record<string, Task[]> = {};
    activeChecklists.forEach(c => {
      map[c.id] = tasks
        .filter(t => t.checklistId === c.id && !t.completed)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
          return a.order - b.order;
        });
    });
    return map;
  }, [tasks, activeChecklists]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--app-text)]">待办清单</h2>
          <p className="text-sm text-[var(--app-text-muted)] mt-0.5">
            {activeChecklists.length} 个清单 · {tasks.filter(t => !t.completed && activeChecklists.some(c => c.id === t.checklistId)).length} 个待办
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <FileDown size={13} />
            导出归档
          </button>
          <button
            onClick={() => setShowAddList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] transition-all"
          >
            <Plus size={13} />
            新建清单
          </button>
        </div>
      </div>

      {/* Add new list input */}
      {showAddList && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)]">
          <input
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateList()}
            placeholder="清单名称"
            autoFocus
            className="flex-1 text-sm bg-transparent outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-placeholder)]"
          />
          <button onClick={handleCreateList} className="px-3 py-1 rounded-md text-xs font-medium text-white bg-[var(--app-accent)]">创建</button>
          <button onClick={() => { setShowAddList(false); setNewListName(''); }} className="p-1 rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Checklist columns */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col md:flex-row gap-3 pb-2">
          {activeChecklists.map(checklist => {
            const listTasks = tasksByList[checklist.id] || [];
            const tagInfo = tags[checklist.defaultTag] || { label: checklist.defaultTag, color: '#9ca3af' };
            const expanded = isExpanded(checklist.id);

            return (
              <div
                key={checklist.id}
                className="w-full md:w-[270px] shrink-0 flex flex-col bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shadow-sm"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--app-border)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tagInfo.color }}
                    />
                    <span className="text-sm font-semibold text-[var(--app-text)] truncate">{checklist.name}</span>
                    <span className="text-[10px] text-[var(--app-text-muted)] shrink-0 bg-[var(--app-tag-bg)] px-1.5 py-0.5 rounded-full">
                      {listTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => toggleExpand(checklist.id)} className="p-1 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]">
                      <ChevronDown size={13} className={cn('transition-transform', !expanded && '-rotate-90')} />
                    </button>
                    <button onClick={() => handleArchiveList(checklist.id)} className="p-1 rounded text-[var(--app-text-muted)] hover:text-amber-600 hover:bg-amber-50">
                      <Archive size={13} />
                    </button>
                    <button onClick={() => handleDeleteList(checklist.id)} className="p-1 rounded text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Task list */}
                {expanded && (
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
                    {listTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onDragOver={e => handleDragOver(e, task.id)}
                        onDrop={e => handleDrop(e, task.id, listTasks)}
                        className={cn(
                          'group flex items-start gap-1.5 p-2 rounded-lg bg-[var(--app-surface-hover)] border border-[var(--app-border)] hover:border-[var(--app-border-hover)] transition-all cursor-grab active:cursor-grabbing',
                          draggedId === task.id && 'opacity-40',
                          task.pinned && 'ring-1 ring-[var(--app-accent)]/20'
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            'mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                            task.completed ? 'bg-[var(--app-success)] border-[var(--app-success)]' : 'border-[var(--app-border)] hover:border-[var(--app-accent)]'
                          )}
                        >
                          {task.completed && <Check size={10} className="text-white" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0" onClick={() => onOpenEdit(task)}>
                          <div className={cn(
                            'text-xs font-medium truncate transition-all',
                            task.completed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
                          )}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {task.deadline && (
                              <span className={cn('text-[9px] font-medium', getDeadlineLabel(task.deadline).color)}>
                                {getDeadlineLabel(task.deadline).text}
                              </span>
                            )}
                            {task.repeat && task.repeat !== 'none' && (
                              <span className="text-[9px] text-purple-600 bg-purple-50 px-1 rounded">重复</span>
                            )}
                            {task.reminder && (
                              <span className="flex items-center gap-0.5 text-[9px] text-[var(--app-accent)]">
                                <Bell size={8} />
                                {format(parseISO(task.reminder), 'H:mm')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => togglePin(task.id)}
                            className={cn('p-0.5 rounded', task.pinned ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-accent)]')}
                            title={task.pinned ? '取消置顶' : '置顶'}
                          >
                            {task.pinned ? <Pin size={11} /> : <PinOff size={11} />}
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-red-500"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add task input */}
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--app-surface-hover)] border border-[var(--app-border)]">
                      <Plus size={12} className="text-[var(--app-text-muted)] shrink-0" />
                      <input
                        value={newTaskInputs[checklist.id] || ''}
                        onChange={e => setNewTaskInputs(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                        onKeyDown={e => handleKeyDown(e, checklist.id, checklist.defaultTag)}
                        placeholder={`添加到 ${checklist.name}...`}
                        className="flex-1 text-xs bg-transparent outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-placeholder)]"
                      />
                      <button
                        onClick={() => handleAddToList(checklist.id, checklist.defaultTag)}
                        disabled={!newTaskInputs[checklist.id]?.trim()}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                          newTaskInputs[checklist.id]?.trim()
                            ? 'text-white bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)]'
                            : 'text-[var(--app-text-placeholder)] cursor-not-allowed'
                        )}
                      >
                        添加
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add column button */}
          <button
            onClick={() => setShowAddList(true)}
            className="w-[270px] shrink-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-surface-hover)] transition-all h-fit min-h-[120px]"
          >
            <Plus size={20} />
            <span className="text-xs font-medium">新建清单</span>
          </button>
        </div>
      </div>

      {/* Archived lists section */}
      {checklists.some(c => c.archived) && (
        <div className="mt-3 pt-3 border-t border-[var(--app-border)]">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
          >
            <Archive size={12} />
            <span>已归档清单 ({checklists.filter(c => c.archived).length})</span>
          </button>
        </div>
      )}
    </div>
  );
}
