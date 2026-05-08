import { format, isSameDay, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy/M/d');
}

export function formatWeekday(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE');
}

export function isToday(date: string): boolean {
  return isSameDay(parseISO(date), new Date());
}

export function getToday(): string {
  return formatDate(new Date());
}

export function isInCurrentWeek(date: string): boolean {
  const d = parseISO(date);
  const now = new Date();
  return isWithinInterval(d, {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  });
}
