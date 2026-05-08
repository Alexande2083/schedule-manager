import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import type { Task, DisplayMode, Checklist, Perspective, Context } from '@/types';
import { DEFAULT_TAGS, DEFAULT_PROJECTS, DEFAULT_CHECKLISTS, DEFAULT_CONTEXTS, DEFAULT_PERSPECTIVES } from '@/types';
import { getToday } from '@/utils/date';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { syncPut } from '@/utils/api';
import { useCloudSync } from '@/hooks/useCloudSync';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useFontSize } from '@/hooks/useFontSize';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import { useRepeatTasks } from '@/hooks/useRepeatTasks';
import LZString from 'lz-string';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { PomodoroModal } from '@/components/PomodoroModal';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileSidebarDrawer } from '@/components/MobileSidebarDrawer';
import { MobileRightPanelSheet } from '@/components/MobileRightPanelSheet';
import { DataSyncPanel } from '@/components/DataSyncPanel';
import { AIParserModal } from '@/components/AIParserModal';
import { AISummaryModal } from '@/components/AISummaryModal';
import { MindMapPanel } from '@/components/MindMapPanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { ChecklistPanel } from '@/components/ChecklistPanel';
import { PerspectivesPanel } from '@/components/PerspectivesPanel';
import { ThemeSettings } from '@/components/ThemeSettings';
import { NotificationSettings } from '@/components/NotificationSettings';
import { TaskEditModal } from '@/components/TaskEditModal';
import { SearchModal } from '@/components/SearchModal';
import { BackupReminder } from '@/components/BackupReminder';
import { MobileEditDrawer } from '@/components/MobileEditDrawer';
import { DailyReviewModal } from '@/components/DailyReviewModal';
import { SettingsModal } from '@/components/SettingsModal';
import { HabitsPanel } from '@/components/HabitsPanel';
import { UserInsights } from '@/components/UserInsights';
import { useHabits } from '@/hooks/useHabits';
import { useLearningSystem } from '@/hooks/useLearningSystem';
import type { ThemeColor } from '@/types';

interface AppTheme {
  colorScheme: ThemeColor;
  isDark: boolean;
}

