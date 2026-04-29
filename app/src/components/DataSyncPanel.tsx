import { useState, useRef, useEffect } from 'react';
import {
  Download, Upload, RotateCcw, AlertTriangle, X, Check, FileJson, Link2,
  Copy, CheckCheck, Zap, Loader2, ClipboardCopy, ClipboardPaste,
  CalendarPlus, FileText
} from 'lucide-react';
import { exportTasksToICS, generateWeeklyMarkdown, copyToClipboard } from '@/utils/export';
import LZString from 'lz-string';
import { cn } from '@/lib/utils';
import type { Task, Project } from '@/types';

interface AppDataExport {
  version: number;
  exportDate: string;
  tasks: Task[];
  tags: Record<string, { label: string; color: string }>;
  projects: Project[];
  checklists?: { id: string; name: string; defaultTag: string; order: number; archived: boolean }[];
  contexts?: { id: string; label: string; icon: string; color: string }[];
  perspectives?: { id: string; name: string; icon: string; filters: Record<string, unknown> }[];
  theme: { colorScheme: string; isDark: boolean } | 'light' | 'dark';
  selectedDate: string;
}

interface DataSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: AppDataExport;
  onImport: (data: AppDataExport) => void;
}

type SyncTab = 'url' | 'clipboard' | 'json';

