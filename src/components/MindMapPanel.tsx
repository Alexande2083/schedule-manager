import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Download,
  ChevronDown, Trash2, Copy,
  ZoomIn, ZoomOut, Maximize,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Types & Data
   ============================================================ */

interface MindMapNode {
  id: string;
  text: string;
  children: string[];
  parentId: string | null;
  collapsed: boolean;
  color?: string;
  icon?: string;
}

interface MindMapData {
  nodes: Record<string, MindMapNode>;
  rootId: string;
}

interface Position { x: number; y: number; }

const STORAGE_KEY = 'mindmap-v2-data';

const THEMES: Record<string, { bg: string; rootGradient: string; lineColor: string; nodeBg: string; nodeBorder: string; nodeText: string; accent: string }> = {
  default: { bg: '#f8f9fa', rootGradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', lineColor: '#6366f1', nodeBg: '#ffffff', nodeBorder: '#e2e8f0', nodeText: '#1e293b', accent: '#6366f1' },
  ocean:   { bg: '#f0f5fa', rootGradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', lineColor: '#0ea5e9', nodeBg: '#ffffff', nodeBorder: '#bae6fd', nodeText: '#0c4a6e', accent: '#0ea5e9' },
  forest:  { bg: '#f2f7f0', rootGradient: 'linear-gradient(135deg, #22c55e, #10b981)', lineColor: '#22c55e', nodeBg: '#ffffff', nodeBorder: '#bbf7d0', nodeText: '#14532d', accent: '#22c55e' },
  sunset:  { bg: '#fef7f0', rootGradient: 'linear-gradient(135deg, #f97316, #ef4444)', lineColor: '#f97316', nodeBg: '#ffffff', nodeBorder: '#fed7aa', nodeText: '#7c2d12', accent: '#f97316' },
  purple:  { bg: '#faf5ff', rootGradient: 'linear-gradient(135deg, #a855f7, #d946ef)', lineColor: '#a855f7', nodeBg: '#ffffff', nodeBorder: '#e9d5ff', nodeText: '#4c1d95', accent: '#a855f7' },
};

function generateId() { return 'mm_' + Math.random().toString(36).slice(2, 9); }

function loadData(): MindMapData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const rootId = generateId();
  return { rootId, nodes: { [rootId]: { id: rootId, text: '中心主题', children: [], parentId: null, collapsed: false, icon: '🧠' } } };
}

function saveData(data: MindMapData) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

/* ============================================================
   Main Component
   ============================================================ */

export function MindMapPanel() {
  const [data, setData] = useState<MindMapData>(loadData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [scale, setScale] = useState(0.85);
  const [offset, setOffset] = useState({ x: 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [themeKey, setThemeKey] = useState('default');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[themeKey] || THEMES.default;

  // Save on change
  useEffect(() => { saveData(data); }, [data]);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  // Close context menu on any click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const getNode = useCallback((id: string) => data.nodes[id], [data.nodes]);

  const updateNode = useCallback((id: string, updates: Partial<MindMapNode>) => {
    setData(prev => ({ ...prev, nodes: { ...prev.nodes, [id]: { ...prev.nodes[id], ...updates } } }));
  }, []);

  /* ── Tree mutations ── */

  const addChild = useCallback((parentId: string) => {
    const newId = generateId();
    setData(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [parentId]: { ...prev.nodes[parentId], children: [...prev.nodes[parentId].children, newId], collapsed: false },
        [newId]: { id: newId, text: '新主题', children: [], parentId, collapsed: false },
      },
    }));
    setSelectedId(newId);
    setTimeout(() => { setEditingId(newId); setEditText('新主题'); }, 50);
  }, []);

  const addSibling = useCallback((nodeId: string) => {
    const node = data.nodes[nodeId];
    if (!node || !node.parentId) return;
    return addChild(node.parentId);
  }, [data.nodes, addChild]);

  const deleteNode = useCallback((id: string) => {
    if (id === data.rootId) return;
    const node = getNode(id);
    if (!node) return;
    const toDelete = new Set<string>();
    const collect = (nid: string) => {
      toDelete.add(nid);
      getNode(nid)?.children.forEach(collect);
    };
    collect(id);
    setData(prev => {
      const nextNodes = { ...prev.nodes };
      toDelete.forEach(did => delete nextNodes[did]);
      if (node.parentId && nextNodes[node.parentId]) {
        nextNodes[node.parentId] = { ...nextNodes[node.parentId], children: nextNodes[node.parentId].children.filter(c => c !== id) };
      }
      return { ...prev, nodes: nextNodes };
    });
    setSelectedId(null);
  }, [getNode, data.rootId]);

  const toggleCollapsed = useCallback((id: string) => {
    const node = getNode(id);
    if (!node || node.children.length === 0) return;
    updateNode(id, { collapsed: !node.collapsed });
  }, [getNode, updateNode]);

  /* ── Layout ── */

  const NODE_W = 140;
  const NODE_H = 44;
  const GAP_X = 60;
  const GAP_Y = 16;

  const positions = useMemo((): Record<string, Position> => {
    const pos: Record<string, Position> = {};
    const visited = new Set<string>();

    const layout = (nodeId: string, startX: number, startY: number): number => {
      const node = getNode(nodeId);
      if (!node || visited.has(nodeId)) return NODE_H + GAP_Y;
      visited.add(nodeId);

      if (node.collapsed || node.children.length === 0) {
        pos[nodeId] = { x: startX, y: startY + GAP_Y / 2 };
        return NODE_H + GAP_Y;
      }

      let childY = startY;
      let totalH = 0;
      const childPositions: { id: string; y: number }[] = [];

      for (const childId of node.children) {
        const h = layout(childId, startX + NODE_W + GAP_X, childY);
        childPositions.push({ id: childId, y: childY + h / 2 - NODE_H / 2 });
        childY += h;
        totalH += h;
      }

      pos[nodeId] = {
        x: startX,
        y: startY + totalH / 2 - NODE_H / 2,
      };

      return Math.max(totalH, NODE_H + GAP_Y);
    };

    layout(data.rootId, 50, 50);
    return pos;
  }, [data, getNode, NODE_W, NODE_H, GAP_X, GAP_Y]);

  /* ── Connection lines ── */

  const connections = useMemo(() => {
    const lines: { from: string; to: string }[] = [];
    const walk = (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node || node.collapsed || node.children.length === 0) return;
      for (const childId of node.children) {
        lines.push({ from: nodeId, to: childId });
        walk(childId);
      }
    };
    walk(data.rootId);
    return lines;
  }, [data, getNode]);

  /* ── Canvas dimensions ── */

  const { canvasW, canvasH } = useMemo(() => {
    let maxX = 0, maxY = 0;
    Object.values(positions).forEach(p => {
      maxX = Math.max(maxX, p.x + NODE_W + 100);
      maxY = Math.max(maxY, p.y + NODE_H + 100);
    });
    return { canvasW: Math.max(maxX, 1000), canvasH: Math.max(maxY, 800) };
  }, [positions]);

  /* ── Pan & Zoom ── */

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-mm-node]') || target.closest('[data-mm-toolbar]')) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    setContextMenu(null);
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setScale(s => Math.round(Math.max(0.2, Math.min(2.5, s + delta)) * 100) / 100);
    }
  }, []);

  const zoomIn = () => setScale(s => Math.min(s + 0.1, 2.5));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.2));
  const resetView = () => { setScale(0.85); setOffset({ x: 100, y: 80 }); };

  /* ── Keyboard shortcuts ── */

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingId) return;
    if (!selectedId) return;

    const key = e.key;
    e.preventDefault();

    if (key === 'Tab') { addChild(selectedId); }
    else if (key === 'Enter') { addSibling(selectedId); }
    else if (key === 'Delete' || key === 'Backspace') { deleteNode(selectedId); }
    else if (key === 'F2') {
      const n = getNode(selectedId);
      if (n) { setEditingId(selectedId); setEditText(n.text); }
    } else if (key === ' ') { toggleCollapsed(selectedId); }
  }, [selectedId, editingId, addChild, addSibling, deleteNode, getNode, toggleCollapsed]);

  /* ── Export ── */

  const exportPNG = useCallback(async () => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    const mindmapEl = containerRef.current.querySelector('.mindmap-scene') as HTMLElement;
    if (!svgEl || !mindmapEl) return;

    // Render to canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw connection lines
    connections.forEach(({ from, to }) => {
      const p1 = positions[from];
      const p2 = positions[to];
      if (!p1 || !p2) return;
      const x1 = p1.x + NODE_W, y1 = p1.y + NODE_H / 2;
      const x2 = p2.x, y2 = p2.y + NODE_H / 2;
      ctx.strokeStyle = theme.lineColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      const mx = (x1 + x2) / 2;
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
      ctx.stroke();
    });

    // Draw nodes
    ctx.globalAlpha = 1;
    Object.entries(positions).forEach(([id, p]) => {
      const node = getNode(id);
      if (!node) return;
      const isRoot = id === data.rootId;
      ctx.fillStyle = isRoot ? theme.accent : '#ffffff';
      ctx.strokeStyle = isRoot ? theme.accent : theme.nodeBorder;
      ctx.lineWidth = isRoot ? 0 : 1;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, NODE_W, NODE_H, 10);
      ctx.fill();
      if (!isRoot) ctx.stroke();
      ctx.fillStyle = isRoot ? '#ffffff' : theme.nodeText;
      ctx.font = `600 ${isRoot ? 13 : 12}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.text.slice(0, 14), p.x + NODE_W / 2, p.y + NODE_H / 2);
    });

    const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mindmap.png'; a.click();
    URL.revokeObjectURL(url);
  }, [canvasW, canvasH, positions, connections, data.rootId, getNode, theme]);

  /* ── Minimap ── */

  const minimapW = 160;
  const minimapH = 100;
  const mmScale = Math.min(minimapW / canvasW, minimapH / canvasH);

  /* ============================================================
     Render
     ============================================================ */

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between mb-2 px-1" data-mm-toolbar="true">
        <div>
          <h2 className="text-lg font-bold text-[var(--app-text)]">思维导图</h2>
          <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
            Tab 加子节点 · Enter 加同级 · Delete 删除 · 滚轮缩放 · 拖拽平移
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Theme selector */}
          {Object.entries(THEMES).map(([k, t]) => (
            <button
              key={k}
              onClick={() => setThemeKey(k)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all',
                themeKey === k ? 'border-[var(--app-text)] scale-110' : 'border-transparent opacity-60 hover:opacity-100',
              )}
              style={{ background: t.rootGradient }}
              title={k}
            />
          ))}
          <div className="w-px h-5 bg-[var(--app-border)] mx-1" />
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all" title="放大"><ZoomIn size={16} /></button>
          <span className="text-[11px] text-[var(--app-text-muted)] tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all" title="缩小"><ZoomOut size={16} /></button>
          <button onClick={resetView} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all" title="重置"><Maximize size={16} /></button>
          <button onClick={exportPNG} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all" title="导出PNG"><Download size={16} /></button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 rounded-xl border border-[var(--app-border)] overflow-hidden relative select-none"
        style={{
          backgroundColor: theme.bg,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Scene (transformed) */}
        <div
          className="mindmap-scene absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: canvasW,
            height: canvasH,
          }}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 pointer-events-none" width={canvasW} height={canvasH}>
            {connections.map(({ from, to }) => {
              const p1 = positions[from];
              const p2 = positions[to];
              if (!p1 || !p2) return null;
              const x1 = p1.x + NODE_W, y1 = p1.y + NODE_H / 2;
              const x2 = p2.x, y2 = p2.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={theme.lineColor}
                  strokeWidth={2}
                  opacity={0.45}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {Object.entries(positions).map(([id, pos]) => {
            const node = getNode(id);
            if (!node) return null;
            const isRoot = id === data.rootId;
            const isSelected = id === selectedId;
            const isEditing = id === editingId;
            const hasChildren = node.children.length > 0;

            return (
              <div
                key={id}
                data-mm-node="true"
                className="absolute"
                style={{ left: pos.x, top: pos.y, width: NODE_W }}
              >
                {/* Collapse toggle */}
                {hasChildren && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCollapsed(id); }}
                    className={cn(
                      'absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border shadow-sm flex items-center justify-center z-10 transition-all hover:scale-110',
                      isRoot ? 'bg-white border-white/30 text-[var(--app-accent)]' : 'bg-white border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]',
                    )}
                  >
                    <ChevronDown size={10} className={cn('transition-transform', node.collapsed && '-rotate-90')} />
                  </button>
                )}

                {/* Node card */}
                <div
                  className={cn(
                    'rounded-xl border px-3 py-2.5 transition-all duration-200 cursor-pointer shadow-sm group',
                    isRoot
                      ? 'text-white border-transparent'
                      : isSelected
                        ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)] shadow-md'
                        : 'hover:shadow-md hover:-translate-y-0.5',
                  )}
                  style={{
                    background: isRoot ? theme.rootGradient : theme.nodeBg,
                    borderColor: isRoot ? 'transparent' : isSelected ? 'var(--app-accent)' : theme.nodeBorder,
                    minHeight: NODE_H,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: id });
                  }}
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => {
                        if (editText.trim()) updateNode(id, { text: editText.trim() });
                        setEditingId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (editText.trim()) updateNode(id, { text: editText.trim() });
                          setEditingId(null);
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-full text-xs font-semibold bg-transparent outline-none border-b border-white/60 pb-0.5 text-center"
                      style={{ color: isRoot ? '#fff' : theme.nodeText }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 min-w-0">
                      {node.icon && <span className="text-sm shrink-0">{node.icon}</span>}
                      <span className={cn(
                        'text-xs font-semibold truncate leading-tight',
                        isRoot ? 'text-white' : '',
                      )}
                        style={{ color: isRoot ? undefined : theme.nodeText }}
                      >
                        {node.text}
                      </span>
                    </div>
                  )}
                  {hasChildren && node.collapsed && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0 rounded-full text-[9px] font-medium"
                      style={{ background: theme.accent + '20', color: theme.accent }}>
                      +{node.children.length}
                    </div>
                  )}
                </div>

                {/* Quick add button */}
                {isSelected && !isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); addChild(id); }}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[var(--app-border)] flex items-center justify-center shadow-sm hover:scale-110 hover:border-[var(--app-accent)] transition-all opacity-0 group-hover:opacity-100"
                    style={{ zIndex: 20 }}
                  >
                    <Plus size={11} className="text-[var(--app-accent)]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Minimap ── */}
        <div
          className="absolute right-3 bottom-3 rounded-lg overflow-hidden border border-[var(--app-border)] bg-white/80 backdrop-blur-sm cursor-pointer opacity-60 hover:opacity-100 transition-opacity shadow-md z-20"
          style={{ width: minimapW + 12, height: minimapH + 12 }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const cx = (e.clientX - rect.left - 6) / mmScale;
            const cy = (e.clientY - rect.top - 6) / mmScale;
            const cw = containerRef.current?.clientWidth || 800;
            const ch = containerRef.current?.clientHeight || 600;
            setOffset({ x: -(cx - cw / 2 / scale), y: -(cy - ch / 2 / scale) });
          }}
        >
          <div style={{ width: minimapW, height: minimapH, position: 'relative', margin: 6 }}>
            {Object.entries(positions).map(([id, p]) => (
              <div
                key={id}
                className="absolute rounded-sm"
                style={{
                  left: p.x * mmScale,
                  top: p.y * mmScale,
                  width: Math.max(3, NODE_W * mmScale),
                  height: Math.max(2, NODE_H * mmScale),
                  backgroundColor: id === data.rootId ? theme.accent : theme.nodeBorder,
                  borderRadius: 2,
                }}
              />
            ))}
            <div className="absolute border border-[var(--app-accent)] rounded-sm pointer-events-none"
              style={{
                left: (-offset.x / scale) * mmScale,
                top: (-offset.y / scale) * mmScale,
                width: ((containerRef.current?.clientWidth || 800) / scale) * mmScale,
                height: ((containerRef.current?.clientHeight || 600) / scale) * mmScale,
              }}
            />
          </div>
        </div>

        {/* ── Context menu ── */}
        {contextMenu && (
          <div
            className="absolute z-50 rounded-xl bg-white border border-[var(--app-border)] shadow-xl p-1 min-w-[140px] animate-in fade-in zoom-in-95 origin-top-left"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text)] transition-all"
              onClick={() => { addChild(contextMenu.nodeId); setContextMenu(null); }}>
              <Plus size={13} />添加子节点
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text)] transition-all"
              onClick={() => { addSibling(contextMenu.nodeId); setContextMenu(null); }}>
              <Copy size={13} />添加同级
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text)] transition-all"
              onClick={() => { const n = getNode(contextMenu.nodeId); if (n) { setEditingId(contextMenu.nodeId); setEditText(n.text); } setContextMenu(null); }}>
              <ZoomIn size={13} />重命名
            </button>
            {contextMenu.nodeId !== data.rootId && (
              <>
                <div className="h-px bg-[var(--app-border)] my-1" />
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-red-50 text-red-600 transition-all"
                  onClick={() => { deleteNode(contextMenu.nodeId); setContextMenu(null); }}>
                  <Trash2 size={13} />删除节点
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Hint ── */}
        <div className="absolute left-3 bottom-3 text-[10px] text-[var(--app-text-muted)] bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] z-10">
          右键节点查看更多操作
        </div>
      </div>
    </div>
  );
}
