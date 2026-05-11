import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, ListChecks, Eye, View,
  Flame, Moon, Sun, X,
  Brain, Calendar, Zap, Tag, FolderKanban, MapPin,
} from 'lucide-react';
import { useAppStore } from '@/store';

const NAV_ITEMS = [
  { id: 'today', label: '仪表盘', icon: LayoutDashboard },
  { id: 'week', label: '本周', icon: CalendarDays },
  { id: 'checklist', label: '清单', icon: ListChecks },
  { id: 'perspectives', label: '透视', icon: Eye },
  { id: 'habits', label: '习惯', icon: Flame },
  { id: 'insights', label: '洞察', icon: Brain },
  { id: 'weeklyplan', label: '计划', icon: Calendar },
  { id: 'scheduler', label: '排程', icon: Zap },
  { id: 'review', label: '回顾', icon: View },
];

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebarDrawer({ isOpen, onClose }: MobileSidebarDrawerProps) {
  const view = useAppStore(s => s.view);
  const setView = useAppStore(s => s.setView);
  const isDark = useAppStore(s => s.theme.isDark);
  const setTheme = useAppStore(s => s.setTheme);
  const tags = useAppStore(s => s.tags);
  const filterTag = useAppStore(s => s.filterTag);
  const setFilterTag = useAppStore(s => s.setFilterTag);
  const projects = useAppStore(s => s.projects);
  const filterProject = useAppStore(s => s.filterProject);
  const setFilterProject = useAppStore(s => s.setFilterProject);
  const contexts = useAppStore(s => s.contexts);
  const filterContext = useAppStore(s => s.filterContext);
  const setFilterContext = useAppStore(s => s.setFilterContext);

  const [expandedSection, setExpandedSection] = useState<'projects' | 'tags' | 'contexts' | null>('projects');

  const handleNavClick = (id: string) => {
    setView(id);
    onClose();
  };

  const toggleSection = (section: 'projects' | 'tags' | 'contexts') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const toggleContextFilter = (ctxId: string) => {
    const isActive = filterContext.includes(ctxId);
    setFilterContext(isActive ? filterContext.filter(c => c !== ctxId) : [...filterContext, ctxId]);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-[var(--app-surface)] shadow-2xl',
          'border-r border-[var(--app-border)] flex flex-col transition-transform duration-300 ease-out md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent-hover)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--app-text)]">日程管理</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 space-y-0.5 px-3 overflow-y-auto min-h-0">
          {NAV_ITEMS.map(item => {
            const isActive = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  isActive
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] font-medium'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Projects / Tags / Contexts */}
        <div className="border-t border-[var(--app-border)] shrink-0 max-h-[40%] overflow-y-auto">
          {/* 我的项目 */}
          <div className="px-3 pt-2">
            <button
              onClick={() => toggleSection('projects')}
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
            >
              <span className="flex items-center gap-1.5">
                <FolderKanban size={12} />
                我的项目
              </span>
              <span className="text-[10px]">{projects.length}</span>
            </button>
            {expandedSection === 'projects' && projects.map(p => (
              <button
                key={p.id}
                onClick={() => setFilterProject(filterProject === p.id ? null : p.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg w-full text-left transition-all',
                  filterProject === p.id
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
                )}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-xs truncate">{p.name}</span>
              </button>
            ))}
          </div>

          {/* 标签 */}
          <div className="px-3 pt-1">
            <button
              onClick={() => toggleSection('tags')}
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
            >
              <span className="flex items-center gap-1.5">
                <Tag size={12} />
                标签
              </span>
              <span className="text-[10px]">{Object.keys(tags).length}</span>
            </button>
            {expandedSection === 'tags' && Object.entries(tags).map(([key, tag]) => (
              <button
                key={key}
                onClick={() => setFilterTag(filterTag === key ? null : key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg w-full text-left transition-all',
                  filterTag === key
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
                )}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-xs">{tag.label}</span>
              </button>
            ))}
          </div>

          {/* 上下文 */}
          <div className="px-3 pt-1 pb-2">
            <button
              onClick={() => toggleSection('contexts')}
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
            >
              <span className="flex items-center gap-1.5">
                <MapPin size={12} />
                上下文
              </span>
              <span className="text-[10px]">{contexts.length}</span>
            </button>
            {expandedSection === 'contexts' && contexts.map(ctx => (
              <button
                key={ctx.id}
                onClick={() => toggleContextFilter(ctx.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg w-full text-left transition-all',
                  filterContext.includes(ctx.id)
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
                )}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ctx.color }} />
                <span className="text-xs">{ctx.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--app-border)] shrink-0">
          <button
            onClick={() => setTheme(prev => ({ ...prev, isDark: !prev.isDark }))}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDark ? '亮色模式' : '暗色模式'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
