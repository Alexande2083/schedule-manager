import { useState } from 'react';
import { X, Sun, Moon, Check, Palette, Tag, Plus, Trash2, Type } from 'lucide-react';
import type { ThemeColor } from '@/types';
import type { FontSize } from '@/hooks/useFontSize';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#d4857a', '#e0b87a', '#7ec9a8', '#9db3d4', '#b8a0d4',
  '#f0a0a0', '#a0d4e0', '#d4a0c0', '#a0c4d4', '#c4d4a0',
  '#e8a87c', '#7cb8e8', '#e87cb8', '#b8e87c', '#e8c47c',
];

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme: ThemeColor;
  onChangeColorScheme: (scheme: ThemeColor) => void;
  isDark: boolean;
  onToggleDark: () => void;
  tags?: Record<string, { label: string; color: string }>;
  onUpdateTags?: (tags: Record<string, { label: string; color: string }>) => void;
  fontSize?: FontSize;
  onChangeFontSize?: (size: FontSize) => void;
  glassOpacity?: number;
  onChangeGlassOpacity?: (opacity: number) => void;
}

interface ThemeOption {
  id: ThemeColor;
  name: string;
  description: string;
  previewColor: string;
}

const themeOptions: ThemeOption[] = [
  { id: 'coral', name: '珊瑚', description: '温暖珊瑚色', previewColor: '#d4857a' },
  { id: 'ocean', name: '海洋', description: '深邃海洋蓝', previewColor: '#4a90d9' },
  { id: 'mint', name: '薄荷', description: '清新薄荷绿', previewColor: '#5abf84' },
  { id: 'lavender', name: '薰衣草', description: '优雅薰衣草', previewColor: '#9b7edc' },
  { id: 'amber', name: '琥珀', description: '经典琥珀金', previewColor: '#d4900a' },
  { id: 'glass', name: '液态玻璃', description: '液态玻璃质感', previewColor: '#8899aa' },
  { id: 'pure-white', name: '纯净白', description: '极简纯净白', previewColor: '#f5f5f7' },
  { id: 'pure-black', name: '暗夜黑', description: '深邃暗夜黑', previewColor: '#1c1c1e' },
];

