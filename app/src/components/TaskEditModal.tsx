import { useState, useEffect, useMemo } from 'react';
import {
  X, Check, Clock, Tag, FolderOpen, Flag, AlertTriangle, Calendar,
  RotateCcw, Monitor, Smartphone, Building2, Car, Users, Home, GitBranch
} from 'lucide-react';
import type { Task, Project, Context } from '@/types';
import { cn } from '@/lib/utils';

const CONTEXT_ICONS: Record<string, React.ElementType> = {
  Monitor, Smartphone, Building2, Car, Users, Home,
};

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  contexts?: Context[];
  allTasks?: Task[];
  onSave: (id: string, updates: Partial<Task>) => void;
}

export function TaskEditModal({ isOpen, onClose, task, tags, projects, contexts, allTasks, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [deadline, setDeadline] = useState('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [hasRepeat, setHasRepeat] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [importance, setImportance] = useState<'important' | 'normal'>('normal');
  const [urgency, setUrgency] = useState<'urgent' | 'normal'>('normal');
  // OmniFocus-inspired
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  // Notes
  const [notes, setNotes] = useState('');

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
      setSelectedTag(task.tag);
      setSelectedProject(task.projectId || '');
      setImportance(task.importance);
      setUrgency(task.urgency);
      setSelectedContexts(task.contexts || []);
      setSelectedParentId(task.parentId || '');
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

  const handleSaveOnly = () => {
    if (!task || !title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      date,
      time: time || undefined,
      duration,
      deadline: hasDeadline ? deadline || undefined : undefined,
      repeat: hasRepeat ? repeat : undefined,
      tag: selectedTag,
      projectId: selectedProject || undefined,
      importance,
      urgency,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
      parentId: selectedParentId || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const handleSaveAndComplete = () => {
    if (!task || !title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      date,
      time: time || undefined,
      duration,
      deadline: hasDeadline ? deadline || undefined : undefined,
      repeat: hasRepeat ? repeat : undefined,
      tag: selectedTag,
      projectId: selectedProject || undefined,
      importance,
      urgency,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
      parentId: selectedParentId || undefined,
      notes: notes.trim() || undefined,
      completed: true,
    });
    onClose();
  };

  // Get available parent tasks (excluding self and descendants to prevent cycles)
  const availableParents = (allTasks || []).filter(t => {
    if (t.id === task?.id) return false;
    let curr = t;
    while (curr.parentId) {
      const parent = allTasks?.find(p => p.id === curr.parentId);
      if (parent?.id === task?.id) return false;
      curr = parent || curr;
      if (!curr.parentId) break;
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
              className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a] transition-colors"
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
                  className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
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
                  className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
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
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
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
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
              >
                <option value="">无（作为顶层任务）</option>
                {availableParents.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
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
                className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
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
                  hasDeadline ? 'bg-[#d4857a]' : 'bg-[var(--app-border)]'
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
                className="w-full text-xs bg-[var(--app-surface)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
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
                  hasRepeat ? 'bg-[#d4857a]' : 'bg-[var(--app-border)]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                  hasRepeat ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>
            {hasRepeat && (
              <div className="flex gap-2">
                {([
                  { value: 'daily' as const, label: '每天' },
                  { value: 'weekly' as const, label: '每周' },
                  { value: 'monthly' as const, label: '每月' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRepeat(opt.value)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                      repeat === opt.value
                        ? 'bg-[#d4857a] text-white'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border border-[var(--app-border)] hover:text-[var(--app-text)]'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. Notes */}
          <div>
            <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加备注信息..."
              rows={3}
              className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a] transition-colors resize-none placeholder:text-[var(--app-text-placeholder)]"
            />
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
                  ? 'bg-[#d4857a] text-white hover:bg-[#c97a6e]'
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
