import { Menu, Sparkles, Flame, Calendar } from 'lucide-react';

interface MobileHeaderProps {
  view: string;
  onOpenSidebar: () => void;
  onOpenRightPanel: () => void;
  completedToday: number;
}

const VIEW_LABELS: Record<string, string> = {
  today: '今日中心', week: '本周概览', checklist: '清单',
  mindmap: '导图', review: '回顾',
  habits: '习惯', timeblocking: '时间块',
  weeklyplan: '周计划', scheduler: '排程', completed: '已完成',
};

/**
 * Mobile Header
 * 固定在顶部，包含 Hamburger 菜单、视图标题、RightPanel 入口
 * 仅在 Mobile (<768px) 显示
 */
export function MobileHeader({ view, onOpenSidebar, onOpenRightPanel, completedToday }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--app-surface)] border-b border-[var(--app-border)]">
      {/* Left: Hamburger */}
      <button
        onClick={onOpenSidebar}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-colors"
        aria-label="打开菜单"
      >
        <Menu size={20} />
      </button>

      {/* Center: Logo + Title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent-hover)] flex items-center justify-center">
          <Calendar size={14} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--app-text)]">
            {VIEW_LABELS[view] || view}
          </span>
          {completedToday > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--app-accent)]/10 text-[var(--app-accent)] text-[10px] font-medium">
              <Flame size={10} />
              {completedToday}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenRightPanel}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-colors"
          aria-label="打开工具面板"
        >
          <Sparkles size={18} />
        </button>
      </div>
    </header>
  );
}
