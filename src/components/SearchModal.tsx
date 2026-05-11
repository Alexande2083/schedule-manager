import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, CalendarDays, FolderOpen } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit: (task: Task) => void;
  onSelectDate: (date: string) => void;
}

export function SearchModal({ isOpen, onClose, onOpenEdit, onSelectDate }: SearchModalProps) {
  const tasks = useAppStore(s => s.tasks);
  const projects = useAppStore(s => s.projects);
  const tags = useAppStore(s => s.tags);
  const contexts = useAppStore(s => s.contexts);

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return tasks.filter(t => {
      // Search title
      if (t.title.toLowerCase().includes(q)) return true;
      // Search project name
      if (t.projectId) {
        const p = projects.find(pr => pr.id === t.projectId);
        if (p?.name.toLowerCase().includes(q)) return true;
      }
      // Search tag label
      if (tags[t.tag]?.label.toLowerCase().includes(q)) return true;
      // Search context label
      if (t.contexts) {
        for (const cid of t.contexts) {
          const ctx = contexts?.find(c => c.id === cid);
          if (ctx?.label.toLowerCase().includes(q)) return true;
        }
      }
      // Search notes
      if (t.notes?.toLowerCase().includes(q)) return true;
      // Search date
      if (t.date.includes(q)) return true;
      return false;
    }).slice(0, 20);
  }, [query, tasks, projects, tags, contexts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-[var(--app-modal-overlay)]" onClick={onClose}>
      <div
        className="glass-panel bg-[var(--app-surface)] rounded-xl shadow-2xl w-[560px] max-h-[70vh] flex flex-col border border-[var(--app-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--app-border)]">
          <Search size={18} className="text-[var(--app-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索任务名称、项目、标签、上下文、备注、日期..."
            className="flex-1 text-sm bg-transparent outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-placeholder)]"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--app-text-muted)] bg-[var(--app-surface-hover)] px-1.5 py-0.5 rounded">ESC</span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} className="text-[var(--app-border)] mb-3" />
              <p className="text-sm text-[var(--app-text-muted)]">未找到匹配的任务</p>
            </div>
          )}
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} className="text-[var(--app-border)] mb-3" />
              <p className="text-sm text-[var(--app-text-muted)]">输入关键词开始搜索</p>
              <div className="flex gap-2 mt-3 text-[10px] text-[var(--app-text-muted)]">
                <span className="bg-[var(--app-surface-hover)] px-2 py-1 rounded">任务名称</span>
                <span className="bg-[var(--app-surface-hover)] px-2 py-1 rounded">项目</span>
                <span className="bg-[var(--app-surface-hover)] px-2 py-1 rounded">标签</span>
                <span className="bg-[var(--app-surface-hover)] px-2 py-1 rounded">上下文</span>
              </div>
            </div>
          )}
          {results.map((task) => {
            const tagInfo = tags[task.tag] || { label: task.tag, color: '#9ca3af' };
            const project = projects.find(p => p.id === task.projectId);
            return (
              <button
                key={task.id}
                onClick={() => {
                  onSelectDate(task.date);
                  onOpenEdit(task);
                  onClose();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[var(--app-surface-hover)] transition-colors border-b border-[var(--app-border)]/50"
              >
                {/* Checkbox indicator */}
                <div className={cn(
                  'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center',
                  task.completed ? 'bg-[#8cc68a] border-[#8cc68a]' : 'border-[var(--app-border)]'
                )}>
                  {task.completed && <span className="text-white text-[8px]">✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm truncate',
                      task.completed ? 'text-[var(--app-text-muted)] line-through' : 'text-[var(--app-text)]'
                    )}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--app-text-muted)] flex items-center gap-1">
                      <CalendarDays size={8} />
                      {task.date}
                    </span>
                    {project && (
                      <span className="text-[10px] text-[var(--app-text-muted)] flex items-center gap-1">
                        <FolderOpen size={8} style={{ color: project.color }} />
                        {project.name}
                      </span>
                    )}
                    <span
                      className="text-[10px] px-1 py-0.5 rounded text-white"
                      style={{ backgroundColor: tagInfo.color }}
                    >
                      {tagInfo.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--app-border)] text-[10px] text-[var(--app-text-muted)]">
            找到 {results.length} 个结果
          </div>
        )}
      </div>
    </div>
  );
}
