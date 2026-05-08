import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Solar } from 'lunar-typescript';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import { parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from 'date-fns';

interface CalendarPanelProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tags?: Record<string, { label: string; color: string }>;
}

/** Get lunar day string and solar term (节气) for a given solar date */
function getLunarInfo(solarDate: Date): { dayStr: string; term: string | null } {
  try {
    const solar = Solar.fromDate(solarDate);
    const lunar = solar.getLunar();
    const dayStr = lunar.getDayInChinese(); // 初一、初二...三十
    const term = lunar.getJieQi(); // 节气名 or null
    return { dayStr, term };
  } catch {
    return { dayStr: '', term: null };
  }
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
    tasks.filter(t => t.date === selectedDate && !t.completed).slice(0, 3),
    [tasks, selectedDate]
  );

  return (
    <div style={{ padding: 'var(--space-3)' }}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-[var(--app-accent)]" />
          <span className="text-[11px] font-semibold text-[var(--app-text)]">
            {format(currentMonth, 'M月 yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-0">
          <button onClick={handlePrev} className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <ChevronLeft size={13} />
          </button>
          <button onClick={handleNext} className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <span key={d} className="text-[9px] text-center text-[var(--app-text-muted)] py-0.5">{d}</span>
        ))}
      </div>

      {/* Days grid — compact */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} className="h-9" />;
          }
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSel = isSameDay(day, selectedDateObj);
          const today = isToday(day);
          const info = taskCountByDate.get(dateStr);
          const completionPct = info && info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0;
          const lunar = getLunarInfo(day);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'h-9 rounded-md flex flex-col items-center justify-center text-center relative transition-colors duration-fast',
                isSel
                  ? 'bg-[var(--app-accent)] text-white font-semibold shadow-sm'
                  : today
                    ? 'text-[var(--app-text)] font-semibold border border-[var(--app-border)]'
                    : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
              )}
            >
              {/* Date number */}
              <span className={cn(
                'text-[11px] leading-none',
                isSel ? 'text-white' : '',
                lunar.term ? 'font-bold' : ''
              )}>
                {format(day, 'd')}
              </span>
              {/* Lunar / Term info */}
              {lunar.term ? (
                <span className={cn(
                  'text-[7px] leading-none mt-px truncate w-full px-0.5',
                  isSel ? 'text-white/80' : 'text-[var(--color-danger)]'
                )}>
                  {lunar.term}
                </span>
              ) : (
                <span className={cn(
                  'text-[7px] leading-none mt-px',
                  isSel ? 'text-white/70' : 'text-[var(--app-text-muted)]'
                )}>
                  {lunar.dayStr}
                </span>
              )}
              {/* Task dot */}
              {info && info.total > 0 && (
                <div className={cn(
                  'absolute top-0.5 right-0.5 w-1 h-1 rounded-full',
                  completionPct === 100 ? 'bg-emerald-400' : isSel ? 'bg-white/70' : 'bg-[var(--app-accent)]/60'
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date tasks preview */}
      {selectedTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--app-border)] space-y-1">
          <p className="text-[9px] font-medium text-[var(--app-text-muted)]">
            {format(selectedDateObj, 'M月d日')} 待办
          </p>
          {selectedTasks.map(task => (
            <div key={task.id} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: tags?.[task.tag]?.color || '#94a3b8' }} />
              <span className="text-[10px] text-[var(--app-text)] truncate">{task.title}</span>
              {task.time && (
                <span className="text-[9px] text-[var(--app-text-muted)] ml-auto shrink-0">{task.time}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
