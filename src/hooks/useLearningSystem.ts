import { useMemo } from 'react';
import type { Task } from '@/types';
import { subWeeks, parseISO, getHours, startOfWeek, format } from 'date-fns';

// ─── Types ───────────────────────────────────────
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface TaskLog {
  taskId: string;
  title: string;
  tag: string;
  completedAt: number;
  date: string;
  timeSlot: TimeSlot;
  duration: number;
  pomodoros: number;
}

export interface UserProfile {
  preferredTime: TimeSlot;
  highEnergyWindow: string;
  lowEnergyWindow: string;
  bestTag: string;
  avgCompletionRate: number;
  weeklyCapacity: number;
  streakDays: number;
  totalCompleted: number;
}

export interface TimeSlotStats {
  morning: { total: number; completed: number; rate: number };
  afternoon: { total: number; completed: number; rate: number };
  evening: { total: number; completed: number; rate: number };
}

export interface TagStats {
  [tag: string]: { total: number; completed: number; rate: number; label: string };
}

export interface Insights {
  timeSlotStats: TimeSlotStats;
  tagStats: TagStats;
  weeklyTrend: { day: string; value: number }[];
  optimizationTips: string[];
  profile: UserProfile;
}

export interface ScheduledTask {
  id: string;
  title: string;
  tag: string;
  time: string;
  duration: number;
  reason: string;
}

export interface DayPlan {
  date: string;
  dayLabel: string;
  tasks: ScheduledTask[];
  focusArea: string;
}

export interface WeeklyPlanData {
  weekLabel: string;
  days: DayPlan[];
  summary: {
    totalTasks: number;
    focusAreas: string[];
    advice: string;
  };
}

