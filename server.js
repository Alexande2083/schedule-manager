import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb, getDb, saveDb, rowToTask, rowsToTasks } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SYNC_SECRET = process.env.SYNC_SECRET;
const DEEPSEEK_API_KEY = process.env.AI_SUMMARY_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// Enforce SYNC_SECRET
if (!SYNC_SECRET) {
  console.error('❌ 未设置 SYNC_SECRET 环境变量，请在 Render 中配置');
  process.exit(1);
}

// ─── Security Middleware ────────────────────────────────────

// HTTPS redirect (production only)
app.use((req, res, next) => {
  if (IS_PROD && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Remove server fingerprint
  res.removeHeader('X-Powered-By');
  next();
});

// ─── Zod Validation Schemas ─────────────────────────────────

const SyncSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(500),
    completed: z.boolean().optional(),
    date: z.string().optional(),
    tag: z.string().max(50).optional(),
    time: z.string().max(10).optional(),
    duration: z.number().min(0).max(1440).optional(),
    projectId: z.string().max(100).optional(),
    pomodoros: z.number().min(0).max(100).optional(),
    createdAt: z.number().optional(),
    order: z.number().optional(),
    importance: z.enum(['important', 'normal']).optional(),
    urgency: z.enum(['urgent', 'normal']).optional(),
    deadline: z.string().max(50).optional(),
    repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).optional(),
    pinned: z.boolean().optional(),
    reminder: z.string().max(50).optional(),
    completedAt: z.number().nullable().optional(),
    checklistId: z.string().max(100).optional(),
    parentId: z.string().max(100).optional(),
    collapsed: z.boolean().optional(),
    contexts: z.array(z.string().max(50)).optional(),
    notes: z.string().max(10000).optional(),
    repeatRule: z.string().max(200).optional(),
    dependsOn: z.array(z.string().max(100)).optional(),
  })).optional(),
  projects: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    color: z.string().max(20).optional(),
  })).optional(),
  checklists: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    defaultTag: z.string().max(50).optional(),
    order: z.number().optional(),
    archived: z.boolean().optional(),
  })).optional(),
  tags: z.array(z.object({
    id: z.string().min(1).max(100),
    label: z.string().min(1).max(100),
    color: z.string().max(20).optional(),
  })).optional(),
  contexts: z.array(z.object({
    id: z.string().min(1).max(100),
    label: z.string().min(1).max(100),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
  })).optional(),
  perspectives: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    icon: z.string().max(50).optional(),
    filters: z.record(z.any()).optional(),
  })).optional(),
});

const TaskSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  completed: z.boolean().optional(),
  date: z.string().max(50).optional(),
  tag: z.string().max(50).optional(),
  time: z.string().max(10).optional(),
  duration: z.number().min(0).max(1440).optional(),
  projectId: z.string().max(100).optional(),
  pomodoros: z.number().min(0).max(100).optional(),
  createdAt: z.number().optional(),
  order: z.number().optional(),
  importance: z.enum(['important', 'normal']).optional(),
  urgency: z.enum(['urgent', 'normal']).optional(),
  deadline: z.string().max(50).optional(),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).optional(),
  pinned: z.boolean().optional(),
  reminder: z.string().max(50).optional(),
  completedAt: z.number().nullable().optional(),
  checklistId: z.string().max(100).optional(),
  parentId: z.string().max(100).optional(),
  collapsed: z.boolean().optional(),
  contexts: z.array(z.string().max(50)).optional(),
  notes: z.string().max(10000).optional(),
  repeatRule: z.string().max(200).optional(),
  dependsOn: z.array(z.string().max(100)).optional(),
});

const MindMapExpandSchema = z.object({
  nodeText: z.string().min(1).max(500),
  parentContext: z.string().max(500).optional(),
  mode: z.enum(['expand', 'breakdown', 'suggest']).optional(),
});

const WebDAVSchema = z.object({
  url: z.string().url().max(500),
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  filename: z.string().max(200).optional(),
  content: z.string().optional(),
});

const NotificationConfigSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  enabled: z.boolean().optional(),
  remindBeforeMinutes: z.number().min(1).max(120).optional(),
  remindOnDeadline: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
});

// Zod validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const issues = result.error?.issues || [];
        return res.status(400).json({
          error: '请求参数校验失败',
          details: issues.map(i => `${i.path.join('.')}: ${i.message}`),
        });
      }
      req.body = result.data;
      next();
    } catch (err) {
      console.error('❌ validate 中间件错误:', err.message);
      return res.status(500).json({ error: '参数校验异常: ' + err.message });
    }
  };
}

// Sync key verification middleware (all /api routes)
function syncKeyAuth(req, res, next) {
  const key = req.headers['x-sync-key'] || req.query.sync_key;
  if (key !== SYNC_SECRET) {
    return res.status(401).json({ error: '同步密钥错误，请在设置中配置正确的密钥' });
  }
  next();
}

// Helper: convert sql.js exec result (Array<{columns, values}>) to object array
function execToObjects(db, sql, params) {
  const result = db.exec(sql, params);
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return (values || []).map(vals => {
    const obj = {};
    columns.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files (frontend build)
app.use(express.static(join(__dirname, 'dist')));

// Apply sync key auth to data API routes only (not AI proxy)
app.use('/api/sync', syncKeyAuth);
app.use('/api/tasks', syncKeyAuth);
app.use('/api/notifications', syncKeyAuth);
// WebDAV uses its own Basic Auth via jianguoyun.com — no sync key needed

// Default user ID (single-user mode, login removed)
const DEFAULT_USER_ID = 1;

// ─── Data Sync Routes ────────────────────────────────────────
app.get('/api/sync', (req, res) => {
  const db = getDb();
  const uid = DEFAULT_USER_ID;

  const tasks = rowsToTasks(execToObjects(db, `SELECT * FROM tasks WHERE user_id = ? ORDER BY "order" ASC`, [uid]));

  const projects = execToObjects(db, `SELECT id, name, color FROM projects WHERE user_id = ?`, [uid]);

  const checklists = execToObjects(db, `SELECT id, name, defaultTag, "order", archived FROM checklists WHERE user_id = ?`, [uid]).map(c => ({ ...c, archived: !!c.archived }));

  const tags = execToObjects(db, `SELECT id, label, color FROM tags WHERE user_id = ?`, [uid]);

  const contexts = execToObjects(db, `SELECT id, label, icon, color FROM contexts WHERE user_id = ?`, [uid]);

  const perspectives = execToObjects(db, `SELECT id, name, icon, filters FROM perspectives WHERE user_id = ?`, [uid]).map(p => { try { return { ...p, filters: JSON.parse(p.filters || '{}') }; } catch { return { ...p, filters: {} }; } });

  res.json({ tasks, projects, checklists, tags, contexts, perspectives });
});

app.post('/api/sync', validate(SyncSchema), (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ error: '数据库未初始化，请稍后重试' });
  }
  const uid = DEFAULT_USER_ID;
  const { tasks, projects, checklists, tags, contexts, perspectives } = req.body;
  const stmts = [];

  try {
    // Delete old data
    db.run(`DELETE FROM tasks WHERE user_id = ?`, [uid]);
    db.run(`DELETE FROM projects WHERE user_id = ?`, [uid]);
    db.run(`DELETE FROM checklists WHERE user_id = ?`, [uid]);
    db.run(`DELETE FROM tags WHERE user_id = ?`, [uid]);
    db.run(`DELETE FROM contexts WHERE user_id = ?`, [uid]);
    db.run(`DELETE FROM perspectives WHERE user_id = ?`, [uid]);

    // Insert new data
    if (tasks && tasks.length > 0) {
      const stmt = db.prepare(`INSERT INTO tasks (id, user_id, title, completed, date, tag, time, duration, projectId, pomodoros, createdAt, "order", importance, urgency, deadline, "repeat", pinned, reminder, completedAt, checklistId, parentId, collapsed, contexts, notes, repeatRule, dependsOn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      stmts.push(stmt);
      tasks.forEach(t => {
        stmt.run([t.id, uid, t.title, t.completed ? 1 : 0, t.date || '', t.tag || 'work', t.time || '', t.duration || 0, t.projectId || '', t.pomodoros || 0, t.createdAt || Date.now(), t.order || 0, t.importance || 'normal', t.urgency || 'normal', t.deadline || '', t.repeat || 'none', t.pinned ? 1 : 0, t.reminder || '', t.completedAt || null, t.checklistId || '', t.parentId || '', t.collapsed ? 1 : 0, JSON.stringify(t.contexts || []), t.notes || '', t.repeatRule || '', JSON.stringify(t.dependsOn || [])]);
      });
    }

    if (projects && projects.length > 0) {
      const stmt = db.prepare(`INSERT INTO projects (id, user_id, name, color) VALUES (?, ?, ?, ?)`);
      stmts.push(stmt);
      projects.forEach(p => stmt.run([p.id, uid, p.name, p.color || '#8bb4d6']));
    }

    if (checklists && checklists.length > 0) {
      const stmt = db.prepare(`INSERT INTO checklists (id, user_id, name, defaultTag, "order", archived) VALUES (?, ?, ?, ?, ?, ?)`);
      stmts.push(stmt);
      checklists.forEach(c => stmt.run([c.id, uid, c.name, c.defaultTag || 'work', c.order || 0, c.archived ? 1 : 0]));
    }

    if (tags && tags.length > 0) {
      const stmt = db.prepare(`INSERT INTO tags (id, user_id, label, color) VALUES (?, ?, ?, ?)`);
      stmts.push(stmt);
      tags.forEach(t => stmt.run([t.id, uid, t.label, t.color || '#8bb4d6']));
    }

    if (contexts && contexts.length > 0) {
      const stmt = db.prepare(`INSERT INTO contexts (id, user_id, label, icon, color) VALUES (?, ?, ?, ?, ?)`);
      stmts.push(stmt);
      contexts.forEach(c => stmt.run([c.id, uid, c.label, c.icon || 'Circle', c.color || '#8bb4d6']));
    }

    if (perspectives && perspectives.length > 0) {
      const stmt = db.prepare(`INSERT INTO perspectives (id, user_id, name, icon, filters) VALUES (?, ?, ?, ?, ?)`);
      stmts.push(stmt);
      perspectives.forEach(p => stmt.run([p.id, uid, p.name, p.icon || 'Filter', JSON.stringify(p.filters || {})]));
    }

    saveDb();
    res.json({ success: true, count: { tasks: tasks?.length || 0, projects: projects?.length || 0, checklists: checklists?.length || 0, tags: tags?.length || 0, contexts: contexts?.length || 0, perspectives: perspectives?.length || 0 } });
  } catch (err) {
    console.error('❌ POST /api/sync 错误:', err.message);
    console.error('   Stack:', err.stack?.split('\n').slice(0,3).join(' | '));
    console.error('   请求体大小:', JSON.stringify(req.body).length, 'bytes');
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  } finally {
    stmts.forEach(s => { try { s.free(); } catch {} });
  }
});

// ─── Individual Task CRUD ─────────────────────────────────
app.post('/api/tasks', validate(TaskSchema), (req, res) => {
  const db = getDb();
  const uid = DEFAULT_USER_ID;
  const t = req.body;

  try {
    db.run(`INSERT INTO tasks (id, user_id, title, completed, date, tag, time, duration, projectId, pomodoros, createdAt, "order", importance, urgency, deadline, "repeat", pinned, reminder, completedAt, checklistId, parentId, collapsed, contexts, notes, repeatRule, dependsOn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [t.id, uid, t.title, t.completed ? 1 : 0, t.date || '', t.tag || 'work', t.time || '', t.duration || 0, t.projectId || '', t.pomodoros || 0, t.createdAt || Date.now(), t.order || 0, t.importance || 'normal', t.urgency || 'normal', t.deadline || '', t.repeat || 'none', t.pinned ? 1 : 0, t.reminder || '', t.completedAt || null, t.checklistId || '', t.parentId || '', t.collapsed ? 1 : 0, JSON.stringify(t.contexts || []), t.notes || '', t.repeatRule || '', JSON.stringify(t.dependsOn || [])]);
    saveDb();
    res.json({ success: true, id: t.id });
  } catch (err) {
    console.error('❌ POST /api/tasks 错误:', err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  if (!id || id.length > 100) return res.status(400).json({ error: '无效的任务ID' });
  const db = getDb();
  const uid = DEFAULT_USER_ID;
  const t = req.body;

  try {
    db.run(`UPDATE tasks SET title=?, completed=?, date=?, tag=?, time=?, duration=?, projectId=?, pomodoros=?, "order"=?, importance=?, urgency=?, deadline=?, "repeat"=?, pinned=?, reminder=?, completedAt=?, checklistId=?, parentId=?, collapsed=?, contexts=?, notes=?, repeatRule=?, dependsOn=? WHERE id=? AND user_id=?`, [t.title, t.completed ? 1 : 0, t.date || '', t.tag || 'work', t.time || '', t.duration || 0, t.projectId || '', t.pomodoros || 0, t.order || 0, t.importance || 'normal', t.urgency || 'normal', t.deadline || '', t.repeat || 'none', t.pinned ? 1 : 0, t.reminder || '', t.completedAt || null, t.checklistId || '', t.parentId || '', t.collapsed ? 1 : 0, JSON.stringify(t.contexts || []), t.notes || '', t.repeatRule || '', JSON.stringify(t.dependsOn || []), req.params.id, uid]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /api/tasks/:id 错误:', err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  if (!id || id.length > 100) return res.status(400).json({ error: '无效的任务ID' });
  const db = getDb();
  const uid = DEFAULT_USER_ID;
  try {
    db.run(`DELETE FROM tasks WHERE id=? AND user_id=?`, [req.params.id, uid]);
    db.run(`DELETE FROM tasks WHERE parentId=? AND user_id=?`, [req.params.id, uid]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE /api/tasks/:id 错误:', err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

// ─── Notification Routes ────────────────────────────────────
const notificationConfigs = new Map();

app.get('/api/notifications/config', (_req, res) => {
  const config = notificationConfigs.get(DEFAULT_USER_ID) || {
    email: '',
    webhookUrl: '',
    enabled: false,
    remindBeforeMinutes: 15,
    remindOnDeadline: true,
    dailyDigest: false,
  };
  res.json(config);
});

app.post('/api/notifications/config', validate(NotificationConfigSchema), (req, res) => {
  const config = {
    email: req.body.email || '',
    webhookUrl: req.body.webhookUrl || '',
    enabled: !!req.body.enabled,
    remindBeforeMinutes: req.body.remindBeforeMinutes || 15,
    remindOnDeadline: !!req.body.remindOnDeadline,
    dailyDigest: !!req.body.dailyDigest,
  };
  notificationConfigs.set(DEFAULT_USER_ID, config);
  res.json({ success: true, config });
});

app.post('/api/notifications/test', async (req, res) => {
  const config = notificationConfigs.get(DEFAULT_USER_ID);
  if (!config || !config.enabled) {
    return res.status(400).json({ error: '请先配置并启用通知' });
  }

  const results = [];

  if (config.webhookUrl) {
    try {
      const webhookRes = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📋 日程管理测试通知',
          message: '这是一条测试通知，您的通知配置生效了！',
          timestamp: new Date().toISOString(),
          type: 'test',
        }),
      });
      if (webhookRes.ok) {
        results.push('✅ Webhook 通知发送成功');
      } else {
        results.push(`❌ Webhook 返回错误: ${webhookRes.status}`);
      }
    } catch (err) {
      results.push(`❌ Webhook 发送失败: ${err.message}`);
    }
  }

  if (results.length === 0) {
    return res.status(400).json({ error: '没有配置任何通知方式' });
  }

  res.json({ success: true, results });
});

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!DEEPSEEK_API_KEY,
    dbReady: !!getDb(),
    timestamp: new Date().toISOString(),
  });
});

// ─── WebDAV Proxy (坚果云同步) ─────────────────────────────
// 前端通过后端代理访问坚果云，绕过浏览器 CORS 限制

function getWebDAVAuthHeader(username, password) {
  return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}

// Test connection
app.post('/api/webdav/test', validate(WebDAVSchema.pick({ url: true, username: true, password: true })), async (req, res) => {
  const { url, username, password } = req.body;
  if (!url || !username || !password) {
    return res.status(400).json({ error: '请填写完整的 WebDAV 配置信息' });
  }
  try {
    const davUrl = url.replace(/\/$/, '') + '/';
    const response = await fetch(davUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': getWebDAVAuthHeader(username, password),
        'Content-Type': 'text/xml',
        'Depth': '0',
      },
    });
    if (response.ok || response.status === 207) {
      res.json({ ok: true, message: '连接成功' });
    } else if (response.status === 401) {
      res.json({ ok: false, message: '账号或密码错误' });
    } else {
      res.json({ ok: false, message: `服务器返回 ${response.status}` });
    }
  } catch (err) {
    res.json({ ok: false, message: err.message || '网络连接失败' });
  }
});

