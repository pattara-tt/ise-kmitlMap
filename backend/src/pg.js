import { AsyncLocalStorage } from "node:async_hooks";

export const TABLES = {
  institutions: "institutions", roles: "roles", useCases: "use_cases", roleUseCases: "role_use_cases", users: "users",
  accountHistory: "account_history", faculties: "faculties", buildings: "buildings", floors: "floors", nodes: "nodes",
  edges: "edges", categories: "categories", roomTypes: "room_types", rooms: "rooms", mapBoundaries: "map_boundaries", mapAssets: "map_assets",
  mapDrafts: "map_drafts", requests: "requests", requestQuota: "request_quota", broadcasts: "broadcasts",
  notifications: "notifications", feedback: "feedback", news: "news", events: "events", eventInterest: "event_interest",
  eventStats: "event_stats", contracts: "contracts", modules: "modules", institutionAccess: "institution_access",
  institutionAccessModules: "institution_access_modules", accessHistory: "access_history", editLogs: "edit_logs", usage: "usage", searchLogs: "search_logs",
};

const PK = { roles: "code", useCases: "key", modules: "code", eventStats: "event_id", usage: "month" };
const COMPOSITE = {
  roleUseCases: ["role_code", "use_case_key"],
  institutionAccessModules: ["access_id", "module_code"],
  eventInterest: ["user_id", "event_id"],
};
const ORDER = {
  institutions: "created_at DESC", roles: "code ASC", useCases: "sort_order ASC", roleUseCases: "role_code ASC, use_case_key ASC",
  users: "created_at DESC", accountHistory: "changed_at DESC", faculties: "name ASC", buildings: "code ASC",
  floors: "building_id ASC, floor_no ASC", nodes: "floor_id ASC, node_key ASC", edges: "from_node_id ASC, to_node_id ASC, id ASC",
  categories: "name ASC", roomTypes: "name ASC", rooms: "created_at DESC", mapBoundaries: "updated_at DESC", mapAssets: "updated_at DESC",
  mapDrafts: "saved_at DESC", requests: "created_at DESC", requestQuota: "updated_at DESC", broadcasts: "created_at DESC",
  notifications: "created_at DESC", feedback: "created_at DESC", news: "created_at DESC", events: "start_at DESC NULLS LAST",
  eventInterest: "created_at DESC", contracts: "created_at DESC", modules: "code ASC", institutionAccess: "updated_at DESC",
  institutionAccessModules: "access_id ASC, module_code ASC", accessHistory: "changed_at DESC", editLogs: "edited_at DESC", usage: "month ASC", searchLogs: "created_at DESC",
};

export const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
export const rowOut = (r) => r ? Object.fromEntries(Object.entries(r).map(([k,v]) => [camel(k),v])) : r;


const ASSET_FILE_PREFIX = "__SCIMAP_ASSET_V1__:";
function unpackAsset(row) {
  if (!row || typeof row.file !== "string" || !row.file.startsWith(ASSET_FILE_PREFIX)) return row;
  try { 
    const meta = JSON.parse(row.file.slice(ASSET_FILE_PREFIX.length));
     return { 
      ...row, 
      file: meta.file || "",
      placement: meta.placement || null,
      customFloor: meta.customFloor?? null,
      boundaryId: meta.boundaryId ?? null,
      buildingName: meta.buildingName ?? null,
     }; 
  } catch { return row; }
}

