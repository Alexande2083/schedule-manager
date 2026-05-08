import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Download, ChevronDown, Trash2, Copy,
  ZoomIn, ZoomOut, Maximize, Sparkles, ListChecks,
  Target, Bug, FileText, Link2, Bookmark, Zap,
  ExternalLink, Image, File, X, Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Types & Data
   ============================================================ */

type MindMapNodeType = 'goal' | 'feature' | 'task' | 'note' | 'resource' | 'bug';

interface MindMapNodeAttachment {
  id: string;
  type: 'image' | 'pdf' | 'link' | 'markdown';
  url: string;
  name: string;
}

interface MindMapNode {
  id: string;
  text: string;
  children: string[];
  parentId: string | null;
  collapsed: boolean;
  color?: string;
  icon?: string;
  type: MindMapNodeType;
  priority: 'high' | 'medium' | 'low';
  attachments: MindMapNodeAttachment[];
  linkedTaskId?: string;
  createdAt: number;
}

interface MindMapData {
  nodes: Record<string, MindMapNode>;
  rootId: string;
}

interface Position { x: number; y: number; }

const STORAGE_KEY = 'mindmap-v2-data';

const THEMES = {
  light:   { bg: '#ffffff', rootGradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', lineColor: '#6366f1', nodeBg: '#ffffff', nodeBorder: '#e2e8f0', nodeText: '#1e293b', accent: '#6366f1' },
  ocean:   { bg: '#f0f5fa', rootGradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', lineColor: '#0ea5e9', nodeBg: '#ffffff', nodeBorder: '#bae6fd', nodeText: '#0c4a6e', accent: '#0ea5e9' },
  forest:  { bg: '#f2f7f0', rootGradient: 'linear-gradient(135deg, #22c55e, #10b981)', lineColor: '#22c55e', nodeBg: '#ffffff', nodeBorder: '#bbf7d0', nodeText: '#14532d', accent: '#22c55e' },
  sunset:  { bg: '#fef7f0', rootGradient: 'linear-gradient(135deg, #f97316, #ef4444)', lineColor: '#f97316', nodeBg: '#ffffff', nodeBorder: '#fed7aa', nodeText: '#7c2d12', accent: '#f97316' },
  purple:  { bg: '#faf5ff', rootGradient: 'linear-gradient(135deg, #a855f7, #d946ef)', lineColor: '#a855f7', nodeBg: '#ffffff', nodeBorder: '#e9d5ff', nodeText: '#4c1d95', accent: '#a855f7' },
};

// ─── Type visual config ───
const TYPE_CONFIG: Record<MindMapNodeType, { icon: React.ElementType; border: string; bg: string; label: string }> = {
  goal:     { icon: Target,       border: '#6366f1', bg: 'rgba(99,102,241,0.08)',  label: '目标' },
  feature:  { icon: Zap,          border: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  label: '功能' },
  task:     { icon: ListChecks,   border: '#22c55e', bg: 'rgba(34,197,94,0.08)',   label: '任务' },
  note:     { icon: FileText,     border: '#6b7280', bg: 'rgba(107,114,128,0.06)', label: '笔记' },
  resource: { icon: Link2,        border: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   label: '资源' },
  bug:      { icon: Bug,          border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: '问题' },
};

const NODE_TYPES: MindMapNodeType[] = ['goal', 'feature', 'task', 'note', 'resource', 'bug'];

function generateId() { return 'mm_' + Math.random().toString(36).slice(2, 9); }

function migrateNode(raw: any): MindMapNode {
  return {
    id: raw.id || generateId(),
    text: raw.text || '未命名',
    children: raw.children || [],
    parentId: raw.parentId || null,
    collapsed: raw.collapsed || false,
    color: raw.color,
    icon: raw.icon,
    type: (raw.type && NODE_TYPES.includes(raw.type)) ? raw.type : 'note',
    priority: raw.priority || 'medium',
    attachments: raw.attachments || [],
    linkedTaskId: raw.linkedTaskId,
    createdAt: raw.createdAt || Date.now(),
  };
}

function loadData(): MindMapData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated: Record<string, MindMapNode> = {};
      Object.entries(parsed.nodes || {}).forEach(([k, v]) => {
        migrated[k] = migrateNode(v);
      });
      return { rootId: parsed.rootId, nodes: migrated };
    }
  } catch {}
  const rootId = generateId();
  return {
    rootId,
    nodes: {
      [rootId]: {
        id: rootId, text: '中心主题', children: [], parentId: null, collapsed: false,
        icon: '🧠', type: 'goal', priority: 'high', attachments: [], createdAt: Date.now(),
      },
    },
  };
}

