import { useState } from 'react';
import {
  Settings, Database, Palette, X, Download, Cloud,
  Sun, Moon, Type,
} from 'lucide-react';
import type { ThemeColor } from '@/types';
import type { FontSize } from '@/hooks/useFontSize';
import { useAppStore } from '@/store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSync: () => void;
  onOpenTheme: () => void;
  onExportArchive?: () => void;
}

type Tab = 'data' | 'theme';

const COLOR_SCHEMES: { id: ThemeColor; name: string; color: string }[] = [
  { id: 'coral', name: 'Coral', color: '#f47268' },
  { id: 'ocean', name: 'Ocean', color: '#38bdf8' },
  { id: 'mint', name: 'Mint', color: '#34d399' },
  { id: 'lavender', name: 'Lavender', color: '#a78bfa' },
  { id: 'amber', name: 'Amber', color: '#fbbf24' },
  { id: 'rose', name: 'Rose', color: '#ec4899' },
  { id: 'sky', name: 'Sky', color: '#3b82f6' },
  { id: 'sunset', name: 'Sunset', color: '#f97316' },
];

export function SettingsModal({
  isOpen, onClose, onOpenSync, onOpenTheme,
  onExportArchive,
}: SettingsModalProps) {
  const colorScheme = useAppStore(s => s.theme.colorScheme);
  const isDark = useAppStore(s => s.theme.isDark);
  const setTheme = useAppStore(s => s.setTheme);
  const fontSize = useAppStore(s => s.fontSize);
  const setFontSize = useAppStore(s => s.setFontSize);
  const [tab, setTab] = useState<Tab>('data');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card border shadow-lg"
        style={{ background: 'var(--color-bg-raised)', borderColor: 'var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: 'var(--color-brand)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>设置</h2>
          </div>
          <button onClick={onClose}
            className="p-1 rounded-btn hover:bg-[var(--color-bg-hover)]"
            style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          <TabButton active={tab === 'data'} onClick={() => setTab('data')} icon={Database}>数据</TabButton>
          <TabButton active={tab === 'theme'} onClick={() => setTab('theme')} icon={Palette}>主题</TabButton>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          {tab === 'data' && (
            <div className="space-y-3">
              <SettingsRow icon={Cloud} title="云同步" desc="同步数据到云端，多设备共享"
                onClick={() => { onOpenSync(); onClose(); }} />
              {onExportArchive && (
                <SettingsRow icon={Download} title="导出归档" desc="导出已完成任务为 JSON 文件"
                  onClick={() => { onExportArchive(); onClose(); }} />
              )}
              <SettingsRow icon={Download} title="导入数据" desc="从 JSON 文件或同步链接恢复数据"
                onClick={() => { onOpenSync(); onClose(); }} />
            </div>
          )}
          {tab === 'theme' && (
            <div className="space-y-4">
              {/* Font size */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Type size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>字体大小</span>
                </div>
                <div className="flex gap-2">
                  {([
                    { key: 'small' as FontSize, label: '小' },
                    { key: 'medium' as FontSize, label: '中' },
                    { key: 'large' as FontSize, label: '大' },
                  ]).map(opt => (
                    <button key={opt.key}
                      onClick={() => setFontSize(opt.key)}
                      className="flex-1 px-3 py-2 rounded-btn text-xs font-medium border transition-all"
                      style={{
                        background: fontSize === opt.key ? 'var(--color-brand)' : 'var(--color-bg)',
                        color: fontSize === opt.key ? '#fff' : 'var(--color-text-secondary)',
                        borderColor: fontSize === opt.key ? 'var(--color-brand)' : 'var(--color-border)',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon size={16} style={{ color: 'var(--color-brand)' }} /> : <Sun size={16} style={{ color: 'var(--color-brand)' }} />}
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>深色模式</span>
                </div>
                <button onClick={() => setTheme(prev => ({ ...prev, isDark: !prev.isDark }))}
                  className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
                  style={{ background: isDark ? 'var(--color-brand)' : 'var(--color-border)' }}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                    style={{ left: isDark ? '22px' : '2px' }} />
                </button>
              </div>
              <div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>配色方案</p>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_SCHEMES.map(s => (
                    <button key={s.id} onClick={() => setTheme(prev => ({ ...prev, colorScheme: s.id }))}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-btn transition-all"
                      style={{
                        background: colorScheme === s.id ? s.color + '18' : 'var(--color-bg)',
                        border: colorScheme === s.id ? `2px solid ${s.color}` : '2px solid var(--color-border)',
                      }}>
                      <div className="w-6 h-6 rounded-full" style={{ background: s.color }} />
                      <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { onOpenTheme(); onClose(); }}
                className="w-full text-center text-[11px] py-2 rounded-btn transition-all"
                style={{ color: 'var(--color-brand)', background: 'var(--color-bg)' }}>
                高级主题设置
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 flex-1 px-6 py-3 text-xs font-medium transition-colors"
      style={{
        color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
        borderBottom: active ? '2px solid var(--color-brand)' : '2px solid transparent',
      }}>
      <Icon size={14} />{children}
    </button>
  );
}

function SettingsRow({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-btn border transition-colors text-left"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <Icon size={18} style={{ color: 'var(--color-brand)' }} />
      <div className="flex-1">
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>{title}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
      </div>
    </button>
  );
}