// ─── Helpers ─────────────────────────────────────
function getTimeSlot(hour: number): TimeSlot {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getTimeSlotCN(slot: TimeSlot): string {
  return { morning: '上午', afternoon: '下午', evening: '晚上' }[slot];
}

// ─── Hook ────────────────────────────────────────
export function useLearningSystem(tasks: Task[], tags: Record<string, { label: string; color: string }> = {}) {
  // Build task logs from completed tasks
  const taskLogs = useMemo((): TaskLog[] => {
    return tasks
      .filter(t => t.completed)
      .map(t => {
        const hour = t.time ? getHours(parseISO(`${t.date}T${t.time}`)) : 12;
        return {
          taskId: t.id,
          title: t.title,
          tag: t.tag,
          completedAt: t.completedAt || Date.now(),
          date: t.date,
          timeSlot: getTimeSlot(hour),
          duration: t.duration || 60,
          pomodoros: t.pomodoros || 0,
        };
      });
  }, [tasks]);

  // All tasks (completed and pending)
  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);

  // ─── Time Slot Stats ───
  const timeSlotStats = useMemo((): TimeSlotStats => {
    const buckets: Record<TimeSlot, { total: number; completed: number }> = {
      morning: { total: 0, completed: 0 },
      afternoon: { total: 0, completed: 0 },
      evening: { total: 0, completed: 0 },
    };

    // All tasks that have a time set
    tasks.filter(t => t.time).forEach(t => {
      const hour = getHours(parseISO(`${t.date}T${t.time}`));
      const slot = getTimeSlot(hour);
      buckets[slot].total++;
      if (t.completed) buckets[slot].completed++;
    });

    return {
      morning: { ...buckets.morning, rate: buckets.morning.total > 0 ? Math.round(buckets.morning.completed / buckets.morning.total * 100) : 0 },
      afternoon: { ...buckets.afternoon, rate: buckets.afternoon.total > 0 ? Math.round(buckets.afternoon.completed / buckets.afternoon.total * 100) : 0 },
      evening: { ...buckets.evening, rate: buckets.evening.total > 0 ? Math.round(buckets.evening.completed / buckets.evening.total * 100) : 0 },
    };
  }, [tasks]);

  // ─── Tag Stats ───
  const tagStats = useMemo((): TagStats => {
    const buckets: Record<string, { total: number; completed: number }> = {};

    tasks.forEach(t => {
      if (!buckets[t.tag]) buckets[t.tag] = { total: 0, completed: 0 };
      buckets[t.tag].total++;
      if (t.completed) buckets[t.tag].completed++;
    });

    const result: TagStats = {};
    Object.entries(buckets).forEach(([tag, data]) => {
      result[tag] = {
        ...data,
        rate: data.total > 0 ? Math.round(data.completed / data.total * 100) : 0,
        label: tags[tag]?.label || tag,
      };
    });
    return result;
  }, [tasks, tags]);

  // ─── Weekly Trend (this week's daily completion) ───
  const weeklyTrend = useMemo((): { day: string; value: number }[] => {
    const todayDate = new Date();
    const mon = startOfWeek(todayDate, { weekStartsOn: 1 });
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    return dayNames.map((day, i) => {
      const dayStart = new Date(mon);
      dayStart.setDate(mon.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const count = taskLogs.filter(log => {
        const logDate = new Date(log.completedAt);
        return logDate >= dayStart && logDate < dayEnd;
      }).length;
      return { day, value: count };
    });
  }, [taskLogs]);

  // ─── User Profile ───
  const profile = useMemo((): UserProfile => {
    // Preferred time: highest completion rate slot
    const slots = Object.entries(timeSlotStats) as [TimeSlot, { total: number; completed: number; rate: number }][];
    const bestSlot = slots.sort((a, b) => b[1].rate - a[1].rate)[0]?.[0] || 'morning';

    // Best tag
    const tagEntries = Object.entries(tagStats);
    const bestTag = tagEntries.sort((a, b) => b[1].rate - a[1].rate)[0]?.[0] || 'work';

    // Weekly capacity
    const taskLogsLast4Weeks = taskLogs.filter(log => {
      const logDate = new Date(log.completedAt);
      const fourWeeksAgo = subWeeks(new Date(), 4);
      return logDate >= fourWeeksAgo;
    });
    const weeklyCapacity = Math.round(taskLogsLast4Weeks.length / 4) || 3;

    // Streak (completed consecutive days)
    let streak = 0;
    const checkDate = new Date();
    while (streak < 365) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const hasCompletion = taskLogs.some(log => log.date === dateStr);
      if (hasCompletion) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      preferredTime: bestSlot,
      highEnergyWindow: bestSlot === 'morning' ? '08:00 - 11:00' : bestSlot === 'afternoon' ? '15:00 - 17:00' : '20:00 - 22:00',
      lowEnergyWindow: bestSlot === 'morning' ? '14:00 - 15:00' : '12:00 - 13:00',
      bestTag,
      avgCompletionRate: taskLogs.length > 0
        ? Math.round(taskLogs.length / (tasks.filter(t => t.completed || !t.completed).length) * 100)
        : 0,
      weeklyCapacity,
      streakDays: streak,
      totalCompleted: taskLogs.length,
    };
  }, [timeSlotStats, tagStats, taskLogs, tasks]);

  // ─── Optimization Tips ───
  const optimizationTips = useMemo((): string[] => {
    const tips: string[] = [];

    const preferredCN = getTimeSlotCN(profile.preferredTime);
    tips.push(`你的高效时段是${preferredCN}，建议把重要任务安排在这个时间段。`);

    if (timeSlotStats.morning.rate < 50 && timeSlotStats.morning.total > 0) {
      tips.push('上午完成率偏低，考虑把简单任务安排在上午作为热身。');
    }

    const worstSlot = Object.entries(timeSlotStats)
      .filter(([, s]) => s.total > 0)
      .sort(([, a], [, b]) => a.rate - b.rate)[0];
    if (worstSlot) {
      const worstCN = getTimeSlotCN(worstSlot[0] as TimeSlot);
      tips.push(`${worstCN}是你效率最低的时段，适合安排重复性或机械性工作。`);
    }

    const worstTag = Object.entries(tagStats)
      .filter(([, s]) => s.total >= 2)
      .sort(([, a], [, b]) => a.rate - b.rate)[0];
    if (worstTag) {
      tips.push(`「${worstTag[1].label}」类任务完成率仅 ${worstTag[1].rate}%，建议拆分为更小的步骤。`);
    }

    if (profile.streakDays > 3) {
      tips.push(`你已经连续完成 ${profile.streakDays} 天任务，保持势头！`);
    }

    if (weeklyTrend.length >= 4) {
      const firstHalf = weeklyTrend.slice(0, 3).reduce((s, d) => s + d.value, 0);
      const secondHalf = weeklyTrend.slice(-3).reduce((s, d) => s + d.value, 0);
      if (secondHalf < firstHalf) {
        tips.push('本周后几天完成量有所下降，可以回顾目标是否合理。');
      } else if (secondHalf > firstHalf) {
        tips.push('本周完成量在上升，继续保持！');
      }
    }

    return tips;
  }, [profile, timeSlotStats, tagStats, weeklyTrend]);

  // ─── Weekly Plan Generator (基于目标动态生成步骤) ───
  const generateWeeklyPlan = (goalDescription: string): WeeklyPlanData => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const days: DayPlan[] = [];
    const preferredCN = getTimeSlotCN(profile.preferredTime);

    // ── 从目标描述中提取关键信息 ──
    const goal = goalDescription.trim();

    // 尝试解析月目标（含时间范围）
    const monthMatch = goal.match(/(\d+)个月|\u4e00\u4e2a\u6708|\u4e24\u4e2a\u6708|\u534a\u5e74/);
    const timeSpan = monthMatch ? (monthMatch[1] ? parseInt(monthMatch[1]) : 1) : 1;
    const weeksInSpan = timeSpan * 4;

    // 解析目标关键词 → 生成步骤
    const goalLower = goal.toLowerCase();

    // ── 根据目标类型动态生成步骤 ──
    const generateSteps = (): { steps: string[]; focusAreas: string[] } => {
      // 学习类
      if (goalLower.includes('学习') || goalLower.includes('学') || goalLower.includes('课程') || goalLower.includes('技能')) {
        const skillMatch = goal.match(/学习(.+)/);
        const skill = skillMatch ? skillMatch[1] : goal;
        return {
          steps: [
            `收集资料：整理${skill}的学习资料和教程清单`,
            `基础入门：完成${skill}的基础概念学习（阅读/视频）`,
            `动手实践：完成${skill}的第一个实操练习`,
            `深入理解：学习${skill}的核心原理和高级概念`,
            `项目实战：用${skill}完成一个小项目或作业`,
            `复习巩固：整理笔记，查漏补缺`,
            `总结输出：写一篇学习总结或分享`,
          ],
          focusAreas: [
            `第1-2天打基础，第3-5天实战，周末复习`,
            `每天至少投入${profile.preferredTime === 'morning' ? '1小时' : '45分钟'}`,
            `${skill} — ${profile.weeklyCapacity > 5 ? '可以加快节奏' : '按计划稳步推进'}`,
          ],
        };
      }

      // 项目/文档类
      if (goalLower.includes('项目') || goalLower.includes('文档') || goalLower.includes('报告') || goalLower.includes('方案') || goalLower.includes('完成')) {
        const projectMatch = goal.match(/完成(.+)/);
        const project = projectMatch ? projectMatch[1] : goal;
        return {
          steps: [
            `需求分析：梳理${project}的核心需求和目标`,
            `框架设计：搭建${project}的整体框架结构`,
            `初稿撰写：完成${project}的初稿内容`,
            `细节完善：补充${project}的细节和数据`,
            `审核修改：对${project}进行全面检查和修改`,
            `定稿输出：完成${project}的最终版本`,
            `复盘总结：回顾${project}的完成过程`,
          ],
          focusAreas: [
            `前3天重点产出，后2天打磨优化`,
            `每天早上${profile.preferredTime === 'morning' ? '优先推进' : '集中处理'}`,
            `${project} — ${weeksInSpan > 4 ? '时间充裕，注意节奏' : '时间紧张，建议加快进度'}`,
          ],
        };
      }

      // 习惯/健康类
      if (goalLower.includes('健身') || goalLower.includes('跑步') || goalLower.includes('运动') || goalLower.includes('健康') || goalLower.includes('早起') || goalLower.includes('阅读')) {
        const habitMatch = goal.match(/(健身|跑步|运动|健康|早起|阅读)/);
        const habit = habitMatch ? habitMatch[1] : goal;
        return {
          steps: [
            `制定计划：确定${habit}的具体目标和时间安排`,
            `第1天：开始${habit}，记录初始状态`,
            `第2天：坚持${habit}，适当调整强度`,
            `第3天：${habit} + 记录感受`,
            `第4天：继续${habit}，尝试小突破`,
            `第5天：${habit}，评估一周进展`,
            `周末复盘：总结${habit}周成果，规划下周`,
          ],
          focusAreas: [
            `每天固定时间执行，形成习惯`,
            `量力而行，循序渐进`,
            `${habit} — 坚持${profile.streakDays > 0 ? '你已经有连续完成的记录了，继续保持' : '从今天开始'}`,
          ],
        };
      }

      // 默认：通用目标拆解
      return {
        steps: [
          `明确目标：把「${goal}」拆解为可执行的小步骤`,
          `第1步：完成目标的核心基础工作`,
          `第2步：推进目标的中期任务`,
          `第3步：处理目标的关键难点`,
          `第4步：收尾和细节完善`,
          `第5步：整体检查和质量把控`,
          `总结复盘：回顾本周进展，调整下周计划`,
        ],
        focusAreas: [
          `把你的大目标拆成小步骤，每天推进一点`,
          `${preferredCN}是高效时段，安排最核心的工作`,
          `${goal} — ${profile.weeklyCapacity > 3 ? '你的周容量较高，可以多安排任务' : '建议每天不超过2个主要任务'}`,
        ],
      };
    };

    const { steps, focusAreas } = generateSteps();

    // ── 分配步骤到每一天 ──
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTasks: ScheduledTask[] = [];
      const isWeekend = i >= 5;

      // 主要步骤（周一至周五每天1-2个步骤）
      if (i < steps.length) {
        const mainStep = steps[i];
        const hourBase = profile.preferredTime === 'morning' ? 9 : profile.preferredTime === 'afternoon' ? 14 : 20;
        dayTasks.push({
          id: `plan-step-${i}`,
          title: mainStep,
          tag: 'work',
          time: `${String(hourBase).padStart(2, '0')}:00`,
          duration: 60 + (i % 3) * 30,
          reason: `这是「${goal}」的关键步骤 #${i + 1}，安排在${preferredCN}的黄金时段`,
        });

        // 如果有匹配的待办任务，作为子任务附加在后面
        const matchedPending = pendingTasks.filter(t =>
          t.title.toLowerCase().includes(goal.substring(0, 4).toLowerCase()) ||
          t.tag === 'work'
        );
        if (matchedPending.length > 0 && i < matchedPending.length) {
          const pt = matchedPending[i];
          dayTasks.push({
            id: pt.id,
            title: pt.title,
            tag: pt.tag,
            time: `${String(hourBase + 2).padStart(2, '0')}:00`,
            duration: pt.duration || 45,
            reason: `关联任务 — 与今日主要步骤相关，建议连续完成`,
          });
        }
      }

      // 周末：轻量任务
      if (isWeekend && dayTasks.length === 0) {
        dayTasks.push({
          id: `weekend-review-${i}`,
          title: '本周回顾与下周规划',
          tag: 'work',
          time: '10:00',
          duration: 30,
          reason: '周末复盘，总结本周进展，规划下周任务',
        });
      }

      days.push({
        date: dateStr,
        dayLabel: dayLabels[i],
        tasks: dayTasks,
        focusArea: i === 0 ? '启动' : i >= 5 ? '复盘' : '推进',
      });
    }

    return {
      weekLabel: `「${goal.length > 20 ? goal.slice(0, 20) + '...' : goal}」第1周计划`,
      days,
      summary: {
        totalTasks: days.reduce((s, d) => s + d.tasks.length, 0),
        focusAreas,
        advice: `基于你的目标「${goal}」，已将${timeSpan}个月(${weeksInSpan}周)的任务拆解为本周(${format(weekStart, 'M月d日')})的${steps.length}个步骤。` +
          `你的最佳工作时段是${preferredCN}，核心步骤已安排在这个时段。` +
          `${focusAreas[0]}。坚持下去！`,
      },
    };
  };

  // ─── Smart Schedule (one day) ───
  const generateSmartSchedule = (date: string): ScheduledTask[] => {
    const dateTasks = pendingTasks.filter(t => t.date === date);
    const preferredCN = getTimeSlotCN(profile.preferredTime);

    // Sort by importance/urgency
    const sorted = [...dateTasks].sort((a, b) => {
      const score = (t: Task) => (t.importance === 'important' ? 2 : 0) + (t.urgency === 'urgent' ? 1 : 0);
      return score(b) - score(a);
    });

    const scheduled: ScheduledTask[] = [];
    const baseHour = profile.preferredTime === 'morning' ? 8 : profile.preferredTime === 'afternoon' ? 13 : 19;

    sorted.forEach((task, idx) => {
      const hour = baseHour + idx * 2;
      const reasons: string[] = [];

      if (idx === 0) {
        reasons.push(`安排在${preferredCN}首位 — 是你的最佳高效时段`);
      } else {
        reasons.push(`优先级 ${idx + 1}，排在上一个任务之后`);
      }
      if (task.duration && task.duration > 90) {
        reasons.push(`耗时较长（${task.duration}分钟），建议集中精力完成`);
      } else {
        reasons.push(`预计只需 ${task.duration || 60} 分钟`);
      }
      if (task.time && task.time !== `${String(hour).padStart(2, '0')}:00`) {
        reasons.push(`你原计划在 ${task.time} 做这个，已考虑在内`);
      }

      scheduled.push({
        id: task.id,
        title: task.title,
        tag: task.tag,
        time: `${String(hour).padStart(2, '0')}:00`,
        duration: task.duration || 60,
        reason: reasons.join('；'),
      });
    });

    return scheduled;
  };

  return {
    taskLogs,
    timeSlotStats,
    tagStats,
    weeklyTrend,
    profile,
    optimizationTips,
    pendingTasks,
    generateWeeklyPlan,
    generateSmartSchedule,
  };
}
