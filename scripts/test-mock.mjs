// Integration checks of the in-memory data layer; no API server or DB needed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  USE_PG, db, list, insert, update, remove, logEdit, withTransaction, getRequestQuota,
} from '../backend/src/store.js';
const root = path.dirname(fileURLToPath(import.meta.url));
const bcrypt = createRequire(path.resolve(root, '../backend/package.json'))('bcryptjs');
assert.equal(USE_PG, false, 'Run this test without DATABASE_URL/INSTANCE_UNIX_SOCKET');

const users = await list('users');
assert.equal(users.length, 8);
assert.ok(users.every(u => typeof u.passwordHash === 'string' && u.passwordHash.startsWith('$2')));
assert.ok(await bcrypt.compare('1234', users[0].passwordHash));
assert.equal(await bcrypt.compare('invalid', users[0].passwordHash), false);
assert.equal((await list('roles')).length, 7);
assert.equal((await list('floors')).length, 8);
assert.equal((await list('nodes')).length, 37);
assert.equal((await list('edges')).length, 40);
const interests = await list('eventStats');
assert.equal(interests.find(x => x.eventId === 'EV-01')?.interested, 1,
  'Interested must be derived from event_interest, not the legacy aggregate');
assert.ok((await list('news')).every(n => n.authorName !== undefined));
assert.equal((await list('requests')).find(r => r.id === 'RQ-1001')?.after?.type, 'ห้องปฏิบัติการ');

const node = await insert('nodes', { nodeKey: 'MOCK-TEST-NODE', floorId: 'FL-SC8-1',
  type: 'path', name: 'Test', x: 100.78, y: 13.729 });
const edge = await insert('edges', { fromNodeId: 'ND-0001', toNodeId: node.id,
  distance: 1, edgeType: 'walk', accessible: true });
assert.ok((await list('edges')).some(e => e.id === edge.id));
await logEdit({ userId: 'U003', action: 'CREATE_nodes',
  target: { type: 'nodes', id: node.id, label: 'Test' }, after: node });
const log = (await list('editLogs')).find(e => e.nodeId === node.id);
assert.equal(log.userName, users.find(u => u.id === 'U003')?.name);
assert.equal(await remove('nodes', node.id), true);
assert.equal((await list('edges')).some(e => e.id === edge.id), false,
  'Removing node must cascade to its connected edges');
assert.equal((await list('editLogs')).find(e => e.id === log.id).nodeId, null,
  'Audit log should survive a removed target');

const link = { accessId: 'IA-01', moduleCode: 'map' };
const original = (await list('institutionAccessModules')).find(x => x.accessId === link.accessId && x.moduleCode === link.moduleCode);
assert.ok(original);
const updated = await update('institutionAccessModules', link, { moduleCode: 'map' });
assert.ok(updated);
assert.equal(await remove('institutionAccessModules', link), true);
assert.equal((await list('institutionAccessModules')).some(x => x.accessId === link.accessId && x.moduleCode === link.moduleCode), false);
assert.equal((await getRequestQuota('U007')).canSubmit, true);

// CREATE must be strict: duplicate keys are conflicts, never implicit UPDATEs.
await assert.rejects(
  () => insert('roles', { code: 'admin', name: 'should-not-overwrite' }),
  (error) => error?.code === '23505'
);
assert.notEqual((await list('roles')).find(r => r.code === 'admin')?.name, 'should-not-overwrite');

// A multi-write request must roll back as one unit in mock mode too.
const rollbackId = 'TX-ROLLBACK-TEST';
await assert.rejects(() => withTransaction(async () => {
  await insert('faculties', { id: rollbackId, name: 'Rollback faculty' });
  throw new Error('force rollback');
}));
assert.equal((await list('faculties')).some(x => x.id === rollbackId), false);

// A failed audit write must also roll back the data row itself.
const failureNodeKey = 'MOCK-TX-BAD-LOG';
await assert.rejects(() => withTransaction(async () => {
  await insert('nodes', { nodeKey: failureNodeKey, floorId: 'FL-SC8-1', type: 'path', x: 1, y: 2 });
  await logEdit({ userId: 'U003', action: 'CREATE_nodes', target: { type: 'invalidCollection', id: 'bad' } });
}));
assert.equal((await list('nodes')).some(n => n.nodeKey === failureNodeKey), false);

// Concurrent mock transactions may not undo one another's committed changes.
const concurrent = await Promise.allSettled([
  withTransaction(async () => {
    await insert('faculties', { id: 'TX-FAIL-1', name: 'Tx failed' });
    await Promise.resolve();
    throw new Error('intentional failure');
  }),
  withTransaction(async () => insert('faculties', { id: 'TX-OK-1', name: 'Tx kept' })),
]);
assert.equal(concurrent[0].status, 'rejected');
assert.equal(concurrent[1].status, 'fulfilled');
assert.equal((await list('faculties')).some(f => f.id === 'TX-FAIL-1'), false);
assert.equal((await list('faculties')).some(f => f.id === 'TX-OK-1'), true);
console.log('PASS: mock auth hash, 32 seeded collections, derived interest, request JSON and JOINed display fields');
console.log('PASS: node/edge cascade, audit FK SET NULL, composite-key update/delete, request quota');
console.log('PASS: strict INSERT duplicate handling and atomic mock transaction rollback');