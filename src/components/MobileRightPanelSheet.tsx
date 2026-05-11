import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Calendar, Grid3X3, Timer, Cloud } from 'lucide-react';
import type { Task } from '@/types';
import { useAppStore } from '@/store';
import { WeatherTimeWidget } from './WeatherTimeWidget';
import { CalendarPanel } from './CalendarPanel';
import { QuadrantPanel } from './QuadrantPanel';
import { CountdownPanel } from './CountdownPanel';

type SheetTab = 'weather' | 'calendar' | 'quadrant' | 'countdown';

const TABS: { id: SheetTab; label: string; icon: React.ElementType }[] = [
  { id: 'weather', label: '天气', icon: Cloud },
  { id: 'calendar', label: '日历', icon: Calendar },
  { id: 'quadrant', label: '四象限', icon: Grid3X3 },
  { id: 'countdown', label: '倒计时', icon: Timer },
];

interface MobileRightPanelSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit: (task: Task) => void;
}

/**
 * Mobile / Tablet RightPanel Bottom Sheet
 * 从底部弹出，包含天气、日历、四象限、倒计时
 * 在 Mobile (<768px) 和 Tablet (768~1024px) 上使用
 */
export function MobileRightPanelSheet({
  isOpen, onClose, onOpenEdit,
}: MobileRightPanelSheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>('weather');
  const tasks = useAppStore(s => s.tasks);
  const selectedDate = useAppStore(s => s.selectedDate);
  const view = useAppStore(s => s.view);
  const setSelectedDate = useAppStore(s => s.setSelectedDate);
  const toggleTask = useAppStore(s => s.toggleTask);
  const updateQuadrant = useAppStore(s => s.updateQuadrant);
  const tags = useAppStore(s => s.tags);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-[var(--app-surface)] shadow-[0_-8px_32px_rgba(0,0,0,0.15)]',
          'border-t border-[var(--app-border)] rounded-t-2xl flex flex-col transition-transform duration-300 ease-out lg:hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '85vh', height: 'auto' }}
      >
        {/* Drag Handle + Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 rounded-full bg-[var(--app-border)] mx-auto" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {activeTab === 'weather' && (
            <WeatherTimeWidget />
          )}
          {activeTab === 'calendar' && (
            <CalendarPanel
              tasks={tasks}
              selectedDate={selectedDate}
              onSelectDate={(date) => { setSelectedDate(date); onClose(); }}
              tags={tags}
            />
          )}
          {activeTab === 'quadrant' && (
            <QuadrantPanel
              tasks={tasks}
              selectedDate={selectedDate}
              view={view}
              onToggleTask={toggleTask}
              onUpdateQuadrant={updateQuadrant}
            />
          )}
          {activeTab === 'countdown' && (
            <CountdownPanel
              tasks={tasks}
              onToggleTask={toggleTask}
              onOpenEdit={onOpenEdit}
            />
          )}
        </div>
      </div>
    </>
  );
}