function saveData(data: MindMapData) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ─── Default node template ───
function createNode(parentId: string, text: string, type: MindMapNodeType = 'note'): MindMapNode {
  return {
    id: generateId(), text, children: [], parentId, collapsed: false,
    type, priority: 'medium', attachments: [], createdAt: Date.now(),
  };
}

/* ============================================================
   API helper
   ============================================================ */

async function aiExpand(nodeText: string, parentContext: string, mode: 'expand' | 'breakdown'): Promise<string[]> {
  const base = window.location.origin;
  const res = await fetch(`${base}/api/mindmap/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeText, parentContext, mode }),
  });
  if (!res.ok) throw new Error('AI 扩展失败');
  const data = await res.json();
  return data.children || [];
}

/* ============================================================
   Main Component
   ============================================================ */

interface MindMapPanelProps {
  onAddTask?: (task: any) => void;
  tags?: Record<string, { label: string; color: string }>;
}

export function MindMapPanel({ onAddTask, tags = {} }: MindMapPanelProps) {
  const [data, setData] = useState<MindMapData>(loadData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [scale, setScale] = useState(0.85);
  const [offset, setOffset] = useState({ x: 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [taskDate, setTaskDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskTag, setTaskTag] = useState('work');
  const [showDetail, setShowDetail] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [themeKey, setThemeKey] = useState<keyof typeof THEMES>('light');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[themeKey as keyof typeof THEMES] || THEMES.light;

  // Save
  useEffect(() => { saveData(data); }, [data]);
  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);
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

  const addChild = useCallback((parentId: string, nodeType: MindMapNodeType = 'note') => {
    const newId = generateId();
    setData(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [parentId]: { ...prev.nodes[parentId], children: [...prev.nodes[parentId].children, newId], collapsed: false },
        [newId]: createNode(parentId, '新主题', nodeType),
      },
    }));
    setSelectedId(newId);
    setTimeout(() => { setEditingId(newId); setEditText('新主题'); }, 50);
  }, []);

  const addSibling = useCallback((nodeId: string) => {
    const node = data.nodes[nodeId];
    if (!node || !node.parentId) return;
    return addChild(node.parentId, node.type);
  }, [data.nodes, addChild]);

  const deleteNode = useCallback((id: string) => {
    if (id === data.rootId) return;
    const node = getNode(id);
    if (!node) return;
    const toDelete = new Set<string>();
    const collect = (nid: string) => { toDelete.add(nid); getNode(nid)?.children.forEach(collect); };
    collect(id);
    setData(prev => {
      const nextNodes = { ...prev.nodes };
      toDelete.forEach(did => delete nextNodes[did]);
      if (node.parentId && nextNodes[node.parentId]) {
        nextNodes[node.parentId] = { ...nextNodes[node.parentId], children: nextNodes[node.parentId].children.filter(c => c !== id) };
      }
      return { ...prev, nodes: nextNodes };
    });
    if (selectedId === id) setSelectedId(null);
  }, [getNode, data.rootId, selectedId]);

  const toggleCollapsed = useCallback((id: string) => {
    const node = getNode(id);
    if (!node || node.children.length === 0) return;
    updateNode(id, { collapsed: !node.collapsed });
  }, [getNode, updateNode]);

  /* ── AI Expand ── */

  const handleAiExpand = useCallback(async (nodeId: string, mode: 'expand' | 'breakdown' = 'expand') => {
    const node = getNode(nodeId);
    if (!node) return;
    setAiLoading(nodeId);
    setContextMenu(null);
    try {
      const parentText = data.nodes[node.parentId || '']?.text || '根节点';
      const children = await aiExpand(node.text, parentText, mode);
      children.forEach(childText => {
        const newId = generateId();
        setData(prev => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: { ...prev.nodes[nodeId], children: [...prev.nodes[nodeId].children, newId], collapsed: false },
            [newId]: createNode(nodeId, childText, mode === 'breakdown' ? 'task' : 'feature'),
          },
        }));
      });
    } catch (e) {
      console.error('AI Expand failed:', e);
    } finally {
      setAiLoading(null);
    }
  }, [getNode, data.nodes]);

  /* ── Convert to Task ── */

  const handleConvertToTask = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    if (!node || !onAddTask) return;
    onAddTask({
      title: node.text,
      completed: false,
      date: taskDate,
      tag: taskTag,
      time: '',
      duration: 60,
      projectId: '',
      pomodoros: 0,
      importance: node.priority === 'high' ? 'important' as const : 'normal' as const,
      urgency: 'normal' as const,
      deadline: taskDate,
      pinned: false,
      checklistId: '',
      contexts: [],
      notes: `从思维导图节点「${node.text}」转换`,
    });
    updateNode(nodeId, { linkedTaskId: `linked-${Date.now()}` });
    setContextMenu(null);
  }, [getNode, onAddTask, taskDate, taskTag, updateNode]);

  /* ── Attachment ── */

  const handleAddAttachment = useCallback((nodeId: string) => {
    if (!attachUrl.trim()) return;
    const url = attachUrl.trim();
    let type: MindMapNodeAttachment['type'] = 'link';
    if (/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(url)) type = 'image';
    else if (/\.pdf(\?|$)/i.test(url)) type = 'pdf';
    else if (/\.md(\?|$)/i.test(url)) type = 'markdown';

    updateNode(nodeId, {
      attachments: [...(getNode(nodeId)?.attachments || []), {
        id: generateId(), type, url,
        name: url.split('/').pop()?.split('?')[0] || url.slice(0, 30),
      }],
    });
    setAttachUrl('');
  }, [attachUrl, getNode, updateNode]);

  const handleRemoveAttachment = useCallback((nodeId: string, attId: string) => {
    const node = getNode(nodeId);
    if (!node) return;
    updateNode(nodeId, { attachments: node.attachments.filter(a => a.id !== attId) });
  }, [getNode, updateNode]);

  /* ── Layout ── */

  const NODE_W = 150;
  const NODE_H = 48;
  const GAP_X = 60;
  const GAP_Y = 18;

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
      let childY = startY, totalH = 0;
      for (const childId of node.children) {
        const h = layout(childId, startX + NODE_W + GAP_X, childY);
        childY += h;
        totalH += h;
      }
      pos[nodeId] = { x: startX, y: startY + totalH / 2 - NODE_H / 2 };
      return Math.max(totalH, NODE_H + GAP_Y);
    };
    layout(data.rootId, 50, 50);
    return pos;
  }, [data, getNode]);

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
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.round(Math.max(0.2, Math.min(2.5, s + delta)) * 100) / 100);
  }, []);

  const zoomIn = () => setScale(s => Math.min(s + 0.1, 2.5));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.2));
  const resetView = () => { setScale(0.85); setOffset({ x: 100, y: 80 }); };

  /* ── Keyboard ── */

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingId) return;
    if (!selectedId) return;
    const key = e.key;
    e.preventDefault();
    if (key === 'Tab') addChild(selectedId);
    else if (key === 'Enter') addSibling(selectedId);
    else if (key === 'Delete' || key === 'Backspace') deleteNode(selectedId);
    else if (key === 'F2') {
      const n = getNode(selectedId);
      if (n) { setEditingId(selectedId); setEditText(n.text); }
    } else if (key === ' ') toggleCollapsed(selectedId);
    else if (key === 'e' && e.metaKey) handleAiExpand(selectedId, 'expand');
  }, [selectedId, editingId, addChild, addSibling, deleteNode, getNode, toggleCollapsed, handleAiExpand]);

  /* ── Export ── */

  const exportPNG = useCallback(async () => {
    if (!containerRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvasW, canvasH);

    connections.forEach(({ from, to }) => {
      const p1 = positions[from], p2 = positions[to];
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

    ctx.globalAlpha = 1;
    Object.entries(positions).forEach(([id, p]) => {
      const node = getNode(id);
      if (!node) return;
      const isRoot = id === data.rootId;
      const typeCfg = TYPE_CONFIG[node.type];
      ctx.fillStyle = isRoot ? theme.accent : theme.nodeBg;
      ctx.strokeStyle = isRoot ? theme.accent : typeCfg.border;
      ctx.lineWidth = isRoot ? 0 : 1.5;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, NODE_W, NODE_H, 10);
      ctx.fill();
      if (!isRoot) ctx.stroke();
      ctx.fillStyle = isRoot ? '#ffffff' : '#e4e5e7';
      ctx.font = `500 ${isRoot ? 13 : 11}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.text.slice(0, 16), p.x + NODE_W / 2, p.y + NODE_H / 2);
    });

    const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mindmap.png'; a.click();
    URL.revokeObjectURL(url);
  }, [canvasW, canvasH, positions, connections, data.rootId, getNode, theme]);

  /* ── Selected node detail ── */
  const selectedNode = selectedId ? getNode(selectedId) : null;

  return (
    <div className="h-full flex min-w-0" onKeyDown={handleKeyDown} tabIndex={0} style={{ minHeight: '60vh' }}>
      {/* ── Main canvas area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-2 px-1" data-mm-toolbar="true">
          <div>
            <h2 className="text-lg font-bold text-[var(--app-text)]">AI 项目导图</h2>
            <p className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
              Tab 子节点 · Enter 同级 · ⌘E AI扩展 · 右键更多
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* Theme dots */}
            {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((k) => (
              <button
                key={k}
                onClick={() => setThemeKey(k)}
                className={themeKey === k ? 'w-5 h-5 rounded-full border-2 border-[var(--app-accent)] scale-110' : 'w-5 h-5 rounded-full border border-[var(--app-border)] opacity-60 hover:opacity-100'}
                style={{ background: THEMES[k].rootGradient }}
                title={k}
              />
            ))}
            <div className="w-px h-5 bg-[var(--app-border)] mx-1" />
            <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]" title="放大"><ZoomIn size={16} /></button>
            <span className="text-[11px] text-[var(--app-text-muted)] tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]" title="缩小"><ZoomOut size={16} /></button>
            <button onClick={resetView} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]" title="重置"><Maximize size={16} /></button>
            <button onClick={exportPNG} className="p-1.5 rounded-lg hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]" title="导出"><Download size={16} /></button>
            <div className="w-px h-5 bg-[var(--app-border)] mx-1" />
            <button onClick={() => setShowDetail(!showDetail)} className={cn('p-1.5 rounded-lg transition-all text-xs', showDetail ? 'bg-[var(--app-accent)]/15 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}>
              {showDetail ? <X size={16} /> : <Bookmark size={16} />}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 rounded-xl border border-[var(--app-border)] overflow-hidden relative select-none w-full h-full"
          style={{ backgroundColor: theme.bg, cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div className="mindmap-scene absolute"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', width: canvasW, height: canvasH }}>
            {/* SVG connections */}
            <svg className="absolute inset-0 pointer-events-none" width={canvasW} height={canvasH}>
              {connections.map(({ from, to }) => {
                const p1 = positions[from], p2 = positions[to];
                if (!p1 || !p2) return null;
                const x1 = p1.x + NODE_W, y1 = p1.y + NODE_H / 2;
                const x2 = p2.x, y2 = p2.y + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                return <path key={`${from}-${to}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={theme.lineColor} strokeWidth={2} opacity={0.35} />;
              })}
            </svg>

            {/* Nodes */}
            {Object.entries(positions).map(([id, pos]) => {
              const node = getNode(id);
              if (!node) return null;
              const isRoot = id === data.rootId;
              const isSelected = id === selectedId;
              const isEditing = id === editingId;
              const isLoading = aiLoading === id;
              const hasChildren = node.children.length > 0;
              const typeCfg = TYPE_CONFIG[node.type];

              return (
                <div key={id} data-mm-node="true" className="absolute group" style={{ left: pos.x, top: pos.y, width: NODE_W }}>
                  {/* Collapse toggle */}
                  {hasChildren && (
                    <button onClick={(e) => { e.stopPropagation(); toggleCollapsed(id); }}
                      className={cn('absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border shadow-sm flex items-center justify-center z-10 transition-all hover:scale-110',
                        isRoot ? 'bg-white border-white/30 text-[var(--app-accent)]' : 'bg-[#1a1b23] border-[var(--app-border)] text-[var(--app-text-muted)]')}
                    >
                      <ChevronDown size={10} className={cn('transition-transform', node.collapsed && '-rotate-90')} />
                    </button>
                  )}

                  {/* AI loading spinner */}
                  {isLoading && (
                    <div className="absolute -right-8 top-1/2 -translate-y-1/2 z-30">
                      <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Node card */}
                  <div
                    className={cn('rounded-xl border px-3 py-2.5 transition-all duration-200 cursor-pointer shadow-sm',
                      isRoot ? 'text-white border-transparent' : isSelected ? 'ring-1 ring-[var(--app-accent)] shadow-md' : 'hover:shadow-md hover:-translate-y-0.5',
                    )}
                    style={{
                      background: isRoot ? theme.rootGradient : theme.nodeBg,
                      borderColor: isRoot ? 'transparent' : isSelected ? 'var(--app-accent)' : typeCfg.border,
                      borderLeftWidth: isRoot ? 0 : 3,
                      borderLeftColor: typeCfg.border,
                      minHeight: NODE_H,
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}
                    onDoubleClick={(e) => { e.stopPropagation(); toggleCollapsed(id); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, nodeId: id }); }}
                  >
                    {isEditing ? (
                      <input ref={inputRef} value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onBlur={() => { if (editText.trim()) updateNode(id, { text: editText.trim() }); setEditingId(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { if (editText.trim()) updateNode(id, { text: editText.trim() }); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                        className="w-full text-xs font-semibold bg-transparent outline-none border-b border-white/20 pb-0.5 text-center"
                        style={{ color: isRoot ? '#fff' : '#e4e5e7' }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!isRoot && <typeCfg.icon size={12} style={{ color: typeCfg.border, flexShrink: 0 }} />}
                        {node.icon && <span className="text-xs shrink-0">{node.icon}</span>}
                        <span className={cn('text-[11px] font-medium truncate leading-tight', isRoot ? 'text-white' : '')}
                          style={{ color: isRoot ? undefined : '#e4e5e7' }}>
                          {node.text}
                        </span>
                        {node.linkedTaskId && <ListChecks size={10} className="text-green-400 shrink-0" />}
                        {node.attachments.length > 0 && <Paperclip size={10} className="text-[var(--app-text-muted)] shrink-0" />}
                      </div>
                    )}
                    {hasChildren && node.collapsed && (
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0 rounded-full text-[9px] font-medium"
                        style={{ background: theme.accent + '20', color: theme.accent }}>
                        +{node.children.length}
                      </div>
                    )}
                  </div>

                  {/* Hover quick actions */}
                  {isSelected && !isEditing && (
                    <div className="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
                      <button onClick={(e) => { e.stopPropagation(); addChild(id); }}
                        className="w-6 h-6 rounded-full bg-[#1a1b23] border border-[var(--app-border)] flex items-center justify-center shadow-sm hover:scale-110 hover:border-[var(--app-accent)] transition-all opacity-0 group-hover:opacity-100"
                      ><Plus size={11} className="text-[var(--app-accent)]" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleAiExpand(id, 'expand'); }}
                        className="w-6 h-6 rounded-full bg-[#1a1b23] border border-purple-500/30 flex items-center justify-center shadow-sm hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                      ><Sparkles size={11} className="text-purple-400" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hint */}
          <div className="absolute left-3 bottom-3 text-[10px] text-[var(--app-text-muted)] bg-[#1a1b23]/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] z-10">
            右键节点 · AI扩展 · 转为任务
          </div>
        </div>
      </div>

      {/* ── Right Side Panel (detail) ── */}
      {showDetail && selectedNode && (
        <div className="w-72 border-l border-[var(--app-border)] bg-[#0f1117] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-[var(--app-border)]">
            <h3 className="text-sm font-semibold text-[var(--app-text)] mb-3">节点详情</h3>
            <p className="text-xs text-[var(--app-text)] font-medium mb-3">{selectedNode.text}</p>

            {/* Type selector */}
            <div className="mb-3">
              <p className="text-[10px] text-[var(--app-text-muted)] uppercase mb-1.5">类型</p>
              <div className="grid grid-cols-3 gap-1">
                {NODE_TYPES.map(t => {
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <button key={t} onClick={() => updateNode(selectedNode.id, { type: t })}
                      className={cn('flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all border',
                        selectedNode.type === t ? 'text-white' : 'text-[var(--app-text-muted)] border-transparent hover:border-[var(--app-border)]')}
                      style={{ background: selectedNode.type === t ? cfg.border : 'transparent', borderColor: selectedNode.type === t ? cfg.border : undefined }}>
                      <cfg.icon size={10} />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div className="mb-3">
              <p className="text-[10px] text-[var(--app-text-muted)] uppercase mb-1.5">优先级</p>
              <div className="flex gap-1">
                {([
                  { k: 'high' as const, l: '高', c: '#ef4444' },
                  { k: 'medium' as const, l: '中', c: '#f59e0b' },
                  { k: 'low' as const, l: '低', c: '#22c55e' },
                ]).map(p => (
                  <button key={p.k} onClick={() => updateNode(selectedNode.id, { priority: p.k })}
                    className={cn('flex-1 py-1 rounded text-[10px] font-medium transition-all',
                      selectedNode.priority === p.k ? 'text-white' : 'text-[var(--app-text-muted)] border border-[var(--app-border)]')}
                    style={{ background: selectedNode.priority === p.k ? p.c : 'transparent' }}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-3">
              <p className="text-[10px] text-[var(--app-text-muted)] uppercase mb-1.5">附件</p>
              <div className="flex gap-1 mb-2">
                <input value={attachUrl} onChange={e => setAttachUrl(e.target.value)} placeholder="粘贴链接..."
                  className="flex-1 text-[10px] bg-[#1a1b23] rounded px-2 py-1 border border-[var(--app-border)] text-[var(--app-text)] outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleAddAttachment(selectedNode.id)} />
                <button onClick={() => handleAddAttachment(selectedNode.id)}
                  className="px-2 py-1 bg-[var(--app-accent)] text-white rounded text-[10px] font-medium">+</button>
              </div>
              {selectedNode.attachments.length > 0 && (
                <div className="space-y-1">
                  {selectedNode.attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-[#1a1b23] border border-[var(--app-border)] group">
                      {a.type === 'image' ? <Image size={10} className="text-blue-400" /> :
                       a.type === 'link' ? <Link2 size={10} className="text-cyan-400" /> :
                       <File size={10} className="text-[var(--app-text-muted)]" />}
                      <a href={a.url} target="_blank" rel="noopener" className="flex-1 truncate text-[var(--app-text-secondary)] hover:text-[var(--app-accent)]">{a.name}</a>
                      <button onClick={() => handleRemoveAttachment(selectedNode.id, a.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Convert to task */}
            {onAddTask && (
              <div className="border-t border-[var(--app-border)] pt-3 mt-3">
                <p className="text-[10px] text-[var(--app-text-muted)] uppercase mb-2">转为日程任务</p>
                <div className="flex gap-1 mb-2">
                  <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)}
                    className="flex-1 text-[10px] bg-[#1a1b23] rounded px-2 py-1 border border-[var(--app-border)] text-[var(--app-text)]" />
                  <select value={taskTag} onChange={e => setTaskTag(e.target.value)}
                    className="text-[10px] bg-[#1a1b23] rounded px-2 py-1 border border-[var(--app-border)] text-[var(--app-text)]">
                    {Object.entries(tags).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <button onClick={() => handleConvertToTask(selectedNode.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all text-white"
                  style={{ background: 'var(--app-accent)' }}>
                  <ListChecks size={12} />转为任务
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Context menu ── */}
      {contextMenu && (() => {
        const ctxNode = getNode(contextMenu.nodeId);
        return (
          <div className="absolute z-50 rounded-xl bg-[#1a1b23] border border-[var(--app-border)] shadow-2xl p-1 min-w-[160px] animate-in fade-in zoom-in-95 origin-top-left"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}>
            <MenuItem icon={Plus} label="添加子节点" onClick={() => { addChild(contextMenu.nodeId); setContextMenu(null); }} />
            <MenuItem icon={Copy} label="添加同级" onClick={() => { addSibling(contextMenu.nodeId); setContextMenu(null); }} />
            <div className="h-px bg-[var(--app-border)] my-1" />
            <MenuItem icon={Sparkles} label="✨ AI 扩展子节点" accent onClick={() => handleAiExpand(contextMenu.nodeId, 'expand')} />
            <MenuItem icon={ListChecks} label="🤖 AI 拆解为任务" accent onClick={() => handleAiExpand(contextMenu.nodeId, 'breakdown')} />
            <div className="h-px bg-[var(--app-border)] my-1" />
            {/* Type change sub-menu */}
            <div className="px-3 py-1.5 text-[10px] text-[var(--app-text-muted)]">更改类型</div>
            <div className="grid grid-cols-3 gap-0.5 px-1 pb-1">
              {NODE_TYPES.map(t => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button key={t} onClick={() => { updateNode(contextMenu.nodeId, { type: t }); setContextMenu(null); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] hover:bg-[var(--app-surface-hover)] text-[var(--app-text-muted)]"
                  ><cfg.icon size={10} style={{ color: cfg.border }} />{cfg.label}</button>
                );
              })}
            </div>
            {onAddTask && ctxNode && (
              <>
                <div className="h-px bg-[var(--app-border)] my-1" />
                <MenuItem icon={ExternalLink} label="📋 转为日程任务" onClick={() => {
                  setTaskDate(new Date().toISOString().slice(0, 10));
                  setTaskTag(ctxNode.type === 'bug' ? 'important' : 'work');
                  handleConvertToTask(contextMenu.nodeId);
                }} />
              </>
            )}
            {contextMenu.nodeId !== data.rootId && (
              <>
                <div className="h-px bg-[var(--app-border)] my-1" />
                <MenuItem icon={Trash2} label="删除节点" danger onClick={() => { deleteNode(contextMenu.nodeId); setContextMenu(null); }} />
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Context menu item ─── */
function MenuItem({ icon: Icon, label, onClick, accent, danger }: {
  icon: React.ElementType; label: string; onClick: () => void; accent?: boolean; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn('flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg transition-all',
        danger ? 'text-red-400 hover:bg-red-500/10' : accent ? 'text-purple-400 hover:bg-purple-500/10' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]')}>
      <Icon size={13} />{label}
    </button>
  );
}
