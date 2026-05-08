import { useState, useCallback } from 'react';

export interface TaskTemplate {
  id: string;
  name: string;
  tag: string;
  duration: number;
  importance: 'important' | 'normal';
  urgency: 'urgent' | 'normal';
  projectId?: string;
  contexts?: string[];
}

const STORAGE_KEY = 'sunsama-task-templates';

function load(): TaskTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Default templates
  return [
    { id: 'tmpl_daily', name: '每日晨会', tag: 'meeting', duration: 30, importance: 'normal', urgency: 'urgent' },
    { id: 'tmpl_focus', name: '深度工作', tag: 'work', duration: 90, importance: 'important', urgency: 'normal' },
    { id: 'tmpl_review', name: '周回顾', tag: 'personal', duration: 60, importance: 'important', urgency: 'normal' },
    { id: 'tmpl_exercise', name: '运动健身', tag: 'personal', duration: 45, importance: 'normal', urgency: 'normal' },
    { id: 'tmpl_read', name: '阅读学习', tag: 'personal', duration: 60, importance: 'important', urgency: 'normal' },
  ];
}

function save(templates: TaskTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch { /* ignore */ }
}

export function useTaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(load);

  const addTemplate = useCallback((name: string, defaults: Partial<TaskTemplate>) => {
    const newTemplate: TaskTemplate = {
      id: `tmpl_${Date.now()}`,
      name,
      tag: defaults.tag || 'work',
      duration: defaults.duration || 60,
      importance: defaults.importance || 'normal',
      urgency: defaults.urgency || 'normal',
      projectId: defaults.projectId,
      contexts: defaults.contexts,
    };
    setTemplates(prev => {
      const next = [...prev, newTemplate];
      save(next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { templates, addTemplate, deleteTemplate };
}
