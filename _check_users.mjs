import { getDb } from './db.js';
const db = getDb();
const r = db.exec('SELECT id, username FROM users');
if (r.length > 0 && r[0].values.length > 0) {
  r[0].values.forEach(v => console.log(`ID: ${v[0]}, 用户名: ${v[1]}`));
} else {
  console.log('数据库中没有用户记录');
}
process.exit(0);
