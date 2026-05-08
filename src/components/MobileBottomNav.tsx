import { Calendar, Timer, Brain, CalendarDays, Zap, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  view: string;
  onChangeView: (v: string) => void;
  onOpenPomodoro: () => void;
}

export function MobileBottomNav({ view, onChangeView, onOpenPomodoro }: MobileBottomNavProps) {
  const items = [
    { id: 'today', label: '今日', icon: Calendar },
    { id: 'insights', label: '洞察', icon: Brain },
    { id: 'weeklyplan', label: '周计划', icon: CalendarDays },
    { id: 'scheduler', label: '排程', icon: Zap },
    { id: 'habits', label: '习惯', icon: Flame },
  ];

  return (
    <div className="glass-toolbar flex items-center justify-around bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] py-1.5 px-2 mx-1 mb-1">
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
    </div>
  );
}
