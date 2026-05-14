import { useState, useEffect } from 'react';
import { X, CloudDownload } from 'lucide-react';

const STORAGE_KEY = 'sunsama-last-backup-reminder';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface BackupReminderProps {
  onOpenSync: () => void;
}

export function BackupReminder({ onOpenSync }: BackupReminderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (!last || now - parseInt(last, 10) > WEEK_MS) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-3 right-3 bottom-20 z-50 mx-auto max-w-[560px] px-4 py-2.5 rounded-xl border border-[var(--app-accent)]/20 bg-[var(--app-surface)]/95 shadow-lg backdrop-blur flex items-center gap-3 text-xs md:left-1/2 md:right-auto md:top-3 md:bottom-auto md:-translate-x-1/2 md:w-[560px]">
      <CloudDownload size={14} className="text-[var(--app-accent)] shrink-0" />
      <span className="text-[var(--app-text-secondary)] flex-1">
        建议定期导出备份数据，防止浏览器清理导致数据丢失
      </span>
      <button
        onClick={() => { dismiss(); onOpenSync(); }}
        className="px-3 py-1 rounded-lg bg-[var(--app-accent)] text-white text-[10px] font-medium hover:bg-[var(--app-accent-hover)] transition-all shrink-0"
      >
        去备份
      </button>
      <button
        onClick={dismiss}
        className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