function packAsset(row) {
  if (!row) return row;
  const { 
    placement,
    customFloor,
    boundaryId,
    buildingName,
     ...rest } = row;
  return { 
    ...rest, 
    file: ASSET_FILE_PREFIX + JSON.stringify({ 
      file: rest.file || "", 
      placement: placement || null,
      customFloor: customFloor ?? null,
      boundaryId: boundaryId ?? null,
      buildingName: buildingName?? null,
    }),
  };
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

const JSON_COLS = { mapBoundaries: ["geometry"] };
function packJson(name, row) {
  const cols = JSON_COLS[name];
  if (!cols || !row) return row;
  const out = { ...row };
  for (const c of cols) if (out[c] != null && typeof out[c] !== "string") out[c] = JSON.stringify(out[c]);
  return out;
}
function unpackJson(name, row) {
  const cols = JSON_COLS[name];
  if (!cols || !row) return row;
  const out = { ...row };
  for (const c of cols) if (typeof out[c] === "string") { try { out[c] = JSON.parse(out[c]); } catch {} }
  return out;
}

let pool;
export async function getPool() {
  if (pool) return pool;
  let Pool;
  try { const mod = await import("pg"); Pool = (mod.default || mod).Pool; }
  catch { throw new Error("ต้องติดตั้ง pg ก่อนใช้งาน PostgreSQL"); }
  const socket = process.env.INSTANCE_UNIX_SOCKET;
  pool = new Pool(socket ? { host: socket, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME, max: 5 }
    : { connectionString: process.env.DATABASE_URL, max: 5, ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  return pool;
}
// All statements within one write request share the same PostgreSQL client.
// This keeps the data mutation and its audit/history records atomic.
const transactionContext = new AsyncLocalStorage();
export async function query(text, params = []) {
  const client = transactionContext.getStore();
  return client ? client.query(text, params) : (await getPool()).query(text, params);
}
export async function withTransaction(operation) {
  if (transactionContext.getStore()) return operation(); // reuse a caller's transaction
  const client = await (await getPool()).connect();
  try {
    await client.query("BEGIN");
    const result = await transactionContext.run(client, operation);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); }
    catch (rollbackError) { console.error("[scimap] rollback failed:", rollbackError); }
    throw error;
  } finally {
    client.release();
  }
}
function table(name) { const t=TABLES[name]; if(!t) throw new Error("ไม่รู้จัก collection: "+name); return t; }

const JOINED_LISTS = {
  editLogs: `SELECT e.*, u.name AS user_name FROM edit_logs e LEFT JOIN users u ON u.id=e.user_id`,
  feedback: `SELECT f.*, u.name AS user_name FROM feedback f LEFT JOIN users u ON u.id=f.user_id`,
  requests: `SELECT r.*, u.name AS user_name FROM requests r LEFT JOIN users u ON u.id=r.user_id`,
  accessHistory: `SELECT h.*, u.name AS actor_name FROM access_history h LEFT JOIN users u ON u.id=h.actor_id`,
  accountHistory: `SELECT h.*, u.name AS user_name, a.name AS actor_name FROM account_history h LEFT JOIN users u ON u.id=h.user_id LEFT JOIN users a ON a.id=h.changed_by`,
  broadcasts: `SELECT b.*, u.name AS sender_name FROM broadcasts b LEFT JOIN users u ON u.id=b.sent_by`,
  news: `SELECT n.*, u.name AS author_name FROM news n LEFT JOIN users u ON u.id=n.author_id`,
  events: `SELECT e.*, u.name AS author_name FROM events e LEFT JOIN users u ON u.id=e.author_id`,
  mapDrafts: `SELECT d.*, u.name AS saved_by_name FROM map_drafts d LEFT JOIN users u ON u.id=d.saved_by`,
};
const JOINED_ORDER = {
  editLogs: "e.edited_at DESC", feedback: "f.created_at DESC", requests: "r.created_at DESC", accessHistory: "h.changed_at DESC",
  accountHistory: "h.changed_at DESC", broadcasts: "b.created_at DESC", news: "n.created_at DESC",
  events: "e.start_at DESC NULLS LAST", mapDrafts: "d.saved_at DESC",
};
export async function list(name) {
  if (name === "eventStats") { const { rows } = await query(`SELECT * FROM event_stats_view ORDER BY event_id`); return rows.map(rowOut); }
  const order = JOINED_ORDER[name] || ORDER[name] || (PK[name] ? snake(PK[name]) : "id ASC");
  const sql = JOINED_LISTS[name] ? `${JOINED_LISTS[name]} ORDER BY ${order}` : `SELECT * FROM ${table(name)} ORDER BY ${order}`;
  const {rows}=await query(sql); const out=rows.map(rowOut); 
  if (name === "mapAssets") 
    return out.map(unpackAsset); 
  if (name === "requests") 
    return out.map(unpackRequest); 
  if (name === "mapBoundaries") return out.map((r) => unpackJson(name, r));
    return out;
}
async function generateId(name) {
  if(name==="users") { const {rows}=await query(`SELECT id FROM users WHERE id ~ '^U[0-9]+$' ORDER BY CAST(SUBSTRING(id FROM 2) AS INTEGER) DESC LIMIT 1`); const n=rows[0]?.id?Number(rows[0].id.slice(1))+1:1; return `U${String(n).padStart(3,"0")}`; }
  if(name==="requests") { const {rows}=await query(`SELECT id FROM requests WHERE id ~ '^RQ-[0-9]+$' ORDER BY CAST(SUBSTRING(id FROM 4) AS INTEGER) DESC LIMIT 1`); const n=rows[0]?.id?Number(rows[0].id.slice(3))+1:1001; return `RQ-${n}`; }
  return `${name.slice(0,2).toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
}
// PR writes contain view-only properties after JOINs and MapPicker selections.
// Keep only database columns; normalize empty optional values before SQL generation.
const PR_COLUMNS = {
  news: new Set(["id", "authorId", "replacedFrom", "title", "body", "publishAt", "expireAt", "published", "createdAt"]),
  events: new Set(["id", "authorId", "categoryId", "tempPlaceCategoryId", "roomId", "temporaryRoomType", "replacedFrom", "name", "detail", "startAt", "endAt", "placeName", "lat", "lon", "published", "createdAt"]),
};
const PR_OPTIONAL = {
  news: new Set(["authorId", "replacedFrom", "publishAt", "expireAt"]),
  events: new Set(["authorId", "categoryId", "tempPlaceCategoryId", "roomId", "temporaryRoomType", "replacedFrom", "startAt", "endAt", "placeName", "lat", "lon"]),
};
function prTimestamp(value, field) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  // A date-only news expiration means the END of the selected Bangkok day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const suffix = field === "expireAt" ? "T23:59:59.999+07:00" : "T00:00:00+07:00";
    const d = new Date(s + suffix);
    if (!Number.isFinite(d.getTime())) throw new Error(`Invalid ${field}`);
    return d.toISOString();
  }
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(s);
  const d = new Date(local ? `${s}+07:00` : s);
  if (!Number.isFinite(d.getTime())) throw new Error(`Invalid ${field}`);
  return d.toISOString();
}
function normalizePrWrite(name, data) {
  if (!PR_COLUMNS[name]) return data;
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (!PR_COLUMNS[name].has(key) || value === undefined) continue;
    if (["publishAt", "expireAt", "startAt", "endAt"].includes(key)) out[key] = prTimestamp(value, key);
    else if (PR_OPTIONAL[name].has(key) && value === "") out[key] = null;
    else out[key] = value;
  }
  return out;
}

export async function insert(name,item) {
  const processedItem = name === "mapAssets" ? packAsset({...item}) : name === "requests" ? packRequest({...item}) : normalizePrWrite(name, {...item}); 
  const row = packJson(name, processedItem);
  const pk=PK[name]||"id";
  if(!COMPOSITE[name] && pk==="id" && !row.id) row.id=await generateId(name);

  const keys=Object.keys(row).filter(k=>row[k]!==undefined); 
  if(!keys.length) throw new Error("ไม่มีข้อมูลสำหรับ insert");

  const cols=keys.map(k=>`"${snake(k)}"`).join(", "); 
  const ph=keys.map((_,i)=>`$${i+1}`).join(", "); 
  const vals=keys.map(k=>row[k]);

  // A create operation must never overwrite an existing row. PostgreSQL's
  // 23505 is translated into HTTP 409 by server.js.
  const {rows}=await query(`INSERT INTO ${table(name)} (${cols}) VALUES (${ph}) RETURNING *`, vals);
  const out = unpackJson(name, rowOut(rows[0]));
  return name === "requests" ? unpackRequest(out) : name === "mapAssets" ? unpackAsset(out) : out;
}

function whereFor(name,id,start=1) {
  const keys=COMPOSITE[name];
  if(keys){ 
    if(!id||typeof id!=="object") throw new Error(`${name} ต้องใช้ composite key object`); 
    return {sql:keys.map((k,i)=>`"${k}"=$${start+i}`).join(" AND "), vals:keys.map(k=>id[camel(k)])}; 
  }
  const pk=PK[name]||"id"; 
  return {sql:`"${snake(pk)}"=$${start}`,vals:[id]};
}

export async function update(name, id, patch) {
  patch = normalizePrWrite(name, patch);
  if (name === "requests") {
    patch = packRequest(patch);
  }

  patch = packJson(name, patch);

  if (name === "mapAssets") {
    const { rows } = await query(
      `SELECT * FROM map_assets WHERE id=$1`,
      [id]
    );

    if (!rows[0]) return null;

    const current = unpackAsset(rowOut(rows[0]));
    const merged = { ...current, ...patch };

    const assetMetadataKeys = [
      "placement",
      "customFloor",
      "boundaryId",
      "buildingName",
      "file",
    ];

    const metadataChanged = assetMetadataKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(patch, key)
    );

    const packed = packAsset(merged);

    const nextPatch = { ...patch };

    // ฟิลด์เหล่านี้ไม่ได้เป็นคอลัมน์ใน map_assets
    delete nextPatch.placement;
    delete nextPatch.customFloor;
    delete nextPatch.boundaryId;
    delete nextPatch.buildingName;
    delete nextPatch.id;

    // ถ้ามีการเปลี่ยนไฟล์หรือตำแหน่ง ให้บันทึกข้อมูลรวมลง file
    if (metadataChanged) {
      nextPatch.file = packed.file;
    }

    patch = nextPatch;
  }

  const pk = PK[name] || "id";
  const blocked = new Set([
    pk,
    ...(COMPOSITE[name] || []).map(camel),
  ]);

  const keys = Object.keys(patch).filter(
    (key) => patch[key] !== undefined && !blocked.has(key)
  );

  if (!keys.length) return null;

  const sets = keys
    .map((key, index) => `"${snake(key)}"=$${index + 1}`)
    .join(", ");

  const where = whereFor(name, id, keys.length + 1);

  const { rows } = await query(
    `UPDATE ${table(name)} SET ${sets} WHERE ${where.sql} RETURNING *`,
    [...keys.map((key) => patch[key]), ...where.vals]
  );

  const out = unpackJson(name, rowOut(rows[0] || null));

  return name === "requests"
    ? unpackRequest(out)
    : name === "mapAssets"
      ? unpackAsset(out)
      : out;
}


export async function remove(name,id) { 
  const w=whereFor(name,id,1); 
  const r=await query(`DELETE FROM ${table(name)} WHERE ${w.sql}`,w.vals); 
  return r.rowCount>0; 
}

const TARGET_FK={nodes:"node_id",edges:"edge_id",floors:"floor_id",rooms:"room_id",mapBoundaries:"map_boundary_id",mapAssets:"map_asset_id",news:"news_id",events:"event_id",categories:"category_id",broadcasts:"broadcast_id",requestQuota:"request_quota_id",requests:"request_id",feedback:"feedback_id"};
export async function logEdit({userId,action,target,before=null,after=null}) {
  const fk=TARGET_FK[target?.type]; 
  if(!fk) throw new Error(`Unsupported edit-log target type: ${target?.type||""}`);
  const data={id:`EL-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,userId:userId||null,action,before:before==null?null:(typeof before==="string"?before:JSON.stringify(before)),after:after==null?null:(typeof after==="string"?after:JSON.stringify(after)),editedAt:new Date().toISOString(),targetLabel:target.label||target.id||null};
  data[camel(fk)]=target.id||null; 
  return insert("editLogs",data);
}