import { useState, useRef, useEffect } from 'react';
import { Cloud, Upload, Download, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

export function SyncFAB() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'idle' | 'upload' | 'download'>('idle');
  const [status, setStatus] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Read store data for upload
  const tasks = useAppStore(s => s.tasks);
  const tags = useAppStore(s => s.tags);
  const projects = useAppStore(s => s.projects);
  const checklists = useAppStore(s => s.checklists);
  const contexts = useAppStore(s => s.contexts);
  const perspectives = useAppStore(s => s.perspectives);
  const theme = useAppStore(s => s.theme);
  const selectedDate = useAppStore(s => s.selectedDate);

  // Store setters for download restore
  const setTasks = useAppStore(s => s.setTasks);
  const setTags = useAppStore(s => s.setTags);
  const setProjects = useAppStore(s => s.setProjects);
  const setChecklists = useAppStore(s => s.setChecklists);
  const setContexts = useAppStore(s => s.setContexts);
  const setPerspectives = useAppStore(s => s.setPerspectives);
  const setTheme = useAppStore(s => s.setTheme);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getWebDAVConfig = () => {
    const raw = localStorage.getItem('sunsama-webdav');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const handleUpload = async () => {
    const config = getWebDAVConfig();
    if (!config) { setStatus('请先在设置→坚果云中配置 WebDAV'); return; }
    setLoading('upload');
    setStatus('正在上传...');
    try {
      const payload = {
        version: 2,
        exportDate: new Date().toISOString(),
        tasks, tags, projects, checklists, contexts, perspectives, theme, selectedDate,
      };
      const res = await fetch('/api/webdav/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, content: JSON.stringify(payload) }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('上传成功 ✓');
        setTimeout(() => { setOpen(false); setStatus(null); }, 1500);
      } else {
        setStatus(data.error || '上传失败');
      }
    } catch {
      setStatus('网络错误');
    } finally {
      setLoading('idle');
    }
  };

  const handleDownload = async () => {
    const config = getWebDAVConfig();
    if (!config) { setStatus('请先在设置→坚果云中配置 WebDAV'); return; }
    setLoading('download');
    setStatus('正在下载...');
    try {
      const res = await fetch('/api/webdav/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.exists && data.data) {
        if (!window.confirm('从坚果云恢复数据？当前数据将被覆盖。')) {
          setStatus(null); setLoading('idle'); return;
        }
        const d = data.data;
        if (d.tasks) setTasks(d.tasks);
        if (d.tags) setTags(d.tags);
        if (d.projects) setProjects(d.projects);
        if (d.checklists) setChecklists(d.checklists);
        if (d.contexts) setContexts(d.contexts);
        if (d.perspectives) setPerspectives(d.perspectives);
        if (d.theme) setTheme(d.theme);
        setStatus('下载成功 ✓');
        setTimeout(() => { setOpen(false); setStatus(null); }, 1500);
      } else {
        setStatus('云端暂无备份');
      }
    } catch {
      setStatus('网络错误');
    } finally {
      setLoading('idle');
    }
  };

  return (
    <div ref={ref} className="fixed bottom-36 right-4 z-50 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
      {/* Menu */}
      {open && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-raised)] shadow-lg animate-fade-in">
          <button
            onClick={handleUpload}
            disabled={loading !== 'idle'}
            className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
          >
            <Upload size={16} className="text-[var(--color-brand)]" />
            <span>上传数据</span>
            {loading === 'upload' && <span className="text-xs text-[var(--color-text-muted)] animate-pulse">···</span>}
          </button>
          <div className="h-px bg-[var(--color-border)] mx-3" />
          <button
            onClick={handleDownload}
            disabled={loading !== 'idle'}
            className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
          >
            <Download size={16} className="text-[var(--color-success)]" />
            <span>下载数据</span>
            {loading === 'download' && <span className="text-xs text-[var(--color-text-muted)] animate-pulse">···</span>}
          </button>
          {status && (
            <>
              <div className="h-px bg-[var(--color-border)] mx-3" />
              <div className="px-5 py-2 text-xs text-[var(--color-text-muted)]">{status}</div>
            </>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
          open
            ? 'bg-[var(--color-text-muted)] text-white rotate-90'
            : 'bg-[var(--color-brand)] text-white hover:scale-105 hover:shadow-xl'
        )}
        title="坚果云同步"
      >
        {open ? <X size={20} /> : <Cloud size={20} />}
      </button>
    </div>
  );
}
