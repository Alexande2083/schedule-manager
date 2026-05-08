// ─── App-wide Constants ───────────────────────────────
// Extracted from magic numbers scattered across the codebase

/** Default new task template */
export const DEFAULT_TASK_VALUES = {
  tag: 'work' as const,
  pomodoros: 0,
  duration: 0,
  importance: 'normal' as const,
  urgency: 'normal' as const,
  repeat: 'none' as const,
  pinned: false,
  collapsed: false,
  notes: '',
  deadline: '',
  time: '',
  checklistId: '',
  projectId: '',
  parentId: '',
  contexts: [] as string[],
  dependsOn: [] as string[],
} as const;

/** Pomodoro defaults */
export const POMODORO_DURATION = 25;        // minutes
export const POMODORO_SHORT_BREAK = 5;       // minutes
export const POMODORO_LONG_BREAK = 15;       // minutes
export const POMODORO_COUNT_BEFORE_LONG = 3;

/** Notification intervals */
export const NOTIFICATION_CHECK_INTERVAL = 30_000; // 30s
export const DEADLINE_WARNING_MINUTES = 15;

/** Undo history */
export const UNDO_MAX_HISTORY = 10;

/** Sync & storage keys */
export const STORAGE_KEYS = {
  tasks: 'sunsama-tasks',
  tags: 'sunsama-tags',
  projects: 'sunsama-projects',
  checklists: 'sunsama-checklists',
  contexts: 'sunsama-contexts',
  perspectives: 'sunsama-perspectives',
  theme: 'sunsama-theme-v2',
  font: 'sunsama-font-size',
  glass: 'sunsama-glass-opacity',
  selectedDate: 'sunsama-selected-date',
  lastReview: 'sunsama-last-review-date',
  mindmap: 'mindmap-v2-data',
  habits: 'sunsama-habits',
  habitLogs: 'sunsama-habit-logs',
} as const;

/** Font sizes */
export const FONT_SIZES = {
  small: '13px',
  medium: '14px',
  large: '16px',
} as const;

/** Revalidation / polling intervals */
export const DATA_SYNC_INTERVAL = 600_000; // 10min
export const KEEP_ALIVE_INTERVAL = 600_000; // 10min

/** AI defaults */
export const AI_TEMPERATURE_PARSE = 0.3;
export const AI_TEMPERATURE_SUMMARY = 0.7;
export const AI_MAX_TOKENS = 500;
export const AI_MINDMAP_CHILDREN_LIMIT = 6;

/** MindMap layout */
export const MINDMAP_NODE_W = 150;
export const MINDMAP_NODE_H = 48;
export const MINDMAP_GAP_X = 60;
export const MINDMAP_GAP_Y = 18;
export const MINDMAP_DEFAULT_SCALE = 0.85;
export const MINDMAP_MIN_SCALE = 0.2;
export const MINDMAP_MAX_SCALE = 2.5;
export const MINDMAP_OFFSET_INIT = { x: 100, y: 80 };

/** Repeat task types */
export const REPEAT_TYPES = ['daily', 'weekly', 'monthly'] as const;

/** Default tag colors for new tags */
export const TAG_COLOR_PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] as const;

/** Weekly: days labels */
export const WEEK_DAYS_SHORT = ['一', '二', '三', '四', '五', '六', '日'] as const;
export const WEEK_DAYS_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
