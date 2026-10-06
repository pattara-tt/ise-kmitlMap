// Run ONLY against a disposable database after applying schema + seed or migration.
// Requires DATABASE_URL or INSTANCE_UNIX_SOCKET and backend's `pg` dependency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPool } from '../backend/src/pg.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL && !process.env.INSTANCE_UNIX_SOCKET) {
  throw new Error('Set DATABASE_URL or INSTANCE_UNIX_SOCKET for a disposable test database');
}
const schema = readFileSync(path.join(root, 'db/schema.sql'), 'utf8');
const expected = [...schema.matchAll(/^CREATE TABLE\s+([a-z_]+)\s*\(/gm)].map(m => m[1]);
assert.equal(expected.length, 32);
const pool = await getPool();
try {
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const names = new Set(tables.rows.map(x => x.tablename));
  for (const table of expected) assert.ok(names.has(table), `Missing normalized table ${table}`);
  const { rows: columns } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'");
  assert.ok(columns.some(c => c.column_name === 'password_hash'));
  assert.ok(!columns.some(c => c.column_name === 'password'), 'Plaintext password column still exists');
  const users = await pool.query('SELECT id, password_hash FROM users');
  assert.ok(users.rows.every(u => /^\$2[aby]\$/.test(u.password_hash)), 'Non-bcrypt password found');
  const roleCount = await pool.query('SELECT count(*)::int AS n FROM roles');
  assert.equal(roleCount.rows[0].n, 7);
  const roleMenus = await pool.query('SELECT r.code, count(ru.use_case_key)::int AS menus FROM roles r LEFT JOIN role_use_cases ru ON ru.role_code=r.code GROUP BY r.code');
  assert.ok(roleMenus.rows.every(r => r.menus >= 2), 'Role has no common use cases');
  const doubleLog = await pool.query(`SELECT count(*)::int AS n FROM edit_logs WHERE num_nonnulls(
    node_id,edge_id,floor_id,room_id,map_boundary_id,map_asset_id,
    news_id,event_id,category_id,broadcast_id,request_quota_id,request_id,feedback_id
  ) > 1`);
  assert.equal(doubleLog.rows[0].n, 0);
  const badStats = await pool.query(`SELECT count(*)::int AS n FROM event_stats_view v
    WHERE interested <> (SELECT count(*) FROM event_interest i WHERE i.event_id=v.event_id)`);
  assert.equal(badStats.rows[0].n, 0);
  console.log(`PASS: ${expected.length} normalized tables, ${users.rowCount} bcrypt users, 7 roles with use cases`);
  console.log('PASS: event_stats_view derives interested; edit_logs has at most one target FK');
} finally {
  await pool.end();
}