export function ThemeSettings({
  isOpen, onClose, colorScheme, onChangeColorScheme, isDark, onToggleDark,
  tags = {}, onUpdateTags,
  fontSize = 'medium', onChangeFontSize,
  glassOpacity = 55, onChangeGlassOpacity,
}: ThemeSettingsProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'tags'>('theme');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagKey, setNewTagKey] = useState('');

  if (!isOpen) return null;

  const handleColorChange = (tagKey: string, color: string) => {
    if (!onUpdateTags) return;
    onUpdateTags({
      ...tags,
      [tagKey]: { ...tags[tagKey], color },
    });
  };

  const handleAddTag = () => {
    if (!onUpdateTags || !newTagKey.trim() || !newTagLabel.trim()) return;
    if (tags[newTagKey.trim()]) return;
    onUpdateTags({
      ...tags,
      [newTagKey.trim()]: { label: newTagLabel.trim(), color: PRESET_COLORS[Object.keys(tags).length % PRESET_COLORS.length] },
    });
    setNewTagKey('');
    setNewTagLabel('');
  };

  const handleDeleteTag = (tagKey: string) => {
    if (!onUpdateTags) return;
    const next = { ...tags };
    delete next[tagKey];
    onUpdateTags(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm">
      <div className="glass-panel bg-[var(--app-surface)] rounded-2xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col border border-[var(--app-border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-[#d4857a]" />
            <h3 className="text-base font-semibold text-[var(--app-text)]">个性化设置</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--app-border)] px-5">
          <button
            onClick={() => setActiveTab('theme')}
            className={cn(
              'px-4 py-2.5 text-xs font-medium transition-all border-b-2',
              activeTab === 'theme'
                ? 'border-[#d4857a] text-[#d4857a]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
          >
            主题
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={cn(
              'px-4 py-2.5 text-xs font-medium transition-all border-b-2',
              activeTab === 'tags'
                ? 'border-[#d4857a] text-[#d4857a]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
          >
            标签颜色
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'theme' && (
            <div className="space-y-4">
              {/* Font size */}
              <div>
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3 flex items-center gap-2">
                  <Type size={14} />
                  字体大小
                </h4>
                <div className="flex gap-2">
                  {([
                    { key: 'small' as FontSize, label: '小' },
                    { key: 'medium' as FontSize, label: '中' },
                    { key: 'large' as FontSize, label: '大' },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => onChangeFontSize?.(opt.key)}
                      className={cn(
                        'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        fontSize === opt.key
                          ? 'bg-[#d4857a] text-white border-[#d4857a]'
                          : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glass opacity */}
              <div>
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3 flex items-center gap-2">
                  <Palette size={14} />
                  毛玻璃透明度
                </h4>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={glassOpacity}
                    onChange={(e) => onChangeGlassOpacity?.(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-[var(--app-border)] rounded-full appearance-none cursor-pointer accent-[#d4857a]"
                  />
                  <span className="text-xs font-medium text-[var(--app-text-secondary)] w-10 text-right">
                    {glassOpacity}%
                  </span>
                </div>
              </div>

              {/* Dark mode toggle */}
              <div>
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3">显示模式</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (isDark) onToggleDark(); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-1',
                      !isDark
                        ? 'bg-[#d4857a] text-white border-[#d4857a]'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                    )}
                  >
                    <Sun size={16} />
                    亮色
                  </button>
                  <button
                    onClick={() => { if (!isDark) onToggleDark(); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-1',
                      isDark
                        ? 'bg-[#d4857a] text-white border-[#d4857a]'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                    )}
                  >
                    <Moon size={16} />
                    暗色
                  </button>
                </div>
              </div>

              {/* Color scheme */}
              <div>
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3">配色方案</h4>
                <div className="grid grid-cols-2 gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onChangeColorScheme(option.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        colorScheme === option.id
                          ? 'border-[#d4857a] bg-[#d4857a]/5'
                          : 'border-[var(--app-border)] hover:border-[#d4857a]/30'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg shrink-0"
                        style={{ backgroundColor: option.previewColor }}
                      />
                      <div>
                        <div className="text-sm font-medium text-[var(--app-text)]">{option.name}</div>
                        <div className="text-[11px] text-[var(--app-text-muted)]">{option.description}</div>
                      </div>
                      {colorScheme === option.id && (
                        <Check size={16} className="text-[#d4857a] ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              {/* Existing tags */}
              <div>
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3">标签颜色</h4>
                <div className="space-y-2">
                  {Object.entries(tags).map(([key, tag]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)]"
                    >
                      <Tag size={12} style={{ color: tag.color }} />
                      <span className="text-xs font-medium text-[var(--app-text)] flex-1">{tag.label}</span>

                      {/* Color picker */}
                      <div className="flex gap-1 flex-wrap">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => handleColorChange(key, c)}
                            className={cn(
                              'w-5 h-5 rounded-full transition-all',
                              tag.color === c ? 'ring-2 ring-offset-1 ring-[var(--app-text)]' : 'hover:scale-110'
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => handleDeleteTag(key)}
                        className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add new tag */}
              <div className="p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <h4 className="text-xs font-medium text-[var(--app-text-muted)] mb-2">新建标签</h4>
                <div className="flex gap-2">
                  <input
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    placeholder="key"
                    className="flex-1 text-xs bg-[var(--app-surface)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a] placeholder:text-[var(--app-text-placeholder)]"
                  />
                  <input
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="显示名称"
                    className="flex-1 text-xs bg-[var(--app-surface)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[#d4857a] placeholder:text-[var(--app-text-placeholder)]"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTagKey.trim() || !newTagLabel.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#d4857a] text-white text-xs font-medium hover:bg-[#c97a6e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
