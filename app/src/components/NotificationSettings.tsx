import { useState, useEffect } from 'react';
import {
  Bell, X, Webhook, Mail, Check, Loader2, Settings, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotificationConfig, updateNotificationConfig, testNotification } from '@/utils/api';

interface NotificationConfig {
  email: string;
  webhookUrl: string;
  enabled: boolean;
  remindBeforeMinutes: number;
  remindOnDeadline: boolean;
  dailyDigest: boolean;
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [config, setConfig] = useState<NotificationConfig>({
    email: '',
    webhookUrl: '',
    enabled: false,
    remindBeforeMinutes: 15,
    remindOnDeadline: true,
    dailyDigest: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getNotificationConfig()
        .then(data => {
          setConfig(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateNotificationConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setTestResult(`保存失败: ${err.message}`);
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testNotification();
      setTestResult(res.results?.join('\n') || '测试完成');
    } catch (err: any) {
      setTestResult(`测试失败: ${err.message}`);
    }
    setTestLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel bg-[var(--app-surface)] rounded-2xl shadow-2xl w-[480px] max-h-[92vh] flex flex-col border border-[var(--app-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--app-accent)]" />
            <h3 className="text-base font-semibold text-[var(--app-text)]">通知设置</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[var(--app-text-muted)]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[var(--app-text-muted)]" />
                <span className="text-sm font-medium text-[var(--app-text)]">启用通知</span>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={cn(
                  'w-10 h-6 rounded-full transition-all relative',
                  config.enabled ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm',
                  config.enabled ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block flex items-center gap-1.5">
                <Webhook size={12} />
                Webhook URL（企业微信/钉钉/Slack 等）
              </label>
              <input
                value={config.webhookUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
              />
              <p className="text-[10px] text-[var(--app-text-muted)] mt-1">
                支持企业微信机器人、钉钉自定义机器人、Slack Webhook 等
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-[var(--app-text-muted)] mb-1.5 block flex items-center gap-1.5">
                <Mail size={12} />
                邮箱通知
              </label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
                className="w-full text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
              />
              <p className="text-[10px] text-[var(--app-text-muted)] mt-1">
                需要配置 SMTP 服务器（开发中）
              </p>
            </div>

            {/* Reminder settings */}
            <div className="p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] space-y-3">
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-[var(--app-text-muted)]" />
                <span className="text-xs font-medium text-[var(--app-text)]">提醒设置</span>
              </div>

              {/* Remind before */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[var(--app-text-muted)]" />
                  <span className="text-xs text-[var(--app-text)]">提前提醒</span>
                </div>
                <select
                  value={config.remindBeforeMinutes}
                  onChange={(e) => setConfig(prev => ({ ...prev, remindBeforeMinutes: Number(e.target.value) }))}
                  className="text-xs bg-[var(--app-input-bg)] rounded-lg px-2 py-1.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none"
                >
                  <option value={5}>5分钟</option>
                  <option value={10}>10分钟</option>
                  <option value={15}>15分钟</option>
                  <option value={30}>30分钟</option>
                  <option value={60}>1小时</option>
                </select>
              </div>

              {/* Deadline reminder */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--app-text)]">截止提醒</span>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, remindOnDeadline: !prev.remindOnDeadline }))}
                  className={cn(
                    'w-9 h-5 rounded-full transition-all relative',
                    config.remindOnDeadline ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    config.remindOnDeadline ? 'left-[18px]' : 'left-0.5'
                  )} />
                </button>
              </div>

              {/* Daily digest */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--app-text)]">每日摘要</span>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, dailyDigest: !prev.dailyDigest }))}
                  className={cn(
                    'w-9 h-5 rounded-full transition-all relative',
                    config.dailyDigest ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    config.dailyDigest ? 'left-[18px]' : 'left-0.5'
                  )} />
                </button>
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 whitespace-pre-line">
                {testResult}
              </div>
            )}

            {/* Saved indicator */}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Check size={12} />
                已保存
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-[var(--app-border)]">
          <button
            onClick={handleTest}
            disabled={testLoading || !config.enabled}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-all disabled:opacity-50"
          >
            {testLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> 测试中...
              </span>
            ) : '测试通知'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
