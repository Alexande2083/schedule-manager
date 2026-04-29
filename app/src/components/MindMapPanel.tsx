import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, X, Edit3, ChevronDown, ChevronRight,
  ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindMapNode {
  id: string;
  text: string;
  children: string[];
  parentId: string | null;
  collapsed: boolean;
}

interface MindMapData {
  nodes: Record<string, MindMapNode>;
  rootId: string;
}

const STORAGE_KEY = 'mindmap-data';

function generateId() {
  return 'mm_' + Math.random().toString(36).slice(2, 9);
}

function loadData(): MindMapData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Default data
  const rootId = generateId();
  const defaultData: MindMapData = {
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        text: '日程规划',
        children: [],
        parentId: null,
        collapsed: false,
      },
    },
  };
  return defaultData;
}

function saveData(data: MindMapData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function MindMapPanel() {
  const [data, setData] = useState<MindMapData>(loadData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const getNode = (id: string) => data.nodes[id];

  const updateNode = (id: string, updates: Partial<MindMapNode>) => {
    setData(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], ...updates },
      },
    }));
  };

  const addChild = (parentId: string) => {
    const newId = generateId();
    setData(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [parentId]: {
          ...prev.nodes[parentId],
          children: [...prev.nodes[parentId].children, newId],
          collapsed: false,
        },
        [newId]: {
          id: newId,
          text: '新主题',
          children: [],
          parentId,
          collapsed: false,
        },
      },
    }));
    setSelectedId(newId);
    setEditingId(newId);
    setEditText('新主题');
  };

  const deleteNode = (id: string) => {
    if (id === data.rootId) return; // Can't delete root
    const node = getNode(id);
    if (!node) return;

    // Recursively delete all descendants
    const toDelete = new Set<string>();
    const collect = (nid: string) => {
      toDelete.add(nid);
      getNode(nid)?.children.forEach(collect);
    };
    collect(id);

    setData(prev => {
      const nextNodes = { ...prev.nodes };
      toDelete.forEach(did => delete nextNodes[did]);

      // Remove from parent's children
      if (node.parentId && nextNodes[node.parentId]) {
        nextNodes[node.parentId] = {
          ...nextNodes[node.parentId],
          children: nextNodes[node.parentId].children.filter(c => c !== id),
        };
      }

      return { ...prev, nodes: nextNodes };
    });
    setSelectedId(null);
    setEditingId(null);
  };

  const toggleCollapsed = (id: string) => {
    const node = getNode(id);
    if (node.children.length === 0) return;
    updateNode(id, { collapsed: !node.collapsed });
  };

  const startEdit = (id: string) => {
    const node = getNode(id);
    setEditingId(id);
    setEditText(node.text);
  };

  const finishEdit = () => {
    if (editingId) {
      updateNode(editingId, { text: editText.trim() || '未命名' });
      setEditingId(null);
    }
  };

  // Tree layout calculation (simple recursive)
  const calculateLayout = useCallback((): Record<string, { x: number; y: number }> => {
    const positions: Record<string, { x: number; y: number }> = {};
    const NODE_W = 140;
    const NODE_H = 44;
    const GAP_X = 40;
    const GAP_Y = 20;

    const layout = (nodeId: string, startX: number, startY: number): number => {
      const node = getNode(nodeId);
      if (!node) return NODE_H + GAP_Y;

      // Calculate total height of this subtree
      let subtreeHeight = NODE_H;
      if (!node.collapsed && node.children.length > 0) {
        let childrenHeight = 0;
        for (const childId of node.children) {
          childrenHeight += layout(childId, startX + NODE_W + GAP_X, 0);
        }
        subtreeHeight = Math.max(subtreeHeight, childrenHeight - GAP_Y);
      }

      // Place this node vertically centered in its subtree
      positions[nodeId] = {
        x: startX,
        y: startY + subtreeHeight / 2 - NODE_H / 2,
      };

      if (!node.collapsed && node.children.length > 0) {
        let childY = startY;
        for (const childId of node.children) {
          const childHeight = layout(childId, startX + NODE_W + GAP_X, childY);
          childY += childHeight;
        }
      }

      return subtreeHeight + GAP_Y;
    };

    layout(data.rootId, 50, 50);
    return positions;
  }, [data]);

  const positions = calculateLayout();

  // Build connection lines
  const connections: { from: string; to: string }[] = [];
  const buildConnections = (nodeId: string) => {
    const node = getNode(nodeId);
    if (!node || node.collapsed) return;
    for (const childId of node.children) {
      connections.push({ from: nodeId, to: childId });
      buildConnections(childId);
    }
  };
  buildConnections(data.rootId);

  // Canvas drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).closest('.mindmap-canvas')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
  const handleReset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  // Calculate canvas bounds
  let maxX = 0, maxY = 0;
  Object.values(positions).forEach(p => {
    maxX = Math.max(maxX, p.x + 200);
    maxY = Math.max(maxY, p.y + 100);
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold text-[var(--app-text)]">思维导图</h2>
          <p className="text-sm text-[var(--app-text-muted)] mt-0.5">点击节点编辑，双击展开/折叠，拖拽移动画布</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-[var(--app-text-muted)] w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all"
          >
            <Maximize size={16} />
          </button>
          {selectedId && selectedId !== data.rootId && (
            <>
              <div className="w-px h-5 bg-[var(--app-border)] mx-1" />
              <button
                onClick={() => addChild(selectedId)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#d4857a] text-white text-xs font-medium hover:bg-[#c97a6e] transition-all"
              >
                <Plus size={14} />
                添加子主题
              </button>
              <button
                onClick={() => deleteNode(selectedId)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200 transition-all"
              >
                <X size={14} />
                删除
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="glass-panel flex-1 bg-[var(--app-surface-hover)] rounded-xl border border-[var(--app-border)] overflow-hidden relative cursor-grab active:cursor-grabbing mindmap-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          {/* SVG connections layer */}
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 pointer-events-none"
            width={Math.max(maxX + 100, 1200)}
            height={Math.max(maxY + 100, 800)}
          >
            {connections.map(({ from, to }) => {
              const p1 = positions[from];
              const p2 = positions[to];
              if (!p1 || !p2) return null;
              const x1 = p1.x + 140; // right edge of parent
              const y1 = p1.y + 22; // middle of parent
              const x2 = p2.x; // left edge of child
              const y2 = p2.y + 22; // middle of child
              const midX = (x1 + x2) / 2;
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--app-border)"
                  strokeWidth={1.5}
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
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: 140,
                }}
              >
                <div
                  className={cn(
                    'group relative rounded-xl border px-3 py-2.5 transition-all cursor-pointer select-none',
                    isRoot
                      ? 'bg-[#d4857a] border-[#d4857a] text-white shadow-md'
                      : isSelected
                        ? 'bg-[var(--app-surface)] border-[#d4857a] shadow-md ring-1 ring-[#d4857a]/30'
                        : 'bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-accent)]/40 hover:shadow-sm',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) toggleCollapsed(id);
                  }}
                >
                  {/* Collapse toggle */}
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapsed(id);
                      }}
                      className={cn(
                        'absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all border',
                        isRoot
                          ? 'bg-white text-[#d4857a] border-[#d4857a]'
                          : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                      )}
                    >
                      {node.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}

                  {/* Edit button */}
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(id);
                      }}
                      className={cn(
                        'absolute -right-2 -top-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border shadow-sm',
                        isRoot
                          ? 'bg-white text-[#d4857a] border-[#d4857a]'
                          : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                      )}
                    >
                      <Edit3 size={10} />
                    </button>
                  )}

                  {/* Text / Input */}
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={finishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishEdit();
                        if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className={cn(
                        'w-full text-xs font-medium bg-transparent outline-none border-b border-[var(--app-accent)] pb-0.5',
                        isRoot ? 'text-white placeholder-white/50' : 'text-[var(--app-text)]'
                      )}
                    />
                  ) : (
                    <span className={cn(
                      'text-xs font-medium break-words leading-snug',
                      isRoot ? 'text-white' : 'text-[var(--app-text)]'
                    )}>
                      {node.text}
                    </span>
                  )}

                  {/* Child count badge */}
                  {hasChildren && node.collapsed && (
                    <span className={cn(
                      'ml-1.5 text-[10px] px-1 py-0 rounded-full',
                      isRoot ? 'bg-white/20 text-white' : 'bg-[var(--app-border)] text-[var(--app-text-muted)]'
                    )}>
                      {node.children.length}
                    </span>
                  )}
                </div>

                {/* Add child button (visible on hover when selected) */}
                {isSelected && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addChild(id);
                    }}
                    className="absolute -right-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text-muted)] hover:text-[#d4857a] hover:border-[#d4857a] transition-all shadow-sm"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="absolute bottom-3 left-3 text-[10px] text-[var(--app-text-muted)] bg-[var(--app-surface)]/80 px-2 py-1 rounded-lg border border-[var(--app-border)]">
          拖拽移动 · 滚轮缩放 · 点击选中 · 双击折叠 · 编辑按钮修改
        </div>
      </div>
    </div>
  );
}
