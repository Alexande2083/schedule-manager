import { useState, type KeyboardEvent } from 'react';
import {
  Plus, Clock, Tag, FolderOpen, Flag, AlertTriangle, Calendar, StickyNote,
  Check, Monitor, Smartphone, Building2, Car, Users, Home,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Task, Context } from '@/types';
import type { Project } from '@/types';
import type { TaskTemplate } from '@/hooks/useTaskTemplates';
import { getToday } from '@/utils/date';
import { cn } from '@/lib/utils';

const CONTEXT_ICONS: Record<string, React.ElementType> = {
  Monitor, Smartphone, Building2, Car, Users, Home,
};

const CLOCK_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const CLOCK_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

interface AddTaskInputProps {
  selectedDate: string;
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  contexts?: Context[];
  templates?: TaskTemplate[];
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => void;
}

export function AddTaskInput({ selectedDate, tags, projects, contexts, templates, onAdd }: AddTaskInputProps) {
  const [title, setTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>(Object.keys(tags)[0] || 'work');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [deadline, setDeadline] = useState('');
  const [importance, setImportance] = useState<'important' | 'normal'>('normal');
  const [urgency, setUrgency] = useState<'urgent' | 'normal'>('normal');
  const [notes, setNotes] = useState('');
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'hour' | 'minute'>('hour');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      completed: false,
      date: selectedDate,
      tag: selectedTag,
      time: time || undefined,
      duration,
      projectId: selectedProject || undefined,
      pomodoros: 0,
      deadline: deadline || undefined,
      importance,
      urgency,
      pinned: false,
      notes: notes.trim() || undefined,
      contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
    });
    setTitle('');
    setTime('');
    setDuration(60);
    setSelectedProject('');
    setDeadline('');
    setImportance('normal');
    setUrgency('normal');
    setNotes('');
    setSelectedContexts([]);
    setShowOptions(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const getTimeParts = () => {
    const [rawHour = '9', rawMinute = '0'] = time.split(':');
    const hour = Number(rawHour);
    const minute = Number(rawMinute);
    return {
      hour: Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 9,
      minute: Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0,
    };
  };

  const setClockTime = (hour: number, minute: number) => {
    setTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Plus size={18} className="text-[var(--app-accent)] shrink-0" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowOptions(true)}
          placeholder={`添加任务到 ${selectedDate === getToday() ? '今天' : selectedDate}`}
          className="flex-1 text-sm bg-transparent outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-placeholder)]"
        />
        <button
          onClick={handleAdd}
          disabled={!title.trim()}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            title.trim()
              ? 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]'
              : 'bg-[var(--app-border)] text-[var(--app-text-placeholder)] cursor-not-allowed'
          )}
        >
          添加
        </button>
      </div>

      {showOptions && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[var(--app-border)]">
          {/* Templates */}
          {templates && templates.length > 0 && (
            <div className="flex items-center gap-1 w-full mb-1">
              <span className="text-[11px] text-[var(--app-text-muted)] shrink-0">模板:</span>
              <div className="flex gap-1 flex-wrap">
                {templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTag(tmpl.tag);
                      setDuration(tmpl.duration);
                      setImportance(tmpl.importance);
                      setUrgency(tmpl.urgency);
                      setSelectedProject(tmpl.projectId || '');
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:bg-[var(--app-accent)]/10 hover:text-[var(--app-accent)] border border-[var(--app-border)] transition-all"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Time */}
          <Popover open={timePickerOpen} onOpenChange={(open) => {
            setTimePickerOpen(open);
            if (open) setTimePickerMode('hour');
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium shadow-xs transition-all',
                  time
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'border-[var(--app-border)] bg-[var(--app-input-bg)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                )}
              >
                <Clock size={12} />
                <span className="min-w-[34px] font-mono">{time || '时间'}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-[276px] rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-[var(--app-text)] shadow-xl"
            >
              {(() => {
                const { hour, minute } = getTimeParts();
                const period = hour >= 12 ? 'pm' : 'am';
                const faceHour = hour % 12 || 12;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-lg bg-[var(--app-input-bg)] p-1">
                        {(['hour', 'minute'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setTimePickerMode(mode)}
                            className={cn(
                              'h-7 rounded-md px-3 text-xs font-semibold transition-all',
                              timePickerMode === mode
                                ? 'bg-[var(--app-accent)] text-white shadow-sm'
                                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                            )}
                          >
                            {mode === 'hour' ? '小时' : '分钟'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center rounded-lg bg-[var(--app-input-bg)] p-1">
                        {(['am', 'pm'] as const).map((nextPeriod) => (
                          <button
                            key={nextPeriod}
                            type="button"
                            onClick={() => {
                              const nextHour = nextPeriod === 'pm'
                                ? (hour % 12) + 12
                                : hour % 12;
                              setClockTime(nextHour, minute);
                            }}
                            className={cn(
                              'h-7 rounded-md px-2.5 text-[11px] font-semibold transition-all',
                              period === nextPeriod
                                ? 'bg-[var(--app-surface)] text-[var(--app-accent)] shadow-sm'
                                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                            )}
                          >
                            {nextPeriod === 'am' ? '上午' : '下午'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-center font-mono text-2xl font-semibold tracking-normal text-[var(--app-text)]">
                      {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
                    </div>

                    <div className="relative mx-auto h-48 w-48 rounded-full border border-[var(--app-border)] bg-[var(--app-input-bg)]">
                      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--app-accent)]" />
                      <div
                        className="absolute left-1/2 top-1/2 h-[70px] w-0.5 origin-bottom rounded-full bg-[var(--app-accent)]"
                        style={{
                          transform: `translate(-50%, -100%) rotate(${
                            timePickerMode === 'hour'
                              ? faceHour * 30
                              : minute * 6
                          }deg)`,
                        }}
                      />
                      {(timePickerMode === 'hour' ? CLOCK_HOURS : CLOCK_MINUTES).map((value, index) => {
                        const clockIndex = timePickerMode === 'hour' ? value % 12 : index;
                        const angle = clockIndex * 30 - 90;
                        const radius = 76;
                        const x = Math.cos((angle * Math.PI) / 180) * radius;
                        const y = Math.sin((angle * Math.PI) / 180) * radius;
                        const isSelected = timePickerMode === 'hour'
                          ? value === faceHour
                          : value === Math.round(minute / 5) * 5;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              if (timePickerMode === 'hour') {
                                const nextHour = period === 'pm' ? (value % 12) + 12 : value % 12;
                                setClockTime(nextHour, minute);
                                setTimePickerMode('minute');
                              } else {
                                setClockTime(hour, value);
                                setTimePickerOpen(false);
                              }
                            }}
                            className={cn(
                              'absolute flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-all',
                              isSelected
                                ? 'bg-[var(--app-accent)] text-white shadow-md'
                                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
                            )}
                            style={{
                              left: `calc(50% + ${x}px)`,
                              top: `calc(50% + ${y}px)`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {timePickerMode === 'hour' ? value : String(value).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setTime('');
                          setTimePickerOpen(false);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-input-bg)] hover:text-[var(--app-text)]"
                      >
                        清除
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen(false)}
                        className="rounded-md bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--app-accent-hover)]"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                );
              })()}
            </PopoverContent>
          </Popover>

          {/* Duration */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[var(--app-text-muted)]">时长</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="text-[11px] bg-[var(--app-input-bg)] rounded-md px-1.5 py-0.5 outline-none border border-[var(--app-border)] text-[var(--app-text)] focus:border-[var(--app-accent)]"
            >
              <option value={15}>15分</option>
              <option value={30}>30分</option>
              <option value={45}>45分</option>
              <option value={60}>1小时</option>
              <option value={90}>1.5小时</option>
              <option value={120}>2小时</option>
              <option value={180}>3小时</option>
            </select>
          </div>

          {/* Project */}
          <div className="flex items-center gap-1">
            <FolderOpen size={11} className="text-[var(--app-text-muted)]" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-[11px] bg-[var(--app-input-bg)] rounded-md px-1.5 py-0.5 outline-none border border-[var(--app-border)] text-[var(--app-text)] focus:border-[var(--app-accent)]"
            >
              <option value="">无项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-[var(--app-text-muted)]" />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="text-[11px] bg-[var(--app-input-bg)] rounded-md px-1.5 py-0.5 outline-none border border-[var(--app-border)] text-[var(--app-text)] focus:border-[var(--app-accent)]"
            />
          </div>

          {/* Importance */}
          <button
            onClick={() => setImportance(prev => prev === 'important' ? 'normal' : 'important')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all',
              importance === 'important'
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] border border-[var(--app-border)] hover:bg-red-50'
            )}
          >
            <Flag size={10} />
            重要
          </button>

          {/* Urgency */}
          <button
            onClick={() => setUrgency(prev => prev === 'urgent' ? 'normal' : 'urgent')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all',
              urgency === 'urgent'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] border border-[var(--app-border)] hover:bg-orange-50'
            )}
          >
            <AlertTriangle size={10} />
            紧急
          </button>

          {/* Tag */}
          <div className="flex items-center gap-1">
            <Tag size={11} className="text-[var(--app-text-muted)]" />
            <div className="flex gap-0.5 flex-wrap">
              {Object.keys(tags).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium transition-all',
                    selectedTag === tag
                      ? 'text-white'
                      : 'bg-[var(--app-tag-bg)] text-[var(--app-tag-text)] hover:bg-[var(--app-border)]'
                  )}
                  style={selectedTag === tag ? { backgroundColor: tags[tag].color } : undefined}
                >
                  {tags[tag].label}
                </button>
              ))}
            </div>
          </div>

          {/* Contexts — Multi-select */}
          {contexts && contexts.length > 0 && (
            <div className="flex items-center gap-1.5 w-full flex-wrap">
              <span className="text-[11px] text-[var(--app-text-muted)] shrink-0">场景:</span>
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
                      'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all border',
                      isSelected ? 'text-white border-transparent' : 'bg-[var(--app-tag-bg)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                    )}
                    style={isSelected ? { backgroundColor: ctx.color, borderColor: ctx.color } : undefined}
                  >
                    {isSelected && <Check size={8} />}
                    <CtxIcon size={8} />
                    @{ctx.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Notes */}
          <div className="flex items-start gap-1 w-full mt-1">
            <StickyNote size={11} className="text-[var(--app-text-muted)] mt-1 shrink-0" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加备注..."
              rows={2}
              className="flex-1 text-[11px] bg-[var(--app-input-bg)] rounded-md px-2 py-1 outline-none border border-[var(--app-border)] text-[var(--app-text)] focus:border-[var(--app-accent)] resize-none placeholder:text-[var(--app-text-placeholder)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
