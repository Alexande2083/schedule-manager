import { X } from 'lucide-react';
import type { Task, Project, Context } from '@/types';
import { cn } from '@/lib/utils';
import { CalendarPanel } from './CalendarPanel';
import { QuadrantPanel } from './QuadrantPanel';
import { CountdownPanel } from './CountdownPanel';
import { Sidebar } from './Sidebar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'calendar' | 'quadrant' | 'countdown' | 'sidebar' | null;
  tasks: Task[];
  selectedDate: string;
  view: string;
  onToggleTask: (id: string) => void;
  onUpdateQuadrant: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;
  onSelectDate: (date: string) => void;
  // Sidebar props
  onChangeView?: (view: string) => void;
  filterTag?: string | null;
  onFilterTag?: (tag: string | null) => void;
  filterContext?: string[];
  onFilterContext?: (context: string[]) => void;
  filterProject?: string | null;
  onFilterProject?: (project: string | null) => void;
  completedToday?: number;
  onOpenPomodoro?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  tags?: Record<string, { label: string; color: string }>;
  onUpdateTags?: (tags: Record<string, { label: string; color: string }>) => void;
  projects?: Project[];
  onUpdateProjects?: (projects: Project[]) => void;
  contexts?: Context[];
  onUpdateContexts?: (contexts: Context[]) => void;
  onOpenSync?: () => void;
  onOpenAI?: () => void;
  onOpenThemeSettings?: () => void;
  onOpenNotificationSettings?: () => void;
}

export function MobileDrawer({
  isOpen, onClose, type, tasks, selectedDate, view, onToggleTask, onUpdateQuadrant, onSelectDate,
  onChangeView, filterTag, onFilterTag, filterProject, onFilterProject,
  filterContext, onFilterContext, tags, projects, contexts,
  onUpdateProjects, onUpdateTags, onUpdateContexts,
}: MobileDrawerProps) {
  const isSidebar = type === 'sidebar';

  const getTitle = () => {
    if (type === 'calendar') return '日历';
    if (type === 'quadrant') return '四象限';
    if (type === 'countdown') return '倒计时';
    if (type === 'sidebar') return '';
    return '';
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer - sidebar slides from left, others from right */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50 bg-[var(--app-surface)] shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          isSidebar
            ? 'left-0 border-r border-[var(--app-border)] w-[85vw] max-w-[320px]'
            : 'right-0 border-l border-[var(--app-border)] w-[85vw] max-w-[360px]',
          isOpen
            ? 'translate-x-0'
            : isSidebar ? '-translate-x-full' : 'translate-x-full'
        )}
      >
        {/* Header - hide for sidebar */}
        {!isSidebar && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] shrink-0">
            <h3 className="text-sm font-semibold text-[var(--app-text)]">{getTitle()}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Sidebar has its own close button in the component */}
        {isSidebar && (
          <div className="flex items-center justify-end px-4 py-2 border-b border-[var(--app-border)] shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {type === 'calendar' && (
            <CalendarPanel tasks={tasks} selectedDate={selectedDate} onSelectDate={(date) => { onSelectDate(date); onClose(); }} />
          )}
          {type === 'quadrant' && (
            <QuadrantPanel tasks={tasks} selectedDate={selectedDate} view={view} onToggleTask={onToggleTask} onUpdateQuadrant={onUpdateQuadrant} />
          )}
          {type === 'countdown' && (
            <CountdownPanel tasks={tasks} onToggleTask={onToggleTask} onOpenEdit={() => {}} />
          )}
          {type === 'sidebar' && onChangeView && (
            <div className="lg:hidden">
              <Sidebar
                view={(view as string) || 'today'}
                onChangeView={(v) => { onChangeView(v); }}
                tags={tags} filterTag={filterTag} onFilterTag={onFilterTag}
                projects={projects} filterProject={filterProject} onFilterProject={onFilterProject}
                contexts={contexts} filterContext={filterContext} onFilterContext={onFilterContext}
                onUpdateProjects={onUpdateProjects} onUpdateTags={onUpdateTags} onUpdateContexts={onUpdateContexts}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
