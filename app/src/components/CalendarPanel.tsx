import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface CalendarPanelProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function CalendarPanel({ tasks, selectedDate, onSelectDate }: CalendarPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksByDate = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.date] = (acc[task.date] || 0) + 1;
    return acc;
  }, {});

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="glass-panel bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-[var(--app-text-muted)] py-1"
          >
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const hasTasks = (tasksByDate[dateStr] || 0) > 0;

          return (
            <button
              key={index}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'relative h-8 rounded-lg text-xs font-medium transition-all duration-200',
                !isCurrentMonth && 'text-[var(--app-text-muted)] opacity-50',
                isCurrentMonth && !isSelected && 'text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]',
                isSelected && 'bg-[#d4857a] text-white shadow-sm',
                isToday && !isSelected && 'ring-2 ring-[#d4857a]/30 text-[#d4857a]'
              )}
            >
              {format(day, 'd')}
              {hasTasks && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#d4857a]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--app-border)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--app-text-secondary)]">今日任务</span>
          <span className="font-semibold text-[var(--app-text)]">
            {tasksByDate[format(new Date(), 'yyyy-MM-dd')] || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
