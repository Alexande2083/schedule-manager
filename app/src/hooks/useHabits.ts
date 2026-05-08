import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { getToday } from '@/utils/date';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekday' | 'weekly';
  weeklyGoal?: number;
  createdAt: string;
}

export interface HabitLog {
  date: string;
  habitId: string;
  completed: boolean;
}

export function useHabits() {
  const [habits, setHabits] = useLocalStorage<Habit[]>('sunsama-habits', []);
  const [logs, setLogs] = useLocalStorage<HabitLog[]>('sunsama-habit-logs', []);

  const addHabit = useCallback((habit: Omit<Habit, 'id' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habit,
      id: 'habit-' + Date.now(),
      createdAt: getToday(),
    };
    setHabits(prev => [...prev, newHabit]);
  }, [setHabits]);

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setLogs(prev => prev.filter(l => l.habitId !== id));
  }, [setHabits, setLogs]);

  const toggleLog = useCallback((habitId: string, date: string) => {
    setLogs(prev => {
      const existing = prev.find(l => l.habitId === habitId && l.date === date);
      if (existing) {
        return prev.filter(l => !(l.habitId === habitId && l.date === date));
      }
      return [...prev, { date, habitId, completed: true }];
    });
  }, [setLogs]);

  const isCompleted = useCallback((habitId: string, date: string) => {
    return logs.some(l => l.habitId === habitId && l.date === date);
  }, [logs]);

  const getStreak = useCallback((habitId: string): number => {
    const today = getToday();
    let streak = 0;
    const d = new Date(today);
    // If today not completed, allow checking yesterday once (skip at most 1 day)
    let skippedToday = false;
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      if (logs.some(l => l.habitId === habitId && l.date === dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        if (streak === 0 && !skippedToday) {
          // Today not done — check from yesterday
          skippedToday = true;
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  }, [logs]);

  const getMonthlyStats = useCallback((habitId: string, year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const monthLogs = logs.filter(l => l.habitId === habitId && l.date.startsWith(monthStr));
    return { daysInMonth, completedDays: monthLogs.length };
  }, [logs]);

  const habitStats = useMemo(() => {
    return habits.map(habit => {
      const todayDone = isCompleted(habit.id, getToday());
      const streak = getStreak(habit.id);
      const today = new Date();
      const monthly = getMonthlyStats(habit.id, today.getFullYear(), today.getMonth() + 1);
      return { habit, todayDone, streak, monthly };
    });
  }, [habits, isCompleted, getStreak, getMonthlyStats]);

  return {
    habits, setHabits,
    logs, setLogs,
    addHabit, deleteHabit, toggleLog, isCompleted, getStreak, getMonthlyStats, habitStats,
  };
}
