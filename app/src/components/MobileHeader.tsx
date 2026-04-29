import { Calendar, CalendarDays, LayoutList, CheckCircle2, Moon, Sun, Clock, Flame, Menu, Map, FileJson, Sparkles,
} from 'lucide-react';
import type { ViewType } from '@/types';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  view: ViewType;
  onChangeView: (v: ViewType) => void;
  onOpenPomodoro: () => void;
  completedToday: number;
  onOpenDrawer: (type: 'calendar' | 'quadrant' | 'countdown') => void;
  onOpenSync: () => void;
  onOpenAI: () => void;
  onOpenSidebar: () => void;
}

export function MobileHeader({ isDark, onToggleTheme, view, onChangeView, onOpenPomodoro, completedToday, onOpenDrawer, onOpenSync, onOpenAI, onOpenSidebar }: MobileHeaderProps) {
  return (
    <div className="lg:hidden flex flex-col gap-2">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d4857a] to-[#d4a08a] flex items-center justify-center">
            <Calendar size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm text-[var(--app-text)]">日程管理</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Pomodoro */}
          <button onClick={onOpenPomodoro} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[10px] text-[var(--app-text-secondary)]">
            <Flame size={10} className="text-[#d4857a]" />
            {completedToday}
          </button>

          {/* Theme toggle */}
          <button onClick={onToggleTheme} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]">
            {!isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* AI Parser */}
          <button onClick={onOpenAI} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[#d4857a] hover:bg-[var(--app-surface-hover)]">
            <Sparkles size={16} />
          </button>

          {/* Data Sync */}
          <button onClick={onOpenSync} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[#d4857a] hover:bg-[var(--app-surface-hover)]">
            <FileJson size={16} />
          </button>

          {/* Sidebar Menu */}
          <button onClick={onOpenSidebar} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]">
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* View switcher + quick tools */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)] p-0.5 flex-1">
          {([
            { id: 'today' as ViewType, label: '今日', icon: Calendar },
            { id: 'week' as ViewType, label: '本周', icon: LayoutList },
            { id: 'completed' as ViewType, label: '已完成', icon: CheckCircle2 },
          ]).map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={cn(
                'flex items-center justify-center gap-1 flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all',
                view === item.id
                  ? 'bg-[#d4857a] text-white'
                  : 'text-[var(--app-text-secondary)]'
              )}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => onOpenDrawer('calendar')}
          className="p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)]"
        >
          <CalendarDays size={15} />
        </button>

        <button
          onClick={() => onOpenDrawer('quadrant')}
          className="p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)]"
        >
          <Map size={15} />
        </button>

        <button
          onClick={() => onOpenDrawer('countdown')}
          className="p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)]"
        >
          <Clock size={15} />
        </button>
      </div>
    </div>
  );
}
