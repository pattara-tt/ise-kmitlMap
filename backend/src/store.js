import { AsyncLocalStorage } from "node:async_hooks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, "../../db/seed");
const today = () => new Date().toISOString().slice(0, 10);
// โควต้านับวัน/เดือนตามเวลาท้องถิ่น (ตั้งค่าได้ด้วย env QUOTA_TIMEZONE)
const QUOTA_TZ = process.env.QUOTA_TIMEZONE || "Asia/Bangkok";
const quotaDayKey = (v) => {
  if (v == null || v === "") return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: QUOTA_TZ }); // YYYY-MM-DD
};
const uid = (p = "ID") => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const USE_PG = !!(process.env.DATABASE_URL || process.env.INSTANCE_UNIX_SOCKET);

const FILES = {
  institutions: "institutions", roles: "roles", useCases: "use_cases", roleUseCases: "role_use_cases",
  users: "users", accountHistory: "account_history", faculties: "faculties", buildings: "buildings",
  floors: "floors", nodes: "nodes", edges: "edges", categories: "categories", rooms: "rooms",
  mapBoundaries: "map_boundaries", mapAssets: "map_assets", mapDrafts: "map_drafts", requests: "requests",
  requestQuota: "request_quota", broadcasts: "broadcasts", notifications: "notifications", feedback: "feedback",
  news: "news", events: "events", eventInterest: "event_interest", eventStats: "event_stats", contracts: "contracts",
  modules: "modules", institutionAccess: "institution_access", institutionAccessModules: "institution_access_modules",
  accessHistory: "access_history", editLogs: "edit_logs", usage: "usage",
};

const PK = { roles: "code", useCases: "key", modules: "code", eventStats: "eventId", usage: "month" };

const ASSET_FILE_PREFIX = "__SCIMAP_ASSET_V1__:";
function unpackAsset(row) {
  if (!row || typeof row.file !== "string" || !row.file.startsWith(ASSET_FILE_PREFIX)) return row;
  try { const meta = JSON.parse(row.file.slice(ASSET_FILE_PREFIX.length)); return { ...row, file: meta.file || "", placement: meta.placement || null }; } catch { return row; }
}
function packAsset(row) {
  if (!row || !("placement" in row)) return row;
  const { placement, ...rest } = row;
  return { ...rest, file: ASSET_FILE_PREFIX + JSON.stringify({ file: rest.file || "", placement: placement || null }) };
}


