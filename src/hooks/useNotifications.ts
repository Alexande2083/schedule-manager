import { useEffect, useRef } from 'react';
import type { Task } from '@/types';
import { NOTIFICATION_CHECK_INTERVAL, DEADLINE_WARNING_MINUTES } from '@/constants';

interface UseNotificationsOptions {
  tasks: Task[];
  pomodoro: { isRunning: boolean; minutes: number; seconds: number };
}

/**
 * Handles browser Notification permission requests,
 * deadline reminder checks, and pomodoro end alerts.
 */
export function useNotifications({ tasks, pomodoro }: UseNotificationsOptions) {
  const notifiedRef = useRef<Set<string>>(new Set());
  const pomodoroRef = useRef(pomodoro);
  pomodoroRef.current = pomodoro;

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();

      tasks.forEach(task => {
        if (task.completed) return;

        // Custom reminder
        if (task.reminder) {
          const reminderTime = new Date(task.reminder);
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60000)) {
            new Notification('任务提醒', { body: task.title, icon: '/favicon.ico', tag: task.id });
          }
        }

        // Deadline warning (15 min before)
        if (task.deadline && task.time) {
          const [h, m] = task.time.split(':').map(Number);
          const deadlineDate = new Date(task.deadline);
          deadlineDate.setHours(h, m, 0, 0);
          const diffMs = deadlineDate.getTime() - now.getTime();
          const key = `deadline-${task.id}`;
          if (diffMs > 0 && diffMs <= DEADLINE_WARNING_MINUTES * 60000 && !notifiedRef.current.has(key)) {
            notifiedRef.current.add(key);
            new Notification('截止提醒', {
              body: `「${task.title}」将在${DEADLINE_WARNING_MINUTES}分钟后截止`,
              icon: '/favicon.ico',
              tag: key,
            });
          }
        }
      });

      // Pomodoro near end
      const p = pomodoroRef.current;
      if (p.isRunning && p.minutes === 1 && p.seconds === 0) {
        new Notification('番茄钟即将结束', {
          body: '还有1分钟，准备休息一下',
          icon: '/favicon.ico',
          tag: 'pomodoro-end',
        });
      }
    }, NOTIFICATION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [tasks]);
}
