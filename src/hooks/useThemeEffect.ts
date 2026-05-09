import { useEffect } from 'react';
import { useAppStore } from '@/store';

export function useThemeEffect() {
  const theme = useAppStore(s => s.theme);
  const glassOpacity = useAppStore(s => s.glassOpacity);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', theme.colorScheme);
    document.documentElement.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
    document.documentElement.style.setProperty('--glass-panel-opacity', `${glassOpacity / 100}`);
  }, [theme, glassOpacity]);
}
