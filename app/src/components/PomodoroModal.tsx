import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
  minutes: number;
  seconds: number;
  isRunning: boolean;
  completedToday: number;
  duration: number;
  progress: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetDuration: (d: number) => void;
}

const DURATION_PRESETS = [15, 25, 45, 60];

export function PomodoroModal({
  isOpen,
  onClose,
  minutes,
  seconds,
  isRunning,
  completedToday,
  duration,
  progress,
  onStart,
  onPause,
  onReset,
  onSetDuration,
}: PomodoroModalProps) {
  if (!isOpen) return null;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm">
      <div className="glass-panel bg-[var(--app-surface)] rounded-2xl shadow-2xl p-8 w-[380px] relative border border-[var(--app-border)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
        >
          <X size={18} />
        </button>

        <h3 className="text-lg font-semibold text-[var(--app-text)] text-center mb-4">
          番茄钟
        </h3>

        {/* Duration presets */}
        <div className="flex justify-center gap-2 mb-4">
          {DURATION_PRESETS.map(d => (
            <button
              key={d}
              onClick={() => { if (!isRunning) onSetDuration(d); }}
              disabled={isRunning}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                duration === d
                  ? 'bg-[#d4857a] text-white'
                  : 'bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
            >
              {d}分
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <div className="relative w-[180px] h-[180px] mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--app-border)" strokeWidth="6" />
            <circle
              cx="90" cy="90" r={radius} fill="none" stroke="#d4857a" strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-[var(--app-text)] tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-[var(--app-text-muted)] mt-1">
              今日完成 {completedToday} 个
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={isRunning ? onPause : onStart}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d4857a] text-white text-sm font-medium hover:bg-[#c97a6e] transition-all"
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? '暂停' : '开始'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] text-sm hover:text-[var(--app-text)] transition-all"
          >
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
