import { useState, useCallback, useMemo } from 'react';
import type { Task } from '@/types';
import { getToday } from '@/utils/date';
import { useAppStore } from '@/store';
import { useCloudSync } from '@/hooks/useCloudSync';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useFontSize } from '@/hooks/useFontSize';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import { useHabits } from '@/hooks/useHabits';
import { useLearningSystem } from '@/hooks/useLearningSystem';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeEffect } from '@/hooks/useThemeEffect';
import { useDailyReview } from '@/hooks/useDailyReview';
import { useSyncOnMount } from '@/hooks/useSyncOnMount';
import { useUrlHashSync } from '@/hooks/useUrlHashSync';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MobileEditDrawer } from '@/components/MobileEditDrawer';
import { DailyReviewModal } from '@/components/DailyReviewModal';
import { SettingsModal } from '@/components/SettingsModal';
import { SyncFAB } from '@/components/SyncFAB';
import { HabitsPanel } from '@/components/HabitsPanel';
import { UserInsights } from '@/components/UserInsights';
import { WeeklyAnalytics } from '@/components/WeeklyAnalytics';

function App() {
  // ─── Store reads (still needed for sync, hooks, WeeklyAnalytics, DataSyncPanel) ───
  const tasks = useAppStore(s => s.tasks);
  const tags = useAppStore(s => s.tags);
  const projects = useAppStore(s => s.projects);
  const checklists = useAppStore(s => s.checklists);
  const contexts = useAppStore(s => s.contexts);
  const perspectives = useAppStore(s => s.perspectives);
  const theme = useAppStore(s => s.theme);
  const view = useAppStore(s => s.view);
  const selectedDate = useAppStore(s => s.selectedDate);
  const filterContext = useAppStore(s => s.filterContext);
  const filterProject = useAppStore(s => s.filterProject);

  // Store actions (sync, WeeklyAnalytics, handlers)
  const setView = useAppStore(s => s.setView);
  const setSelectedDate = useAppStore(s => s.setSelectedDate);
  const setDisplayMode = useAppStore(s => s.setDisplayMode);
  const setTasks = useAppStore(s => s.setTasks);
  const setTags = useAppStore(s => s.setTags);
  const setProjects = useAppStore(s => s.setProjects);
  const setChecklists = useAppStore(s => s.setChecklists);
  const setContexts = useAppStore(s => s.setContexts);
  const setPerspectives = useAppStore(s => s.setPerspectives);
  const setTheme = useAppStore(s => s.setTheme);
  const undo = useAppStore(s => s.undo);

  // ─── Cloud sync ───
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

  // ─── Side effect hooks ───
  useThemeEffect();
  useUrlHashSync();
  useSyncOnMount(pullFromServer);

  // ─── Independent hooks ───
  const pomodoro = usePomodoro();
  useFontSize();
  const habits = useHabits();
  const learning = useLearningSystem(tasks);
  useNotifications({ tasks, pomodoro });
  const taskTemplates = useTaskTemplates();

  // ─── Local UI state (modal toggles) ───
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

  // ─── Side effects ───
  useDailyReview(() => setDailyReviewOpen(true));
  useKeyboardShortcuts({
    undo,
    openEdit: () => setEditingTask({
      id: '', title: '', completed: false, date: selectedDate, tag: 'work',
      pomodoros: 0, notes: '', deadline: '', order: tasks.length, pinned: false,
      duration: 0, createdAt: Date.now(), importance: 'normal', urgency: 'normal',
    }),
    toggleTheme: () => setTheme(prev => ({ ...prev, isDark: !prev.isDark })),
    openPomodoro: () => setPomodoroOpen(true),
    openSearch: () => setSearchOpen(true),
    closeAll: () => {
      setEditingTask(null);
      setSyncOpen(false);
      setAiParserOpen(false);
      setAiSummaryOpen(false);
      setThemeSettingsOpen(false);
      setPomodoroOpen(false);
      setSearchOpen(false);
    },
  });

  // ─── Context + project filter (still needed for WeeklyAnalytics) ───
  const contextFilteredTasks = useMemo(() => {
    let result = tasks;
    if (filterContext.length > 0) {
      result = result.filter(t => {
        if (t.contexts && t.contexts.some(c => filterContext.includes(c))) return true;
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

  // ─── Convenience handlers ───
  const handleChangeView = useCallback((v: string) => {
    setView(v);
    if (v === 'today') { setSelectedDate(getToday()); setDisplayMode('list'); }
    if (v === 'week') setDisplayMode('list');
  }, [setView, setSelectedDate, setDisplayMode]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setView('today');
  }, [setSelectedDate, setView]);

  // ─── Export archive ───
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
    <ErrorBoundary>
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <BackupReminder onOpenSync={() => setSyncOpen(true)} />

      {/* === Sidebar — Desktop === */}
      <div className="hidden md:flex flex-shrink-0 h-full border-r border-[var(--color-border)]">
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* === Main Content === */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ background: 'var(--color-bg)' }}>
        {/* Mobile Header */}
        <header className="md:hidden flex-shrink-0 border-b border-[var(--color-border)] px-4 py-3">
          <MobileHeader
            view={view}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            onOpenRightPanel={() => setMobileRightPanelOpen(true)}
            completedToday={pomodoro.completedToday}
          />
        </header>

        {/* Content */}
        <main className={`flex-1 ${view !== 'mindmap' ? 'overflow-y-auto' : ''}`}>
          {['today', 'week', 'checklist'].includes(view) && (
            <div className="flex items-center justify-end gap-2 px-6 pt-3">
              <button onClick={() => setAiParserOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-brand)] transition-all">
                ✨ AI 解析
              </button>
              <button onClick={() => setSearchOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-brand)] transition-all">
                🔍 搜索
              </button>
            </div>
          )}
          {view === 'checklist' ? (
            <div className="p-6">
              <ChecklistPanel onOpenEdit={setEditingTask} onExportArchive={handleExportArchive} />
            </div>
          ) : view === 'mindmap' ? (
            <MindMapPanel />
          ) : view === 'review' ? (
            <div className="p-6">
              <ReviewPanel />
            </div>
          ) : view === 'perspectives' ? (
            <PerspectivesPanel />
          ) : view === 'habits' ? (
            <div className="p-6">
              <HabitsPanel habits={habits.habits} logs={habits.logs}
                onAddHabit={habits.addHabit} onDeleteHabit={habits.deleteHabit} onToggleLog={habits.toggleLog} />
            </div>
          ) : view === 'insights' ? (
            <UserInsights insights={{ profile: learning.profile, timeSlotStats: learning.timeSlotStats, tagStats: learning.tagStats, weeklyTrend: learning.weeklyTrend, optimizationTips: learning.optimizationTips }} />
          ) : view === 'week' ? (
            <WeeklyAnalytics
              tasks={contextFilteredTasks}
              tags={tags}
              learning={learning}
              habits={habits}
              onSelectDate={handleSelectDate}
            />
          ) : (
            <Dashboard
              onOpenEdit={setEditingTask}
              completedToday={pomodoro.completedToday}
              templates={taskTemplates.templates}
              onGenerateSchedule={learning.generateSmartSchedule}
              onGeneratePlan={learning.generateWeeklyPlan}
              pendingTodayCount={learning.pendingTasks.filter(t => t.date === selectedDate).length}
            />
          )}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden flex-shrink-0 border-t border-[var(--color-border)]">
          <MobileBottomNav view={view} onChangeView={handleChangeView}
            onOpenPomodoro={() => setPomodoroOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
        </nav>
      </div>

      {/* === Overlays === */}
      <MobileSidebarDrawer isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <MobileRightPanelSheet isOpen={mobileRightPanelOpen} onClose={() => setMobileRightPanelOpen(false)}
        onOpenEdit={setEditingTask} />

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)}
        onOpenEdit={setEditingTask} onSelectDate={handleSelectDate} />

      <TaskEditModal isOpen={!!editingTask} onClose={() => setEditingTask(null)} task={editingTask} />

      <DataSyncPanel
        isOpen={syncOpen}
        onClose={() => setSyncOpen(false)}
        currentData={{ version: 2, exportDate: new Date().toISOString(), tasks, tags, projects, checklists, contexts, perspectives, theme, selectedDate }}
        onImport={async (data) => {
          const makeId = () => crypto.randomUUID();
          const newTasks = (data.tasks || []).map(t => ({ ...t, id: makeId() }));
          const newProjects = (data.projects || []).map(p => ({ ...p, id: makeId() }));
          const newChecklists = (data.checklists || []).map(c => ({ ...c, id: makeId() }));
          const newContexts = (data.contexts || []).map(c => ({ ...c, id: makeId() }));
          const newPerspectives = (data.perspectives || []).map(p => ({ ...p, id: makeId() }));

          const projectMap: Record<string, string> = {};
          (data.projects || []).forEach((p, i) => { projectMap[p.id] = newProjects[i].id; });
          const checklistMap: Record<string, string> = {};
          (data.checklists || []).forEach((c, i) => { checklistMap[c.id] = newChecklists[i].id; });
          const contextMap: Record<string, string> = {};
          (data.contexts || []).forEach((c, i) => { contextMap[c.id] = newContexts[i].id; });
          const taskMap: Record<string, string> = {};
          (data.tasks || []).forEach((t, i) => { taskMap[t.id] = newTasks[i].id; });

          const remappedTasks = newTasks.map(t => ({
            ...t,
            projectId: t.projectId ? (projectMap[t.projectId] || t.projectId) : undefined,
            checklistId: t.checklistId ? (checklistMap[t.checklistId] || t.checklistId) : undefined,
            contexts: (t.contexts || []).map((ctx: string) => contextMap[ctx] || ctx),
            parentId: t.parentId ? (taskMap[t.parentId] || t.parentId) : undefined,
            dependsOn: (t.dependsOn || []).map((depId: string) => taskMap[depId] || depId),
          }));

          localStorage.setItem('sunsama-skip-pull', 'true');
          localStorage.setItem('sunsama-tasks', JSON.stringify(remappedTasks));
          if (data.tags) localStorage.setItem('sunsama-tags', JSON.stringify(data.tags));
          if (data.projects) localStorage.setItem('sunsama-projects', JSON.stringify(newProjects));
          if (data.checklists) localStorage.setItem('sunsama-checklists', JSON.stringify(newChecklists));
          if (data.contexts) localStorage.setItem('sunsama-contexts', JSON.stringify(newContexts));
          if (data.perspectives) localStorage.setItem('sunsama-perspectives', JSON.stringify(newPerspectives));
          if (data.theme) localStorage.setItem('sunsama-theme-v2', JSON.stringify(data.theme));
          if (data.selectedDate) localStorage.setItem('sunsama-selected-date', JSON.stringify(data.selectedDate));

          setTasks(remappedTasks);
          if (data.tags) setTags(data.tags);
          if (data.projects) setProjects(newProjects);
          if (data.checklists) setChecklists(newChecklists);
          if (data.contexts) setContexts(newContexts);
          if (data.perspectives) setPerspectives(newPerspectives);
          if (data.theme) setTheme(data.theme as any);

          const { syncPut } = await import('@/utils/api');
          syncPut({
            tasks: remappedTasks, projects: newProjects, checklists: newChecklists,
            tags: Object.entries(data.tags || {}).map(([key, val]) => ({
              id: `tag_${key}`, label: (val as any).label, color: (val as any).color,
            })),
            contexts: newContexts, perspectives: newPerspectives,
          }).catch((e: any) => console.warn('导入数据同步到服务器失败:', e));

          setTimeout(() => window.location.reload(), 800);
        }}
      />

      <AIParserModal isOpen={aiParserOpen} onClose={() => setAiParserOpen(false)} />
      <AISummaryModal isOpen={aiSummaryOpen} onClose={() => setAiSummaryOpen(false)}
        timeRange={aiSummaryRange} onTimeRangeChange={setAiSummaryRange} />
      <ThemeSettings isOpen={themeSettingsOpen} onClose={() => setThemeSettingsOpen(false)} />
      <MobileEditDrawer isOpen={!!editingTask} onClose={() => setEditingTask(null)} task={editingTask} />
      <NotificationSettings isOpen={notificationSettingsOpen} onClose={() => setNotificationSettingsOpen(false)} />

      <SettingsModal
        isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}
        onOpenSync={() => setSyncOpen(true)} onOpenTheme={() => setThemeSettingsOpen(true)}
        onExportArchive={handleExportArchive}
      />

      <DailyReviewModal
        isOpen={dailyReviewOpen} onClose={() => setDailyReviewOpen(false)}
        pomodoroCompletedToday={pomodoro.completedToday}
        onOpenReview={() => { setView('review'); setDailyReviewOpen(false); }}
      />

      <PomodoroModal
        isOpen={pomodoroOpen} onClose={() => setPomodoroOpen(false)}
        minutes={pomodoro.minutes} seconds={pomodoro.seconds}
        isRunning={pomodoro.isRunning} completedToday={pomodoro.completedToday}
        duration={pomodoro.duration} progress={pomodoro.progress}
        onStart={pomodoro.start} onPause={pomodoro.pause} onReset={pomodoro.reset}
        onSetDuration={pomodoro.setDuration}
       />

      {/* Floating WebDAV sync button */}
      <SyncFAB />
    </div>
    </ErrorBoundary>
  );
}

export default App;