export function DataSyncPanel({ isOpen, onClose, currentData, onImport }: DataSyncPanelProps) {
  const [activeTab, setActiveTab] = useState<SyncTab>('clipboard');
  const [syncUrl, setSyncUrl] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Clipboard sync state
  const [clipboardData, setClipboardData] = useState('');
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [clipboardImportText, setClipboardImportText] = useState('');

  // Default to clipboard tab on open
  useEffect(() => {
    if (isOpen) setActiveTab('clipboard');
  }, [isOpen]);

  // Generate sync URL
  const handleGenerateUrl = () => {
    setLoading(true);
    try {
      const json = JSON.stringify(currentData);
      const compressed = LZString.compressToEncodedURIComponent(json);
      const url = `${window.location.origin}${window.location.pathname}#sync=${compressed}`;
      setSyncUrl(url);
      setUrlCopied(false);
    } catch {
      setImportStatus({ success: false, message: '生成链接失败' });
    }
    setLoading(false);
  };

  const handleCopyUrl = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      urlInputRef.current?.select();
      setImportStatus({ success: false, message: '请手动复制链接' });
    }
  };

  // ===== CLIPBOARD SYNC =====
  const handleCopyToClipboard = async () => {
    try {
      const json = JSON.stringify(currentData);
      const compressed = LZString.compressToBase64(json);
      await navigator.clipboard.writeText(compressed);
      setClipboardCopied(true);
      setClipboardData(compressed.slice(0, 80) + '...');
      setImportStatus({ success: true, message: '数据已复制到剪贴板！可粘贴到微信、邮件、备忘录等' });
      setTimeout(() => setClipboardCopied(false), 2000);
    } catch {
      setImportStatus({ success: false, message: '剪贴板写入失败，请手动复制' });
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setImportStatus({ success: false, message: '剪贴板为空' });
        return;
      }
      handleClipboardImport(text.trim());
    } catch {
      setImportStatus({ success: false, message: '无法读取剪贴板，请手动粘贴到下方输入框' });
    }
  };

  const handleClipboardImport = (text: string) => {
    try {
      let json: string;
      try {
        json = LZString.decompressFromBase64(text);
      } catch {
        json = '';
      }
      if (!json) json = text;
      const data = JSON.parse(json) as AppDataExport;
      if (!data.tasks || !Array.isArray(data.tasks)) throw new Error('无效的数据格式');
      onImport(data);
      setImportStatus({ success: true, message: '剪贴板导入成功！数据已恢复' });
      setClipboardImportText('');
      setTimeout(() => { setImportStatus(null); onClose(); }, 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportStatus({ success: false, message: '导入失败：' + msg });
    }
  };

  // JSON Export
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunsama-backup-${currentData.selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setImportStatus({ success: true, message: 'JSON 导出成功' });
    setTimeout(() => setImportStatus(null), 2000);
  };

  // JSON Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as AppDataExport;
        if (!data.tasks || !Array.isArray(data.tasks)) throw new Error('无效的数据格式');
        onImport(data);
        setImportStatus({ success: true, message: '导入成功！数据已恢复' });
        setTimeout(() => { setImportStatus(null); onClose(); }, 1500);
      } catch {
        setImportStatus({ success: false, message: '文件解析失败，请检查格式' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmJsonImport = () => {
    setShowConfirm(false);
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--app-surface)] rounded-2xl shadow-2xl w-[480px] max-w-[92vw] max-h-[85vh] flex flex-col border border-[var(--app-border)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--app-accent)]" />
            <h3 className="text-base font-semibold text-[var(--app-text)]">数据同步</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pb-3 gap-2 shrink-0">
          <button onClick={() => setActiveTab('clipboard')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', activeTab === 'clipboard' ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]')}>
            <ClipboardCopy size={13} />
            剪贴板同步
          </button>
          <button onClick={() => setActiveTab('url')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', activeTab === 'url' ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]')}>
            <Link2 size={13} />
            链接同步
          </button>
          <button onClick={() => setActiveTab('json')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', activeTab === 'json' ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]')}>
            <FileJson size={13} />
            文件备份
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 min-h-0">
          {/* ===== CLIPBOARD SYNC ===== */}
          {activeTab === 'clipboard' && (
            <>
              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCopy size={14} className="text-[var(--app-accent)]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">复制数据到剪贴板</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3 leading-relaxed">
                  将所有数据压缩后复制到剪贴板，可粘贴到微信、邮件、备忘录、坚果云笔记等任意地方，在另一台设备上粘贴回来即可恢复。
                </p>
                <button onClick={handleCopyToClipboard} disabled={loading} className={cn('w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all', loading ? 'bg-[var(--app-border)] text-[var(--app-text-muted)]' : 'bg-[var(--app-accent)] text-white hover:brightness-110 shadow-sm')}>
                  {clipboardCopied ? <CheckCheck size={14} /> : <ClipboardCopy size={14} />}
                  {clipboardCopied ? '已复制！' : '复制全部数据到剪贴板'}
                </button>
                {clipboardData && (
                  <p className="text-[9px] text-[var(--app-text-muted)] mt-2 font-mono break-all">{clipboardData}</p>
                )}
              </div>

              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardPaste size={14} className="text-[var(--app-accent)]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">从剪贴板恢复</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3">在另一台设备上复制了同步数据？粘贴到下方，一键恢复。</p>
                <div className="flex gap-2 mb-2">
                  <button onClick={handlePasteFromClipboard} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-colors">
                    <ClipboardPaste size={12} />
                    自动粘贴
                  </button>
                </div>
                <textarea
                  value={clipboardImportText}
                  onChange={e => setClipboardImportText(e.target.value)}
                  placeholder="或手动粘贴同步数据到这里..."
                  className="w-full h-20 text-[10px] bg-[var(--app-input-bg)] rounded-lg px-3 py-2 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] resize-none font-mono"
                />
                {clipboardImportText && (
                  <button onClick={() => handleClipboardImport(clipboardImportText)} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[var(--app-accent)] text-white hover:brightness-110 transition-all">
                    <Check size={12} />
                    恢复数据
                  </button>
                )}
              </div>

              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-[10px] text-green-700 leading-relaxed">
                  <span className="font-semibold">推荐同步流程：</span><br />
                  1. 在电脑 A 上点击「复制全部数据到剪贴板」<br />
                  2. 粘贴到微信「文件传输助手」或坚果云笔记<br />
                  3. 在电脑/手机 B 上打开微信，复制那段数据<br />
                  4. 回到本应用，点击「自动粘贴」→「恢复数据」<br />
                  不受任何网络限制，100% 成功。
                </p>
              </div>
            </>
          )}

          {/* ===== URL SYNC ===== */}
          {activeTab === 'url' && (
            <>
              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={14} className="text-[var(--app-accent)]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">生成同步链接</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3 leading-relaxed">
                  零成本方案！将所有数据压缩编码到链接中，通过微信/钉钉/邮件分享给另一台设备，点击链接即可自动恢复全部数据。
                </p>
                {!syncUrl ? (
                  <button onClick={handleGenerateUrl} disabled={loading} className={cn('w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all', loading ? 'bg-[var(--app-border)] text-[var(--app-text-muted)]' : 'bg-[var(--app-accent)] text-white hover:brightness-110 shadow-sm')}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    {loading ? '生成中...' : '生成同步链接'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input ref={urlInputRef} value={syncUrl} readOnly className="flex-1 text-[10px] bg-[var(--app-input-bg)] rounded-lg px-3 py-2 outline-none border border-[var(--app-border)] text-[var(--app-text-muted)] truncate" />
                      <button onClick={handleCopyUrl} className={cn('shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1', urlCopied ? 'bg-green-100 text-green-700' : 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]')}>
                        {urlCopied ? <CheckCheck size={13} /> : <Copy size={13} />}
                        {urlCopied ? '已复制' : '复制'}
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--app-text-muted)]">链接已包含全部数据，直接发送给朋友或另一台设备即可</p>
                    <button onClick={() => { setSyncUrl(''); }} className="text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-accent)] transition-colors">重新生成</button>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-[10px] text-blue-700 leading-relaxed"><span className="font-semibold">提示：</span>链接同步完全免费。如果数据量很大，链接会比较长，建议通过微信「收藏」或邮件发送。</p>
              </div>
            </>
          )}

          {/* ===== JSON BACKUP ===== */}
          {activeTab === 'json' && (
            <>
              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <Download size={14} className="text-[var(--app-accent)]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">导出 JSON 备份</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3">将所有数据导出为 JSON 文件。可放入坚果云同步文件夹实现自动云同步。</p>
                <button onClick={handleExportJson} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-colors">
                  <Download size={14} />
                  导出备份文件
                </button>
              </div>

              {/* Export .ICS */}
              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarPlus size={14} className="text-[#7ec9a8]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">导出日历 (.ics)</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3">导出所有带时间的任务为标准日历格式，可导入 Outlook / Google Calendar。</p>
                <button onClick={() => exportTasksToICS(currentData.tasks, currentData.projects)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-colors">
                  <CalendarPlus size={14} />
                  导出 .ics 文件
                </button>
              </div>

              {/* Weekly Markdown Report */}
              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-[#9db3d4]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">Markdown 周报</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3">生成本周任务周报（Markdown 格式），可复制到飞书/钉钉/邮件。</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const md = generateWeeklyMarkdown(currentData.tasks, currentData.projects);
                      await copyToClipboard(md);
                      setImportStatus({ success: true, message: '周报已复制到剪贴板' });
                      setTimeout(() => setImportStatus(null), 2000);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-colors"
                  >
                    <Copy size={14} />
                    复制周报
                  </button>
                  <button
                    onClick={() => {
                      const md = generateWeeklyMarkdown(currentData.tasks, currentData.projects);
                      const blob = new Blob([md], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `weekly-report-${new Date().toISOString().slice(0, 10)}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-colors"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={14} className="text-[var(--app-accent)]" />
                  <span className="text-sm font-medium text-[var(--app-text)]">从 JSON 恢复</span>
                </div>
                <p className="text-[11px] text-[var(--app-text-muted)] mb-3">从之前导出的 JSON 备份文件恢复数据。导入将覆盖当前所有数据。</p>
                <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
                {!showConfirm ? (
                  <button onClick={() => setShowConfirm(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-colors">
                    <Upload size={14} />
                    选择备份文件
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 leading-relaxed">导入将覆盖当前所有数据，不可撤销。建议先导出备份。</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConfirm(false)} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] transition-colors">取消</button>
                      <button onClick={confirmJsonImport} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:brightness-110 transition-colors">
                        <RotateCcw size={12} />
                        确认覆盖
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Status message */}
          {importStatus && (
            <div className={cn('flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium', importStatus.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
              {importStatus.success ? <Check size={14} /> : <AlertTriangle size={14} />}
              {importStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
