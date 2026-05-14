import { motion } from 'framer-motion';
import {
  Brain, Clock, Target, Zap,
  Flame, Award, Lightbulb,
} from 'lucide-react';
import type { Insights } from '@/hooks/useLearningSystem';

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
  const { profile, optimizationTips } = insights;

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
            <h1 className="text-base font-semibold text-[var(--app-text)]">本周洞察</h1>
            <p className="text-xs text-[var(--app-text-muted)]">基于你的行为数据，生成个性化洞察和调度建议</p>
          </div>
        </div>
      </motion.div>

      {/* Profile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-6 pb-3 md:pb-4">
        <motion.div variants={item} className="saas-stats-card rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 shadow-sm">
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

        <motion.div variants={item} className="saas-stats-card rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--app-text-muted)]">完成率</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Target size={14} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-[var(--app-text)] tabular-nums">{profile.avgCompletionRate}%</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">总完成率</p>
        </motion.div>

        <motion.div variants={item} className="saas-stats-card rounded-2xl p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--app-text-muted)]">连续天数</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Flame size={14} className="text-orange-500" />
            </div>
          </div>
          <p className="text-lg font-bold text-[var(--app-text)] tabular-nums">{profile.streakDays}</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">连续完成任务</p>
        </motion.div>

        <motion.div variants={item} className="saas-stats-card rounded-2xl p-5 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 shadow-sm">
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

      <div className="px-4 md:px-6 pb-4 md:pb-6">
        <motion.div variants={item} className="saas-card p-5 rounded-2xl">
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
