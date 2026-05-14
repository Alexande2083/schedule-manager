import { useState } from 'react';
import { X, Sun, Moon, Check, Palette, Tag, Plus, Trash2, Type, Monitor } from 'lucide-react';
import type { ThemeColor } from '@/types';
import type { FontSize } from '@/hooks/useFontSize';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#14b8a6',
];

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
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
  { id: 'rose', name: '玫瑰', description: '浪漫玫瑰粉', previewColor: '#ec4899' },
  { id: 'sky', name: '天蓝', description: '明亮天空蓝', previewColor: '#3b82f6' },
  { id: 'sunset', name: '落日', description: '活力落日橙', previewColor: '#f97316' },
];

export function ThemeSettings({
  isOpen, onClose,
}: ThemeSettingsProps) {
  const colorScheme = useAppStore(s => s.theme.colorScheme);
  const isDark = useAppStore(s => s.theme.isDark);
  const setTheme = useAppStore(s => s.setTheme);
  const tags = useAppStore(s => s.tags);
  const setTags = useAppStore(s => s.setTags);
  const fontSize = useAppStore(s => s.fontSize);
  const setFontSize = useAppStore(s => s.setFontSize);
  const [activeTab, setActiveTab] = useState<'theme' | 'tags'>('theme');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagKey, setNewTagKey] = useState('');

  if (!isOpen) return null;

  const handleColorChange = (tagKey: string, color: string) => {
    setTags({
      ...tags,
      [tagKey]: { ...tags[tagKey], color },
    });
  };

  const handleAddTag = () => {
    if (!newTagKey.trim() || !newTagLabel.trim()) return;
    if (tags[newTagKey.trim()]) return;
    setTags({
      ...tags,
      [newTagKey.trim()]: { label: newTagLabel.trim(), color: PRESET_COLORS[Object.keys(tags).length % PRESET_COLORS.length] },
    });
    setNewTagKey('');
    setNewTagLabel('');
  };

  const handleDeleteTag = (tagKey: string) => {
    const next = { ...tags };
    delete next[tagKey];
    setTags(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)]">
      <div className="glass-panel bg-[var(--app-surface)] rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col border border-[var(--app-border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-[var(--app-accent)]" />
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
                ? 'border-[var(--app-accent)] text-[var(--app-accent)]'
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
                ? 'border-[var(--app-accent)] text-[var(--app-accent)]'
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
                      onClick={() => setFontSize(opt.key)}
                      className={cn(
                        'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                        fontSize === opt.key
                          ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
                          : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark mode toggle */}
              <div>
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3 flex items-center gap-2">
                  <Monitor size={14} />
                  显示模式
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (isDark) setTheme(prev => ({ ...prev, isDark: false })); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-1',
                      !isDark
                        ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:text-[var(--app-text)]'
                    )}
                  >
                    <Sun size={16} />
                    亮色
                  </button>
                  <button
                    onClick={() => { if (!isDark) setTheme(prev => ({ ...prev, isDark: true })); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex-1',
                      isDark
                        ? 'bg-[var(--app-accent)] text-white border-[var(--app-accent)]'
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
                <h4 className="text-sm font-medium text-[var(--app-text)] mb-3 flex items-center gap-2">
                  <Palette size={14} />
                  配色方案
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setTheme(prev => ({ ...prev, colorScheme: option.id }))}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        colorScheme === option.id
                          ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/5'
                          : 'border-[var(--app-border)] hover:border-[var(--app-accent)]/30'
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
                        <Check size={16} className="text-[var(--app-accent)] ml-auto shrink-0" />
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
                      <div className="flex gap-1.5 flex-wrap items-center">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => handleColorChange(key, c)}
                            className={cn(
                              'w-6 h-6 rounded-full transition-all',
                              tag.color === c ? 'ring-2 ring-offset-1 ring-[var(--app-text)] scale-110' : 'hover:scale-110'
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
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2">
                  <input
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    placeholder="key"
                    className="min-w-0 text-xs bg-[var(--app-surface)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] placeholder:text-[var(--app-text-placeholder)]"
                  />
                  <input
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="显示名称"
                    className="min-w-0 text-xs bg-[var(--app-surface)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] placeholder:text-[var(--app-text-placeholder)]"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTagKey.trim() || !newTagLabel.trim()}
                    className="w-9 h-8 inline-flex items-center justify-center rounded-lg bg-[var(--app-accent)] text-white text-xs font-medium hover:bg-[var(--app-accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
