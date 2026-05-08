import { useState, useMemo } from 'react';
import { Plus, Trash2, Flame, Dumbbell, BookOpen, Coffee, Heart, Sun, Moon, Zap, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToday } from '@/utils/date';
import type { Habit, HabitLog } from '@/hooks/useHabits';

const HABIT_ICONS: Record<string, React.ElementType> = {
  Dumbbell, BookOpen, Coffee, Heart, Sun, Moon, Zap, Flame,
};
const DEFAULT_ICONS = ['Flame', 'Dumbbell', 'BookOpen', 'Coffee', 'Heart', 'Sun', 'Moon', 'Zap'];

const HABIT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
  '#38bdf8', '#818cf8', '#e879f9', '#f472b6', '#f97316',
];

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface HabitsPanelProps {
  habits: Habit[];
  logs: HabitLog[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  onDeleteHabit: (id: string) => void;
  onToggleLog: (habitId: string, date: string) => void;
}

export function HabitsPanel({ habits, logs, onAddHabit, onDeleteHabit, onToggleLog }: HabitsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Flame');
  const [newColor, setNewColor] = useState(HABIT_COLORS[0]);
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekday' | 'weekly'>('daily');
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const today = getToday();

  const isCompleted = (habitId: string, date: string) => {
    return logs.some(l => l.habitId === habitId && l.date === date);
  };

  const getStreak = (habitId: string): number => {
    let streak = 0;
    const d = new Date(today);
    let skippedToday = false;
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      if (logs.some(l => l.habitId === habitId && l.date === dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        if (streak === 0 && !skippedToday) {
          skippedToday = true;
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  // Get last 7 days for compact view
  const last7Days = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(d);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0
      days.push({ dateStr, label: WEEKDAY_LABELS[dayOfWeek], day: date.getDate(), isToday: i === 0 });
    }
    return days;
  }, []);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddHabit({ name: newName.trim(), icon: newIcon, color: newColor, frequency: newFrequency });
    setNewName('');
    setShowAddForm(false);
  };

  // Full calendar for expanded view
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewMonth.year, viewMonth.month, 0).getDate();
    const firstDay = new Date(viewMonth.year, viewMonth.month - 1, 1).getDay();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [viewMonth]);

  const formatDate = (day: number) => {
    return `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const prevMonth = () => {
    if (viewMonth.month === 1) {
      setViewMonth({ year: viewMonth.year - 1, month: 12 });
    } else {
      setViewMonth({ ...viewMonth, month: viewMonth.month - 1 });
    }
  };

  const nextMonth = () => {
    if (viewMonth.month === 12) {
      setViewMonth({ year: viewMonth.year + 1, month: 1 });
    } else {
      setViewMonth({ ...viewMonth, month: viewMonth.month + 1 });
    }
  };

  // Count this month's completions
  const getMonthlyCount = (habitId: string) => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return logs.filter(l => l.habitId === habitId && l.date.startsWith(monthPrefix)).length;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[var(--app-text)]">习惯追踪</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-all"
        >
          <Plus size={14} />
          新建习惯
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-3 p-4 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="习惯名称，如「阅读30分钟」"
            className="w-full text-sm bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-text-muted)]">图标：</span>
            <div className="flex gap-1 flex-wrap">
              {DEFAULT_ICONS.map(icon => {
                const IconComp = HABIT_ICONS[icon] || Flame;
                return (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      newIcon === icon ? 'bg-[var(--app-accent)] text-white' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]'
                    )}
                  >
                    <IconComp size={16} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-text-muted)]">颜色：</span>
            <div className="flex gap-1 flex-wrap">
              {HABIT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all border-2',
                    newColor === color ? 'border-[var(--app-text)] scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-text-muted)]">频率：</span>
            <select
              value={newFrequency}
              onChange={(e) => setNewFrequency(e.target.value as 'daily' | 'weekday' | 'weekly')}
              className="text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none"
            >
              <option value="daily">每天</option>
              <option value="weekday">工作日</option>
              <option value="weekly">每周</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-all"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Flame size={48} className="mx-auto mb-3 text-[var(--app-text-muted)] opacity-30" />
            <p className="text-sm text-[var(--app-text-muted)]">还没有习惯</p>
            <p className="text-xs text-[var(--app-text-muted)] mt-1">点击上方按钮添加第一个习惯</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {habits.map(habit => {
            const streak = getStreak(habit.id);
            const todayDone = isCompleted(habit.id, today);
            const IconComp = HABIT_ICONS[habit.icon] || Flame;
            const monthlyCount = getMonthlyCount(habit.id);
            const isExpanded = expandedHabit === habit.id;

            return (
              <div key={habit.id} className="rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] overflow-hidden">
                {/* Compact row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Icon + name */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: habit.color + '20', color: habit.color }}
                  >
                    <IconComp size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-[var(--app-text)] truncate">{habit.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--app-text-muted)]">
                        本月 {monthlyCount} 次
                      </span>
                      {streak > 0 && (
                        <span className="text-[10px] flex items-center gap-0.5 text-orange-500">
                          <Flame size={9} />
                          {streak}天
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last 7 days dots */}
                  <div className="flex items-center gap-1 shrink-0">
                    {last7Days.map(d => {
                      const done = isCompleted(habit.id, d.dateStr);
                      return (
                        <button
                          key={d.dateStr}
                          onClick={() => onToggleLog(habit.id, d.dateStr)}
                          className={cn(
                            'w-5 h-5 rounded text-[9px] font-medium transition-all flex items-center justify-center',
                            done
                              ? 'text-white'
                              : d.isToday
                                ? 'border border-dashed border-[var(--app-border)] text-[var(--app-text-muted)]'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]'
                          )}
                          style={done ? { backgroundColor: habit.color } : undefined}
                          title={`${d.label} ${d.day}日`}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Today check button */}
                  <button
                    onClick={() => onToggleLog(habit.id, today)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-0.5 shrink-0',
                      todayDone
                        ? 'bg-green-100 text-green-700'
                        : 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] border border-[var(--app-border)] hover:border-green-300'
                    )}
                  >
                    <CheckCircle2 size={10} />
                    {todayDone ? '已打卡' : '打卡'}
                  </button>

                  {/* Expand / delete */}
                  <button
                    onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                    className="p-1 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    className="p-1 rounded text-[var(--app-text-muted)] hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Expanded calendar (click to expand) */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-[var(--app-border)]">
                    <div className="flex items-center justify-between mb-1.5 mt-2">
                      <span className="text-[10px] text-[var(--app-text-muted)]">
                        {viewMonth.year}年{viewMonth.month}月
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-[10px]">◀</button>
                        <button onClick={nextMonth} className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text)] text-[10px]">▶</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                        <span key={d} className="text-[9px] text-center text-[var(--app-text-muted)]">{d}</span>
                      ))}
                      {calendarDays.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} />;
                        const dateStr = formatDate(day);
                        const done = isCompleted(habit.id, dateStr);
                        const isToday = dateStr === today;
                        return (
                          <button
                            key={dateStr}
                            onClick={() => onToggleLog(habit.id, dateStr)}
                            className={cn(
                              'aspect-square rounded text-[10px] font-medium transition-all flex items-center justify-center',
                              done
                                ? 'text-white'
                                : isToday
                                  ? 'text-[var(--app-text)] border border-dashed border-[var(--app-border)]'
                                  : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]',
                              isToday && done && 'ring-1 ring-offset-0.5 ring-[var(--app-accent)]'
                            )}
                            style={done ? { backgroundColor: habit.color } : undefined}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
