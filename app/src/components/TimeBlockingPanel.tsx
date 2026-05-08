import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface TimeBlock {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  color: string;
  taskId?: string;
}

interface PositionedBlock extends TimeBlock {
  colIndex: number;
  colTotal: number;
}

const BLOCK_COLORS = [
  '#8bb4d6', '#a3c495', '#c9a87c', '#b8a0c8',
  '#d4857a', '#c4a5a0', '#8cc4bb', '#a5a5c4',
];

interface TimeBlockingPanelProps {
  tasks: Task[];
  selectedDate: string;
  onEditFullTask: (id: string, updates: Partial<Task>) => void;
}

/** Group overlapping blocks into columns, same logic as GanttChart */
function groupOverlapping(blocks: TimeBlock[]): PositionedBlock[] {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a.startHour - b.startHour);
  const groups: TimeBlock[][] = [];
  let currentGroup: TimeBlock[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const block = sorted[i];
    const lastEnd = Math.max(...currentGroup.map(b => b.endHour));
    if (block.startHour < lastEnd) {
      currentGroup.push(block);
    } else {
      groups.push(currentGroup);
      currentGroup = [block];
    }
  }
  groups.push(currentGroup);

  const result: PositionedBlock[] = [];
  groups.forEach(group => {
    group.forEach((block, idx) => {
      result.push({ ...block, colIndex: idx, colTotal: group.length });
    });
  });
  return result;
}

