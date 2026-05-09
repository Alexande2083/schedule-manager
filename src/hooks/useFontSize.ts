import { useEffect } from 'react';
import { useAppStore } from '@/store';

export type FontSize = 'small' | 'medium' | 'large';

const SIZES: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '16px',
};

export function useFontSize() {
  const size = useAppStore(s => s.fontSize);
  const setSize = useAppStore(s => s.setFontSize);

  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[size];
  }, [size]);

  return { size, setSize };
}
