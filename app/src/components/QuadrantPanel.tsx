import { useMemo, useState, useEffect } from 'react';
import { Clock, CheckCircle2, Settings } from 'lucide-react';
import type { Task } from '@/types';
import { QUADRANT_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

interface QuadrantPanelProps {
  tasks: Task[];
  selectedDate: string;
  view: string;
  onToggleTask: (id: string) => void;
  onUpdateQuadrant: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;
}

export function QuadrantPanel({ tasks, selectedDate, view, onToggleTask, onUpdateQuadrant }: QuadrantPanelProps) {
  const [expandedQuadrant, setExpandedQuadrant] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.completed);
    if (view === 'today') {
      filtered = filtered.filter(t => t.date === selectedDate);
    }
    return filtered;
  }, [tasks, selectedDate, view]);

  const getQuadrantKey = (task: Task): keyof typeof QUADRANT_CONFIG => {
    if (task.importance === 'important' && task.urgency === 'urgent') return 'important-urgent';
    if (task.importance === 'important' && task.urgency === 'normal') return 'important-not-urgent';
    if (task.importance === 'normal' && task.urgency === 'urgent') return 'not-important-urgent';
    return 'not-important-not-urgent';
  };

  const quadrants: Array<keyof typeof QUADRANT_CONFIG> = [
    'important-urgent',
    'important-not-urgent',
    'not-important-urgent',
    'not-important-not-urgent',
  ];

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">四象限</h3>
        <Settings size={12} className="text-[var(--app-text-muted)]" />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {quadrants.map((key) => {
          const config = QUADRANT_CONFIG[key];
          const quadrantTasks = filteredTasks.filter(t => getQuadrantKey(t) === key);
          const isExpanded = expandedQuadrant === key;

          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-2.5 cursor-pointer transition-all duration-200 overflow-y-auto',
                isDark ? config.bgColorDark : config.bgColor,
                isDark ? config.borderColorDark : config.borderColor,
                isExpanded && 'ring-2 ring-offset-1',
              )}
              style={{ maxHeight: '200px', '--tw-ring-color': config.accentColor } as React.CSSProperties}
              onClick={() => setExpandedQuadrant(isExpanded ? null : key)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn('text-[10px] font-semibold', isDark ? config.textColorDark : config.textColor)}>
                  {config.label}
                </span>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', isDark ? 'bg-black/30' : 'bg-white/60', isDark ? config.textColorDark : config.textColor)}>
                  {quadrantTasks.length}
                </span>
              </div>

              <div className="space-y-1">
                {quadrantTasks.slice(0, isExpanded ? undefined : 2).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTask(task.id);
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-[var(--app-text)] hover:opacity-70 transition-opacity"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTask(task.id);
                      }}
                      className="w-3.5 h-3.5 rounded border border-[var(--app-border)] flex items-center justify-center shrink-0 hover:border-[#d4857a]"
                    >
                      {task.completed && <CheckCircle2 size={10} className="text-[#8cc68a]" />}
                    </button>
                    <span className="truncate">{task.title}</span>
                    {task.deadline && (
                      <Clock size={9} className="shrink-0 text-[var(--app-text-muted)]" />
                    )}
                  </div>
                ))}
                {!isExpanded && quadrantTasks.length > 2 && (
                  <div className="text-[10px] text-[var(--app-text-muted)] pl-5">
                    +{quadrantTasks.length - 2} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Task Editor */}
      {expandedQuadrant && (
        <div className="mt-3 pt-3 border-t border-[var(--app-border)] space-y-2">
          <p className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider">
            点击任务切换重要/紧急状态
          </p>
          {filteredTasks
            .filter(t => getQuadrantKey(t) === expandedQuadrant)
            .map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--app-text)] truncate">{task.title}</span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onUpdateQuadrant(task.id, task.importance === 'important' ? 'normal' : 'important', task.urgency)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                      task.importance === 'important'
                        ? (isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700')
                        : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] hover:bg-red-900/20'
                    )}
                  >
                    重要
                  </button>
                  <button
                    onClick={() => onUpdateQuadrant(task.id, task.importance, task.urgency === 'urgent' ? 'normal' : 'urgent')}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                      task.urgency === 'urgent'
                        ? (isDark ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700')
                        : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] hover:bg-orange-900/20'
                    )}
                  >
                    紧急
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