export function TimeBlockingPanel({ tasks, selectedDate, onEditFullTask }: TimeBlockingPanelProps) {
  const dayTasks = useMemo(() =>
    tasks.filter(t => t.date === selectedDate && !t.completed),
    [tasks, selectedDate]
  );

  // Generate suggestion blocks from tasks that have time set
  const [blocks, setBlocks] = useState<TimeBlock[]>(() => {
    const saved = localStorage.getItem('sunsama-timeblocks');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });

  // Save blocks to localStorage
  const saveBlocks = useCallback((newBlocks: TimeBlock[]) => {
    setBlocks(newBlocks);
    localStorage.setItem('sunsama-timeblocks', JSON.stringify(newBlocks));
  }, []);

  const addBlock = useCallback(() => {
    const newBlock: TimeBlock = {
      id: 'tb-' + Date.now(),
      startHour: 9,
      endHour: 10,
      label: '新时间段',
      color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
    };
    saveBlocks([...blocks, newBlock]);
  }, [blocks, saveBlocks]);

  const deleteBlock = useCallback((id: string) => {
    saveBlocks(blocks.filter(b => b.id !== id));
  }, [blocks, saveBlocks]);

  const updateBlock = useCallback((id: string, updates: Partial<TimeBlock>) => {
    saveBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [blocks, saveBlocks]);

  // Drag state for time block — with throttling via rAF
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartY = useRef(0);
  const blockStartHour = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ blockId: string; newStart: number; newEnd: number } | null>(null);

  // Apply pending drag update on rAF
  useEffect(() => {
    if (!draggingId) return;

    const tick = () => {
      const pending = pendingDragRef.current;
      if (pending) {
        pendingDragRef.current = null;
        // Use functional update to avoid stale closures
        setBlocks(prev => {
          const updated = prev.map(b => b.id === pending.blockId
            ? { ...b, startHour: pending.newStart, endHour: pending.newEnd }
            : b
          );
          localStorage.setItem('sunsama-timeblocks', JSON.stringify(updated));
          return updated;
        });
      }
      if (draggingId) {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [draggingId]);

  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    setDraggingId(blockId);
    dragStartY.current = e.clientY;
    blockStartHour.current = block.startHour;
    e.preventDefault();
  };

  useEffect(() => {
    if (!draggingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaHours = (e.clientY - dragStartY.current) / 40; // 40px per hour
      const block = blocks.find(b => b.id === draggingId);
      if (!block) return;
      const newStart = Math.max(6, Math.min(21, Math.round((blockStartHour.current + deltaHours) * 2) / 2));
      const newEnd = Math.min(22, newStart + (block.endHour - block.startHour));
      // Throttle via rAF — store pending update
      pendingDragRef.current = { blockId: draggingId, newStart, newEnd };
    };
    const handleMouseUp = () => setDraggingId(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, blocks]);

  // Generate time rows from 6:00 to 22:00
  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 6), []);

  const getBlockStyle = (block: PositionedBlock) => {
    const top = ((block.startHour - 6) / 16) * 100;
    const height = ((block.endHour - block.startHour) / 16) * 100;
    const colWidth = 100 / block.colTotal;
    const left = block.colIndex * colWidth;
    return {
      top: `${top}%`,
      height: `${height}%`,
      left: `${left + 2}%`,
      width: `${colWidth - 4}%`,
    };
  };

  // Position blocks with overlap grouping
  const positionedBlocks = useMemo(() => groupOverlapping(blocks), [blocks]);

  const unassignedTasks = dayTasks.filter(t => !t.time);

  const assignTask = (taskId: string, hour: number) => {
    onEditFullTask(taskId, { time: `${String(hour).padStart(2, '0')}:00`, duration: 60 });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--app-text)]">时间段规划</h2>
          <p className="text-sm text-[var(--app-text-muted)] mt-0.5">拖拽调整时间块</p>
        </div>
        <button
          onClick={addBlock}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-all"
        >
          <Plus size={14} />
          新增时间块
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Timeline */}
        <div className="flex-1 relative overflow-y-auto border border-[var(--app-border)] rounded-xl bg-[var(--app-surface)]">
          {/* Time rows */}
          <div className="absolute inset-0">
            {hours.map(hour => (
              <div
                key={hour}
                className="flex border-b border-[var(--app-border)] last:border-b-0"
                style={{ height: 'calc(100% / 16)' }}
              >
                <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-0.5 text-[10px] text-[var(--app-text-muted)]">
                  {`${hour}:00`}
                </div>
                <div className="flex-1 relative hover:bg-[var(--app-surface-hover)]/30 transition-colors" />
              </div>
            ))}
          </div>

          {/* Time blocks overlay — positioned with overlap grouping */}
          <div className="relative" style={{ height: 'calc(100% / 16 * 16)' }}>
            {positionedBlocks.map(block => (
              <div
                key={block.id}
                className={cn(
                  'absolute rounded-xl border transition-shadow flex flex-col overflow-hidden group',
                  draggingId === block.id ? 'shadow-lg z-10 opacity-90' : 'z-0'
                )}
                style={{
                  ...getBlockStyle(block),
                  backgroundColor: block.color + '20',
                  borderColor: block.color + '40',
                }}
                onMouseDown={(e) => handleMouseDown(e, block.id)}
              >
                {/* Block header */}
                <div className={cn(
                  'px-2 py-1 flex items-center gap-1 text-[11px] font-medium cursor-grab',
                  draggingId === block.id ? 'cursor-grabbing' : ''
                )}
                  style={{ backgroundColor: block.color + '15' }}
                >
                  <GripVertical size={10} className="text-[var(--app-text-muted)]" />
                  <input
                    value={block.label}
                    onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                    className="flex-1 bg-transparent outline-none text-[var(--app-text)] min-w-0"
                  />
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Block body */}
                <div className="flex-1 px-2 py-1 overflow-y-auto">
                  {/* Show tasks assigned to this block */}
                  {dayTasks.filter(t => {
                    if (!t.time) return false;
                    const [h] = t.time.split(':').map(Number);
                    return h >= block.startHour && h < block.endHour;
                  }).map(task => (
                    <div key={task.id} className="text-[11px] py-0.5 text-[var(--app-text)] truncate">
                      {task.title}
                    </div>
                  ))}
                  <div className="text-[10px] text-[var(--app-text-muted)] mt-0.5">
                    {block.startHour}:00 - {block.endHour}:00
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unassigned tasks panel */}
        <div className="w-56 shrink-0 flex flex-col">
          <h3 className="text-xs font-semibold text-[var(--app-text-muted)] mb-2">未分配任务</h3>
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {unassignedTasks.map(task => (
              <div
                key={task.id}
                className="p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-xs text-[var(--app-text)] cursor-pointer hover:border-[var(--app-accent)] transition-all"
                onClick={() => assignTask(task.id, 9)}
              >
                {task.title}
              </div>
            ))}
            {unassignedTasks.length === 0 && (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-4">
                所有任务已分配时间
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
