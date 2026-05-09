import { useEffect, useRef } from 'react';

interface ShortcutActions {
  undo: () => boolean;
  openEdit: () => void;
  toggleTheme: () => void;
  openPomodoro: () => void;
  openSearch: () => void;
  closeAll: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const ref = useRef(actions);
  ref.current = actions;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const a = ref.current;
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        a.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        a.openEdit();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        a.toggleTheme();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        a.openPomodoro();
        return;
      }
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        a.openSearch();
        return;
      }
      if (e.key === 'Escape') {
        a.closeAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
