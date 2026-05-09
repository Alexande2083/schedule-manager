import { useState, useEffect, useMemo } from 'react';
import {
  X, Check, Clock, Tag, FolderOpen, Flag, AlertTriangle, Calendar,
  RotateCcw, Monitor, Smartphone, Building2, Car, Users, Home, GitBranch, Repeat, Link2,
  Eye, Edit3,
} from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

const CONTEXT_ICONS: Record<string, React.ElementType> = {
  Monitor, Smartphone, Building2, Car, Users, Home,
};

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export function TaskEditModal({ isOpen, onClose, task }: TaskEditModalProps) {
  const tags = useAppStore(s => s.tags);
  const projects = useAppStore(s => s.projects);
  const contexts = useAppStore(s => s.contexts);
  const allTasks = useAppStore(s => s.tasks);
  const editFullTask = useAppStore(s => s.editFullTask);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [deadline, setDeadline] = useState('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('none');
  const [hasRepeat, setHasRepeat] = useState(false);
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly' | 'workday' | 'interval'>('daily');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // 1=Mon, 7=Sun
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(1);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [importance, setImportance] = useState<'important' | 'normal'>('normal');
  const [urgency, setUrgency] = useState<'urgent' | 'normal'>('normal');
  // OmniFocus-inspired
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  // Notes
  const [notes, setNotes] = useState('');
  // Task dependencies
  const [selectedDependsOn, setSelectedDependsOn] = useState<string[]>([]);
  const [notesPreview, setNotesPreview] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDate(task.date);
      setTime(task.time || '');
      setDuration(task.duration || 60);
      setDeadline(task.deadline || '');
      setHasDeadline(!!task.deadline);
      setRepeat(task.repeat || 'none');
      setHasRepeat(!!task.repeat && task.repeat !== 'none');
      // Parse repeatRule for custom rules
      if (task.repeatRule) {
        try {
          const rule = JSON.parse(task.repeatRule);
          setRepeatType(rule.type || 'daily');
          setRepeatInterval(rule.interval || 1);
          setRepeatWeekdays(rule.weekdays || [1, 2, 3, 4, 5]);
          setRepeatDayOfMonth(rule.dayOfMonth || 1);
        } catch {}
      }
      setSelectedTag(task.tag);
      setSelectedProject(task.projectId || '');
      setImportance(task.importance);
      setUrgency(task.urgency);
      setSelectedContexts(task.contexts || []);
      setSelectedParentId(task.parentId || '');
      setSelectedDependsOn(task.dependsOn || []);
      setNotes(task.notes || '');
    }
  }, [task]);

  const timeOptions = useMemo(() => {
    const opts: string[] = [];
    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        opts.push(`${hh}:${mm}`);
      }
    }
    return opts;
  }, []);

  const getRepeatRule = () => {
    if (!hasRepeat || repeat === 'none') return undefined;
    if (repeat !== 'custom') return undefined; // use simple repeat field for basic types
    // Build custom rule
    const rule: Record<string, any> = { type: repeatType, interval: repeatInterval };
    if (repeatType === 'weekly') rule.weekdays = repeatWeekdays;
    if (repeatType === 'monthly') rule.dayOfMonth = repeatDayOfMonth;
    return JSON.stringify(rule);
  };

  const handleSaveOnly = () => {
    if (!task || !title.trim()) return;
    editFullTask(task.id, {
      title: title.trim(),
      date,
      time: time || undefined,
      duration,
      deadline: hasDeadline ? deadline || undefined : undefined,
      repeat: hasRepeat ? (repeat !== 'custom' ? repeat : undefined) : undefined,
      repeatRule: getRepeatRule(),
      tag: selectedTag,
      projectId: selectedProject || undefined,
      importance,
      urgency,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
      parentId: selectedParentId || undefined,
      dependsOn: selectedDependsOn.length > 0 ? selectedDependsOn : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const handleSaveAndComplete = () => {
    if (!task || !title.trim()) return;
    editFullTask(task.id, {
      title: title.trim(),
      date,
      time: time || undefined,
      duration,
      deadline: hasDeadline ? deadline || undefined : undefined,
      repeat: hasRepeat ? (repeat !== 'custom' ? repeat : undefined) : undefined,
      repeatRule: getRepeatRule(),
      tag: selectedTag,
      projectId: selectedProject || undefined,
      importance,
      urgency,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
      parentId: selectedParentId || undefined,
      dependsOn: selectedDependsOn.length > 0 ? selectedDependsOn : undefined,
      notes: notes.trim() || undefined,
      completed: true,
    });
    onClose();
  };

  // Get available parent tasks (excluding self and descendants to prevent cycles)
  const availableParents = (allTasks || []).filter(t => {
    if (t.id === task?.id) return false;
    let curr = t;
    const visited = new Set<string>();
    let safety = 0;
    while (curr.parentId && safety < 100) {
      if (visited.has(curr.id)) break; // prevent infinite loop on cycle
      visited.add(curr.id);
      const parent = allTasks?.find(p => p.id === curr.parentId);
      if (!parent) break; // orphan parentId — safe exit
      if (parent.id === task?.id) return false;
      curr = parent;
      safety++;
    }
    return true;
  });

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel bg-[var(--app-surface)] rounded-2xl shadow-2xl w-[480px] max-h-[92vh] flex flex-col border border-[var(--app-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
          <h3 className="text-base font-semibold text-[var(--app-text)]">编辑任务</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">任务名称</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
            />
          </div>

          {/* Date, Time(15min), Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">日期</label>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[var(--app-text-muted)] shrink-0" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">时间（15分钟）</label>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-[var(--app-text-muted)] shrink-0" />
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
                >
                  <option value="">无</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">时长</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                <option value={15}>15分钟</option>
                <option value={30}>30分钟</option>
                <option value={45}>45分钟</option>
                <option value={60}>1小时</option>
                <option value={90}>1.5小时</option>
                <option value={120}>2小时</option>
                <option value={180}>3小时</option>
              </select>
            </div>
          </div>

          {/* Parent Task — Infinite Hierarchy */}
          {availableParents.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block flex items-center gap-1.5">
                <GitBranch size={12} />
                父任务（层级嵌套）
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                <option value="">无（作为顶层任务）</option>
                {availableParents.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dependency — Task Dependencies */}
          {allTasks && allTasks.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block flex items-center gap-1.5">
                <Link2 size={12} />
                前置依赖（需先完成）
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                {allTasks
                  .filter(t => t.id !== task?.id && t.title.trim())
                  .map(t => {
                    const isSelected = selectedDependsOn.includes(t.id);
                    const isCompleted = t.completed;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDependsOn(prev => prev.filter(id => id !== t.id));
                          } else {
                            setSelectedDependsOn(prev => [...prev, t.id]);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border',
                          isSelected
                            ? 'text-white border-transparent'
                            : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                        )}
                        style={isSelected ? { backgroundColor: 'var(--app-accent)', borderColor: 'var(--app-accent)' } : undefined}
                      >
                        <div className={cn(
                          'w-3 h-3 rounded-sm border flex items-center justify-center transition-all shrink-0',
                          isSelected ? 'border-white/60 bg-white/20' : 'border-[var(--app-text-muted)]'
                        )}>
                          {isSelected && <Check size={7} className="text-white" />}
                        </div>
                        <span className={cn(isCompleted && 'line-through opacity-60')}>
                          {t.title}
                        </span>
                        {isCompleted && <span className="text-[8px] opacity-70">✓</span>}
                      </button>
                    );
                  })}
              </div>
              {selectedDependsOn.length > 0 && (
                <p className="text-[9px] text-[var(--app-text-muted)] mt-1">
                  已选择 {selectedDependsOn.length} 个前置任务，完成这些任务后当前任务才能开始
                </p>
              )}
            </div>
          )}

          {/* 1. Project */}
          <div>
            <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">所属项目</label>
            <div className="flex items-center gap-1.5">
              <FolderOpen size={14} className="text-[var(--app-text-muted)]" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              >
                <option value="">无项目</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Context — Multi-select */}
          {contexts && contexts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">上下文场景（可多选）</label>
              <div className="flex gap-1.5 flex-wrap">
                {contexts.map((ctx) => {
                  const CtxIcon = CONTEXT_ICONS[ctx.icon] || Monitor;
                  const isSelected = selectedContexts.includes(ctx.id);
                  return (
                    <button
                      key={ctx.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedContexts(prev => prev.filter(c => c !== ctx.id));
                        } else {
                          setSelectedContexts(prev => [...prev, ctx.id]);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                        isSelected
                          ? 'text-white border-transparent'
                          : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                      )}
                      style={isSelected ? { backgroundColor: ctx.color, borderColor: ctx.color } : undefined}
                    >
                      <div className={cn(
                        'w-3 h-3 rounded-sm border flex items-center justify-center transition-all',
                        isSelected ? 'border-white/60 bg-white/20' : 'border-[var(--app-text-muted)]'
                      )}>
                        {isSelected && <Check size={8} className="text-white" />}
                      </div>
                      <CtxIcon size={10} />
                      @{ctx.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Tag */}
          <div>
            <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">标签</label>
            <div className="flex gap-1.5 flex-wrap">
              {Object.keys(tags).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedTag === tag
                      ? 'text-white'
                      : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] hover:bg-[var(--app-border)]'
                  )}
                  style={selectedTag === tag ? { backgroundColor: tags[tag].color } : undefined}
                >
                  <Tag size={10} />
                  {tags[tag].label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Importance & Urgency */}
          <div>
            <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">重要程度</label>
            <div className="flex gap-3">
              <button
                onClick={() => setImportance(importance === 'important' ? 'normal' : 'important')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border',
                  importance === 'important'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-[var(--app-tag-bg)] border-[var(--app-border)] text-[var(--app-tag-text)] hover:bg-red-50 hover:border-red-200'
                )}
              >
                <Flag size={12} />
                重要
              </button>
              <button
                onClick={() => setUrgency(urgency === 'urgent' ? 'normal' : 'urgent')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border',
                  urgency === 'urgent'
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-[var(--app-tag-bg)] border-[var(--app-border)] text-[var(--app-tag-text)] hover:bg-orange-50 hover:border-orange-200'
                )}
              >
                <AlertTriangle size={12} />
                紧急
              </button>
            </div>
          </div>

          {/* Deadline */}
          <div className="p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[var(--app-text-muted)]" />
                <span className="text-xs font-medium text-[var(--app-text)]">倒计时（截止日期）</span>
              </div>
              <button
                onClick={() => setHasDeadline(!hasDeadline)}
                className={cn(
                  'w-9 h-5 rounded-full transition-all relative',
                  hasDeadline ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                  hasDeadline ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>
            {hasDeadline && (
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs bg-[var(--app-surface)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
              />
            )}
          </div>

          {/* Repeat */}
          <div className="p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RotateCcw size={14} className="text-[var(--app-text-muted)]" />
                <span className="text-xs font-medium text-[var(--app-text)]">重复</span>
              </div>
              <button
                onClick={() => setHasRepeat(!hasRepeat)}
                className={cn(
                  'w-9 h-5 rounded-full transition-all relative',
                  hasRepeat ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                  hasRepeat ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>
            {hasRepeat && (
              <div className="space-y-2">
                {/* Quick presets */}
                <div className="flex gap-2">
                  {([
                    { value: 'daily' as const, label: '每天' },
                    { value: 'weekly' as const, label: '每周' },
                    { value: 'monthly' as const, label: '每月' },
                    { value: 'custom' as const, label: '自定义' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRepeat(opt.value)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                        repeat === opt.value
                          ? 'bg-[var(--app-accent)] text-white'
                          : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)] hover:text-[var(--app-text)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Custom rule editor */}
                {repeat === 'custom' && (
                  <div className="space-y-2 pt-2 border-t border-[var(--app-border)]">
                    {/* Rule type selector */}
                    <div className="flex gap-2">
                      {([
                        { value: 'workday' as const, label: '工作日' },
                        { value: 'interval' as const, label: '间隔' },
                        { value: 'weekly' as const, label: '每周' },
                        { value: 'monthly' as const, label: '每月' },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setRepeatType(opt.value)}
                          className={cn(
                            'flex-1 py-1 rounded-lg text-[10px] font-medium transition-all',
                            repeatType === opt.value
                              ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)] border border-[var(--app-accent)]/40'
                              : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)]'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Interval input */}
                    {repeatType === 'interval' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--app-text-muted)]">每</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={repeatInterval}
                          onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none text-center"
                        />
                        <span className="text-[10px] text-[var(--app-text-muted)]">天</span>
                      </div>
                    )}

                    {/* Weekday picker (for weekly) */}
                    {repeatType === 'weekly' && (
                      <div>
                        <div className="text-[10px] text-[var(--app-text-muted)] mb-1">选择星期</div>
                        <div className="flex gap-1">
                          {['一','二','三','四','五','六','日'].map((label, i) => {
                            const dayNum = i + 1;
                            const isSelected = repeatWeekdays.includes(dayNum);
                            return (
                              <button
                                key={dayNum}
                                onClick={() => {
                                  setRepeatWeekdays(prev =>
                                    isSelected ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
                                  );
                                }}
                                className={cn(
                                  'w-7 h-7 rounded-full text-[10px] font-medium transition-all',
                                  isSelected
                                    ? 'bg-[var(--app-accent)] text-white'
                                    : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)]'
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Day of month (for monthly) */}
                    {repeatType === 'monthly' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--app-text-muted)]">每月第</span>
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={repeatDayOfMonth}
                          onChange={(e) => setRepeatDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))}
                          className="w-14 text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none text-center"
                        />
                        <span className="text-[10px] text-[var(--app-text-muted)]">天</span>
                      </div>
                    )}

                    {/* Preview text */}
                    <div className="text-[10px] text-[var(--app-text-muted)] flex items-center gap-1">
                      <Repeat size={10} />
                      {repeatType === 'workday' && '每个工作日（周一至周五）重复'}
                      {repeatType === 'interval' && `每 ${repeatInterval} 天重复`}
                      {repeatType === 'weekly' && `每周 ${repeatWeekdays.sort().map(d => ['一','二','三','四','五','六','日'][d-1]).join('、')} 重复`}
                      {repeatType === 'monthly' && `每月第 ${repeatDayOfMonth} 天重复`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--app-text-muted)]">备注（支持 Markdown）</label>
              <button
                onClick={() => setNotesPreview(!notesPreview)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                  notesPreview
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                )}
              >
                {notesPreview ? <Edit3 size={10} /> : <Eye size={10} />}
                {notesPreview ? '编辑' : '预览'}
              </button>
            </div>
            {notesPreview ? (
              <div className="w-full min-h-[60px] text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] whitespace-pre-wrap">
                {notes || <span className="text-[var(--app-text-placeholder)]">无内容</span>}
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="支持 Markdown 格式&#10;例如：&#10;- 列表项1&#10;- 列表项2&#10;**加粗文字**&#10;`代码`"
                rows={3}
                className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors resize-none placeholder:text-[var(--app-text-placeholder)]"
              />
            )}
          </div>
        </div>

        {/* Footer — Left: Cancel | Right: Save + Save & Complete */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-[var(--app-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-all border border-red-200"
          >
            取消
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveOnly}
              disabled={!title.trim()}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all border border-yellow-300',
                title.trim()
                  ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
              )}
            >
              <Check size={14} />
              保存
            </button>
            <button
              onClick={handleSaveAndComplete}
              disabled={!title.trim()}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium transition-all',
                title.trim()
                  ? 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]'
                  : 'bg-[var(--app-border)] text-[var(--app-text-placeholder)] cursor-not-allowed'
              )}
            >
              <Check size={14} />
              保存并完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
