import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import type { Task, ViewType, DisplayMode, Checklist, Perspective, Context } from '@/types';
import { DEFAULT_TAGS, DEFAULT_PROJECTS, DEFAULT_CHECKLISTS, DEFAULT_CONTEXTS, DEFAULT_PERSPECTIVES } from '@/types';
import { getToday } from '@/utils/date';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useFontSize } from '@/hooks/useFontSize';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import LZString from 'lz-string';
import { Sidebar } from '@/components/Sidebar';
import { TaskPanel } from '@/components/TaskPanel';
import { CalendarPanel } from '@/components/CalendarPanel';
import { PomodoroModal } from '@/components/PomodoroModal';
import { QuadrantPanel } from '@/components/QuadrantPanel';
import { CountdownPanel } from '@/components/CountdownPanel';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileDrawer } from '@/components/MobileDrawer';
import { DataSyncPanel } from '@/components/DataSyncPanel';
import { AIParserModal } from '@/components/AIParserModal';
import { AISummaryModal } from '@/components/AISummaryModal';
import { MindMapPanel } from '@/components/MindMapPanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { ChecklistPanel } from '@/components/ChecklistPanel';
import { PerspectivesPanel } from '@/components/PerspectivesPanel';
import { ThemeSettings } from '@/components/ThemeSettings';
import { WeatherTimeWidget } from '@/components/WeatherTimeWidget';
import { TaskEditModal } from '@/components/TaskEditModal';
import { SearchModal } from '@/components/SearchModal';
import { BackupReminder } from '@/components/BackupReminder';
import { MobileEditDrawer } from '@/components/MobileEditDrawer';
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
  const [contexts] = useLocalStorage<Context[]>('sunsama-contexts', DEFAULT_CONTEXTS);
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
  const [view, setView] = useState<ViewType>('today');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterContext, setFilterContext] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<'calendar' | 'quadrant' | 'countdown' | 'sidebar' | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [aiParserOpen, setAiParserOpen] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // Batch selection state
  const [_selectedTaskIds] = useState<string[]>([]);

  // Undo history: keep last 10 snapshots
  const historyRef = useRef<Task[][]>([]);
  const undoFlagRef = useRef(false);

  const pushHistory = useCallback(() => {
    historyRef.current.push(tasks);
    if (historyRef.current.length > 10) historyRef.current.shift();
  }, [tasks]);

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
  }, [editingTask, syncOpen, aiParserOpen, aiSummaryOpen, themeSettingsOpen, pomodoroOpen, searchOpen, undo]);

  const pomodoro = usePomodoro();

  // Notification permission & reminder checker (deadline + pomodoro)
  const notifiedTasksRef = useRef<Set<string>>(new Set());
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
      if (pomodoro.isRunning && pomodoro.minutes === 1 && pomodoro.seconds === 0) {
        new Notification('番茄钟即将结束', {
          body: '还有1分钟，准备休息一下',
          icon: '/favicon.ico',
          tag: 'pomodoro-end',
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [tasks, pomodoro]);

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
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1);
    // Auto-assign checklistId based on tag matching checklist's defaultTag
    let checklistId = taskData.checklistId;
    if (!checklistId) {
      const matchedChecklist = checklists.find(c => c.defaultTag === taskData.tag && !c.archived);
      if (matchedChecklist) {
        checklistId = matchedChecklist.id;
      }
    }
    const newTask: Task = { ...taskData, checklistId, id: crypto.randomUUID(), createdAt: Date.now(), order: maxOrder + 1 };
    setTasks(prev => [newTask, ...prev]);
  }, [tasks, setTasks, pushHistory, checklists]);

  const handleToggleTask = useCallback((id: string) => {
    pushHistory();
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        completed: !t.completed,
        completedAt: !t.completed ? Date.now() : undefined,
      };
    }));
  }, [setTasks, pushHistory]);

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

  const handleChangeView = useCallback((v: ViewType) => {
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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [setTasks, pushHistory]);

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
    <div className="h-[100dvh] flex flex-col lg:p-4 lg:gap-4 p-2 gap-2 overflow-hidden">
      {/* Backup Reminder Banner */}
      <BackupReminder onOpenSync={() => setSyncOpen(true)} />

      {/* Mobile Header */}
      <MobileHeader
        isDark={theme.isDark} onToggleTheme={toggleTheme} view={view} onChangeView={handleChangeView}
        onOpenPomodoro={() => setPomodoroOpen(true)} completedToday={pomodoro.completedToday}
        onOpenDrawer={setMobileDrawer} onOpenSync={() => setSyncOpen(true)} onOpenAI={() => setAiParserOpen(true)} onOpenSidebar={() => setMobileDrawer('sidebar')}
      />

      {/* Main Content */}
      <div className="flex-1 flex lg:gap-4 gap-2 min-h-0">
        {/* Left Sidebar - desktop only */}
        <div className="hidden lg:block">
          <Sidebar
            view={view} onChangeView={handleChangeView} filterTag={filterTag} onFilterTag={setFilterTag}
            filterContext={filterContext} onFilterContext={setFilterContext}
            filterProject={filterProject} onFilterProject={setFilterProject}
            tasks={tasks} completedToday={pomodoro.completedToday} onOpenPomodoro={() => setPomodoroOpen(true)}
            isDark={theme.isDark} onToggleTheme={toggleTheme} tags={tags} onUpdateTags={setTags}
            projects={projects} onUpdateProjects={setProjects} contexts={contexts}
            onOpenSync={() => setSyncOpen(true)} onOpenAI={() => setAiParserOpen(true)}
            onOpenThemeSettings={() => setThemeSettingsOpen(true)}
          />
        </div>

        {/* Center Content - conditional by view */}
        {view === 'checklist' ? (
          <ChecklistPanel
            tasks={tasks} checklists={checklists} tags={tags}
            onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask} onTogglePin={handleTogglePin} onSetReminder={handleSetReminder}
            onOpenEdit={handleOpenEdit} onUpdateChecklists={setChecklists} onReorderTasks={handleReorderTasks}
            onExportArchive={handleExportArchive}
          />
        ) : view === 'mindmap' ? (
          <MindMapPanel />
        ) : view === 'review' ? (
          <ReviewPanel
            tasks={tasks} checklists={checklists} projects={projects} tags={tags}
            onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask}
          />
        ) : view === 'perspectives' ? (
          <PerspectivesPanel
            tasks={tasks}
            perspectives={perspectives}
            contexts={contexts}
            tags={tags}
            projects={projects}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditFullTask={handleEditFullTask}
            onUpdatePerspectives={setPerspectives}
          />
        ) : (
          <TaskPanel
            tasks={contextFilteredTasks} selectedDate={selectedDate} view={view} displayMode={displayMode}
            onChangeDisplayMode={handleChangeDisplayMode} filterTag={filterTag} onSelectDate={handleSelectDate}
            onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask}
            onEditFullTask={handleEditFullTask} onAddTask={handleAddTask} onReorderTasks={handleReorderTasks}
            completedToday={pomodoro.completedToday} tags={tags} projects={projects} contexts={contexts} templates={taskTemplates.templates}
            onOpenEdit={setEditingTask}
            onReorderProjects={setProjects}
          />
        )}

        {/* Right Column - desktop only, hide on checklist/perspectives view */}
        {view !== 'checklist' && view !== 'perspectives' && (
          <div className="hidden lg:flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto">
            <WeatherTimeWidget />
            <CalendarPanel tasks={tasks} selectedDate={selectedDate} onSelectDate={handleSelectDate} />
            <QuadrantPanel tasks={tasks} selectedDate={selectedDate} view={view} onToggleTask={handleToggleTask} onUpdateQuadrant={handleUpdateTaskQuadrant} />
            <CountdownPanel tasks={tasks} onToggleTask={handleToggleTask} onOpenEdit={setEditingTask} />
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav view={view} onChangeView={handleChangeView} onOpenPomodoro={() => setPomodoroOpen(true)} />

      {/* Mobile Drawer for Calendar/Quadrant/Countdown/Sidebar */}
      <MobileDrawer
        isOpen={mobileDrawer !== null} onClose={() => setMobileDrawer(null)} type={mobileDrawer}
        tasks={tasks} selectedDate={selectedDate} view={view} onToggleTask={handleToggleTask}
        onUpdateQuadrant={handleUpdateTaskQuadrant} onSelectDate={handleSelectDate}
        onChangeView={handleChangeView} filterTag={filterTag} onFilterTag={setFilterTag}
        filterContext={filterContext} onFilterContext={setFilterContext}
        filterProject={filterProject} onFilterProject={setFilterProject}
        completedToday={pomodoro.completedToday} onOpenPomodoro={() => setPomodoroOpen(true)}
        isDark={theme.isDark} onToggleTheme={toggleTheme} tags={tags} onUpdateTags={setTags}
        projects={projects} onUpdateProjects={setProjects} contexts={contexts}
        onOpenSync={() => setSyncOpen(true)} onOpenAI={() => setAiParserOpen(true)}
        onOpenThemeSettings={() => setThemeSettingsOpen(true)}
      />

      {/* Global Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        tasks={tasks}
        projects={projects}
        contexts={contexts}
        tags={tags}
        onOpenEdit={setEditingTask}
        onSelectDate={handleSelectDate}
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
        onImport={(data) => {
          localStorage.setItem('sunsama-tasks', JSON.stringify(data.tasks));
          if (data.tags) localStorage.setItem('sunsama-tags', JSON.stringify(data.tags));
          if (data.projects) localStorage.setItem('sunsama-projects', JSON.stringify(data.projects));
          if (data.checklists) localStorage.setItem('sunsama-checklists', JSON.stringify(data.checklists));
          if (data.contexts) localStorage.setItem('sunsama-contexts', JSON.stringify(data.contexts));
          if (data.perspectives) localStorage.setItem('sunsama-perspectives', JSON.stringify(data.perspectives));
          if (data.theme) localStorage.setItem('sunsama-theme', JSON.stringify(data.theme));
          if (data.selectedDate) localStorage.setItem('sunsama-selected-date', JSON.stringify(data.selectedDate));
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