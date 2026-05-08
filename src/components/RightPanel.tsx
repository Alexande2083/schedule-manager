import type { Task } from '@/types';
import { WeatherTimeWidget } from './WeatherTimeWidget';
import { CalendarPanel } from './CalendarPanel';
import { QuadrantPanel } from './QuadrantPanel';
import { CountdownPanel } from './CountdownPanel';

interface RightPanelProps {
  tasks: Task[];
  selectedDate: string;
  view: string;
  onSelectDate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onUpdateQuadrant: (id: string, importance: 'important' | 'normal', urgency: 'urgent' | 'normal') => void;
  onOpenEdit: (task: Task) => void;
  tags: Record<string, { label: string; color: string }>;
}

export function RightPanel({
  tasks,
  selectedDate,
  view,
  onSelectDate,
  onToggleTask,
  onUpdateQuadrant,
  onOpenEdit,
  tags,
}: RightPanelProps) {
  const showQuadrantAndCountdown = view !== 'habits';

  return (
    <aside className="flex flex-col gap-4 p-4 h-full" style={{ background: 'var(--color-bg)' }}>
      <WeatherTimeWidget />
      <CalendarPanel tasks={tasks} selectedDate={selectedDate} onSelectDate={onSelectDate} tags={tags} />
      {showQuadrantAndCountdown && (
        <>
          <QuadrantPanel tasks={tasks} selectedDate={selectedDate} view={view}
            onToggleTask={onToggleTask} onUpdateQuadrant={onUpdateQuadrant} />
          <CountdownPanel tasks={tasks} onToggleTask={onToggleTask} onOpenEdit={onOpenEdit} />
        </>
      )}
    </aside>
  );
}
