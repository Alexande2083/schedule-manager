import { motion } from 'framer-motion';
import {
  Brain, Clock, TrendingUp, Target, Zap,
  Sun, Moon, Cloud, Flame, Award, Lightbulb,
  BarChart3, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insights, TimeSlot } from '@/hooks/useLearningSystem';

interface UserInsightsProps {
  insights: Insights;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

export function UserInsights({ insights }: UserInsightsProps) {
  const { profile, timeSlotStats, tagStats, weeklyTrend, optimizationTips } = insights;

  const maxTrend = Math.max(...weeklyTrend, 1);

  const slotIcon = (slot: TimeSlot) => {
    if (slot === 'morning') return <Sun size={16} />;
    if (slot === 'afternoon') return <Cloud size={16} />;
    return <Moon size={16} />;
  };

  return (
    <motion.div
      className="w-full"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[var(--app-text)]">学习系统</h1>
            <p className="text-xs text-[var(--app-text-muted)]">基于你的行为数据，生成个性化洞察和调度建议</p>
          </div>
        </div>
      </motion.div>

      {/* Profile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-6 pb-3 md:pb-4">
        <motion.div variants={item} className="saas-stats-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--app-text-muted)]">最佳时段</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Clock size={14} className="text-amber-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-[var(--app-text)] capitalize">
            {profile.preferredTime === 'morning' ? '上午' : profile.preferredTime === 'afternoon' ? '下午' : '晚上'}
          </p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">{profile.highEnergyWindow}</p>
        </motion.div>

        <motion.div variants={item} className="saas-stats-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--app-text-muted)]">完成率</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Target size={14} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-[var(--app-text)] tabular-nums">{profile.avgCompletionRate}%</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">总完成率</p>
        </motion.div>

        <motion.div variants={item} className="saas-stats-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--app-text-muted)]">连续天数</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Flame size={14} className="text-orange-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-[var(--app-text)] tabular-nums">{profile.streakDays}</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">连续完成任务</p>
        </motion.div>

        <motion.div variants={item} className="saas-stats-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--app-text-muted)]">周容量</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Zap size={14} className="text-blue-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-[var(--app-text)] tabular-nums">{profile.weeklyCapacity}</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">任务/周</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 px-4 md:px-6 pb-4 md:pb-6">
        {/* Time Slot Analysis */}
        <motion.div variants={item} className="saas-card p-5 lg:col-span-1">
          <h3 className="text-xs font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            <Activity size={14} className="text-purple-500" />
            时段效率分析
          </h3>
          <div className="space-y-3">
            {(Object.entries(timeSlotStats) as [TimeSlot, { total: number; completed: number; rate: number }][]).map(([slot, data]) => (
              <div key={slot}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center',
                      slot === 'morning' ? 'bg-amber-50 text-amber-600' : slot === 'afternoon' ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600'
                    )}>
                      {slotIcon(slot)}
                    </span>
                    <span className="text-xs font-medium text-[var(--app-text)]">
                      {slot === 'morning' ? '上午' : slot === 'afternoon' ? '下午' : '晚上'}
                    </span>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold tabular-nums',
                    data.rate >= 70 ? 'text-emerald-600' : data.rate >= 40 ? 'text-amber-600' : 'text-red-500'
                  )}>
                    {data.rate}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--app-surface-hover)] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', data.rate >= 70 ? 'bg-emerald-400' : data.rate >= 40 ? 'bg-amber-400' : 'bg-red-400')}
                    style={{ width: `${data.rate}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--app-text-muted)] mt-1">{data.completed}/{data.total} 个完成</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tag Performance */}
        <motion.div variants={item} className="saas-card p-5 lg:col-span-1">
          <h3 className="text-xs font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-500" />
            标签完成率
          </h3>
          <div className="space-y-3">
            {Object.entries(tagStats)
              .sort(([, a], [, b]) => b.rate - a.rate)
              .slice(0, 6)
              .map(([tag, data]) => (
                <div key={tag}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--app-text)]">{data.label || tag}</span>
                    <span className="text-[11px] tabular-nums font-medium text-[var(--app-text-secondary)]">{data.rate}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[var(--app-surface-hover)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500"
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--app-text-muted)]">{data.completed}/{data.total}</p>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Weekly Trend + Tips */}
        <motion.div variants={item} className="saas-card p-5 lg:col-span-1">
          <h3 className="text-xs font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-500" />
            周完成趋势
          </h3>
          {/* Mini bar chart */}
          <div className="flex items-end gap-1.5 h-20 mb-4">
            {weeklyTrend.map((count, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full rounded-sm transition-all duration-300',
                    idx === weeklyTrend.length - 1 ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-border)]'
                  )}
                  style={{ height: `${(count / maxTrend) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                />
                <span className="text-[8px] text-[var(--app-text-muted)]">{count}</span>
              </div>
            ))}
          </div>

          {/* Optimization Tips */}
          <h3 className="text-xs font-semibold text-[var(--app-text)] mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-500" />
            优化建议
          </h3>
          <div className="space-y-2">
            {optimizationTips.slice(0, 4).map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--app-surface-hover)]">
                <Award size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-[var(--app-text-secondary)] leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
