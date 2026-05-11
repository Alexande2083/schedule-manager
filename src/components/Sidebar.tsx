import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CalendarDays, ListChecks, Eye, View,
  Flame, Brain,
  FolderKanban, Tag, MapPin, ChevronDown, ChevronRight,
  Plus, X, Settings,
} from 'lucide-react';
import { useAppStore } from '@/store';

const NAV_ITEMS = [
  { id: 'today', label: 'Today', icon: LayoutDashboard },
  { id: 'week', label: '本周', icon: CalendarDays },
  { id: 'checklist', label: '清单', icon: ListChecks },
  { id: 'perspectives', label: '透视', icon: Eye },
  { id: 'habits', label: '习惯', icon: Flame },
  { id: 'insights', label: '洞察', icon: Brain },
  { id: 'review', label: '回顾', icon: View },
];

interface SidebarProps {
  onOpenSettings?: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const view = useAppStore(s => s.view);
  const onChangeView = useAppStore(s => s.setView);
  const tags = useAppStore(s => s.tags);
  const filterTag = useAppStore(s => s.filterTag);
  const onFilterTag = useAppStore(s => s.setFilterTag);
  const projects = useAppStore(s => s.projects);
  const filterProject = useAppStore(s => s.filterProject);
  const onFilterProject = useAppStore(s => s.setFilterProject);
  const contexts = useAppStore(s => s.contexts);
  const filterContext = useAppStore(s => s.filterContext);
  const onFilterContext = useAppStore(s => s.setFilterContext);
  const setProjects = useAppStore(s => s.setProjects);
  const setTags = useAppStore(s => s.setTags);
  const setContexts = useAppStore(s => s.setContexts);

  const [expandedProject, setExpandedProject] = useState(false);
  const [expandedTag, setExpandedTag] = useState(false);
  const [expandedContext, setExpandedContext] = useState(false);
  const [newItem, setNewItem] = useState<{ type: string; value: string } | null>(null);

  const baseItemClass = "flex items-center gap-2 w-full px-3 py-2 rounded-btn text-sm font-medium transition-all duration-fast text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]";
  const activeClass = "bg-[var(--color-brand-ghost)] text-[var(--color-brand)] font-semibold hover:bg-[var(--color-brand-ghost)] hover:text-[var(--color-brand)]";

  return (
    <div className="flex flex-col h-full px-3 py-4" style={{ background: 'var(--color-bg)' }}>
      {/* Logo */}
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-btn flex items-center justify-center" style={{ background: 'var(--color-brand-gradient)' }}>
            <LayoutDashboard size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text)] tracking-tight">Schedule</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={cn(baseItemClass, view === item.id && activeClass)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Collapsible sections */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
        {/* Projects */}
        <Section
          icon={FolderKanban}
          label="项目"
          expanded={expandedProject}
          onToggle={() => setExpandedProject(!expandedProject)}
          items={projects.map(p => ({ id: p.id, label: p.name, color: p.color }))}
          activeId={filterProject}
          onSelect={(id) => onFilterProject(id === filterProject ? null : id)}
          onDelete={(id) => setProjects(projects.filter(p => p.id !== id))}
          onAdd={(label) => {
            setProjects([...projects, { id: crypto.randomUUID(), name: label, color: '#6366f1' }]);
          }}
          newItem={newItem}
          setNewItem={setNewItem}
        />
        {/* Tags */}
        <Section
          icon={Tag}
          label="标签"
          expanded={expandedTag}
          onToggle={() => setExpandedTag(!expandedTag)}
          items={Object.entries(tags).map(([k, v]) => ({ id: k, label: v.label, color: v.color }))}
          activeId={filterTag}
          onSelect={(id) => onFilterTag(id === filterTag ? null : id)}
          onDelete={(id) => {
            const next = { ...tags }; delete next[id]; setTags(next);
          }}
          onAdd={(label) => {
            const key = label.toLowerCase().replace(/\s+/g, '-');
            const colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
            setTags({ ...tags, [key]: { label, color: colors[Object.keys(tags).length % colors.length] } });
          }}
          newItem={newItem}
          setNewItem={setNewItem}
        />
        {/* Contexts */}
        <Section
          icon={MapPin}
          label="场景"
          expanded={expandedContext}
          onToggle={() => setExpandedContext(!expandedContext)}
          items={contexts.map(c => ({ id: c.id, label: c.label, color: c.color }))}
          activeId={filterContext?.length === 1 ? filterContext[0] : null}
          multiSelect
          activeIds={filterContext || []}
          onSelect={(id) => {
            onFilterContext(filterContext.includes(id) ? filterContext.filter(c => c !== id) : [...filterContext, id]);
          }}
          onDelete={(id) => setContexts(contexts.filter(c => c.id !== id))}
          onAdd={(label) => {
            setContexts([...contexts, { id: crypto.randomUUID(), label, color: '#6366f1', icon: 'computer' }]);
          }}
          newItem={newItem}
          setNewItem={setNewItem}
        />
      </div>

      {/* Settings button — bottom */}
      <div className="mt-auto pt-3 border-t border-[var(--color-border)]">
        <button
          onClick={() => onOpenSettings?.()}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-btn text-sm font-medium transition-all duration-fast text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
        >
          <Settings size={16} />
          <span>设置</span>
        </button>
      </div>
    </div>
  );
}

function Section({
  icon: Icon, label, expanded, onToggle, items, activeId, activeIds, multiSelect,
  onSelect, onDelete, onAdd, newItem, setNewItem,
}: {
  icon: any; label: string; expanded: boolean; onToggle: () => void;
  items: { id: string; label: string; color: string }[];
  activeId?: string | null; activeIds?: string[];
  multiSelect?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (label: string) => void;
  newItem: { type: string; value: string } | null;
  setNewItem: (v: { type: string; value: string } | null) => void;
}) {
  return (
    <div>
      <button onClick={onToggle} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hover:text-[var(--color-text-secondary)] transition-colors duration-fast">
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Icon size={12} />
        {label}
        {onAdd && (
          <button onClick={(e) => { e.stopPropagation(); setNewItem({ type: label, value: '' }); }} className="ml-auto p-0.5 rounded hover:bg-[var(--color-bg-hover)]">
            <Plus size={12} />
          </button>
        )}
      </button>
      {expanded && (
        <div className="ml-2 space-y-0.5">
          {items.map(item => {
            const isActive = multiSelect ? activeIds?.includes(item.id) : activeId === item.id;
            return (
              <div key={item.id} className="flex items-center group">
                <button
                  onClick={() => onSelect?.(item.id)}
                  className={cn(
                    "flex items-center gap-2 flex-1 px-3 py-1.5 rounded-btn text-xs transition-all duration-fast",
                    isActive ? "bg-[var(--color-brand-ghost)] text-[var(--color-brand)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
                  )}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.label}</span>
                </button>
                {onDelete && (
                  <button onClick={() => onDelete(item.id)} className="p-1 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all duration-fast">
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          {newItem?.type === label && (
            <input
              autoFocus
              className="w-full px-3 py-1.5 rounded-btn text-xs bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
              placeholder={`Add ${label}...`}
              value={newItem.value}
              onChange={e => setNewItem({ ...newItem, value: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter' && newItem.value.trim()) {
                  onAdd?.(newItem.value.trim());
                  setNewItem(null);
                }
                if (e.key === 'Escape') setNewItem(null);
              }}
              onBlur={() => setNewItem(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
