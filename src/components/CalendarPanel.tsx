import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import { parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from 'date-fns';

interface CalendarPanelProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tags?: Record<string, { label: string; color: string }>;
}

export function CalendarPanel({ tasks, selectedDate, onSelectDate, tags = {} }: CalendarPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(() => parseISO(selectedDate));

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start); // 0=Sun
    const padding: null[] = Array(firstDayOfWeek).fill(null);
    return [...padding, ...allDays];
  }, [currentMonth]);

  const taskCountByDate = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    tasks.forEach(t => {
      const existing = map.get(t.date) || { total: 0, completed: 0 };
      existing.total++;
      if (t.completed) existing.completed++;
      map.set(t.date, existing);
    });
    return map;
  }, [tasks]);

  const selectedDateObj = parseISO(selectedDate);

  const handlePrev = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNext = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Tasks for selected date (max 3 preview)
  const selectedTasks = useMemo(() =>
    tasks.filter(t => t.date === selectedDate && !t.completed).slice(0, 5),
    [tasks, selectedDate]
  );

  return (
    <div className="saas-card p-4">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-[var(--app-accent)]" />
          <span className="text-xs font-semibold text-[var(--app-text)]">
            {format(currentMonth, 'M月 yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handlePrev} className="p-1 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
            <ChevronLeft size={14} />
          </button>
          <button onClick={handleNext} className="p-1 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <span key={d} className="text-[10px] text-center text-[var(--app-text-muted)] font-medium py-1">{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-7 gap-0.5"
        >
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`pad-${idx}`} className="aspect-square" />;
            }
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSel = isSameDay(day, selectedDateObj);
            const today = isToday(day);
            const info = taskCountByDate.get(dateStr);
            const completionPct = info && info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0;

            return (
              <motion.button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all',
                  isSel
                    ? 'bg-[var(--app-accent)] text-white font-semibold shadow-sm'
                    : today
                      ? 'text-[var(--app-text)] font-semibold border border-[var(--app-border)]'
                      : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
                )}
              >
                <span className={cn('text-xs', isSel ? 'text-white' : '')}>{format(day, 'd')}</span>
                {info && info.total > 0 && (
                  <div className={cn(
                    'w-1 h-1 rounded-full mt-0.5',
                    completionPct === 100 ? 'bg-emerald-400' : isSel ? 'bg-white/70' : 'bg-[var(--app-accent)]/50'
                  )} />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Selected date tasks preview */}
      {selectedTasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--app-border)] space-y-1.5">
          <p className="text-[10px] font-medium text-[var(--app-text-muted)]">
            {format(selectedDateObj, 'M月d日')} 待办
          </p>
          {selectedTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tags?.[task.tag]?.color || '#94a3b8' }} />
              <span className="text-[11px] text-[var(--app-text)] truncate">{task.title}</span>
              {task.time && (
                <span className="text-[10px] text-[var(--app-text-muted)] ml-auto shrink-0">{task.time}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
