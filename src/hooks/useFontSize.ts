import { useState, useEffect, useCallback } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'sunsama-font-size';
const DEFAULT: FontSize = 'medium';

const SIZES: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '16px',
};

function load(): FontSize {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw in SIZES) return raw as FontSize;
  } catch { /* ignore */ }
  return DEFAULT;
}

function save(size: FontSize) {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch { /* ignore */ }
}

export function useFontSize() {
  const [size, setSizeState] = useState<FontSize>(load);

  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[size];
    save(size);
  }, [size]);

  const setSize = useCallback((s: FontSize) => setSizeState(s), []);

  return { size, setSize };
}
