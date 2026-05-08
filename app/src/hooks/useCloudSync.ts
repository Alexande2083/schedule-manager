import { useCallback, useEffect, useRef } from 'react';
import { syncGet, syncPut } from '@/utils/api';
import type { SyncData } from '@/types';

export function useCloudSync(
  data: SyncData,
  setData: (key: string, value: any) => void,
) {
  const lastSyncRef = useRef<string>('');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isPullingRef = useRef(false);

  // Pull data from server on login
  const pullFromServer = useCallback(async () => {
    if (isPullingRef.current) return; // prevent concurrent pulls
    isPullingRef.current = true;
    try {
      const serverData = await syncGet();
      if (!serverData) return;

      // Convert tags array to Record (strip 'tag_' prefix from server IDs)
      const tagsRecord: Record<string, { label: string; color: string }> = {};
      (serverData.tags || []).forEach((t: any) => {
        const key = t.id.replace(/^tag_/, '').replace(/_\d+$/, '');
        tagsRecord[key] = { label: t.label, color: t.color };
      });

      // Only overwrite each field if server actually has data for it
      if (serverData.tasks && serverData.tasks.length > 0) {
        setData('tasks', serverData.tasks);
      }
      if (serverData.projects && serverData.projects.length > 0) {
        setData('projects', serverData.projects);
      }
      if (serverData.checklists && serverData.checklists.length > 0) {
        setData('checklists', serverData.checklists);
      }
      if (serverData.tags && serverData.tags.length > 0) {
        setData('tags', tagsRecord);
      }
      if (serverData.contexts && serverData.contexts.length > 0) {
        setData('contexts', serverData.contexts);
      }
      if (serverData.perspectives && serverData.perspectives.length > 0) {
        setData('perspectives', serverData.perspectives);
      }

      lastSyncRef.current = JSON.stringify(serverData);
    } catch (err) {
      console.warn('从服务器拉取数据失败，使用本地数据:', err);
    } finally {
      isPullingRef.current = false;
    }
  }, [setData]);

  // Push data to server (debounced)
  // Use ref to always access the latest data without recreating pushToServer
  const dataRef = useRef(data);
  dataRef.current = data;

  const pushToServer = useCallback(async () => {
    if (isPullingRef.current) return; // don't push while pulling

    const d = dataRef.current;

    const currentData = JSON.stringify({
      tasks: d.tasks,
      projects: d.projects,
      checklists: d.checklists,
      tags: Object.entries(d.tags).map(([key, val]) => ({
        id: `tag_${key}`, label: val.label, color: val.color,
      })),
      contexts: d.contexts,
      perspectives: d.perspectives,
    });

    // Skip if nothing changed
    if (currentData === lastSyncRef.current) return;

    try {
      await syncPut({
        tasks: d.tasks,
        projects: d.projects,
        checklists: d.checklists,
        tags: Object.entries(d.tags).map(([key, val]) => ({
          id: `tag_${key}`, label: val.label, color: val.color,
        })),
        contexts: d.contexts,
        perspectives: d.perspectives,
      });
      lastSyncRef.current = currentData;
    } catch (err) {
      console.warn('同步到服务器失败:', err);
    }
  }, []);

  // Auto-sync when data changes (debounced 3s)
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(pushToServer, 3000);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [data.tasks, data.projects, data.checklists, data.tags, data.contexts, data.perspectives]);

  return { pullFromServer, pushToServer };
}
