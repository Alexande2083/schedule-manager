import { useCallback, useRef } from 'react';
import type { Task } from '@/types';
import { getNextDate } from '@/utils/repeat';

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
