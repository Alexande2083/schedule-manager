import { useState } from 'react';
import { X, Sparkles, Loader2, Plus, Check, AlertTriangle, Trash2, Edit3 } from 'lucide-react';
import { useAppStore } from '@/store';
import { getToday } from '@/utils/date';
import { cn } from '@/lib/utils';

// 后端代理地址 — 开发时由 Vite 代理，生产时同域
const API_BASE = '';

interface AIParserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTask {
  title: string;
  date: string;
  time?: string;
  duration: number;
  tag: string;
  importance: 'important' | 'normal';
  urgency: 'urgent' | 'normal';
  deadline?: string;
  projectId?: string;
  selected: boolean;
}

const SYSTEM_PROMPT = `你是一个任务提取助手。请分析用户粘贴的通知/会议纪要/工作安排文本，提取所有明确的任务事项。

要求：
1. 提取每个具体任务，忽略寒暄语、背景描述等非任务内容
2. 如果文本中有明确的时间，提取为 date (YYYY-MM-DD) 和 time (HH:MM)
3. 如果没有明确日期，使用默认日期
4. 根据任务性质判断 importance(important/normal) 和 urgency(urgent/normal)
5. 根据内容判断最合适的 tag：work(工作事项), meeting(会议), important(重要任务), personal(个人事务)
6. 如果有明确的截止日期，提取为 deadline (YYYY-MM-DD)
7. duration 根据任务复杂度估算，单位分钟

请严格以 JSON 格式返回，不要有任何其他文字：
{
  "tasks": [
    {
      "title": "任务名称",
      "date": "2026-04-27",
      "time": "09:00",
      "duration": 60,
      "tag": "work",
      "importance": "important",
      "urgency": "urgent",
      "deadline": "2026-04-28"
    }
  ]
}`;

