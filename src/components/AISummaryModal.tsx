import { useState, useMemo } from 'react';
import { X, Sparkles, Loader2, Lightbulb, TrendingUp, AlertCircle, CheckCircle2, Target, Zap, Calendar } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const API_BASE = '';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional time range for weekly/monthly report */
  timeRange?: 'overall' | 'week' | 'month';
  onTimeRangeChange?: (range: 'overall' | 'week' | 'month') => void;
}

interface SummarySection {
  title: string;
  icon: React.ReactNode;
  items: string[];
  color: string;
}

export function AISummaryModal({ isOpen, onClose, timeRange = 'overall', onTimeRangeChange }: AISummaryModalProps) {
  const tasks = useAppStore(s => s.tasks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<SummarySection[]>([]);
  const [rawContent, setRawContent] = useState('');

  // Filter tasks by time range
  const filteredTasks = useMemo(() => {
    if (timeRange === 'overall') return tasks;
    const now = new Date();
    let cutoff: Date;
    if (timeRange === 'week') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
    } else {
      cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return tasks.filter(t => t.date >= cutoffStr);
  }, [tasks, timeRange]);

  const generatePrompt = () => {
    const completed = filteredTasks.filter(t => t.completed);
    const pending = filteredTasks.filter(t => !t.completed);

    const completedByTag: Record<string, number> = {};
    const pendingByTag: Record<string, number> = {};

    completed.forEach(t => {
      completedByTag[t.tag] = (completedByTag[t.tag] || 0) + 1;
    });
    pending.forEach(t => {
      pendingByTag[t.tag] = (pendingByTag[t.tag] || 0) + 1;
    });

    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((s, t) => s + (t.duration || 0), 0) / completed.length)
      : 0;

    const pinnedPending = pending.filter(t => t.pinned).length;
    const overdue = pending.filter(t => t.deadline && new Date(t.deadline) < new Date()).length;
    const importantUrgent = pending.filter(t => t.importance === 'important' && t.urgency === 'urgent').length;
    // Count pomodoros
    const totalPomodoros = completed.reduce((s, t) => s + (t.pomodoros || 0), 0);

    const rangeLabel = timeRange === 'week' ? '过去7天' : timeRange === 'month' ? '过去30天' : '全部时间';

    const taskList = filteredTasks.slice(0, 40).map(t =>
      `- ${t.title} [${t.completed ? '完成' : '待办'}] 标签:${t.tag} ${t.deadline ? '截止:' + t.deadline : ''} ${t.importance === 'important' ? '重要' : ''} ${t.urgency === 'urgent' ? '紧急' : ''}`
    ).join('\n');

    return `你是一位高效工作顾问。请分析用户${rangeLabel}的任务数据，生成一份专业的工作报告和建议。

数据概览（${rangeLabel}）：
- 任务总数：${filteredTasks.length}
- 已完成：${completed.length}
- 待完成：${pending.length}
- 完成率：${filteredTasks.length > 0 ? Math.round((completed.length / filteredTasks.length) * 100) : 0}%
- 完成番茄钟数：${totalPomodoros}
- 平均任务时长：${avgDuration}分钟
- 置顶待办：${pinnedPending}个
- 已逾期：${overdue}个
- 重要且紧急待办：${importantUrgent}个

完成按标签分布：${JSON.stringify(completedByTag)}
待办按标签分布：${JSON.stringify(pendingByTag)}

任务明细（前40个）：
${taskList}

请以中文输出，格式如下（严格使用这些标题）：

【工作概览】
- 简要总结用户的工作状态，${rangeLabel}的关键成果

【完成亮点】
- 2-3条做得好的方面

【待改进点】
- 2-3条工作效率上的不足

【紧急关注】
- 需要优先处理的任务

【优化建议】
- 5-7条具体可执行的行动建议

【${rangeLabel === '全部时间' ? '下一步行动' : '下个周期行动计划'}】
- 给出下一步应该优先做的3件事

请用简洁有力的语言，不要废话。`;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setSections([]);
    setRawContent('');

    try {
      const response = await fetch(`${API_BASE}/api/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: generatePrompt() }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `请求失败 ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      setRawContent(content);

      const parsed: SummarySection[] = [];
      const sectionMap: Record<string, { icon: React.ReactNode; color: string }> = {
        '工作概览': { icon: <TrendingUp size={14} />, color: 'text-sky-600 bg-sky-50' },
        '完成亮点': { icon: <CheckCircle2 size={14} />, color: 'text-emerald-600 bg-emerald-50' },
        '待改进点': { icon: <AlertCircle size={14} />, color: 'text-amber-600 bg-amber-50' },
        '紧急关注': { icon: <Target size={14} />, color: 'text-red-600 bg-red-50' },
        '优化建议': { icon: <Lightbulb size={14} />, color: 'text-purple-600 bg-purple-50' },
        '下一步行动': { icon: <Zap size={14} />, color: 'text-orange-600 bg-orange-50' },
        '下个周期行动计划': { icon: <Zap size={14} />, color: 'text-orange-600 bg-orange-50' },
      };

      const regex = /【([^】]+)】([\s\S]*?)(?=【|$)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const title = match[1].trim();
        const body = match[2].trim();
        const items = body.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^- /, ''));
        const config = sectionMap[title] || { icon: <Sparkles size={14} />, color: 'text-gray-600 bg-gray-50' };
        parsed.push({ title, icon: config.icon, items, color: config.color });
      }

      setSections(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-modal-overlay)] backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--app-surface)] rounded-2xl shadow-2xl w-[560px] max-w-[92vw] max-h-[85vh] flex flex-col border border-[var(--app-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--app-accent)]" />
            <h3 className="text-base font-semibold text-[var(--app-text)]">AI 工作报告</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5 space-y-4 min-h-0">
          {/* Time range selector */}
          {onTimeRangeChange && (
            <div className="flex items-center gap-2 bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)] p-0.5 w-fit">
              {(['overall', 'week', 'month'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    timeRange === range
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  )}
                >
                  <Calendar size={12} />
                  {range === 'overall' ? '全部' : range === 'week' ? '本周' : '本月'}
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-[11px] text-[var(--app-text-muted)] leading-relaxed">
            DeepSeek AI 将分析你在{timeRange === 'week' ? '过去7天' : timeRange === 'month' ? '过去30天' : '全部时间'}的任务数据，生成个性化报告。
          </p>

          {/* Analyze Button */}
          {sections.length === 0 && !loading && !error && (
            <button
              onClick={handleAnalyze}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-[var(--app-accent)] to-[#c4a5a0] text-white hover:brightness-110 shadow-sm transition-all"
            >
              <Sparkles size={14} />
              开始分析
            </button>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="animate-spin text-[var(--app-accent)]" />
              <p className="text-xs text-[var(--app-text-muted)]">DeepSeek 正在生成报告...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Sections */}
          {sections.map((section, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--app-border)] overflow-hidden">
              <div className={cn('flex items-center gap-2 px-3 py-2 text-xs font-semibold', section.color)}>
                {section.icon}
                {section.title}
              </div>
              <div className="p-3 space-y-1.5">
                {section.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--app-text)]">
                    <span className="w-1 h-1 rounded-full bg-[var(--app-accent)] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Raw content fallback */}
          {rawContent && sections.length === 0 && !loading && (
            <div className="text-xs text-[var(--app-text)] leading-relaxed whitespace-pre-wrap">
              {rawContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
