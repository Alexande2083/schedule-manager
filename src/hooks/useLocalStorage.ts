import { useState, useEffect, useCallback } from 'react';
import { getStorageItem, setStorageItem } from '@/utils/storage';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => getStorageItem(key, defaultValue));

  useEffect(() => {
    setStorageItem(key, state);
  }, [key, state]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      return next;
    });
  }, []);

  return [state, setValue];
}