function App() {
  const [theme, setTheme] = useLocalStorage<AppTheme>('sunsama-theme-v2', { colorScheme: 'coral', isDark: false });
  const [glassOpacity, setGlassOpacity] = useLocalStorage<number>('sunsama-glass-opacity', 55);
  const fontSize = useFontSize();
  const taskTemplates = useTaskTemplates();
  const [tags, setTags] = useLocalStorage<Record<string, { label: string; color: string }>>('sunsama-tags', DEFAULT_TAGS);
  const [projects, setProjects] = useLocalStorage('sunsama-projects', DEFAULT_PROJECTS);
  const [checklists, setChecklists] = useLocalStorage<Checklist[]>('sunsama-checklists', DEFAULT_CHECKLISTS);
  // OmniFocus-inspired: contexts and perspectives
  const [contexts, setContexts] = useLocalStorage<Context[]>('sunsama-contexts', DEFAULT_CONTEXTS);
  const [perspectives, setPerspectives] = useLocalStorage<Perspective[]>('sunsama-perspectives', DEFAULT_PERSPECTIVES);

  const todayStr = getToday();

  const [tasks, setTasks] = useLocalStorage<Task[]>('sunsama-tasks', [
    { id: '1', title: '完成项目设计文档', completed: false, date: todayStr, tag: 'work', time: '09:00', duration: 120, projectId: 'p1', pomodoros: 2, createdAt: Date.now(), order: 0, importance: 'important', urgency: 'urgent', deadline: todayStr, pinned: false, checklistId: 'c1' },
    { id: '2', title: '撰写需求说明', completed: false, date: todayStr, tag: 'work', time: '10:00', duration: 60, projectId: 'p1', pomodoros: 0, createdAt: Date.now() - 500, order: 1, importance: 'important', urgency: 'urgent', deadline: todayStr, pinned: false, checklistId: 'c1', parentId: '1' },
    { id: '3', title: '绘制流程图', completed: false, date: todayStr, tag: 'work', time: '11:00', duration: 45, projectId: 'p1', pomodoros: 0, createdAt: Date.now() - 600, order: 2, importance: 'normal', urgency: 'normal', pinned: false, checklistId: 'c1', parentId: '1' },
    { id: '4', title: '团队周会', completed: false, date: todayStr, tag: 'meeting', time: '14:00', duration: 60, projectId: 'p1', pomodoros: 0, createdAt: Date.now() - 1000, order: 3, importance: 'important', urgency: 'urgent', deadline: todayStr, pinned: false, checklistId: 'c1', contexts: ['meeting'] },
    { id: '5', title: '学习 React 新特性', completed: true, date: todayStr, tag: 'personal', time: '19:00', duration: 90, pomodoros: 1, createdAt: Date.now() - 2000, order: 4, importance: 'important', urgency: 'normal', pinned: false, checklistId: 'c3', contexts: ['computer'] },
    { id: '6', title: '回复客户邮件', completed: false, date: todayStr, tag: 'important', time: '10:30', duration: 30, projectId: 'p2', pomodoros: 0, createdAt: Date.now() - 3000, order: 5, importance: 'normal', urgency: 'urgent', deadline: todayStr, pinned: false, checklistId: 'c1', contexts: ['computer'] },
    { id: '7', title: '产品原型评审', completed: false, date: todayStr, tag: 'meeting', time: '10:00', duration: 45, projectId: 'p2', pomodoros: 0, createdAt: Date.now() - 4000, order: 6, importance: 'normal', urgency: 'normal', repeat: 'weekly', pinned: false, checklistId: 'c1', contexts: ['office', 'meeting'] },
    { id: '8', title: '买咖啡豆', completed: false, date: todayStr, tag: 'shopping', duration: 15, pomodoros: 0, createdAt: Date.now() - 5000, order: 7, importance: 'normal', urgency: 'normal', pinned: false, checklistId: 'c2', contexts: ['outdoor'] },
    { id: '9', title: '打印会议资料', completed: false, date: todayStr, tag: 'shopping', duration: 15, pomodoros: 0, createdAt: Date.now() - 6000, order: 8, importance: 'normal', urgency: 'normal', pinned: false, checklistId: 'c2', contexts: ['office'] },
  ]);

  // Cloud sync (only when logged in)
  const syncData = useMemo(() => ({
    tasks, projects, checklists, contexts, perspectives, tags,
  }), [tasks, projects, checklists, contexts, perspectives, tags]);

  const setSyncData = useCallback((key: string, value: any) => {
    switch (key) {
      case 'tasks': setTasks(value); break;
      case 'projects': setProjects(value); break;
      case 'checklists': setChecklists(value); break;
      case 'tags': setTags(value); break;
      case 'contexts': setContexts(value); break;
      case 'perspectives': setPerspectives(value); break;
    }
  }, [setTasks, setProjects, setChecklists, setTags, setContexts, setPerspectives]);

  const { pullFromServer } = useCloudSync(syncData, setSyncData);

  // Pull data from server on startup (once)
  useEffect(() => {
    pullFromServer();
  }, []);

  // Daily review: show once per day on first visit
  useEffect(() => {
    const lastReviewDate = localStorage.getItem('sunsama-last-review-date');
    const todayStr = getToday();
    if (lastReviewDate !== todayStr) {
      // Show review after a short delay to let UI settle
      const timer = setTimeout(() => setDailyReviewOpen(true), 2000);
      localStorage.setItem('sunsama-last-review-date', todayStr);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', theme.colorScheme);
    document.documentElement.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
    document.documentElement.style.setProperty('--glass-panel-opacity', `${glassOpacity / 100}`);
  }, [theme, glassOpacity]);

  // URL hash sync detection
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#sync=')) {
      try {
        const compressed = hash.slice(6);
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (!json) throw new Error('解压失败');
        const data = JSON.parse(json);
        if (data.tasks && Array.isArray(data.tasks)) {
          if (window.confirm('检测到同步链接，是否恢复其中的数据？当前数据将被覆盖。')) {
            localStorage.setItem('sunsama-tasks', JSON.stringify(data.tasks));
            if (data.tags) localStorage.setItem('sunsama-tags', JSON.stringify(data.tags));
            if (data.projects) localStorage.setItem('sunsama-projects', JSON.stringify(data.projects));
            if (data.checklists) localStorage.setItem('sunsama-checklists', JSON.stringify(data.checklists));
            if (data.contexts) localStorage.setItem('sunsama-contexts', JSON.stringify(data.contexts));
            if (data.perspectives) localStorage.setItem('sunsama-perspectives', JSON.stringify(data.perspectives));
            if (data.theme) localStorage.setItem('sunsama-theme', JSON.stringify(data.theme));
            if (data.selectedDate) localStorage.setItem('sunsama-selected-date', JSON.stringify(data.selectedDate));
            window.location.hash = '';
            window.location.reload();
          } else {
            window.location.hash = '';
          }
        }
      } catch {
        window.location.hash = '';
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => ({ ...prev, isDark: !prev.isDark }));
  }, [setTheme]);

  const changeColorScheme = useCallback((scheme: ThemeColor) => {
    setTheme(prev => ({ ...prev, colorScheme: scheme }));
  }, [setTheme]);

  const [selectedDate, setSelectedDate] = useLocalStorage<string>('sunsama-selected-date', getToday());
  const [view, setView] = useState<string>('today');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterContext, setFilterContext] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [aiParserOpen, setAiParserOpen] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [aiSummaryRange, setAiSummaryRange] = useState<'overall' | 'week' | 'month'>('overall');
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dailyReviewOpen, setDailyReviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Batch selection state
  const [_selectedTaskIds] = useState<string[]>([]);

  // Undo history: keep last 10 snapshots
  const historyRef = useRef<Task[][]>([]);
  const undoFlagRef = useRef(false);
  // Ref to always have latest tasks without triggering dep changes
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const pushHistory = useCallback(() => {
    historyRef.current.push([...tasksRef.current]);
    if (historyRef.current.length > 10) historyRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    const snapshot = historyRef.current.pop();
    if (snapshot) {
      undoFlagRef.current = true;
      setTasks([...snapshot]);
    }
  }, [setTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Z undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Ctrl+N quick add task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setEditingTask({ id: '', title: '', completed: false, date: selectedDate, tag: 'work', pomodoros: 0, notes: '', deadline: '', order: tasks.length, pinned: false, duration: 0, createdAt: Date.now(), importance: 'normal', urgency: 'normal' });
        return;
      }
      // Ctrl+T toggle theme
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        toggleTheme();
        return;
      }
      // Ctrl+Enter start pomodoro
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setPomodoroOpen(true);
        return;
      }
      // / open search (when not typing)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // Esc close any modal/drawer
      if (e.key === 'Escape') {
        if (editingTask) setEditingTask(null);
        if (syncOpen) setSyncOpen(false);
        if (aiParserOpen) setAiParserOpen(false);
        if (aiSummaryOpen) setAiSummaryOpen(false);
        if (themeSettingsOpen) setThemeSettingsOpen(false);
        if (pomodoroOpen) setPomodoroOpen(false);
        if (searchOpen) setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingTask, syncOpen, aiParserOpen, aiSummaryOpen, themeSettingsOpen, pomodoroOpen, searchOpen, undo, toggleTheme, selectedDate, filterTag, tasks.length]);

  const pomodoro = usePomodoro();
  const { processCompletedRepeatTask } = useRepeatTasks(tasks, setTasks);
  const habits = useHabits();
  const learning = useLearningSystem(tasks);

  // Notification permission & reminder checker (deadline + pomodoro)
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  // Use ref to access latest pomodoro values without triggering effect re-runs
  const pomodoroRef = useRef(pomodoro);
  pomodoroRef.current = pomodoro;
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      tasks.forEach(task => {
        if (task.completed) return;
        if (task.reminder) {
          const reminderTime = new Date(task.reminder);
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60000)) {
            new Notification('任务提醒', { body: task.title, icon: '/favicon.ico', tag: task.id });
          }
        }
        if (task.deadline && task.time) {
          const [h, m] = task.time.split(':').map(Number);
          const deadlineDate = new Date(task.deadline);
          deadlineDate.setHours(h, m, 0, 0);
          const diffMs = deadlineDate.getTime() - now.getTime();
          const key = `deadline-${task.id}`;
          if (diffMs > 0 && diffMs <= 15 * 60000 && !notifiedTasksRef.current.has(key)) {
            notifiedTasksRef.current.add(key);
            new Notification('截止提醒', {
              body: `「${task.title}」将在15分钟后截止`,
              icon: '/favicon.ico',
              tag: key,
            });
          }
        }
      });
      const p = pomodoroRef.current;
      if (p.isRunning && p.minutes === 1 && p.seconds === 0) {
        new Notification('番茄钟即将结束', {
          body: '还有1分钟，准备休息一下',
          icon: '/favicon.ico',
          tag: 'pomodoro-end',
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Apply context + project filter to tasks passed to TaskPanel
  const contextFilteredTasks = useMemo(() => {
    let result = tasks;
    if (filterContext.length > 0) {
      result = result.filter(t => {
        // 任务自身有选中的任意一个上下文
        if (t.contexts && t.contexts.some(c => filterContext.includes(c))) return true;
        // 或者任务的父任务有选中的任意一个上下文
        if (t.parentId) {
          const parent = tasks.find(pt => pt.id === t.parentId);
          if (parent?.contexts && parent.contexts.some(c => filterContext.includes(c))) return true;
        }
        return false;
      });
    }
    if (filterProject) {
      result = result.filter(t => t.projectId === filterProject || (!t.projectId && filterProject === 'none'));
    }
    return result;
  }, [tasks, filterContext, filterProject]);

  const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'order'>) => {
    pushHistory();
    setTasks(prev => {
      const maxOrder = prev.reduce((max, t) => Math.max(max, t.order), -1);
      let checklistId = taskData.checklistId;
      if (!checklistId) {
        const matchedChecklist = checklists.find(c => c.defaultTag === taskData.tag && !c.archived);
        if (matchedChecklist) {
          checklistId = matchedChecklist.id;
        }
      }
      const newTask: Task = { ...taskData, checklistId, id: crypto.randomUUID(), createdAt: Date.now(), order: maxOrder + 1 };
      return [newTask, ...prev];
    });
  }, [setTasks, pushHistory, checklists]);

  const handleToggleTask = useCallback((id: string) => {
    pushHistory();
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          completed: !t.completed,
          completedAt: !t.completed ? Date.now() : undefined,
        };
      });
      // If task was just completed and has repeat, create next occurrence
      const REPEAT_TYPES = ['daily', 'weekly', 'monthly'] as const;
      if (!task.completed && task.repeat && REPEAT_TYPES.includes(task.repeat as any)) {
        // We need to use the updated task (which is now completed)
        const completedTask = updated.find(t => t.id === id);
        if (completedTask) {
          // Schedule repeat task creation after state update
          setTimeout(() => processCompletedRepeatTask(completedTask), 0);
        }
      }
      return updated;
    });
  }, [setTasks, pushHistory, processCompletedRepeatTask]);

  const handleDeleteTask = useCallback((id: string) => {
    pushHistory();
    setTasks(prev => {
      const toDelete = new Set<string>();
      const collectChildren = (taskId: string) => {
        toDelete.add(taskId);
        prev.filter(t => t.parentId === taskId).forEach(c => collectChildren(c.id));
      };
      collectChildren(id);
      return prev.filter(t => !toDelete.has(t.id));
    });
  }, [setTasks, pushHistory]);

  const handleEditTask = useCallback((id: string, title: string) => {
    pushHistory();
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, title } : t)));
  }, [setTasks, pushHistory]);

  const handleReorderTasks = useCallback((reorderedTasks: Task[]) => {
    pushHistory();
    setTasks(reorderedTasks);
  }, [setTasks, pushHistory]);

  const handleTogglePin = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }, [setTasks]);

  const handleSetReminder = useCallback((id: string, reminder: string | undefined) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reminder } : t));
  }, [setTasks]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setView('today');
  }, [setSelectedDate]);

  const handleChangeView = useCallback((v: string) => {
    setView(v);
    setFilterTag(null);
    setFilterContext([]);
    setFilterProject(null);
    if (v === 'today') { setSelectedDate(getToday()); setDisplayMode('list'); }
    if (v === 'week') setDisplayMode('list');
  }, [setSelectedDate]);

  const handleChangeDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
  }, []);

  const handleEditFullTask = useCallback((id: string, updates: Partial<Task>) => {
    pushHistory();
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      // Check if task was completed via edit (save & complete)
      const task = updated.find(t => t.id === id);
      if (task?.completed && task.repeat && task.repeat !== 'none') {
        setTimeout(() => processCompletedRepeatTask(task), 0);
      }
      return updated;
    });
  }, [setTasks, pushHistory, processCompletedRepeatTask]);

  const handleUpdateTaskQuadrant = useCallback((id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => {
    pushHistory();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, importance, urgency } : t));
  }, [setTasks, pushHistory]);

  const handleOpenEdit = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingTask(null);
  }, []);

  // ========== AI Parser: Batch add parsed tasks ==========
  const handleAddParsedTasks = useCallback((parsedTasks: Omit<Task, 'id' | 'createdAt' | 'order'>[]) => {
    pushHistory();
    setTasks(prev => {
      let maxOrder = prev.reduce((max, t) => Math.max(max, t.order), -1);
      const newTasks = parsedTasks.map(taskData => {
        maxOrder += 1;
        return { ...taskData, id: crypto.randomUUID(), createdAt: Date.now(), order: maxOrder };
      });
      return [...newTasks, ...prev];
    });
  }, [setTasks]);

  // ─── Auto Planner callbacks ───

  // Apply schedule: set times for multiple tasks at once
  const handleApplySchedule = useCallback((updates: { id: string; time: string }[]) => {
    pushHistory();
    setTasks(prev => prev.map(t => {
      const update = updates.find(u => u.id === t.id);
      return update ? { ...t, time: update.time } : t;
    }));
  }, [setTasks, pushHistory]);

  // Add child tasks (breakdown)
  const handleAddSubTasks = useCallback((parentId: string, steps: string[]) => {
    pushHistory();
    setTasks(prev => {
      const parent = prev.find(t => t.id === parentId);
      if (!parent) return prev;
      const maxOrder = prev.reduce((max, t) => Math.max(max, t.order), -1);
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
      return [...newTasks, ...prev];
    });
  }, [setTasks, pushHistory]);

  // Update priority
  const handleUpdatePriority = useCallback((id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, importance, urgency } : t));
  }, [setTasks]);

  // Reschedule task to a new date
  const handleReschedule = useCallback((id: string, date: string) => {
    pushHistory();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, date } : t));
  }, [setTasks, pushHistory]);

  // Export archive: export completed tasks by date
  const handleExportArchive = useCallback(() => {
    const completed = tasks.filter(t => t.completed);
    const byDate: Record<string, Task[]> = {};
    completed.forEach(t => {
      const date = t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : t.date;
      byDate[date] = byDate[date] || [];
      byDate[date].push(t);
    });
    const archive = {
      exportDate: new Date().toISOString(),
      archive: byDate,
      totalCompleted: completed.length,
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunsama-archive-${getToday()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tasks]);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Backup Reminder Banner */}
      <BackupReminder onOpenSync={() => setSyncOpen(true)} />

      {/* === Sidebar — Desktop (>=768px) === */}
      <div className="hidden md:flex flex-shrink-0 h-full border-r border-[var(--color-border)]">
        <Sidebar
          view={view} onChangeView={handleChangeView}
          onOpenSettings={() => setSettingsOpen(true)}
          tags={tags} filterTag={filterTag} onFilterTag={setFilterTag}
          projects={projects} filterProject={filterProject} onFilterProject={setFilterProject}
          contexts={contexts} filterContext={filterContext} onFilterContext={setFilterContext}
          onUpdateProjects={setProjects} onUpdateTags={setTags} onUpdateContexts={setContexts}
        />
      </div>

      {/* === Main Content Area === */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ background: 'var(--color-bg)' }}>
        {/* Mobile Header (< md) */}
        <header className="md:hidden flex-shrink-0 border-b border-[var(--color-border)] px-4 py-3">
          <MobileHeader
            view={view}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            onOpenRightPanel={() => setMobileRightPanelOpen(true)}
            completedToday={pomodoro.completedToday}
          />
        </header>

        {/* Desktop Toolbar (>=768px) */}
        <div className="hidden md:flex flex-shrink-0 items-center justify-end gap-2 px-6 py-3 border-b border-[var(--color-border)]">
          <button onClick={() => setAiParserOpen(true)} className="btn-ghost text-xs">✨ AI 解析</button>
          <button onClick={() => setSearchOpen(true)} className="btn-ghost text-xs">🔍 搜索</button>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          {view === 'checklist' ? (
            <div className="p-6">
              <ChecklistPanel
                tasks={tasks} checklists={checklists} tags={tags}
                onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask}
                onEditTask={handleEditTask} onTogglePin={handleTogglePin} onSetReminder={handleSetReminder}
                onOpenEdit={handleOpenEdit} onUpdateChecklists={setChecklists} onReorderTasks={handleReorderTasks}
                onExportArchive={handleExportArchive}
              />
            </div>
          ) : view === 'mindmap' ? (
            <MindMapPanel />
          ) : view === 'review' ? (
            <div className="p-6">
              <ReviewPanel tasks={tasks} checklists={checklists} projects={projects} tags={tags}
                onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} />
            </div>
          ) : view === 'perspectives' ? (
            <PerspectivesPanel tasks={tasks} perspectives={perspectives} contexts={contexts} tags={tags} projects={projects}
              onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} onEditFullTask={handleEditFullTask}
              onUpdatePerspectives={setPerspectives} />
          ) : view === 'habits' ? (
            <div className="p-6">
              <HabitsPanel habits={habits.habits} logs={habits.logs}
                onAddHabit={habits.addHabit} onDeleteHabit={habits.deleteHabit} onToggleLog={habits.toggleLog} />
            </div>
          ) : view === 'insights' ? (
            <UserInsights insights={{ profile: learning.profile, timeSlotStats: learning.timeSlotStats, tagStats: learning.tagStats, weeklyTrend: learning.weeklyTrend, optimizationTips: learning.optimizationTips }} />
          ) : (
            <Dashboard
              tasks={contextFilteredTasks} selectedDate={selectedDate} view={view as 'today' | 'week'} displayMode={displayMode}
              onChangeDisplayMode={handleChangeDisplayMode} filterTag={filterTag} onFilterTag={setFilterTag} onSelectDate={handleSelectDate}
              onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask}
              onEditFullTask={handleEditFullTask} onAddTask={handleAddTask} onReorderTasks={handleReorderTasks}
              completedToday={pomodoro.completedToday} tags={tags} projects={projects} contexts={contexts} templates={taskTemplates.templates}
              onOpenEdit={setEditingTask} onReorderProjects={setProjects}
              onApplySchedule={handleApplySchedule} onAddSubTasks={handleAddSubTasks}
              onUpdatePriority={handleUpdatePriority} onReschedule={handleReschedule}
              onGenerateSchedule={learning.generateSmartSchedule}
              onGeneratePlan={learning.generateWeeklyPlan}
              pendingTodayCount={learning.pendingTasks.filter(t => t.date === selectedDate).length}
            />
          )}
        </main>

        {/* Mobile Bottom Nav (<768px) */}
        <nav className="md:hidden flex-shrink-0 border-t border-[var(--color-border)]">
          <MobileBottomNav view={view} onChangeView={handleChangeView} onOpenPomodoro={() => setPomodoroOpen(true)} />
        </nav>
      </div>

      {/* === Overlays === */}
      <MobileSidebarDrawer
        isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)}
        view={view} onChangeView={handleChangeView}
        isDark={theme.isDark} onToggleTheme={toggleTheme}
        tags={tags} onFilterTag={setFilterTag} filterTag={filterTag}
        projects={projects} filterProject={filterProject} onFilterProject={setFilterProject}
        contexts={contexts} filterContext={filterContext} onFilterContext={setFilterContext}
        onUpdateTags={setTags} onUpdateProjects={setProjects} onUpdateContexts={setContexts}
      />
      <MobileRightPanelSheet
        isOpen={mobileRightPanelOpen} onClose={() => setMobileRightPanelOpen(false)}
        tasks={tasks} selectedDate={selectedDate} view={view}
        onSelectDate={handleSelectDate} onToggleTask={handleToggleTask}
        onUpdateQuadrant={handleUpdateTaskQuadrant} onOpenEdit={setEditingTask} tags={tags}
      />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)}
        tasks={tasks} projects={projects} contexts={contexts} tags={tags}
        onOpenEdit={setEditingTask} onSelectDate={handleSelectDate}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        onClose={handleCloseEdit}
        task={editingTask}
        tags={tags}
        projects={projects}
        contexts={contexts}
        allTasks={tasks}
        onSave={handleEditFullTask}
      />

      {/* Data Sync Panel */}
      <DataSyncPanel
        isOpen={syncOpen}
        onClose={() => setSyncOpen(false)}
        currentData={{ version: 2, exportDate: new Date().toISOString(), tasks, tags, projects, checklists, contexts, perspectives, theme, selectedDate }}
        onImport={async (data) => {
          // Generate new IDs for all imported data to avoid conflicts with existing data
          const makeId = () => crypto.randomUUID();

          const newTasks = (data.tasks || []).map(t => ({ ...t, id: makeId() }));
          const newProjects = (data.projects || []).map(p => ({ ...p, id: makeId() }));
          const newChecklists = (data.checklists || []).map(c => ({ ...c, id: makeId() }));
          const newContexts = (data.contexts || []).map(c => ({ ...c, id: makeId() }));
          const newPerspectives = (data.perspectives || []).map(p => ({ ...p, id: makeId() }));

          // Map old checklist/project IDs in tasks to new IDs
          const projectMap: Record<string, string> = {};
          (data.projects || []).forEach((p, i) => { projectMap[p.id] = newProjects[i].id; });
          const checklistMap: Record<string, string> = {};
          (data.checklists || []).forEach((c, i) => { checklistMap[c.id] = newChecklists[i].id; });
          const contextMap: Record<string, string> = {};
          (data.contexts || []).forEach((c, i) => { contextMap[c.id] = newContexts[i].id; });

          const remappedTasks = newTasks.map(t => ({
            ...t,
            projectId: t.projectId ? (projectMap[t.projectId] || t.projectId) : undefined,
            checklistId: t.checklistId ? (checklistMap[t.checklistId] || t.checklistId) : undefined,
            contexts: (t.contexts || []).map((ctx: string) => contextMap[ctx] || ctx),
          }));

          // Write to localStorage
          localStorage.setItem('sunsama-tasks', JSON.stringify(remappedTasks));
          if (data.tags) localStorage.setItem('sunsama-tags', JSON.stringify(data.tags));
          if (data.projects) localStorage.setItem('sunsama-projects', JSON.stringify(newProjects));
          if (data.checklists) localStorage.setItem('sunsama-checklists', JSON.stringify(newChecklists));
          if (data.contexts) localStorage.setItem('sunsama-contexts', JSON.stringify(newContexts));
          if (data.perspectives) localStorage.setItem('sunsama-perspectives', JSON.stringify(newPerspectives));
          if (data.theme) localStorage.setItem('sunsama-theme', JSON.stringify(data.theme));
          if (data.selectedDate) localStorage.setItem('sunsama-selected-date', JSON.stringify(data.selectedDate));

          // Push to server BEFORE reload, so pullFromServer gets the imported data
          try {
            await syncPut({
              tasks: remappedTasks,
              projects: newProjects,
              checklists: newChecklists,
              tags: Object.entries(data.tags || {}).map(([key, val]) => ({
                id: `tag_${key}`, label: val.label, color: val.color,
              })),
              contexts: newContexts,
              perspectives: newPerspectives,
            });
          } catch (e) {
            console.warn('导入数据同步到服务器失败，将基于本地数据恢复:', e);
          }

          window.location.reload();
        }}
      />

      {/* AI Parser Modal */}
      <AIParserModal
        isOpen={aiParserOpen}
        onClose={() => setAiParserOpen(false)}
        onAddTasks={handleAddParsedTasks}
        tags={tags}
      />

      {/* AI Summary Modal */}
      <AISummaryModal
        isOpen={aiSummaryOpen}
        onClose={() => setAiSummaryOpen(false)}
        tasks={tasks}
        timeRange={aiSummaryRange}
        onTimeRangeChange={setAiSummaryRange}
      />

      {/* Theme Settings Modal */}
      <ThemeSettings
        isOpen={themeSettingsOpen}
        onClose={() => setThemeSettingsOpen(false)}
        colorScheme={theme.colorScheme}
        onChangeColorScheme={changeColorScheme}
        isDark={theme.isDark}
        onToggleDark={toggleTheme}
        tags={tags}
        onUpdateTags={setTags}
        fontSize={fontSize.size}
        onChangeFontSize={fontSize.setSize}
        glassOpacity={glassOpacity}
        onChangeGlassOpacity={setGlassOpacity}
      />

      {/* Mobile Edit Drawer (replaces modal on mobile) */}
      <MobileEditDrawer
        isOpen={!!editingTask}
        onClose={handleCloseEdit}
        task={editingTask}
        tags={tags}
        projects={projects}
        contexts={contexts}
        onSave={handleEditFullTask}
      />

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenSync={() => setSyncOpen(true)}
        onOpenTheme={() => setThemeSettingsOpen(true)}
        onExportArchive={handleExportArchive}
        colorScheme={theme.colorScheme}
        isDark={theme.isDark}
        onChangeColorScheme={changeColorScheme}
        onToggleDark={toggleTheme}
      />

      {/* Daily Review Modal */}
      <DailyReviewModal
        isOpen={dailyReviewOpen}
        onClose={() => setDailyReviewOpen(false)}
        tasks={tasks}
        pomodoroCompletedToday={pomodoro.completedToday}
        date={selectedDate}
        onOpenReview={() => { setView('review'); setDailyReviewOpen(false); }}
      />

      {/* Pomodoro Modal */}
      <PomodoroModal
        isOpen={pomodoroOpen} onClose={() => setPomodoroOpen(false)}
        minutes={pomodoro.minutes} seconds={pomodoro.seconds}
        isRunning={pomodoro.isRunning} completedToday={pomodoro.completedToday}
        duration={pomodoro.duration} progress={pomodoro.progress}
        onStart={pomodoro.start} onPause={pomodoro.pause} onReset={pomodoro.reset}
        onSetDuration={pomodoro.setDuration}
       />
    </div>
  );
}

export default App;