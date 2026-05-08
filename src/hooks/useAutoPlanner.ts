import { useMemo } from 'react';
import type { Task } from '@/types';
import type { ScheduledTask } from './useLearningSystem';
import { getToday } from '@/utils/date';
import { parseISO, format, addDays, startOfWeek } from 'date-fns';

/* ============================================================
   Types
   ============================================================ */

export interface TimeGap {
  start: string;       // "09:00"
  end: string;         // "11:00"
  durationMin: number; // 120
  suggestion: string;  // "适合安排中度工作"
}

export interface BreakdownSuggestion {
  taskId: string;
  title: string;
  steps: string[];
}

export interface PriorityUpdate {
  taskId: string;
  title: string;
  from: string;
  to: string;
  reason: string;
}

export interface OverdueTask {
  taskId: string;
  title: string;
  date: string;
  duration: number;
  suggestion: string;
}

export interface MorningBrief {
  totalPending: number;
  highPriority: number;
  overdue: number;
  estimatedMinutes: number;
  suggestion: string;
  greeting: string;
}

export interface AutoPlan {
  schedule: ScheduledTask[];
  gaps: TimeGap[];
  breakdownSuggestions: BreakdownSuggestion[];
  priorityUpdates: PriorityUpdate[];
  overdueTasks: OverdueTask[];
  morningBrief: MorningBrief;
  scheduleReason: string;
}

/* ============================================================
   Helpers
   ============================================================ */

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const START_DAY = 6 * 60;  // 06:00
const END_DAY = 22 * 60;   // 22:00
const MIN_GAP = 30;        // minimum gap to report (minutes)

const BREAKDOWN_KEYWORDS = ['完成', '项目', '报告', '方案', '文档', '设计', '开发', '搭建', '撰写', '整理', '规划'];
const BREAKDOWN_TEMPLATES: Record<string, string[]> = {
  '报告': ['收集数据', '起草大纲', '撰写正文', '数据核对', '审查修改', '定稿输出'],
  '方案': ['需求分析', '框架设计', '初稿撰写', '细节完善', '评审修改', '最终定稿'],
  '文档': ['资料收集', '提纲梳理', '正文撰写', '格式整理', '审阅校对', '归档发布'],
  '项目': ['目标拆解', '里程碑划分', '任务分配', '执行推进', '进度检查', '复盘总结'],
  '设计': ['需求调研', '概念设计', '方案细化', '原型设计', '评审迭代', '最终交付'],
};

const PRIORITY_SCORE = {
  deadlineWithin: { days: 0, score: 3 },    // today
  deadlineWeek: { days: 7, score: 2 },       // within 7 days
  deadlineLater: { days: 30, score: 1 },     // within 30 days
  tagEfficient: 2,                             // tag with >70% completion rate
  tagAverage: 1,                               // tag with 40-70%
  longDuration: { min: 90, score: 1 },        // long tasks get attention
  urgent: 3,
  important: 2,
};

/* ============================================================
   Hook
   ============================================================ */

