const API_BASE = '/api';

// Read sync key from localStorage
function getSyncKey(): string {
  return localStorage.getItem('cloud_sync_key') || '';
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach sync key if configured
  const syncKey = getSyncKey();
  if (syncKey) {
    headers['x-sync-key'] = syncKey;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

// ─── Sync ─────────────────────────────────────────────────────────
export async function syncGet() {
  return request('/sync');
}

export async function syncPut(data: any) {
  return request('/sync', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Tasks ────────────────────────────────────────────────────────
export async function createTask(task: any) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(id: string, task: any) {
  return request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });
}

export async function deleteTask(id: string) {
  return request(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

// ─── Notifications ────────────────────────────────────────────────
export async function getNotificationConfig() {
  return request('/notifications/config');
}

export async function updateNotificationConfig(config: any) {
  return request('/notifications/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function testNotification() {
  return request('/notifications/config', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
