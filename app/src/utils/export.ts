import type { Task, Project } from '@/types';

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function exportTasksToICS(tasks: Task[], projects: Project[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//日程管理//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  tasks.forEach(task => {
    if (!task.time || !task.date) return;
    const [h, m] = task.time.split(':').map(Number);
    const startDate = new Date(task.date);
    startDate.setHours(h, m, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (task.duration || 60));

    const project = projects.find(p => p.id === task.projectId);
    const summary = project ? `[${project.name}] ${task.title}` : task.title;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${task.id}@schedule.local`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:${escapeICS(summary)}`);
    if (task.notes) lines.push(`DESCRIPTION:${escapeICS(task.notes)}`);
    lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n') + '\r\n';
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule-export-${new Date().toISOString().slice(0, 10)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateWeeklyMarkdown(tasks: Task[], projects: Project[]): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weekTasks = tasks.filter(t => {
    const d = new Date(t.createdAt);
    return d >= startOfWeek && d <= endOfWeek;
  });

  const completed = weekTasks.filter(t => t.completed);
  const pending = weekTasks.filter(t => !t.completed);

  const lines: string[] = [];
  lines.push(`# ${now.getFullYear()}年第${getWeekNumber(now)}周 周报`);
  lines.push('');
  lines.push(`**统计时间**: ${formatDate(startOfWeek)} ~ ${formatDate(endOfWeek)}`);
  lines.push('');
  lines.push(`- 本周共设定任务: ${weekTasks.length} 个`);
  lines.push(`- 已完成: ${completed.length} 个`);
  lines.push(`- 未完成: ${pending.length} 个`);
  lines.push(`- 完成率: ${weekTasks.length > 0 ? Math.round((completed.length / weekTasks.length) * 100) : 0}%`);
  lines.push('');

  if (completed.length > 0) {
    lines.push('## 已完成任务');
    lines.push('');
    completed.forEach(t => {
      const p = projects.find(pr => pr.id === t.projectId);
      lines.push(`- [x] ${t.title}${p ? ` [${p.name}]` : ''}`);
    });
    lines.push('');
  }

  if (pending.length > 0) {
    lines.push('## 待办任务');
    lines.push('');
    pending.forEach(t => {
      const p = projects.find(pr => pr.id === t.projectId);
      lines.push(`- [ ] ${t.title}${p ? ` [${p.name}]` : ''} (截止: ${t.date}${t.time ? ' ' + t.time : ''})`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
