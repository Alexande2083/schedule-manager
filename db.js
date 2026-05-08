import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data.db');

let db = null;

export async function initDb() {
  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    try {
      const buffer = readFileSync(DB_PATH);
      if (buffer.length === 0) {
        console.warn('⚠️  data.db 为空文件，重新创建');
        db = new SQL.Database();
      } else {
        db = new SQL.Database(buffer);
      }
    } catch (e) {
      console.error('❌ 加载 data.db 失败，将重新创建:', e.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode for better concurrent access
  db.run('PRAGMA journal_mode=WAL');
  // Clean up any stale WAL files
  db.run('PRAGMA wal_checkpoint(TRUNCATE)');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      date TEXT,
      tag TEXT DEFAULT 'work',
      time TEXT,
      duration INTEGER DEFAULT 0,
      projectId TEXT,
      pomodoros INTEGER DEFAULT 0,
      createdAt INTEGER,
      "order" INTEGER DEFAULT 0,
      importance TEXT DEFAULT 'normal',
      urgency TEXT DEFAULT 'normal',
      deadline TEXT,
      repeat TEXT DEFAULT 'none',
      pinned INTEGER DEFAULT 0,
      reminder TEXT,
      completedAt INTEGER,
      checklistId TEXT,
      parentId TEXT,
      collapsed INTEGER DEFAULT 0,
      contexts TEXT DEFAULT '[]',
      notes TEXT,
      repeatRule TEXT,
      dependsOn TEXT DEFAULT '[]',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#8bb4d6',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      defaultTag TEXT DEFAULT 'work',
      "order" INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT '#8bb4d6',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      icon TEXT DEFAULT 'Circle',
      color TEXT DEFAULT '#8bb4d6',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS perspectives (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Filter',
      filters TEXT DEFAULT '{}',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDb();
  return db;
}

export function getDb() {
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

// Helper: convert SQLite row (with JSON fields) to JS object
export function rowToTask(row) {
  if (!row) return null;
  return {
    ...row,
    completed: !!row.completed,
    pinned: !!row.pinned,
    collapsed: !!row.collapsed,
    contexts: safeJsonParse(row.contexts, []),
    dependsOn: safeJsonParse(row.dependsOn, []),
  };
}

export function rowsToTasks(rows) {
  return rows.map(rowToTask);
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
