import { useState, useEffect, useRef, useCallback } from 'react';
import { getToday } from '@/utils/date';

interface PomodoroTimer {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  completedToday: number;
  lastDate: string;
  duration: number; // minutes
}

const STORAGE_KEY = 'sunsama-pomodoro';

function load(): PomodoroTimer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    completedToday: 0,
    lastDate: getToday(),
    duration: 25,
  };
}

function save(state: PomodoroTimer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function usePomodoro() {
  const saved = useRef(load());

  const today = getToday();
  if (saved.current.lastDate !== today) {
    saved.current = { ...saved.current, completedToday: 0, lastDate: today };
    save(saved.current);
  }

  const [state, setState] = useState<PomodoroTimer>({
    ...saved.current,
    isRunning: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.minutes === 0 && prev.seconds === 0) {
            const next = { ...prev, isRunning: false, completedToday: prev.completedToday + 1 };
            save(next);
            return next;
          }
          if (prev.seconds === 0) {
            return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  const start = useCallback(() => {
    setState(prev => { const next = { ...prev, isRunning: true }; save(next); return next; });
  }, []);

  const pause = useCallback(() => {
    setState(prev => { const next = { ...prev, isRunning: false }; save(next); return next; });
  }, []);

  const reset = useCallback(() => {
    const next = { ...state, minutes: state.duration, seconds: 0, isRunning: false, lastDate: today };
    setState(next);
    save(next);
  }, [state]);

  const setDuration = useCallback((d: number) => {
    const next = { ...state, duration: d, minutes: d, seconds: 0, isRunning: false };
    setState(next);
    save(next);
  }, [state]);

  const progress = state.duration > 0
    ? ((state.duration - state.minutes - state.seconds / 60) / state.duration) * 100
    : 0;

  return {
    minutes: state.minutes,
    seconds: state.seconds,
    isRunning: state.isRunning,
    completedToday: state.completedToday,
    duration: state.duration,
    start,
    pause,
    reset,
    setDuration,
    progress,
  };
}
