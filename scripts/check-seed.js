// Run with `node scripts/check-seed.js`; no external dependencies required.
// Check the canonical JSON source before producing SQL or starting mock mode.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'db', 'seed');
const schema = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8');
const data = {};

const pk = {
  roles: ['code'], use_cases: ['key'], modules: ['code'], event_stats: ['eventId'], usage: ['month'],
  role_use_cases: ['roleCode', 'useCaseKey'],
  institution_access_modules: ['accessId', 'moduleCode'],
  event_interest: ['userId', 'eventId'],
};
const refs = {
  role_use_cases: { roleCode: 'roles', useCaseKey: 'use_cases' },
  users: { roleCode: 'roles', institutionId: 'institutions' },
  account_history: { userId: 'users', changedBy: 'users' },
  buildings: { facultyId: 'faculties' },
  floors: { buildingId: 'buildings' },
  nodes: { floorId: 'floors' },
  edges: { fromNodeId: 'nodes', toNodeId: 'nodes' },
  rooms: { floorId: 'floors', nodeId: 'nodes', categoryId: 'categories' },
  map_boundaries: { buildingId: 'buildings' },
  map_assets: { floorId: 'floors' },
  map_drafts: { buildingId: 'buildings', savedBy: 'users' },
  requests: { userId: 'users', roomId: 'rooms', nodeId: 'nodes', reviewedBy: 'users' },
  request_quota: { updatedBy: 'users' },
  broadcasts: { sentBy: 'users' },
  notifications: { userId: 'users', broadcastId: 'broadcasts' },
  feedback: { userId: 'users' },
  news: { authorId: 'users', replacedFrom: 'news' },
  events: { authorId: 'users', categoryId: 'categories', tempPlaceCategoryId: 'categories', replacedFrom: 'events' },
  event_interest: { userId: 'users', eventId: 'events' },
  event_stats: { eventId: 'events' },
  contracts: { institutionId: 'institutions' },
  institution_access: { institutionId: 'institutions' },
  institution_access_modules: { accessId: 'institution_access', moduleCode: 'modules' },
  access_history: { accessId: 'institution_access', actorId: 'users' },
  edit_logs: {
    userId: 'users', nodeId: 'nodes', edgeId: 'edges', floorId: 'floors', roomId: 'rooms',
    mapBoundaryId: 'map_boundaries', mapAssetId: 'map_assets', newsId: 'news', eventId: 'events',
    categoryId: 'categories', broadcastId: 'broadcasts', requestQuotaId: 'request_quota',
    requestId: 'requests', feedbackId: 'feedback',
  },
};
const tables = [...schema.matchAll(/^CREATE TABLE\s+([a-z_]+)\s*\(/gm)].map(match => match[1]);
assert.equal(tables.length, 32, 'Normalized schema must contain exactly 32 tables');
assert.equal(new Set(tables).size, tables.length, 'Duplicate table in schema');
for (const table of tables) {
  const file = path.join(dir, `${table}.json`);
  assert.ok(fs.existsSync(file), `Missing seed JSON for ${table}`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(Array.isArray(rows), `${table} seed must be an array`);
  data[table] = rows;
  const keys = pk[table] || ['id'];
  const seen = new Set();
  for (const row of rows) {
    for (const k of keys) assert.ok(row[k] !== undefined && row[k] !== null, `${table}: missing ${k}`);
    const key = JSON.stringify(keys.map(k => row[k]));
    assert.ok(!seen.has(key), `${table}: duplicate primary key ${key}`);
    seen.add(key);
  }
}
const ids = Object.fromEntries(tables.map(table => [table, new Set(data[table].map(row => JSON.stringify((pk[table] || ['id']).map(k => row[k]))))]));
const find = (table, value) => ids[table].has(JSON.stringify([value]));
let checked = 0;
for (const [table, links] of Object.entries(refs)) {
  for (const row of data[table]) {
    for (const [field, target] of Object.entries(links)) {
      const value = row[field];
      if (value === undefined || value === null) continue;
      assert.ok(find(target, value), `${table}.${field}=${JSON.stringify(value)} missing from ${target}`);
      checked++;
    }
  }
}
for (const table of ['institutions', 'roles', 'buildings', 'nodes', 'users']) {
  const uniqueKey = { institutions: 'name', roles: 'code', buildings: 'code', nodes: 'nodeKey', users: 'email' }[table];
  const values = data[table].map(row => row[uniqueKey]);
  assert.equal(new Set(values).size, values.length, `${table}.${uniqueKey} has duplicates`);
}
for (const [table, fields] of [['floors', ['buildingId', 'floorNo']], ['rooms', ['floorId', 'code']], ['institution_access', ['institutionId']]]) {
  const values = data[table].map(row => JSON.stringify(fields.map(k => row[k])));
  assert.equal(new Set(values).size, values.length, `${table} has a duplicate normalized unique key`);
}
assert.ok(data.users.every(user => !('password' in user) && !('passwordHash' in user)), 'Passwords should be generated as hashes by the seed builder');
assert.ok(data.edges.every(edge => edge.fromNodeId !== edge.toNodeId), 'Self-loop edges are forbidden');
const labelFk = ['nodeId','edgeId','floorId','roomId','mapBoundaryId','mapAssetId','newsId','eventId','categoryId','broadcastId','requestQuotaId','requestId','feedbackId'];
assert.ok(data.edit_logs.every(log => labelFk.filter(key => log[key] != null).length <= 1), 'edit_logs target FK must be singular');
const sql = fs.readFileSync(path.join(root, 'db', 'seed.sql'), 'utf8');
for (const [table, rows] of Object.entries(data)) {
  if (rows.length) assert.ok(sql.includes(`INSERT INTO ${table} (`), `${table}: generated SQL is stale or missing`);
}
console.log(`PASS: ${tables.length} unique schema tables, ${Object.values(data).reduce((n, rows) => n + rows.length, 0)} seed rows, ${checked} resolved FK references`);
console.log('PASS: unique constraints, edit-log target cardinality and generated SQL coverage');
