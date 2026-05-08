export interface TagConfig {
  label: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  tag: string;
  time?: string;
  duration: number;
  projectId?: string;
  pomodoros: number;
  createdAt: number;
  order: number;
  importance: 'important' | 'normal';
  urgency: 'urgent' | 'normal';
  deadline?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  /** 自定义重复规则 JSON 字符串，如 {"type":"workday","interval":1} */
  repeatRule?: string;
  pinned: boolean;
  reminder?: string;
  completedAt?: number;
  checklistId?: string;
  // OmniFocus-inspired: infinite hierarchy
  parentId?: string;
  collapsed?: boolean;
  // OmniFocus-inspired: contexts (multiple contexts for multi-scenario)
  contexts?: string[];
  // 简易备注
  notes?: string;
  // 任务依赖关系：依赖的任务 ID 列表
  dependsOn?: string[];
}

// OmniFocus-inspired: Context (where/tool/person)
export interface Context {
  id: string;
  label: string;
  icon: string;
  color: string;
}

// OmniFocus-inspired: Perspective (saved filter view)
export interface Perspective {
  id: string;
  name: string;
  icon: string;
  filters: {
    tags?: string[];
    projectId?: string;
    context?: string;
    completed?: boolean;
    importance?: 'important' | 'normal';
    urgency?: 'urgent' | 'normal';
    dateRange?: 'today' | 'week' | 'overdue' | 'all';
    hasDeadline?: boolean;
  };
}

export interface Checklist {
  id: string;
  name: string;
  defaultTag: string;
  order: number;
  archived: boolean;
}

// Unified sync/export data format
export interface SyncData {
  tasks: Task[];
  projects: Project[];
  checklists: Checklist[];
  contexts: Context[];
  perspectives: Perspective[];
  tags: Record<string, { label: string; color: string }>;
}

export interface AppDataExport extends SyncData {
  version: number;
  exportDate: string;
  theme: { colorScheme: string; isDark: boolean } | 'light' | 'dark';
  selectedDate: string;
}

export interface PomodoroState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  completedToday: number;
}

export type ViewType = 'today' | 'week' | 'completed' | 'checklist' | 'mindmap' | 'review' | 'perspectives';

// Theme color scheme
export type ThemeColor = 'coral' | 'ocean' | 'mint' | 'lavender' | 'amber' | 'rose' | 'sky' | 'sunset';
export type DisplayMode = 'list' | 'gantt';

// 柔和耐看配色 —— 所有颜色均为低饱和度、舒适的浅色系
export const DEFAULT_TAGS: Record<string, TagConfig> = {
  work: { label: '工作', color: '#8bb4d6' },
  personal: { label: '个人', color: '#a3c495' },
  important: { label: '重要', color: '#c9a87c' },
  meeting: { label: '会议', color: '#b8a0c8' },
  shopping: { label: '购物', color: '#c4a5a0' },
  study: { label: '学习', color: '#a5a5c4' },
};

export const PRESET_COLORS = [
  '#8bb4d6', '#a3c495', '#c9a87c', '#b8a0c8',
  '#d4857a', '#c4a5a0', '#8cc4bb', '#a5a5c4',
  '#9cb8d4', '#b0c8a0', '#c8b88a', '#9eaab8',
  '#8ec4b8', '#b0c8a0', '#a0b8d4', '#b8a8c8',
];

export const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: '网站重构', color: '#8bb4d6' },
  { id: 'p2', name: '产品设计', color: '#c9a87c' },
  { id: 'p3', name: '市场推广', color: '#a3c495' },
];

export const DEFAULT_CHECKLISTS: Checklist[] = [
  { id: 'c1', name: '今日待办', defaultTag: 'work', order: 0, archived: false },
  { id: 'c2', name: '购物清单', defaultTag: 'shopping', order: 1, archived: false },
  { id: 'c3', name: '学习计划', defaultTag: 'study', order: 2, archived: false },
];

// OmniFocus-inspired: Default Contexts
export const DEFAULT_CONTEXTS: Context[] = [
  { id: 'computer', label: '电脑', icon: 'Monitor', color: '#8bb4d6' },
  { id: 'phone', label: '手机', icon: 'Smartphone', color: '#a3c495' },
  { id: 'office', label: '办公室', icon: 'Building2', color: '#c9a87c' },
  { id: 'outdoor', label: '外出', icon: 'Car', color: '#b8a0c8' },
  { id: 'meeting', label: '会议', icon: 'Users', color: '#c4a5a0' },
  { id: 'home', label: '家里', icon: 'Home', color: '#8cc4bb' },
];

// OmniFocus-inspired: Default Perspectives
export const DEFAULT_PERSPECTIVES: Perspective[] = [
  {
    id: 'urgent-important',
    name: '紧急且重要',
    icon: 'Flame',
    filters: { importance: 'important', urgency: 'urgent', completed: false, dateRange: 'all' },
  },
  {
    id: 'today-due',
    name: '今日截止',
    icon: 'CalendarClock',
    filters: { dateRange: 'today', completed: false },
  },
  {
    id: 'overdue',
    name: '已逾期',
    icon: 'AlertTriangle',
    filters: { dateRange: 'overdue', completed: false },
  },
  {
    id: 'work-only',
    name: '工作聚焦',
    icon: 'Briefcase',
    filters: { tags: ['work'], completed: false, dateRange: 'week' },
  },
  {
    id: 'personal-only',
    name: '个人事务',
    icon: 'Coffee',
    filters: { tags: ['personal'], completed: false, dateRange: 'all' },
  },
  {
    id: 'high-priority',
    name: '高优先级',
    icon: 'Flag',
    filters: { importance: 'important', completed: false, dateRange: 'all' },
  },
];

// 四象限莫兰迪色系（低饱和度、高级感）
export const QUADRANT_CONFIG = {
  'important-urgent': {
    label: '重要且紧急',
    bgColor: 'bg-rose-50/60',
    bgColorDark: 'bg-rose-950/30',
    borderColor: 'border-rose-200/60',
    borderColorDark: 'border-rose-900/40',
    textColor: 'text-rose-600',
    textColorDark: 'text-rose-300',
    accentColor: '#c98a8a',
  },
  'important-not-urgent': {
    label: '重要不紧急',
    bgColor: 'bg-amber-50/50',
    bgColorDark: 'bg-amber-950/25',
    borderColor: 'border-amber-200/50',
    borderColorDark: 'border-amber-900/35',
    textColor: 'text-amber-600',
    textColorDark: 'text-amber-300',
    accentColor: '#c9a66b',
  },
  'not-important-urgent': {
    label: '紧急不重要',
    bgColor: 'bg-sky-50/50',
    bgColorDark: 'bg-sky-950/25',
    borderColor: 'border-sky-200/50',
    borderColorDark: 'border-sky-900/35',
    textColor: 'text-sky-600',
    textColorDark: 'text-sky-300',
    accentColor: '#8bb4d6',
  },
  'not-important-not-urgent': {
    label: '不重要不紧急',
    bgColor: 'bg-emerald-50/50',
    bgColorDark: 'bg-emerald-950/25',
    borderColor: 'border-emerald-200/50',
    borderColorDark: 'border-emerald-900/35',
    textColor: 'text-emerald-600',
    textColorDark: 'text-emerald-300',
    accentColor: '#8cc4a8',
  },
} as const;
