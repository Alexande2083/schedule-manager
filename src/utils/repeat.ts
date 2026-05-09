import { addDays, addWeeks, addMonths, format, parseISO, getDay } from 'date-fns';
import type { Task } from '@/types';

function getNextCustomDate(baseDate: Date, repeatRule?: string): string | null {
  if (!repeatRule) return null;

  try {
    const rule = JSON.parse(repeatRule);
    const type = rule.type || 'daily';
    const interval = rule.interval || 1;

    switch (type) {
      case 'workday': {
        let next = addDays(baseDate, 1);
        let attempts = 0;
        while (attempts < 14) {
          const day = getDay(next);
          if (day >= 1 && day <= 5) {
            return format(next, 'yyyy-MM-dd');
          }
          next = addDays(next, 1);
          attempts++;
        }
        return null;
      }
      case 'interval':
        return format(addDays(baseDate, interval), 'yyyy-MM-dd');
      case 'weekly': {
        const weekdays: number[] = rule.weekdays || [1, 2, 3, 4, 5];
        let next = addDays(baseDate, 1);
        let attempts = 0;
        while (attempts < 14) {
          const day = getDay(next);
          const adjustedDay = day === 0 ? 7 : day;
          if (weekdays.includes(adjustedDay)) {
            return format(next, 'yyyy-MM-dd');
          }
          next = addDays(next, 1);
          attempts++;
        }
        return null;
      }
      case 'monthly': {
        const dayOfMonth = rule.dayOfMonth || 1;
        let nextMonth = addMonths(baseDate, interval);
        const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
        nextMonth.setDate(Math.min(dayOfMonth, lastDay));
        return format(nextMonth, 'yyyy-MM-dd');
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function getNextDate(currentDate: string, repeat: Task['repeat'], repeatRule?: string): string | null {
  if (!repeat || repeat === 'none') return null;

  if (repeatRule) {
    return getNextCustomDate(parseISO(currentDate), repeatRule);
  }

  const baseDate = parseISO(currentDate);

  switch (repeat) {
    case 'daily':
      return format(addDays(baseDate, 1), 'yyyy-MM-dd');
    case 'weekly':
      return format(addWeeks(baseDate, 1), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(baseDate, 1), 'yyyy-MM-dd');
    default:
      return null;
  }
}