// Pull data from WebDAV
app.post('/api/webdav/pull', async (req, res) => {
  const { url, username, password, filename } = req.body;
  if (!url || !username || !password) {
    return res.status(400).json({ error: '配置信息不完整' });
  }
  const filePath = (url.replace(/\/$/, '')) + '/sunsama/' + (filename || 'sunsama-sync.json');
  try {
    const response = await fetch(filePath, {
      method: 'GET',
      headers: { 'Authorization': getWebDAVAuthHeader(username, password) },
    });
    if (response.status === 404) {
      return res.json({ exists: false, data: null });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: `拉取失败: ${response.status}` });
    }
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      res.json({ exists: true, data });
    } catch {
      res.status(400).json({ error: '文件内容不是有效的 JSON' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || '拉取失败' });
  }
});

// Push data to WebDAV
app.post('/api/webdav/push', async (req, res) => {
  const { url, username, password, filename, content } = req.body;
  if (!url || !username || !password || !content) {
    return res.status(400).json({ error: '配置信息或数据不完整' });
  }
  const auth = getWebDAVAuthHeader(username, password);
  const baseUrl = url.replace(/\/$/, '');
  const dirPath = baseUrl + '/sunsama';
  const filePath = dirPath + '/' + (filename || 'sunsama-sync.json');

  try {
    try {
      await fetch(dirPath + '/', {
        method: 'MKCOL',
        headers: { 'Authorization': auth },
      });
    } catch {
      // MKCOL failed, usually dir already exists (405) or unsupported, continue
    }

    const response = await fetch(filePath, {
      method: 'PUT',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });
    if (response.ok || response.status === 201 || response.status === 204) {
      res.json({ success: true });
    } else {
      const bodyText = await response.text().catch(() => '');
      const isHtml = bodyText.trim().startsWith('<');
      if (response.status === 404) {
        res.status(404).json({ error: '坚果云返回404：请在坚果云网页版中手动创建「sunsama」文件夹后再试。' });
      } else if (isHtml) {
        res.status(response.status).json({ error: `坚果云返回HTML页面(${response.status})，请检查URL是否正确。` });
      } else {
        res.status(response.status).json({ error: `推送失败: ${response.status} ${bodyText.slice(0, 100)}` });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message || '推送失败' });
  }
});

