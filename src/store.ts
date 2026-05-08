import { create } from 'zustand';
import type { Task, Project, Checklist, Context, Perspective } from '@/types';
import { STORAGE_KEYS, UNDO_MAX_HISTORY } from '@/constants';

interface AppTheme {
  colorScheme: string;
  isDark: boolean;
}

interface AppState {
  // Data
  tasks: Task[];
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  checklists: Checklist[];
  contexts: Context[];
  perspectives: Perspective[];

  // UI
  view: string;
  selectedDate: string;
  displayMode: 'list' | 'gantt';
  filterTag: string | null;
  filterContext: string[];
  filterProject: string | null;
  theme: AppTheme;
  fontSize: 'small' | 'medium' | 'large';
  glassOpacity: number;

  // Undo
  history: Task[][];

  // Actions
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  pushHistory: () => void;
  undo: () => Task[] | null;
  setView: (view: string) => void;
  setSelectedDate: (date: string) => void;
  setDisplayMode: (mode: 'list' | 'gantt') => void;
  setFilterTag: (tag: string | null) => void;
  setFilterContext: (contexts: string[]) => void;
  setFilterProject: (project: string | null) => void;
  setTheme: (theme: AppTheme | ((prev: AppTheme) => AppTheme)) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setGlassOpacity: (opacity: number) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Initial state from localStorage ───
  tasks: loadFromStorage<Task[]>(STORAGE_KEYS.tasks, []),
  tags: loadFromStorage(STORAGE_KEYS.tags, {} as Record<string, { label: string; color: string }>),
  projects: loadFromStorage<Project[]>(STORAGE_KEYS.projects, []),
  checklists: loadFromStorage<Checklist[]>(STORAGE_KEYS.checklists, []),
  contexts: loadFromStorage<Context[]>(STORAGE_KEYS.contexts, []),
  perspectives: loadFromStorage<Perspective[]>(STORAGE_KEYS.perspectives, []),
  view: 'today',
  selectedDate: new Date().toISOString().slice(0, 10),
  displayMode: 'list' as const,
  filterTag: null,
  filterContext: [],
  filterProject: null,
  theme: loadFromStorage<AppTheme>(STORAGE_KEYS.theme, { colorScheme: 'coral', isDark: false }),
  fontSize: loadFromStorage<'small' | 'medium' | 'large'>(STORAGE_KEYS.font, 'medium'),
  glassOpacity: loadFromStorage<number>(STORAGE_KEYS.glass, 55),
  history: [],

  // ─── Task actions ───
  setTasks: (tasksOrFn) => {
    set(state => ({
      tasks: typeof tasksOrFn === 'function' ? tasksOrFn(state.tasks) : tasksOrFn,
    }));
    // Auto-save
    const { tasks } = get();
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  },

  pushHistory: () => {
    const { tasks, history } = get();
    const next = [...history, [...tasks]];
    if (next.length > UNDO_MAX_HISTORY) next.shift();
    set({ history: next });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return null;
    const snapshot = history[history.length - 1];
    set({ history: history.slice(0, -1), tasks: snapshot });
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(snapshot));
    return snapshot;
  },

  // ─── UI actions ───
  setView: (view) => set({ view, filterTag: null, filterContext: [], filterProject: null }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setDisplayMode: (displayMode) => set({ displayMode }),
  setFilterTag: (filterTag) => set({ filterTag }),
  setFilterContext: (filterContext) => set({ filterContext }),
  setFilterProject: (filterProject) => set({ filterProject }),
  setTheme: (themeOrFn) => {
    set(state => ({
      theme: typeof themeOrFn === 'function' ? themeOrFn(state.theme) : themeOrFn,
    }));
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(get().theme));
  },
  setFontSize: (fontSize) => {
    set({ fontSize });
    localStorage.setItem(STORAGE_KEYS.font, JSON.stringify(fontSize));
  },
  setGlassOpacity: (glassOpacity) => {
    set({ glassOpacity });
    localStorage.setItem(STORAGE_KEYS.glass, JSON.stringify(glassOpacity));
  },
}));
