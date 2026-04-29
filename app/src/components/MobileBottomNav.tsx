import { Calendar, CheckCircle2, Timer, ListChecks, TreePine, View } from 'lucide-react';
import type { ViewType } from '@/types';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  view: ViewType;
  onChangeView: (v: ViewType) => void;
  onOpenPomodoro: () => void;
}

export function MobileBottomNav({ view, onChangeView, onOpenPomodoro }: MobileBottomNavProps) {
  const items = [
    { id: 'today' as ViewType, label: '今日', icon: Calendar },
    { id: 'checklist' as ViewType, label: '清单', icon: ListChecks },
    { id: 'mindmap' as ViewType, label: '导图', icon: TreePine },
    { id: 'perspectives' as ViewType, label: '透视', icon: View },
    { id: 'completed' as ViewType, label: '已完成', icon: CheckCircle2 },
  ];

  return (
    <div className="lg:hidden glass-toolbar flex items-center justify-around bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] py-2 px-3 mx-1 mb-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChangeView(item.id)}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
            view === item.id
              ? 'text-[var(--app-accent)]'
              : 'text-[var(--app-text-muted)]'
          )}
        >
          <item.icon size={18} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
      <button
        onClick={onOpenPomodoro}
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[var(--app-text-muted)]"
      >
        <Timer size={18} />
        <span className="text-[10px] font-medium">番茄钟</span>
      </button>
    </div>
  );
}
