import { create } from 'zustand';
import type { Task, Project, Checklist, Context, Perspective } from '@/types';
import { STORAGE_KEYS, UNDO_MAX_HISTORY } from '@/constants';
import { getNextDate } from '@/utils/repeat';

interface AppTheme {
  colorScheme: string;
  isDark: boolean;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
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

  // ─── Task CRUD ───
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  editTask: (id: string, title: string) => void;
  editFullTask: (id: string, updates: Partial<Task>) => void;
  reorderTasks: (tasks: Task[]) => void;
  togglePin: (id: string) => void;
  setReminder: (id: string, reminder: string | undefined) => void;
  updateQuadrant: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;

  // ─── AI / Batch ───
  addParsedTasks: (parsedTasks: Omit<Task, 'id' | 'createdAt' | 'order'>[]) => void;

  // ─── Planner ───
  applySchedule: (updates: { id: string; time: string }[]) => void;
  addSubTasks: (parentId: string, steps: string[]) => void;
  updatePriority: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;
  reschedule: (id: string, date: string) => void;

  // ─── State setters (with localStorage sync) ───
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  pushHistory: () => void;
  undo: () => boolean;
  setView: (view: string) => void;
  setSelectedDate: (date: string) => void;
  setDisplayMode: (mode: 'list' | 'gantt') => void;
  setFilterTag: (tag: string | null) => void;
  setFilterContext: (contexts: string[]) => void;
  setFilterProject: (project: string | null) => void;
  setTheme: (theme: AppTheme | ((prev: AppTheme) => AppTheme)) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setGlassOpacity: (opacity: number) => void;
  setTags: (tags: Record<string, { label: string; color: string }> | ((prev: Record<string, { label: string; color: string }>) => Record<string, { label: string; color: string }>)) => void;
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  setChecklists: (checklists: Checklist[] | ((prev: Checklist[]) => Checklist[])) => void;
  setContexts: (contexts: Context[] | ((prev: Context[]) => Context[])) => void;
  setPerspectives: (perspectives: Perspective[] | ((prev: Perspective[]) => Perspective[])) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Initial state ───
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

  // ─── Undo ───
  pushHistory: () => {
    const { tasks, history } = get();
    const next = [...history, [...tasks]];
    if (next.length > UNDO_MAX_HISTORY) next.shift();
    set({ history: next });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return false;
    const snapshot = history[history.length - 1];
    set({ history: history.slice(0, -1), tasks: snapshot });
    saveToStorage(STORAGE_KEYS.tasks, snapshot);
    return true;
  },

  // ─── Task CRUD ───

  addTask: (taskData) => {
    get().pushHistory();
    const { tasks, checklists } = get();
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);
    let checklistId = taskData.checklistId;
    if (!checklistId) {
      const matched = checklists.find(c => c.defaultTag === taskData.tag && !c.archived);
      if (matched) checklistId = matched.id;
    }
    const newTask: Task = {
      ...taskData,
      checklistId,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      order: maxOrder + 1,
    };
    const next = [newTask, ...tasks];
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  toggleTask: (id) => {
    get().pushHistory();
    const { tasks } = get();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated = tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t
    );
    set({ tasks: updated });
    saveToStorage(STORAGE_KEYS.tasks, updated);

