import { useCallback, useRef } from 'react';
import type { Task } from '@/types';
import { addDays, addWeeks, addMonths, format, parseISO, getDay } from 'date-fns';

/**
 * 根据重复规则计算下一次任务日期
 */
function getNextDate(currentDate: string, repeat: Task['repeat'], repeatRule?: string): string | null {
  if (!repeat || repeat === 'none') return null;

  // custom 类型通过 repeatRule 判断
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

function getNextCustomDate(baseDate: Date, repeatRule?: string): string | null {
  if (!repeatRule) return null;

  try {
    const rule = JSON.parse(repeatRule);
    const type = rule.type || 'daily';
    const interval = rule.interval || 1;

    switch (type) {
      case 'workday': {
        // 找下一个工作日
        let next = addDays(baseDate, 1);
        let attempts = 0;
        while (attempts < 14) {
          const day = getDay(next); // 0=Sun, 6=Sat
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
        // 找下一个选中的星期几
        const weekdays: number[] = rule.weekdays || [1, 2, 3, 4, 5];
        let next = addDays(baseDate, 1);
        let attempts = 0;
        while (attempts < 14) {
          const day = getDay(next); // 0=Sun
          const adjustedDay = day === 0 ? 7 : day; // convert Sun=0 to Sun=7
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
        // Set to desired day of month, clamp to last day of month
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

/**
 * 当任务完成时，如果有重复规则，生成下一个副本
 */
export function useRepeatTasks(tasks: Task[], setTasks: (tasks: Task[]) => void) {
  // Refs to avoid recreating processCompletedRepeatTask on every tasks change
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const setTasksRef = useRef(setTasks);
  setTasksRef.current = setTasks;

  const processCompletedRepeatTask = useCallback((completedTask: Task) => {
    const currentTasks = tasksRef.current;
    const REPEAT_TYPES: string[] = ['daily', 'weekly', 'monthly', 'custom'];
    if (!completedTask.repeat || completedTask.repeat === 'none') return;
    // Support custom repeat type via repeatRule
    if (!REPEAT_TYPES.includes(completedTask.repeat)) return;
    if (!completedTask.completed) return;

    const nextDate = getNextDate(completedTask.date, completedTask.repeat, completedTask.repeatRule);
    if (!nextDate) return;

    // 如果下一个日期的任务已经存在，不重复创建
    const existing = currentTasks.find(t =>
      t.title === completedTask.title &&
      t.date === nextDate &&
      !t.completed
    );
    if (existing) return;

    const maxOrder = currentTasks.reduce((max, t) => Math.max(max, t.order), -1);

    const newTask: Task = {
      ...completedTask,
      id: crypto.randomUUID(),
      date: nextDate,
      completed: false,
      completedAt: undefined,
      createdAt: Date.now(),
      order: maxOrder + 1,
    };

    setTasksRef.current([newTask, ...currentTasks]);
  }, []);

  return { processCompletedRepeatTask, getNextDate };
}
