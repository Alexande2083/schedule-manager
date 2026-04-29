import { useState, useEffect } from 'react';
import {
  X, Flag, AlertTriangle,
  Monitor, Smartphone, Building2, Car, Users, Home,
} from 'lucide-react';
import type { Task, Project, Context } from '@/types';
import { cn } from '@/lib/utils';

const CONTEXT_ICONS: Record<string, React.ElementType> = {
  Monitor, Smartphone, Building2, Car, Users, Home,
};

// 15-minute time options: 06:00 ~ 23:45
const TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

interface MobileEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  contexts?: Context[];
  onSave: (id: string, updates: Partial<Task>) => void;
}

export function MobileEditDrawer({ isOpen, onClose, task, tags, projects, contexts, onSave }: MobileEditDrawerProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [importance, setImportance] = useState<'important' | 'normal'>('normal');
  const [urgency, setUrgency] = useState<'urgent' | 'normal'>('normal');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDate(task.date);
      setTime(task.time || '');
      setDuration(task.duration || 60);
      setSelectedTag(task.tag);
      setSelectedProject(task.projectId || '');
      setSelectedContexts(task.contexts || []);
      setImportance(task.importance);
      setUrgency(task.urgency);
      setNotes(task.notes || '');
    }
  }, [task]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSave = () => {
    if (!task || !title.trim()) return;
    onSave(task.id, {
      title: title.trim(),
      date,
      time: time || undefined,
      duration,
      tag: selectedTag,
      projectId: selectedProject || undefined,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
      importance,
      urgency,
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
      tag: selectedTag,
      projectId: selectedProject || undefined,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
      importance,
      urgency,
      notes: notes.trim() || undefined,
      completed: true,
    });
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50 lg:hidden"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--app-surface)] rounded-t-2xl border-t border-[var(--app-border)] shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-[var(--app-border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--app-border)]">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">编辑任务</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="任务名称"
            className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a]"
          />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--app-text-muted)] mb-1 block">日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--app-text-muted)] mb-1 block">时间（15分）</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none">
                <option value="">无</option>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-[10px] text-[var(--app-text-muted)] mb-1 block">时长</label>
            <div className="flex gap-1.5">
              {[15, 30, 45, 60, 90, 120].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all',
                    duration === d ? 'bg-[#d4857a] text-white border-[#d4857a]' : 'bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] border-[var(--app-border)]')}>
                  {d >= 60 ? `${d / 60}h` : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-[10px] text-[var(--app-text-muted)] mb-1 block">项目</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none">
              <option value="">无项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Contexts */}
          {contexts && contexts.length > 0 && (
            <div>
              <label className="text-[10px] text-[var(--app-text-muted)] mb-1 block">上下文（可多选）</label>
              <div className="flex gap-1.5 flex-wrap">
                {contexts.map(ctx => {
                  const CtxIcon = CONTEXT_ICONS[ctx.icon] || Monitor;
                  const isSelected = selectedContexts.includes(ctx.id);
                  return (
                    <button key={ctx.id}
                      onClick={() => setSelectedContexts(prev => isSelected ? prev.filter(c => c !== ctx.id) : [...prev, ctx.id])}
                      className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all',
                        isSelected ? 'text-white border-transparent' : 'bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] border-[var(--app-border)]')}
                      style={isSelected ? { backgroundColor: ctx.color } : undefined}>
                      <CtxIcon size={8} />
                      @{ctx.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tag */}
          <div>
            <label className="text-[10px] text-[var(--app-text-muted)] mb-1 block">标签</label>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(tags).map(([key, tag]) => (
                <button key={key} onClick={() => setSelectedTag(key)}
                  className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all',
                    selectedTag === key ? 'text-white' : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)]')}
                  style={selectedTag === key ? { backgroundColor: tag.color } : undefined}>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Importance */}
          <div className="flex gap-2">
            <button onClick={() => setImportance(importance === 'important' ? 'normal' : 'important')}
              className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all flex-1',
                importance === 'important' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[var(--app-tag-bg)] border-[var(--app-border)] text-[var(--app-tag-text)]')}>
              <Flag size={10} /> 重要
            </button>
            <button onClick={() => setUrgency(urgency === 'urgent' ? 'normal' : 'urgent')}
              className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all flex-1',
                urgency === 'urgent' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-[var(--app-tag-bg)] border-[var(--app-border)] text-[var(--app-tag-text)]')}>
              <AlertTriangle size={10} /> 紧急
            </button>
          </div>

          {/* Notes */}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="备注..."
            rows={2}
            className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none resize-none" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-[var(--app-border)]">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--app-text-secondary)]">
            取消
          </button>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!title.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[var(--app-text)] disabled:opacity-50">
              保存
            </button>
            <button onClick={handleSaveAndComplete} disabled={!title.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#d4857a] text-white disabled:opacity-50">
              保存并完成
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
