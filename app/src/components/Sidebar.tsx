import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Calendar, CheckCircle2, LayoutList, Clock, Flame, Tag, Sun, Moon,
  Settings, X, Plus, Trash2, Check, FolderOpen, Briefcase, RefreshCw,
  Sparkles, ListChecks, Eye, View, Monitor, Smartphone,
  Building2, Car, Users, Home, Palette, ChevronDown, ChevronRight, TreePine,
} from 'lucide-react';
import type { ViewType, Task, Project, Context } from '@/types';
import { PRESET_COLORS } from '@/types';
import { isToday, isInCurrentWeek } from '@/utils/date';
import { parseISO, differenceInDays } from 'date-fns';

const CONTEXT_ICONS: Record<string, React.ElementType> = {
  Monitor, Smartphone, Building2, Car, Users, Home,
};

interface SidebarProps {
  view: ViewType;
  onChangeView: (view: ViewType) => void;
  filterTag: string | null;
  onFilterTag: (tag: string | null) => void;
  filterContext: string[];
  onFilterContext: (context: string[]) => void;
  filterProject: string | null;
  onFilterProject: (project: string | null) => void;
  tasks: Task[];
  completedToday: number;
  onOpenPomodoro: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  tags: Record<string, { label: string; color: string }>;
  onUpdateTags: (tags: Record<string, { label: string; color: string }>) => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
  contexts: Context[];
  onOpenSync: () => void;
  onOpenAI: () => void;
  onOpenThemeSettings: () => void;
}