// ─── AI Proxy ─────────────────────────────────────────────
app.post('/api/parse', async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY，请在 .env 文件中设置' });
  }
  try {
    const { messages, temperature = 0.3 } = req.body;
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, temperature }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || `DeepSeek 请求失败 (${response.status})` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('❌ POST /api/parse 错误:', err.message);
    res.status(500).json({ error: err.message || '代理请求失败' });
  }
});

app.post('/api/summary', async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY，请在 .env 文件中设置' });
  }
  try {
    const { messages, temperature = 0.7 } = req.body;
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, temperature }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || `DeepSeek 请求失败 (${response.status})` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('❌ POST /api/summary 错误:', err.message);
    res.status(500).json({ error: err.message || '代理请求失败' });
  }
});

// ─── MindMap AI Expand ──────────────────────────────────────────
app.post('/api/mindmap/expand', validate(MindMapExpandSchema), async (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY' });
  }
  try {
    const { nodeText, parentContext, mode = 'expand' } = req.body;
    if (!nodeText) return res.status(400).json({ error: '缺少 nodeText' });

    const prompts = {
      expand: '你是目标拆解专家。把这个项目目标拆解为子模块。每行一个，格式: "- 子模块名"。最多5个。只返回列表，不要解释。',
      breakdown: '你是项目拆解专家。把用户的任务拆解为可执行的子任务。每行一个，格式: "- 子任务名"。最多6个。只返回列表，不要解释。',
      suggest: '你是项目规划专家。给这个节点建议缺失的依赖或下一步。每行一个，格式: "- 建议"。最多3个。只返回列表，不要解释。',
    };

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompts[mode] || prompts.expand },
          { role: 'user', content: `节点: "${nodeText}"\n父级上下文: ${parentContext || '无'}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'DeepSeek 请求失败' });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const children = text.split('\n')
      .map(l => l.replace(/^[-\d.]+\s*/, '').trim())
      .filter(l => l.length > 0 && l.length < 50)
      .slice(0, 6);

    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI 扩展失败' });
  }
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ 未处理错误:');
  console.error('   消息:', err?.message || err);
  console.error('   堆栈:', err?.stack?.split('\n').slice(0, 4).join(' | '));
  console.error('   请求路径:', _req?.method, _req?.url);
  console.error('   请求体:', JSON.stringify(_req?.body)?.slice(0, 500));
  res.status(500).json({ error: '服务器内部错误，请稍后重试' });
});

// ─── Fallback ─────────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────
async function start() {
  await initDb();

  // Ensure default user exists (id=1) for single-user mode
  const db = getDb();
  const existing = db.exec(`SELECT id FROM users WHERE id = ?`, [DEFAULT_USER_ID]);
  if (!existing.length || !existing[0].values.length) {
    db.run(`INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)`, [DEFAULT_USER_ID, 'default', 'nopassword', new Date().toISOString()]);
    createDefaultData(db, DEFAULT_USER_ID);
    saveDb();
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 日程管理应用已启动`);
    console.log(`📡 端口: ${PORT}`);
    console.log(`🔒 HTTPS: ${IS_PROD ? '✅ 已启用强制跳转' : '⚠️ 开发模式'}`);
    console.log(`🛡️  安全头: ✅ 已设置`);
    console.log(`✅ 参数校验: ✅ Zod schemas`);
    console.log(`🤖 AI 代理: ${DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`🌐 访问: http://localhost:${PORT}\n`);
  });

  // 保活：每 10 分钟自 ping 一次，防止 Render 免费 tier 休眠
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(() => {
    fetch(SELF_URL).catch(() => {/* 自 ping 失败不影响服务 */});
  }, 10 * 60 * 1000);
}