export function useAutoPlanner(
  tasks: Task[],
  tagStats: Record<string, { total: number; completed: number; rate: number }>,
  timeSlotStats: { morning: { rate: number }; afternoon: { rate: number }; evening: { rate: number } },
  profile: { preferredTime: string; streakDays: number; weeklyCapacity: number },
) {
  const today = getToday();
  const now = new Date();
  const currentHour = now.getHours();

  return useMemo((): AutoPlan => {
    /* ── 0. 基础数据 ── */
    const todayTasks = tasks.filter(t => t.date === today && !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const allPending = tasks.filter(t => !t.completed);
    const todayCompleted = completedTasks.filter(t => t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === today).length;

    /* ── 1. 自动规划今天 ── */
    const sorted = [...todayTasks].sort((a, b) => {
      const scoreA = priorityScore(a, tagStats);
      const scoreB = priorityScore(b, tagStats);
      if (scoreB !== scoreA) return scoreB - scoreA;
      // If both have time, sort by time
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });

    const bestSlot = profile.preferredTime === 'morning' ? 8 : profile.preferredTime === 'afternoon' ? 14 : 19;
    const schedule: ScheduledTask[] = sorted.map((task, idx) => {
      const hour = bestSlot + idx * 2;
      const reasons: string[] = [];
      const tagStat = tagStats[task.tag];
      if (tagStat && tagStat.rate > 70) reasons.push(`「${task.tag}」类任务你完成率较高`);
      if (task.importance === 'important') reasons.push('重要任务，建议优先处理');
      if (idx === 0) reasons.push('安排在最佳时段');
      return {
        id: task.id,
        title: task.title,
        tag: task.tag,
        time: minutesToTime(hour * 60),
        duration: task.duration || 60,
        reason: reasons.join('；'),
      };
    });

    const scheduleReason = profile.preferredTime === 'morning'
      ? `你的高效时段是上午，重要任务已排在 ${bestSlot}:00`
      : profile.preferredTime === 'afternoon'
        ? `你的高效时段是下午，核心任务已排在 ${bestSlot}:00`
        : `晚上是你效率最高的时段`;

    /* ── 2. 自动安排空闲时间 ── */
    const todayScheduled = todayTasks
      .filter(t => t.time && t.duration)
      .map(t => ({ start: parseTimeToMinutes(t.time!), end: parseTimeToMinutes(t.time!) + (t.duration || 60) }))
      .sort((a, b) => a.start - b.start);

    const gaps: TimeGap[] = [];
    let cursor = START_DAY;
    for (const block of todayScheduled) {
      if (block.start > cursor + MIN_GAP) {
        const gapMin = block.start - cursor;
        gaps.push({
          start: minutesToTime(cursor),
          end: minutesToTime(block.start),
          durationMin: gapMin,
          suggestion: gapMin >= 120 ? '大段空闲，适合深度工作或拆解后的子任务' :
                       gapMin >= 60 ? '中等时段，适合处理需要集中精力的任务' :
                       '碎片时间，适合快速回复、整理等小任务',
        });
      }
      cursor = Math.max(cursor, block.end);
    }
    if (END_DAY - cursor >= MIN_GAP) {
      gaps.push({
        start: minutesToTime(cursor),
        end: minutesToTime(END_DAY),
        durationMin: END_DAY - cursor,
        suggestion: '晚间时段，适合安排个人项目或学习',
      });
    }

    /* ── 3. 自动任务拆解 ── */
    const breakdownSuggestions: BreakdownSuggestion[] = [];
    const unassignedToday = todayTasks.filter(t => !t.time && t.duration && t.duration >= 60);

    for (const task of unassignedToday) {
      for (const kw of BREAKDOWN_KEYWORDS) {
        if (task.title.includes(kw)) {
          const steps = BREAKDOWN_TEMPLATES[kw] || [
            '分析需求', '制定方案', '逐步执行', '检查验收', '总结归档',
          ];
          breakdownSuggestions.push({ taskId: task.id, title: task.title, steps });
          break;
        }
      }
    }

    /* ── 4. 自动优先级 ── */
    const priorityUpdates: PriorityUpdate[] = [];
    for (const task of todayTasks) {
      const currentPriority = (task.importance === 'important' ? '高' : '中') + '/' + (task.urgency === 'urgent' ? '紧急' : '普通');
      const score = priorityScore(task, tagStats);

      let suggestedImportance: 'important' | 'normal' = task.importance;
      let suggestedUrgency: 'urgent' | 'normal' = task.urgency;

      if (score >= 5 && task.importance !== 'important') {
        suggestedImportance = 'important';
      }
      if (score >= 7 && task.urgency !== 'urgent') {
        suggestedUrgency = 'urgent';
      }

      if (suggestedImportance !== task.importance || suggestedUrgency !== task.urgency) {
        const newPriority = (suggestedImportance === 'important' ? '高' : '中') + '/' + (suggestedUrgency === 'urgent' ? '紧急' : '普通');
        const reasonParts: string[] = [];
        if (task.deadline) {
          const dl = new Date(task.deadline);
          const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
          if (daysLeft <= 0) reasonParts.push(`今日截止`);
          else if (daysLeft <= 1) reasonParts.push(`明天截止`);
          else if (daysLeft <= 3) reasonParts.push(`${daysLeft}天后截止`);
        }
        const tagStat = tagStats[task.tag];
        if (tagStat && tagStat.rate >= 70) reasonParts.push(`完成率高的任务`);
        if ((task.duration || 0) >= 90) reasonParts.push(`耗时较长需提前安排`);
        priorityUpdates.push({
          taskId: task.id, title: task.title,
          from: currentPriority, to: newPriority,
          reason: reasonParts.join('、') || '综合评分较高',
        });
      }
    }

    /* ── 5. 自动延期 ── */
    const overdueTasks: OverdueTask[] = [];
    const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
    const monday = format(startOfWeek(addDays(parseISO(today), 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    for (const task of allPending) {
      if (task.date && task.date < today) {
        let suggestion: string;
        if (task.importance === 'important' || task.urgency === 'urgent') {
          suggestion = today;
        } else if (task.tag && tagStats[task.tag] && tagStats[task.tag].rate > 60) {
          suggestion = tomorrow;
        } else {
          suggestion = monday;
        }
        overdueTasks.push({
          taskId: task.id,
          title: task.title,
          date: task.date,
          duration: task.duration || 60,
          suggestion,
        });
      }
    }

    /* ── 6. 早间简报 ── */
    const highPriority = allPending.filter(t => t.importance === 'important' || (t.deadline && t.deadline <= today)).length;
    const totalEstimated = todayTasks.reduce((sum, t) => sum + (t.duration || 60), 0);

    const greetingTime = currentHour < 9 ? '早上好' : currentHour < 12 ? '上午好' : currentHour < 14 ? '中午好' : currentHour < 18 ? '下午好' : '晚上好';
    const streak = profile.streakDays > 0 ? `已连续 ${profile.streakDays} 天完成任务` : '';
    const weekly = profile.weeklyCapacity > 5 ? '你本周效率不错，继续保持' : '今天开始，从小目标做起';

    const morningBrief: MorningBrief = {
      totalPending: allPending.length,
      highPriority,
      overdue: overdueTasks.length,
      estimatedMinutes: totalEstimated,
      suggestion: overdueTasks.length > 0
        ? `你有 ${overdueTasks.length} 个过期任务，建议优先处理`
        : highPriority > 0
          ? `今天有 ${highPriority} 个高优任务，建议集中精力先完成它们`
          : `今天任务量适中，你已完成 ${todayCompleted} 个任务`,
      greeting: `${greetingTime}！${streak}。${weekly}。`,
    };

    return {
      schedule,
      gaps,
      breakdownSuggestions,
      priorityUpdates,
      overdueTasks,
      morningBrief,
      scheduleReason,
    };
  }, [tasks, tagStats, timeSlotStats, profile]);
}

/* ── Priority scoring ── */
function priorityScore(task: Task, tagStats: Record<string, { total: number; completed: number; rate: number }>): number {
  let score = 0;
  const now = new Date();

  if (task.importance === 'important') score += PRIORITY_SCORE.important;
  if (task.urgency === 'urgent') score += PRIORITY_SCORE.urgent;
  if (task.deadline) {
    const dl = new Date(task.deadline);
    const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
    if (daysLeft <= PRIORITY_SCORE.deadlineWithin.days) score += PRIORITY_SCORE.deadlineWithin.score;
    else if (daysLeft <= PRIORITY_SCORE.deadlineWeek.days) score += PRIORITY_SCORE.deadlineWeek.score;
    else if (daysLeft <= PRIORITY_SCORE.deadlineLater.days) score += PRIORITY_SCORE.deadlineLater.score;
  }
  const tagStat = tagStats[task.tag];
  if (tagStat) {
    if (tagStat.rate >= 70) score += PRIORITY_SCORE.tagEfficient;
    else if (tagStat.rate >= 40) score += PRIORITY_SCORE.tagAverage;
  }
  if ((task.duration || 0) >= PRIORITY_SCORE.longDuration.min) score += PRIORITY_SCORE.longDuration.score;

  return score;
}