export function Sidebar({
  view, onChangeView, filterTag, onFilterTag,
  filterContext, onFilterContext, filterProject, onFilterProject,
  tasks, completedToday, onOpenPomodoro, isDark, onToggleTheme,
  tags, onUpdateTags, projects, onUpdateProjects, contexts,
  onOpenSync, onOpenAI, onOpenThemeSettings,
}: SidebarProps) {
  const [showTagManager, setShowTagManager] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [editingTags, setEditingTags] = useState<Record<string, { label: string; color: string }>>({});
  const [editingProjects, setEditingProjects] = useState<Project[]>([]);

  // Collapsible section states — all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([])
  );
  const [expandedSync, setExpandedSync] = useState(false);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const todayCount = tasks.filter(t => isToday(t.date) && !t.completed).length;
  const weekCount = tasks.filter(t => isInCurrentWeek(t.date) && !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const checklistCount = tasks.filter(t => !t.completed && t.checklistId).length;
  const mindmapCount = tasks.filter(t => !t.completed).length;
  const reviewCount = tasks.filter(t => {
    if (t.completed) return false;
    const daysOld = differenceInDays(new Date(), new Date(t.createdAt));
    return daysOld > 7 || (t.deadline && parseISO(t.deadline) < new Date());
  }).length;
  const perspectiveCount = tasks.filter(t => {
    if (t.completed) return false;
    return t.importance === 'important' && t.urgency === 'urgent';
  }).length;

  const navItems = [
    { id: 'today' as ViewType, label: '今日', icon: Calendar, count: todayCount },
    { id: 'week' as ViewType, label: '本周', icon: LayoutList, count: weekCount },
    { id: 'checklist' as ViewType, label: '清单', icon: ListChecks, count: checklistCount },
    { id: 'mindmap' as ViewType, label: '思维导图', icon: TreePine, count: mindmapCount },
    { id: 'review' as ViewType, label: '回顾', icon: Eye, count: reviewCount },
    { id: 'perspectives' as ViewType, label: '透视', icon: View, count: perspectiveCount },
    { id: 'completed' as ViewType, label: '已完成', icon: CheckCircle2, count: completedCount },
  ];

  // Tag manager
  const openTagManager = useCallback(() => {
    setEditingTags({ ...tags });
    setShowTagManager(true);
  }, [tags]);

  const saveTags = useCallback(() => {
    onUpdateTags(editingTags);
    setShowTagManager(false);
  }, [editingTags, onUpdateTags]);

  const updateTagLabel = useCallback((key: string, label: string) => {
    setEditingTags(prev => ({ ...prev, [key]: { ...prev[key], label } }));
  }, []);

  const updateTagColor = useCallback((key: string, color: string) => {
    setEditingTags(prev => ({ ...prev, [key]: { ...prev[key], color } }));
  }, []);

  const removeTag = useCallback((key: string) => {
    setEditingTags(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const addNewTag = useCallback(() => {
    const key = `tag_${Date.now()}`;
    const unusedColors = PRESET_COLORS.filter(c => !Object.values(editingTags).some(t => t.color === c));
    const color = unusedColors[0] || PRESET_COLORS[0];
    setEditingTags(prev => ({ ...prev, [key]: { label: '新标签', color } }));
  }, [editingTags]);

  // Project manager
  const openProjectManager = useCallback(() => {
    setEditingProjects([...projects]);
    setShowProjectManager(true);
  }, [projects]);

  const saveProjects = useCallback(() => {
    onUpdateProjects(editingProjects);
    setShowProjectManager(false);
  }, [editingProjects, onUpdateProjects]);

  const updateProjectName = useCallback((id: string, name: string) => {
    setEditingProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const updateProjectColor = useCallback((id: string, color: string) => {
    setEditingProjects(prev => prev.map(p => p.id === id ? { ...p, color } : p));
  }, []);

  const removeProject = useCallback((id: string) => {
    setEditingProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const addNewProject = useCallback(() => {
    const id = `p_${Date.now()}`;
    const unusedColors = PRESET_COLORS.filter(c => !editingProjects.some(p => p.color === c));
    const color = unusedColors[0] || PRESET_COLORS[0];
    setEditingProjects(prev => [...prev, { id, name: '新项目', color }]);
  }, [editingProjects]);

  const isSectionExpanded = (key: string) => expandedSections.has(key);

  return (
    <div className="w-[200px] flex flex-col gap-3 overflow-y-auto h-full pb-4">
      {/* Logo + Theme Toggle */}
      <div className="flex items-center gap-2 px-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4857a] to-[#d4a08a] flex items-center justify-center">
          <Calendar size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg text-[var(--app-text)]">日程管理</span>
        <button
          onClick={onToggleTheme}
          className="glass-nav-icon-btn ml-auto p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
          title={!isDark ? '切换到暗色模式' : '切换到亮色模式'}
        >
          {!isDark ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onChangeView(item.id); onFilterTag(null); onFilterContext([]); onFilterProject(null); }}
            className={cn(
              'glass-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              view === item.id
                ? 'glass-nav-active text-[#d4857a]'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            )}
          >
            <item.icon size={18} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count > 0 && (
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                view === item.id ? 'bg-[#d4857a] text-white' : 'bg-[var(--app-border)] text-[var(--app-text-secondary)]'
              )}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>



      {/* Project List — Clickable Filter — Collapsible */}
      <div className="pt-3 border-t border-[var(--app-border)]">
        <div className="flex items-center justify-between px-3">
          <button
            onClick={() => toggleSection('project')}
            className="flex items-center gap-2 py-1.5"
          >
            {isSectionExpanded('project') ? <ChevronDown size={14} className="text-[var(--app-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--app-text-muted)]" />}
            <h4 className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">项目列表</h4>
          </button>
          <button
            onClick={openProjectManager}
            className="p-1 rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-surface-hover)] transition-all"
            title="管理项目"
          >
            <Settings size={12} />
          </button>
        </div>
        {isSectionExpanded('project') && (
          <div className="flex flex-col gap-1 mt-1">
            {projects.map((project) => {
              const projectTasks = tasks.filter(t => t.projectId === project.id && !t.completed);
              return (
                <button
                  key={project.id}
                  onClick={() => onFilterProject(filterProject === project.id ? null : project.id)}
                  className={cn(
                    'glass-nav-btn flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left',
                    filterProject === project.id
                      ? 'glass-nav-active font-medium'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  )}
                >
                  <Briefcase size={14} style={{ color: project.color }} />
                  <span className="flex-1 text-left">{project.name}</span>
                  {projectTasks.length > 0 && (
                    <span className="text-xs font-medium text-[var(--app-text-muted)] bg-[var(--app-border)] px-1.5 py-0.5 rounded-full">{projectTasks.length}</span>
                  )}
                </button>
              );
            })}
            {/* 未分类项目 */}
            {(() => {
              const uncategorizedCount = tasks.filter(t => !t.projectId && !t.completed).length;
              return (
                <button
                  onClick={() => onFilterProject(filterProject === 'none' ? null : 'none')}
                  className={cn(
                    'glass-nav-btn flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left',
                    filterProject === 'none'
                      ? 'glass-nav-active font-medium'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  )}
                >
                  <Briefcase size={14} className="text-[#9ca3af]" />
                  <span className="flex-1 text-left">未分类</span>
                  {uncategorizedCount > 0 && (
                    <span className="text-xs font-medium text-[var(--app-text-muted)] bg-[var(--app-border)] px-1.5 py-0.5 rounded-full">{uncategorizedCount}</span>
                  )}
                </button>
              );
            })()}
            {filterProject && (
              <button
                onClick={() => onFilterProject(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-[var(--app-accent)] hover:bg-[var(--app-surface-hover)] transition-all"
              >
                <X size={12} />
                清除项目筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* Context Filter — Collapsible — Multi-select — MOVED below projects */}
      <div className="pt-3 border-t border-[var(--app-border)]">
        <button
          onClick={() => toggleSection('context')}
          className="flex items-center gap-2 px-3 py-1.5 w-full text-left"
        >
          {isSectionExpanded('context') ? <ChevronDown size={14} className="text-[var(--app-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--app-text-muted)]" />}
          <h4 className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">上下文</h4>
          {filterContext.length > 0 && (
            <span className="text-[10px] font-semibold text-white bg-[#d4857a] px-1.5 py-0.5 rounded-full ml-auto">{filterContext.length}</span>
          )}
        </button>
        {isSectionExpanded('context') && (
          <div className="flex flex-col gap-1 mt-1">
            {contexts.map((ctx) => {
              const CtxIcon = CONTEXT_ICONS[ctx.icon] || Monitor;
              const count = tasks.filter(t => !t.completed && t.contexts?.includes(ctx.id)).length;
              const isSelected = filterContext.includes(ctx.id);
              return (
                <button
                  key={ctx.id}
                  onClick={() => {
                    if (isSelected) {
                      onFilterContext(filterContext.filter(c => c !== ctx.id));
                    } else {
                      onFilterContext([...filterContext, ctx.id]);
                    }
                  }}
                  className={cn(
                    'glass-nav-btn flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                    isSelected
                      ? 'glass-nav-active font-medium'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  )}
                >
                  {/* Checkbox */}
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                    isSelected ? 'bg-[#d4857a] border-[#d4857a]' : 'border-[var(--app-border)]'
                  )}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <CtxIcon size={14} style={{ color: ctx.color }} />
                  <span className="flex-1 text-left">@{ctx.label}</span>
                  {count > 0 && (
                    <span className="text-xs font-medium text-[var(--app-text-muted)] bg-[var(--app-border)] px-1.5 py-0.5 rounded-full">{count}</span>
                  )}
                </button>
              );
            })}
            {filterContext.length > 0 && (
              <button
                onClick={() => onFilterContext([])}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-[var(--app-accent)] hover:bg-[var(--app-surface-hover)] transition-all"
              >
                <X size={12} />
                清除上下文筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tag Filter — Collapsible */}
      <div className="pt-3 border-t border-[var(--app-border)]">
        <div className="flex items-center justify-between px-3">
          <button
            onClick={() => toggleSection('tag')}
            className="flex items-center gap-2 py-1.5"
          >
            {isSectionExpanded('tag') ? <ChevronDown size={14} className="text-[var(--app-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--app-text-muted)]" />}
            <h4 className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">标签筛选</h4>
          </button>
          <button
            onClick={openTagManager}
            className="p-1 rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-accent)] hover:bg-[var(--app-surface-hover)] transition-all"
            title="管理标签"
          >
            <Settings size={12} />
          </button>
        </div>
        {isSectionExpanded('tag') && (
          <div className="flex flex-col gap-1 mt-1">
            {Object.keys(tags).map((tagKey) => (
              <button
                key={tagKey}
                onClick={() => onFilterTag(filterTag === tagKey ? null : tagKey)}
                className={cn(
                  'glass-nav-btn flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                  filterTag === tagKey
                    ? 'glass-nav-active font-medium'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tags[tagKey].color }} />
                <span className="flex-1 text-left">{tags[tagKey].label}</span>
                <Tag size={12} className={cn('transition-opacity', filterTag === tagKey ? 'opacity-100 text-[#d4857a]' : 'opacity-0')} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 同步及其他 — Collapsible */}
      <div className="pt-3 border-t border-[var(--app-border)]">
        <button
          onClick={() => setExpandedSync(!expandedSync)}
          className="flex items-center gap-2 px-3 py-1.5 w-full text-left"
        >
          {expandedSync ? <ChevronDown size={14} className="text-[var(--app-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--app-text-muted)]" />}
          <h4 className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">同步及其他</h4>
        </button>
        {expandedSync && (
          <div className="flex flex-col gap-1 mt-1">
            {/* 个性化主题 */}
            <button
              onClick={onOpenThemeSettings}
              className="glass-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)] transition-all duration-200"
            >
              <Palette size={16} />
              <span className="flex-1 text-left">个性化主题</span>
            </button>
            {/* AI 智能解析 */}
            <button
              onClick={onOpenAI}
              className="glass-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)] transition-all duration-200"
            >
              <Sparkles size={16} />
              <span className="flex-1 text-left">AI 智能解析</span>
              <span className="text-[10px] text-[var(--app-text-muted)]">Beta</span>
            </button>
            {/* 数据同步 */}
            <button
              onClick={onOpenSync}
              className="glass-nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)] transition-all duration-200"
            >
              <RefreshCw size={16} />
              <span className="flex-1 text-left">数据同步</span>
            </button>
          </div>
        )}
      </div>

      {/* 番茄钟 — 今日番茄X */}
      <div className="mt-auto pt-3 border-t border-[var(--app-border)] shrink-0">
        <button
          onClick={onOpenPomodoro}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-[#d4857a]/10 to-[#d4a08a]/10 hover:from-[#d4857a]/20 hover:to-[#d4a08a]/20 transition-all duration-200 group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#d4857a] flex items-center justify-center shadow-sm">
            <Clock size={18} className="text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-[var(--app-text)] group-hover:text-[#d4857a] transition-colors">
              今日番茄{completedToday}
            </div>
            <div className="text-xs text-[var(--app-text-muted)]">
              <Flame size={10} className="inline text-[#d4857a] mr-0.5" />{completedToday} 个完成
            </div>
          </div>
        </button>
      </div>

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm">
          <div className="bg-[var(--app-surface)] rounded-2xl shadow-2xl p-6 w-[400px] max-h-[80vh] flex flex-col border border-[var(--app-border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">管理标签</h3>
              <button onClick={() => setShowTagManager(false)} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
              {Object.keys(editingTags).map((key) => (
                <div key={key} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)]">
                  <input value={editingTags[key].label} onChange={(e) => updateTagLabel(key, e.target.value)} className="flex-1 text-sm bg-transparent outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-placeholder)]" />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button key={color} onClick={() => updateTagColor(key, color)} className="w-5 h-5 rounded-full border-2 transition-all" style={{ backgroundColor: color, borderColor: editingTags[key].color === color ? color : 'transparent', boxShadow: editingTags[key].color === color ? `0 0 0 2px var(--app-surface), 0 0 0 4px ${color}` : 'none' }} />
                    ))}
                  </div>
                  <button onClick={() => removeTag(key)} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--app-border)]">
              <button onClick={addNewTag} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] transition-all"><Plus size={14} />新增标签</button>
              <button onClick={saveTags} className="ml-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-[#d4857a] text-white hover:bg-[#c97a6e] transition-colors"><Check size={14} />保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Project Manager Modal */}
      {showProjectManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm">
          <div className="bg-[var(--app-surface)] rounded-2xl shadow-2xl p-6 w-[400px] max-h-[80vh] flex flex-col border border-[var(--app-border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--app-text)]">管理项目</h3>
              <button onClick={() => setShowProjectManager(false)} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
              {editingProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)]">
                  <FolderOpen size={16} style={{ color: project.color }} />
                  <input value={project.name} onChange={(e) => updateProjectName(project.id, e.target.value)} className="flex-1 text-sm bg-transparent outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-placeholder)]" />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button key={color} onClick={() => updateProjectColor(project.id, color)} className="w-5 h-5 rounded-full border-2 transition-all" style={{ backgroundColor: color, borderColor: project.color === color ? color : 'transparent', boxShadow: project.color === color ? `0 0 0 2px var(--app-surface), 0 0 0 4px ${color}` : 'none' }} />
                    ))}
                  </div>
                  <button onClick={() => removeProject(project.id)} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--app-border)]">
              <button onClick={addNewProject} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] transition-all"><Plus size={14} />新增项目</button>
              <button onClick={saveProjects} className="ml-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-[#d4857a] text-white hover:bg-[#c97a6e] transition-colors"><Check size={14} />保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