function createDefaultData(db, userId) {
  // Check if user already has data
  const existing = db.exec(`SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?`, [userId]);
  if (existing[0]?.values[0]?.[0] > 0) return;

  const uid = userId;

  // Create default tags
  const defaultTags = [
    { id: `tag_work_${uid}`, label: '工作', color: '#8bb4d6' },
    { id: `tag_personal_${uid}`, label: '个人', color: '#a3c495' },
    { id: `tag_important_${uid}`, label: '重要', color: '#c9a87c' },
    { id: `tag_meeting_${uid}`, label: '会议', color: '#b8a0c8' },
    { id: `tag_shopping_${uid}`, label: '购物', color: '#c4a5a0' },
    { id: `tag_study_${uid}`, label: '学习', color: '#a5a5c4' },
  ];
  const tagStmt = db.prepare(`INSERT INTO tags (id, user_id, label, color) VALUES (?, ?, ?, ?)`);
  defaultTags.forEach(t => tagStmt.run([t.id, uid, t.label, t.color]));
  tagStmt.free();
  tagStmt.free();

  // Create default projects
  const defaultProjects = [
    { id: `p1_${uid}`, name: '网站重构', color: '#8bb4d6' },
    { id: `p2_${uid}`, name: '产品设计', color: '#c9a87c' },
    { id: `p3_${uid}`, name: '市场推广', color: '#a3c495' },
  ];
  const projStmt = db.prepare(`INSERT INTO projects (id, user_id, name, color) VALUES (?, ?, ?, ?)`);
  defaultProjects.forEach(p => projStmt.run([p.id, uid, p.name, p.color]));
  projStmt.free();
  projStmt.free();

  // Create default checklists
  const defaultChecklists = [
    { id: `c1_${uid}`, name: '今日待办', defaultTag: 'work', order: 0 },
    { id: `c2_${uid}`, name: '购物清单', defaultTag: 'shopping', order: 1 },
    { id: `c3_${uid}`, name: '学习计划', defaultTag: 'study', order: 2 },
  ];
  const chkStmt = db.prepare(`INSERT INTO checklists (id, user_id, name, defaultTag, "order", archived) VALUES (?, ?, ?, ?, ?, ?)`);
  defaultChecklists.forEach(c => chkStmt.run([c.id, uid, c.name, c.defaultTag, c.order, 0]));
  chkStmt.free();
  chkStmt.free();

  // Create default contexts
  const defaultContexts = [
    { id: `computer_${uid}`, label: '电脑', icon: 'Monitor', color: '#8bb4d6' },
    { id: `phone_${uid}`, label: '手机', icon: 'Smartphone', color: '#a3c495' },
    { id: `office_${uid}`, label: '办公室', icon: 'Building2', color: '#c9a87c' },
    { id: `outdoor_${uid}`, label: '外出', icon: 'Car', color: '#b8a0c8' },
    { id: `meeting_${uid}`, label: '会议', icon: 'Users', color: '#c4a5a0' },
    { id: `home_${uid}`, label: '家里', icon: 'Home', color: '#8cc4bb' },
  ];
  const ctxStmt = db.prepare(`INSERT INTO contexts (id, user_id, label, icon, color) VALUES (?, ?, ?, ?, ?)`);
  defaultContexts.forEach(c => ctxStmt.run([c.id, uid, c.label, c.icon, c.color]));
  ctxStmt.free();
  ctxStmt.free();

  // Create default perspectives
  const defaultPerspectives = [
    { id: `urgent-important_${uid}`, name: '紧急且重要', icon: 'Flame', filters: { importance: 'important', urgency: 'urgent', completed: false, dateRange: 'all' } },
    { id: `today-due_${uid}`, name: '今日截止', icon: 'CalendarClock', filters: { dateRange: 'today', completed: false } },
    { id: `overdue_${uid}`, name: '已逾期', icon: 'AlertTriangle', filters: { dateRange: 'overdue', completed: false } },
    { id: `work-only_${uid}`, name: '工作聚焦', icon: 'Briefcase', filters: { tags: ['work'], completed: false, dateRange: 'week' } },
    { id: `personal-only_${uid}`, name: '个人事务', icon: 'Coffee', filters: { tags: ['personal'], completed: false, dateRange: 'all' } },
    { id: `high-priority_${uid}`, name: '高优先级', icon: 'Flag', filters: { importance: 'important', completed: false, dateRange: 'all' } },
  ];
  const perStmt = db.prepare(`INSERT INTO perspectives (id, user_id, name, icon, filters) VALUES (?, ?, ?, ?, ?)`);
  defaultPerspectives.forEach(p => perStmt.run([p.id, uid, p.name, p.icon, JSON.stringify(p.filters)]));
  perStmt.free();
  perStmt.free();

  saveDb();
}

start();