    // Handle repeat task creation for just-completed tasks
    const completedTask = updated.find(t => t.id === id);
    if (completedTask?.completed && completedTask.repeat && completedTask.repeat !== 'none') {
      const REPEAT_TYPES: readonly string[] = ['daily', 'weekly', 'monthly'];
      if (REPEAT_TYPES.includes(completedTask.repeat) || completedTask.repeatRule) {
        const nextDate = getNextDate(completedTask.date, completedTask.repeat, completedTask.repeatRule);
        if (nextDate) {
          const currentTasks = get().tasks;
          const exists = currentTasks.find(t =>
            t.title === completedTask.title && t.date === nextDate && !t.completed
          );
          if (!exists) {
            const maxOrder = currentTasks.reduce((max, t) => Math.max(max, t.order), -1);
            const repeatTask: Task = {
              ...completedTask,
              id: crypto.randomUUID(),
              date: nextDate,
              completed: false,
              completedAt: undefined,
              createdAt: Date.now(),
              order: maxOrder + 1,
            };
            const withRepeat = [repeatTask, ...get().tasks];
            set({ tasks: withRepeat });
            saveToStorage(STORAGE_KEYS.tasks, withRepeat);
          }
        }
      }
    }
  },

  deleteTask: (id) => {
    get().pushHistory();
    const { tasks } = get();
    const toDelete = new Set<string>();
    const collectChildren = (taskId: string) => {
      toDelete.add(taskId);
      tasks.filter(t => t.parentId === taskId).forEach(c => collectChildren(c.id));
    };
    collectChildren(id);
    const next = tasks.filter(t => !toDelete.has(t.id));
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  editTask: (id, title) => {
    get().pushHistory();
    const { tasks } = get();
    const next = tasks.map(t => (t.id === id ? { ...t, title } : t));
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  editFullTask: (id, updates) => {
    get().pushHistory();
    const { tasks } = get();
    const updated = tasks.map(t => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks: updated });
    saveToStorage(STORAGE_KEYS.tasks, updated);

    // Handle repeat task creation
    const task = updated.find(t => t.id === id);
    if (task?.completed && task.repeat && task.repeat !== 'none') {
      const REPEAT_TYPES: readonly string[] = ['daily', 'weekly', 'monthly'];
      if (REPEAT_TYPES.includes(task.repeat) || task.repeatRule) {
        const nextDate = getNextDate(task.date, task.repeat, task.repeatRule);
        if (nextDate) {
          const currentTasks = get().tasks;
          const exists = currentTasks.find(t =>
            t.title === task.title && t.date === nextDate && !t.completed
          );
          if (!exists) {
            const maxOrder = currentTasks.reduce((max, t) => Math.max(max, t.order), -1);
            const repeatTask: Task = {
              ...task,
              id: crypto.randomUUID(),
              date: nextDate,
              completed: false,
              completedAt: undefined,
              createdAt: Date.now(),
              order: maxOrder + 1,
            };
            const withRepeat = [repeatTask, ...get().tasks];
            set({ tasks: withRepeat });
            saveToStorage(STORAGE_KEYS.tasks, withRepeat);
          }
        }
      }
    }
  },

  reorderTasks: (reordered) => {
    get().pushHistory();
    const next = [...reordered];
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  togglePin: (id) => {
    const { tasks } = get();
    const next = tasks.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t);
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  setReminder: (id, reminder) => {
    const { tasks } = get();
    const next = tasks.map(t => t.id === id ? { ...t, reminder } : t);
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  updateQuadrant: (id, importance, urgency) => {
    get().pushHistory();
    const { tasks } = get();
    const next = tasks.map(t => t.id === id ? { ...t, importance, urgency } : t);
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  // ─── AI / Batch ───

  addParsedTasks: (parsedTasks) => {
    get().pushHistory();
    const { tasks } = get();
    let maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);
    const newTasks = parsedTasks.map(taskData => {
      maxOrder += 1;
      return { ...taskData, id: crypto.randomUUID(), createdAt: Date.now(), order: maxOrder };
    });
    const next = [...newTasks, ...tasks];
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  // ─── Planner ───

  applySchedule: (updates) => {
    get().pushHistory();
    const { tasks } = get();
    const next = tasks.map(t => {
      const update = updates.find(u => u.id === t.id);
      return update ? { ...t, time: update.time } : t;
    });
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  addSubTasks: (parentId, steps) => {
    get().pushHistory();
    const { tasks } = get();
    const parent = tasks.find(t => t.id === parentId);
    if (!parent) return;
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);
    const newTasks: Task[] = steps.map((step, i) => ({
      id: crypto.randomUUID(),
      title: step,
      completed: false,
      date: parent.date,
      tag: parent.tag,
      projectId: parent.projectId,
      pomodoros: 0,
      createdAt: Date.now(),
      order: maxOrder + i + 1,
      parentId,
      pinned: false,
      duration: Math.max(30, Math.floor((parent.duration || 60) / steps.length)),
      importance: parent.importance,
      urgency: parent.urgency,
    }));
    const next = [...newTasks, ...tasks];
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  updatePriority: (id, importance, urgency) => {
    const { tasks } = get();
    const next = tasks.map(t => t.id === id ? { ...t, importance, urgency } : t);
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  reschedule: (id, date) => {
    get().pushHistory();
    const { tasks } = get();
    const next = tasks.map(t => t.id === id ? { ...t, date } : t);
    set({ tasks: next });
    saveToStorage(STORAGE_KEYS.tasks, next);
  },

  // ─── Raw task setter (no undo) ───
  setTasks: (tasksOrFn) => {
    set(state => ({
      tasks: typeof tasksOrFn === 'function' ? tasksOrFn(state.tasks) : tasksOrFn,
    }));
    saveToStorage(STORAGE_KEYS.tasks, get().tasks);
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
    saveToStorage(STORAGE_KEYS.theme, get().theme);
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    saveToStorage(STORAGE_KEYS.font, fontSize);
  },

  setGlassOpacity: (glassOpacity) => {
    set({ glassOpacity });
    saveToStorage(STORAGE_KEYS.glass, glassOpacity);
  },

  // ─── Master data setters ───
  setTags: (tagsOrFn) => {
    set(state => ({
      tags: typeof tagsOrFn === 'function' ? tagsOrFn(state.tags) : tagsOrFn,
    }));
    saveToStorage(STORAGE_KEYS.tags, get().tags);
  },

  setProjects: (projectsOrFn) => {
    set(state => ({
      projects: typeof projectsOrFn === 'function' ? projectsOrFn(state.projects) : projectsOrFn,
    }));
    saveToStorage(STORAGE_KEYS.projects, get().projects);
  },

  setChecklists: (checklistsOrFn) => {
    set(state => ({
      checklists: typeof checklistsOrFn === 'function' ? checklistsOrFn(state.checklists) : checklistsOrFn,
    }));
    saveToStorage(STORAGE_KEYS.checklists, get().checklists);
  },

  setContexts: (contextsOrFn) => {
    set(state => ({
      contexts: typeof contextsOrFn === 'function' ? contextsOrFn(state.contexts) : contextsOrFn,
    }));
    saveToStorage(STORAGE_KEYS.contexts, get().contexts);
  },

  setPerspectives: (perspectivesOrFn) => {
    set(state => ({
      perspectives: typeof perspectivesOrFn === 'function' ? perspectivesOrFn(state.perspectives) : perspectivesOrFn,
    }));
    saveToStorage(STORAGE_KEYS.perspectives, get().perspectives);
  },
}));
