import { Search, Settings, Command, Sparkles } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenAI?: () => void;
  onOpenSync?: () => void;
}

export function Header({
  title, subtitle, onOpenSearch, onOpenSettings, onOpenAI, onOpenSync,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-xl border-b border-[var(--app-border)]">
      <div className="flex items-center justify-between h-14 px-6">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-[var(--app-text)] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--app-text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all border border-transparent hover:border-[var(--app-border)]"
            >
              <Search size={14} />
              <span className="hidden sm:inline">搜索</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] border border-[var(--app-border)]">
                <Command size={10} />K
              </kbd>
            </button>
          )}

          <div className="w-px h-5 bg-[var(--app-border)] mx-1" />

          {/* AI */}
          {onOpenAI && (
            <button
              onClick={onOpenAI}
              className="p-2 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
              title="AI 助手"
            >
              <Sparkles size={16} />
            </button>
          )}

          {/* Sync */}
          {onOpenSync && (
            <button
              onClick={onOpenSync}
              className="p-2 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
              title="数据同步"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/>
              </svg>
            </button>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
              title="设置"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