export function AIParserModal({ isOpen, onClose }: AIParserModalProps) {
  const tags = useAppStore(s => s.tags);
  const addParsedTasks = useAppStore(s => s.addParsedTasks);
  const [notificationText, setNotificationText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ParsedTask | null>(null);
  const handleParse = async () => {
    if (!notificationText.trim()) { setError('请输入通知文本'); return; }

    setLoading(true);
    setError(null);
    setParsedTasks([]);

    try {
      const response = await fetch(`${API_BASE}/api/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `默认日期：${getToday()}\n\n通知内容：\n${notificationText.trim()}` },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `请求失败 (${response.status})`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 返回格式不正确，未找到 JSON');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('AI 返回格式不正确，缺少 tasks 数组');
      }

      const validTagKeys = Object.keys(tags);
      const tasksWithDefaults: ParsedTask[] = parsed.tasks.map((t: Record<string, unknown>) => ({
        title: String(t.title || '未命名任务'),
        date: String(t.date || getToday()),
        time: t.time ? String(t.time) : undefined,
        duration: typeof t.duration === 'number' ? t.duration : 60,
        tag: validTagKeys.includes(String(t.tag)) ? String(t.tag) : validTagKeys[0] || 'work',
        importance: t.importance === 'important' ? 'important' as const : 'normal' as const,
        urgency: t.urgency === 'urgent' ? 'urgent' as const : 'normal' as const,
        deadline: t.deadline ? String(t.deadline) : undefined,
        projectId: t.projectId ? String(t.projectId) : undefined,
        selected: true,
      }));

      setParsedTasks(tasksWithDefaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAll = () => {
    const selected = parsedTasks.filter(t => t.selected);
    if (selected.length === 0) { setError('请至少选择一个任务'); return; }
    addParsedTasks(selected.map(t => ({
      title: t.title,
      completed: false,
      date: t.date,
      tag: t.tag,
      time: t.time,
      duration: t.duration,
      importance: t.importance,
      urgency: t.urgency,
      deadline: t.deadline,
      projectId: t.projectId,
      pomodoros: 0,
      pinned: false,
    })));
    setParsedTasks([]);
    setNotificationText('');
    onClose();
  };

  const toggleTask = (idx: number) => {
    setParsedTasks(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const removeTask = (idx: number) => {
    setParsedTasks(prev => prev.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
    setEditingTask(idx);
    setEditDraft({ ...parsedTasks[idx] });
  };

  const saveEdit = () => {
    if (editDraft && editingTask !== null) {
      setParsedTasks(prev => prev.map((t, i) => i === editingTask ? editDraft : t));
    }
    setEditingTask(null);
    setEditDraft(null);
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditDraft(null);
  };

  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个日程助手。帮助用户管理任务、创建任务、查询状态。回答简洁直接。当前没有任务上下文信息，请直接回答用户的问题或帮用户规划。' },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
        }),
      });
      if (!response.ok) throw new Error(`请求失败 ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '抱歉，我没有理解你的意思。';
      setChatMessages(prev => [...prev, { role: 'ai', content }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '未知错误';
      setChatMessages(prev => [...prev, { role: 'ai', content: `抱歉，连接 AI 服务失败（${errMsg}）。请检查网络连接或稍后再试。` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)]" onClick={onClose}>
      <div
        className="bg-[var(--app-surface)] rounded-xl shadow-2xl w-[520px] max-w-[90vw] max-h-[85vh] flex flex-col border border-[var(--app-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--app-accent)]" />
            <h3 className="text-base font-semibold text-[var(--app-text)]">AI 智能助手</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5 space-y-4 min-h-0">
          {/* Mode tabs */}
          <div className="flex items-center gap-1 bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)] p-0.5">
            <button
              onClick={() => setChatMode(false)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                !chatMode ? 'bg-[var(--app-accent)] text-white' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              )}
            >
              解析文本
            </button>
            <button
              onClick={() => setChatMode(true)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                chatMode ? 'bg-[var(--app-accent)] text-white' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              )}
            >
              对话模式
            </button>
          </div>

          {chatMode ? (
            /* Chat Mode */
            <div className="flex flex-col h-[400px]">
              <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles size={32} className="mx-auto mb-2 text-[var(--app-text-muted)] opacity-30" />
                    <p className="text-xs text-[var(--app-text-muted)]">问我任何关于日程管理的问题</p>
                    <p className="text-[10px] text-[var(--app-text-muted)] mt-1">例如「帮我安排明天的工作」「创建个任务叫写周报」</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}>
                    <div className={cn(
                      'max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[var(--app-accent)] text-white'
                        : 'bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text)]'
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)]">
                      <Loader2 size={14} className="animate-spin text-[var(--app-accent)]" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChat())}
                  placeholder="输入你的问题..."
                  className="flex-1 text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 border border-[var(--app-border)] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
                />
                <button
                  onClick={handleChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-[var(--app-accent)] text-white hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {chatLoading ? <Loader2 size={14} className="animate-spin" /> : '发送'}
                </button>
              </div>
            </div>
          ) : (
            /* Parse Mode */
            <>
              <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
                粘贴上级通知、会议纪要或工作安排，DeepSeek AI 自动提取任务事项，一键导入日程。
              </p>

          {/* Notification Text Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--app-text-muted)] mb-1.5">通知/会议纪要文本</label>
            <textarea
              value={notificationText}
              onChange={(e) => setNotificationText(e.target.value)}
              placeholder="请粘贴通知内容，例如：\n各位同事，本周工作安排如下：\n1. 周三上午9点召开产品设计评审会议，预计1小时\n2. 周五前完成Q2季度报告初稿\n3. 下周一与客户进行需求对接..."
              className="w-full h-32 text-xs bg-[var(--app-input-bg)] rounded-lg px-3 py-2.5 outline-none border border-[var(--app-border)] text-[var(--app-text)] focus:border-[var(--app-accent)] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Parse Button */}
          <button
            onClick={handleParse}
            disabled={loading || !notificationText.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              loading
                ? 'bg-[var(--app-border)] text-[var(--app-text-muted)] cursor-not-allowed'
                : notificationText.trim()
                  ? 'bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-accent)] text-white hover:brightness-110 shadow-sm'
                  : 'bg-[var(--app-border)] text-[var(--app-text-placeholder)] cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'DeepSeek 解析中...' : '开始解析'}
          </button>

          {/* Backend proxy status */}
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--app-text-muted)]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            API Key 已安全存储在后端，前端不再暴露密钥
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Parsed Tasks Preview */}
          {parsedTasks.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--app-border)]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[var(--app-text)]">
                  已提取 {parsedTasks.length} 个任务
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setParsedTasks(prev => prev.map(t => ({ ...t, selected: true })))}
                    className="text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
                  >
                    全选
                  </button>
                  <button
                    onClick={() => setParsedTasks(prev => prev.map(t => ({ ...t, selected: false })))}
                    className="text-[10px] text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
                  >
                    全不选
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {parsedTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-start gap-2 p-2.5 rounded-lg border transition-all',
                      task.selected
                        ? 'border-[var(--app-accent)]/30 bg-[var(--app-accent)]/5'
                        : 'border-[var(--app-border)] bg-[var(--app-surface-hover)] opacity-60'
                    )}
                  >
                    <button
                      onClick={() => toggleTask(idx)}
                      className={cn(
                        'mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
                        task.selected ? 'bg-[var(--app-accent)] border-[var(--app-accent)]' : 'border-[var(--app-border)]'
                      )}
                    >
                      {task.selected && <Check size={10} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingTask === idx && editDraft ? (
                        <div className="space-y-1.5">
                          <input
                            value={editDraft.title}
                            onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                            className="w-full text-xs bg-transparent outline-none border-b border-[var(--app-accent)] text-[var(--app-text)]"
                          />
                          <div className="flex gap-1.5 flex-wrap">
                            <input
                              type="date"
                              value={editDraft.date}
                              onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                              className="text-[10px] bg-[var(--app-input-bg)] rounded px-1.5 py-0.5 border border-[var(--app-border)]"
                            />
                            <input
                              type="time"
                              value={editDraft.time || ''}
                              onChange={(e) => setEditDraft({ ...editDraft, time: e.target.value || undefined })}
                              className="text-[10px] bg-[var(--app-input-bg)] rounded px-1.5 py-0.5 border border-[var(--app-border)]"
                            />
                            <select
                              value={editDraft.tag}
                              onChange={(e) => setEditDraft({ ...editDraft, tag: e.target.value })}
                              className="text-[10px] bg-[var(--app-input-bg)] rounded px-1.5 py-0.5 border border-[var(--app-border)]"
                            >
                              {Object.keys(tags).map(k => (
                                <option key={k} value={k}>{tags[k].label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={saveEdit} className="text-[10px] px-2 py-0.5 rounded bg-[var(--app-accent)] text-white">保存</button>
                            <button onClick={cancelEdit} className="text-[10px] px-2 py-0.5 rounded bg-[var(--app-border)] text-[var(--app-text-secondary)]">取消</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-medium text-[var(--app-text)] truncate">{task.title}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {task.time && <span className="text-[10px] text-[var(--app-text-muted)]">{task.time}</span>}
                            <span className="text-[10px] text-[var(--app-text-muted)]">{task.duration}分钟</span>
                            {task.deadline && <span className="text-[10px] text-red-500">截止 {task.deadline}</span>}
                            <span
                              className="text-[9px] px-1 py-0.5 rounded text-white"
                              style={{ backgroundColor: tags[task.tag]?.color || '#9ca3af' }}
                            >
                              {tags[task.tag]?.label || task.tag}
                            </span>
                            {task.importance === 'important' && <span className="text-[9px] text-red-600">重要</span>}
                            {task.urgency === 'urgent' && <span className="text-[9px] text-orange-600">紧急</span>}
                          </div>
                        </>
                      )}
                    </div>

                    {editingTask !== idx && (
                      <div className="flex gap-0.5">
                        <button onClick={() => startEdit(idx)} className="p-1 rounded text-[var(--app-text-muted)] hover:text-[var(--app-accent)]">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => removeTask(idx)} className="p-1 rounded text-[var(--app-text-muted)] hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddAll}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] transition-colors"
              >
                <Plus size={14} />
                添加选中的 {parsedTasks.filter(t => t.selected).length} 个任务
              </button>
            </div>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