function packRequest(row) {
  if (!row) return row;
  const out = { ...row };
  for (const key of ["before", "after"]) if (out[key] != null && typeof out[key] !== "string") out[key] = JSON.stringify(out[key]);
  return out;
}
function unpackRequest(row) {
  if (!row) return row;
  const out = { ...row };
  for (const key of ["before", "after"]) {
    if (typeof out[key] === "string" && /^[\[{]/.test(out[key].trim())) { try { out[key] = JSON.parse(out[key]); } catch {} }
  }
  return out;
}

const COMPOSITE = {
  roleUseCases: ["roleCode", "useCaseKey"],
  institutionAccessModules: ["accessId", "moduleCode"],
  eventInterest: ["userId", "eventId"],
};

function readSeed(file) {
  const p = path.join(SEED_DIR, `${file}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function seed() {
  const out = {};
  for (const [collection, file] of Object.entries(FILES)) {
    const rows = readSeed(file);
    out[collection] = Array.isArray(rows) ? rows : [rows];
  }
  // รหัสเริ่มต้นของ seed ถูก hash ก่อนใช้งานทั้ง mock และ PostgreSQL; ไม่มี plaintext ใน seed JSON/DB
  out.users = out.users.map((u) => ({ ...u, passwordHash: bcrypt.hashSync("1234", 10) }));
  return out;
}

const g = globalThis;
// โหลด seed JSON เฉพาะโหมด mock เท่านั้น
// ในโหมด PostgreSQL ไม่ควรพึ่งไฟล์ db/seed ตอน startup; ข้อมูลถูกอ่านจาก DB ผ่าน pg.js
if (!g.__SCIMAP_DB__) g.__SCIMAP_DB__ = USE_PG ? {} : seed();
export const db = g.__SCIMAP_DB__;

async function pg() { return import("./pg.js"); }

const mockTransactionContext = new AsyncLocalStorage();
let mockQueue = Promise.resolve();
export async function withTransaction(operation) {
  if (USE_PG) return (await pg()).withTransaction(operation);
  if (mockTransactionContext.getStore()) return operation();
  // Serialize mock write requests so a rollback doesn't erase another
  // request's edits while both requests are waiting on async work.
  const previous = mockQueue;
  let unlock;
  mockQueue = new Promise((resolve) => { unlock = resolve; });
  await previous;
  const snapshot = structuredClone(db);
  try {
    return await mockTransactionContext.run(true, operation);
  } catch (error) {
    for (const key of Object.keys(db)) delete db[key];
    Object.assign(db, snapshot);
    throw error;
  } finally {
    unlock();
  }
}
export async function list(name) {
  if (USE_PG) return (await pg()).list(name);
  if (name === "requests") return (db.requests || []).map(unpackRequest);
  if (name === "rooms") {
    const now = Date.now();
    const active = (db.events || []).filter((e) => e.published && e.roomId && e.temporaryRoomType &&
      (!e.startAt || new Date(e.startAt).getTime() <= now) &&
      (!e.endAt || now < new Date(e.endAt).getTime()))
      .sort((a,b) => new Date(b.startAt || 0) - new Date(a.startAt || 0));
    const byRoom = new Map();
    for (const e of active) if (!byRoom.has(String(e.roomId))) byRoom.set(String(e.roomId), e);
    return (db.rooms || []).map((room) => {
      const e = byRoom.get(String(room.id));
      return e ? { ...room, type: e.temporaryRoomType, originalType: room.type, typeOverrideEventId: e.id, typeOverrideUntil: e.endAt || null } : room;
    });
  }
  if (name === "eventStats") {
    const statsByEvent = new Map((db.eventStats || []).map((row) => [row.eventId, row]));
    return (db.events || []).map((event) => {
      const row = statsByEvent.get(event.id) || { eventId: event.id, searched: 0 };
      return { ...row, interested: (db.eventInterest || []).filter((i) => i.eventId === event.id).length };
    });
  }
  if (name === "mapDrafts") {
    return (db.mapDrafts || []).map((row) => ({ ...row, savedByName: (db.users || []).find((u) => u.id === row.savedBy)?.name || null }));
  }
  if (name === "news" || name === "events") {
    return (db[name] || []).map((row) => ({ ...row, authorName: (db.users || []).find((u) => u.id === row.authorId)?.name || null }));
  }
  if (name === "editLogs") {
    return (db.editLogs || []).map((row) => ({ ...row, userName: (db.users || []).find((u) => u.id === row.userId)?.name || null }));
  }
  if (name === "feedback") {
    return (db.feedback || []).map((row) => ({ ...row, userName: (db.users || []).find((u) => u.id === row.userId)?.name || null }));
  }
  if (name === "accessHistory") {
    return (db.accessHistory || []).map((row) => ({ ...row, actorName: (db.users || []).find((u) => u.id === row.actorId)?.name || null }));
  }
  if (name === "accountHistory") {
    return (db.accountHistory || []).map((row) => ({ ...row,
      userName: (db.users || []).find((u) => u.id === row.userId)?.name || null,
      actorName: (db.users || []).find((u) => u.id === row.changedBy)?.name || null,
    }));
  }
  if (name === "broadcasts") {
    return (db.broadcasts || []).map((row) => ({ ...row, senderName: (db.users || []).find((u) => u.id === row.sentBy)?.name || null }));
  }
  const rows = db[name] || [];
  return name === "mapAssets" ? rows.map(unpackAsset) : rows;
}

function matchesId(row, name, id) {
  const composite = COMPOSITE[name];
  if (composite) {
    if (!id || typeof id !== "object") return false;
    return composite.every((k) => row[k] === id[k]);
  }
  const pk = PK[name] || "id";
  return row[pk] === id;
}

export async function insert(name, item) {
  if (USE_PG) return (await pg()).insert(name, item);
  if (!Array.isArray(db[name])) db[name] = [];
  const pk = PK[name] || "id";
  const row = name === "mapAssets" ? packAsset({ ...item }) : name === "requests" ? packRequest({ ...item }) : { ...item };
  if (!COMPOSITE[name] && pk === "id" && !row.id) row.id = uid(name.slice(0, 2).toUpperCase());
  if (db[name].some((existing) => matchesId(existing, name, COMPOSITE[name]
    ? Object.fromEntries(COMPOSITE[name].map((k) => [k, row[k]])) : row[pk]))) {
    const error = new Error(`Duplicate key for ${name}`);
    error.code = "23505"; // same unique-violation code as PostgreSQL
    throw error;
  }
  db[name].unshift(row);
  return row;
}

export async function update(name, id, patch) {
  if (USE_PG) return (await pg()).update(name, id, patch);
  const arr = db[name] || [];
  const i = arr.findIndex((r) => matchesId(r, name, id));
  if (i < 0) return null;
  const nextPatch = name === "mapAssets" ? packAsset({ ...unpackAsset(arr[i]), ...patch }) : name === "requests" ? packRequest(patch) : patch;
  arr[i] = { ...arr[i], ...nextPatch };
  return name === "mapAssets" ? unpackAsset(arr[i]) : name === "requests" ? unpackRequest(arr[i]) : arr[i];
}

export async function remove(name, id) {
  if (USE_PG) return (await pg()).remove(name, id);
  const arr = db[name] || [];
  const i = arr.findIndex((r) => matchesId(r, name, id));
  if (i < 0) return false;
  const row = arr[i];
  arr.splice(i, 1);

  // Mirror edit_logs target FKs with ON DELETE SET NULL in PostgreSQL.
  const logFk = EDIT_TARGET_FK[name];
  if (logFk) db.editLogs = (db.editLogs || []).map((log) => log[logFk] === row.id ? { ...log, [logFk]: null } : log);

  // Mirror the key FK actions from the normalized schema so mock mode behaves
  // like PostgreSQL for the flows exercised by the application.
  if (name === "nodes") {
    const removedEdgeIds = new Set((db.edges || []).filter((e) => e.fromNodeId === row.id || e.toNodeId === row.id).map((e) => e.id));
    db.edges = (db.edges || []).filter((e) => !removedEdgeIds.has(e.id));
    db.rooms = (db.rooms || []).map((r) => r.nodeId === row.id ? { ...r, nodeId: null } : r);
    db.editLogs = (db.editLogs || []).map((log) => removedEdgeIds.has(log.edgeId) ? { ...log, edgeId: null } : log);
  }
  if (name === "events") {
    db.eventInterest = (db.eventInterest || []).filter((x) => x.eventId !== row.id);
    db.eventStats = (db.eventStats || []).filter((x) => x.eventId !== row.id);
  }
  if (name === "floors") {
    const nodeIds = new Set((db.nodes || []).filter((n) => n.floorId === row.id).map((n) => n.id));
    const edgeIds = new Set((db.edges || []).filter((e) => nodeIds.has(e.fromNodeId) || nodeIds.has(e.toNodeId)).map((e) => e.id));
    db.nodes = (db.nodes || []).filter((n) => !nodeIds.has(n.id));
    db.edges = (db.edges || []).filter((e) => !edgeIds.has(e.id));
    db.rooms = (db.rooms || []).filter((r) => r.floorId !== row.id);
    db.mapAssets = (db.mapAssets || []).filter((a) => a.floorId !== row.id);
    db.editLogs = (db.editLogs || []).map((log) => ({ ...log,
      ...(nodeIds.has(log.nodeId) ? { nodeId: null } : {}),
      ...(edgeIds.has(log.edgeId) ? { edgeId: null } : {}),
    }));
  }
  return true;
}

export async function getRequestQuota(userId) {
  if (USE_PG) {
    const rows = await (await pg()).list("requestQuota");
    return computeQuota(rows[0], await (await pg()).list("requests"), userId);
  }
  return computeQuota(db.requestQuota?.[0], db.requests || [], userId);
}

function computeQuota(quota = {}, requests, userId) {
  const d = quotaDayKey(Date.now());
  const m = d.slice(0, 7);
  const active = requests.filter((r) => r.userId === userId && r.status !== "cancelled");
  const dailyCount = active.filter((r) => quotaDayKey(r.createdAt) === d).length;
  const monthlyCount = active.filter((r) => quotaDayKey(r.createdAt).slice(0, 7) === m).length;
  const dailyLimit = quota.perUserPerDay ?? 3;
  const monthlyLimit = quota.perUserPerMonth ?? 20;
  return { dailyCount, monthlyCount, dailyLimit, monthlyLimit, canSubmit: dailyCount < dailyLimit && monthlyCount < monthlyLimit };
}

export const EDIT_TARGET_FK = {
  nodes: "nodeId", edges: "edgeId", floors: "floorId", rooms: "roomId", mapBoundaries: "mapBoundaryId",
  mapAssets: "mapAssetId", news: "newsId", events: "eventId", categories: "categoryId", broadcasts: "broadcastId",
  requestQuota: "requestQuotaId", requests: "requestId", feedback: "feedbackId",
};

export async function logEdit({ userId, action, target, before = null, after = null }) {
  const fk = EDIT_TARGET_FK[target?.type];
  if (!fk) throw new Error(`Unsupported edit-log target type: ${target?.type || ""}`);
  const row = {
    id: uid("EL"), userId: userId || null, action,
    before: before == null ? null : (typeof before === "string" ? before : JSON.stringify(before)),
    after: after == null ? null : (typeof after === "string" ? after : JSON.stringify(after)),
    editedAt: new Date().toISOString(), targetLabel: target.label || target.id || null,
    [fk]: target.id || null,
  };
  return insert("editLogs", row);
}

export { uid, today };