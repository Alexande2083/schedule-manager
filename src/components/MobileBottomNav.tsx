import { Calendar, Timer, Brain, Flame, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  view: string;
  onChangeView: (v: string) => void;
  onOpenPomodoro: () => void;
  onOpenSettings: () => void;
}

export function MobileBottomNav({ view, onChangeView, onOpenPomodoro, onOpenSettings }: MobileBottomNavProps) {
  const items = [
    { id: 'today', label: '今日', icon: Calendar },
    { id: 'insights', label: '洞察', icon: Brain },
    { id: 'habits', label: '习惯', icon: Flame },
  ];

  return (
    <div className="flex items-center justify-around bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] py-1.5 px-2 mx-1 mb-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-0',
              isActive
                ? 'text-[var(--app-accent)]'
                : 'text-[var(--app-text-muted)]'
            )}
          >
            <Icon size={17} />
            <span className="text-[9px] font-medium truncate max-w-full">{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenPomodoro}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[var(--app-text-muted)]"
      >
        <Timer size={17} />
        <span className="text-[9px] font-medium">番茄钟</span>
      </button>
      <button
        onClick={onOpenSettings}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[var(--app-text-muted)]"
      >
        <Settings size={17} />
        <span className="text-[9px] font-medium">设置</span>
      </button>
    </div>
  );
}
