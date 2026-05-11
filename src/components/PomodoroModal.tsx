import { useState } from 'react';
import { X, Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
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
const SOUNDS = [
  { id: 'rain', label: '雨声' },
  { id: 'cafe', label: '咖啡馆' },
  { id: 'white', label: '白噪音' },
  { id: 'forest', label: '森林' },
];

export function PomodoroModal({
  isOpen, onClose, minutes, seconds, isRunning,
  completedToday, duration, progress,
  onStart, onPause, onReset, onSetDuration,
}: PomodoroModalProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeSound, setActiveSound] = useState('rain');

  if (!isOpen) return null;

  const radius = focusMode ? 120 : 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const modalContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn('font-semibold', focusMode ? 'text-xl text-white' : 'text-lg text-[var(--app-text)]')}>
          番茄钟
        </h3>
        <div className="flex items-center gap-1">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'p-2 rounded-lg transition-all',
              focusMode
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
            )}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {/* Focus mode toggle */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={cn(
              'p-2 rounded-lg transition-all',
              focusMode
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
            )}
          >
            {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-all',
              focusMode
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
            )}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Duration presets */}
      {!focusMode && (
        <div className="flex justify-center gap-2 mb-4">
          {DURATION_PRESETS.map(d => (
            <button
              key={d}
              onClick={() => { if (!isRunning) onSetDuration(d); }}
              disabled={isRunning}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                duration === d
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
            >
              {d}分
            </button>
          ))}
        </div>
      )}

      {/* Timer circle */}
      <div className={cn('relative mx-auto', focusMode ? 'w-[260px] h-[260px] mb-8' : 'w-[180px] h-[180px] mb-6')}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none"
            stroke={focusMode ? 'rgba(255,255,255,0.2)' : 'var(--app-border)'} strokeWidth="6" />
          <circle
            cx="90" cy="90" r={radius} fill="none"
            stroke={focusMode ? 'white' : 'var(--app-accent)'} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold tabular-nums', focusMode ? 'text-6xl text-white' : 'text-4xl text-[var(--app-text)]')}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className={cn('mt-1', focusMode ? 'text-white/60 text-sm' : 'text-xs text-[var(--app-text-muted)]')}>
            今日完成 {completedToday} 个
          </span>
        </div>
      </div>

      {/* Sound selector */}
      {soundEnabled && !focusMode && (
        <div className="flex justify-center gap-2 mb-4">
          {SOUNDS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSound(s.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all',
                activeSound === s.id
                  ? 'bg-[var(--app-accent)] text-white'
                  : 'bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={isRunning ? onPause : onStart}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
            focusMode
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]'
          )}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          {isRunning ? '暂停' : '开始'}
        </button>
        <button
          onClick={onReset}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all',
            focusMode
              ? 'bg-white/10 text-white/80 hover:bg-white/20'
              : 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
          )}
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>
    </>
  );

  // Focus mode: full-screen overlay
  if (focusMode) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <div className="w-[400px]">
          {modalContent}
        </div>
      </div>
    );
  }

  // Normal mode: centered modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)]">
      <div className="glass-panel bg-[var(--app-surface)] rounded-xl shadow-2xl p-8 w-[380px] relative border border-[var(--app-border)]">
        {modalContent}
      </div>
    </div>
  );
}
