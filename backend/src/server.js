import { query as pgQuery } from "./pg.js";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { list, insert, update, remove, logEdit, withTransaction, getRequestQuota, EDIT_TARGET_FK, USE_PG } from "./store.js";
import { osmHandler, walknetHandler } from "./overpass.js";
import { cancelPendingRequestsByUser } from "./account.js";
import { createSession, destroySession, invalidateSession, clearRevokedForUser, getSession, getRevokedReason } from "./auth.js";
import { ROLE, MARKETING_COLLECTIONS as MARKETING_COLLECTION_LIST, ACCESS_STATUS as ACCESS_STATUS_LIST } from "./constants.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
const wrap = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

const MARKETING_COLLECTIONS = new Set(MARKETING_COLLECTION_LIST);
const LOGGED_COLLECTIONS = new Set(Object.keys(EDIT_TARGET_FK));
const ALLOWED = new Set([
  "institutions","roles","useCases","roleUseCases","users","accountHistory","faculties","buildings","floors","nodes","edges",
  "categories","roomTypes","rooms","mapBoundaries","mapAssets","mapDrafts","requests","requestQuota","broadcasts","notifications","feedback",
  "news","events","eventInterest","eventStats","contracts","modules","institutionAccess","institutionAccessModules","accessHistory","editLogs","usage"
]);
const ACCESS_STATUS = new Set(ACCESS_STATUS_LIST);

function safeUser(user) { if(!user) return user; const { passwordHash, password, ...safe } = user; return safe; }

async function institutionContractBlock(userId) {
  const user = (await list("users")).find((row) => String(row.id) === String(userId));
  if (!user || !user.institutionId || user.roleCode === ROLE.MARKETING) return null;

  const [accessRows, contracts] = await Promise.all([list("institutionAccess"), list("contracts")]);
  const access = accessRows.find((row) => String(row.institutionId) === String(user.institutionId));
  if (access?.accessStatus && access.accessStatus !== "active") return { reason: access.accessStatus };

  const institutionContracts = contracts.filter((row) => String(row.institutionId) === String(user.institutionId));
  if (!institutionContracts.length) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const hasValidContract = institutionContracts.some((contract) => {
    const endDate = String(contract.endDate || "").slice(0, 10);
    return contract.status !== "expired" && contract.status !== "suspended" && (!endDate || endDate >= today);
  });
  return hasValidContract ? null : { reason: "expired" };
}

// Server-Sent Events connections keyed by authenticated user id.
const notificationClients = new Map();

function publishNotification(userId, notification) {
  const clients = notificationClients.get(String(userId));
  if (!clients) return;
  const payload = `data: ${JSON.stringify(notification)}\n\n`;
  for (const res of clients) {
    try {
      if (!res.destroyed && !res.writableEnded) res.write(payload);
      else clients.delete(res);
    } catch {
      clients.delete(res);
    }
  }
  if (clients.size === 0) notificationClients.delete(String(userId));
}

async function requireSession(req,res,next) {
  const id=req.headers["x-session-id"];
  if(!id) return res.status(401).json({ok:false,error:"กรุณาเข้าสู่ระบบ",code:"NO_SESSION"});
  const session=getSession(id);
  if(!session){
    const reason=getRevokedReason(id);
    if(reason==="ROLE_CHANGED") return res.status(401).json({ok:false,error:"มีการเปลี่ยนบทบาทในระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง",code:reason});
    if(reason==="ACCOUNT_SUSPENDED") return res.status(401).json({ok:false,error:"บัญชีถูกระงับการใช้งาน",code:reason});
    return res.status(401).json({ok:false,error:"Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",code:"SESSION_EXPIRED"});
  }
  req.session=session;
  // Permit only safe reads needed to render the suspension screen. Marketing
  // remains able to renew contracts; blocked institutions cannot write access data.
  const isAllowedWhileBlocked = req.method === "GET" && (
    req.path === "/api/auth/session" || req.path === "/api/data/contracts" ||
    req.path === "/api/data/institutionAccess" || req.path === "/api/data/institutions"
  );
  if (!isAllowedWhileBlocked) {
    try {
      const blocked = await institutionContractBlock(session.userId);
      if (blocked) return res.status(423).json({
        ok: false, code: "INSTITUTION_CONTRACT_INACTIVE",
        error: "ระบบถูกหยุดชั่วคราว", accessStatus: blocked.reason,
      });
    } catch (error) {
      console.error("[contract-guard] failed to check institution contract:", error);
      return res.status(503).json({ ok: false, error: "ไม่สามารถตรวจสอบสิทธิ์สัญญาได้ กรุณาลองใหม่" });
    }
  }
  next();
}

function guard(req,res){ if(ALLOWED.has(req.params.name)) return true; res.status(404).json({ok:false,error:"ไม่พบชุดข้อมูล"}); return false; }
const COMPOSITE_KEYS = Object.freeze({
  roleUseCases: ["roleCode", "useCaseKey"],
  institutionAccessModules: ["accessId", "moduleCode"],
  eventInterest: ["userId", "eventId"],
});
function rowId(name,row){
  if(!row) return null;
  if(COMPOSITE_KEYS[name]) return Object.fromEntries(COMPOSITE_KEYS[name].map((key)=>[key,row[key]]));
  if(name==="roles") return row.code; if(name==="useCases") return row.key; if(name==="modules") return row.code; if(name==="eventStats") return row.eventId; if(name==="usage") return row.month; return row.id;
}
function sameId(a,b){
  if(a&&b&&typeof a==="object"&&typeof b==="object") {
    const keys=new Set([...Object.keys(a),...Object.keys(b)]);
    return [...keys].every((key)=>String(a[key]??"")===String(b[key]??""));
  }
  return String(a??"")===String(b??"");
}
function labelOf(row){ return row?.name || row?.title || row?.label || row?.code || row?.id || row?.moduleCode || row?.useCaseKey || null; }
async function logAccessModuleChange(accessId,actorId){
  const access=(await list("institutionAccess")).find((row)=>row.id===accessId);
  if(!access) return;
  await insert("accessHistory",{
    accessId,actorId,beforeStatus:access.accessStatus||"active",afterStatus:access.accessStatus||"active",changedAt:new Date().toISOString(),
  });
}
async function ensureRequestQuota(userId,res){
  const quota=await getRequestQuota(userId);
  if(quota.canSubmit) return true;
  const message=quota.dailyCount>=quota.dailyLimit ? `ส่งคำร้องครบ ${quota.dailyLimit} ครั้งต่อวันแล้ว` : `ส่งคำร้องครบ ${quota.monthlyLimit} ครั้งต่อเดือนแล้ว`;
  res.status(429).json({ok:false,error:message,quota});
  return false;
}

app.get("/health",(_req,res)=>res.json({ok:true,backend:"scimap",storage:USE_PG?"postgres":"memory"}));

app.get("/api/auth/roles", wrap(async(_req,res)=>res.json({ok:true,items:(await list("roles")).map(({code,name})=>({code,name}))})));
app.get("/api/auth/institutions", wrap(async(_req,res)=>res.json({ok:true,items:(await list("institutions")).map(({id,name,shortName})=>({id,name,shortName}))})));

app.get("/api/notifications/stream", requireSession, (req, res) => {
  const userId = String(req.session.userId);
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  if (!notificationClients.has(userId)) notificationClients.set(userId, new Set());
  const clients = notificationClients.get(userId);
  clients.add(res);
  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(": heartbeat\n\n");
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(res);
    if (clients.size === 0) notificationClients.delete(userId);
  };
  // The request itself can emit "close" as soon as its body is consumed;
  // keep the SSE client registered until the response/socket actually closes.
  res.on("close", cleanup);
});

app.get("/api/auth/session", requireSession, wrap(async(req,res)=>{
  const user=(await list("users")).find(u=>u.id===req.session.userId);
  if(!user) return res.status(401).json({ok:false,error:"ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่",code:"SESSION_EXPIRED"});
  res.json({ok:true,user:safeUser(user),session:req.session});
}));

app.post("/api/auth/logout", wrap(async (req, res) => {
  const id = req.headers["x-session-id"];
  if (id) destroySession(id);
  res.json({ ok: true });
}));

app.post("/api/auth", wrap(async(req,res)=>{
  const body=req.body||{}; const email=String(body.email||"").trim().toLowerCase(); const users=await list("users");
  if(body.action==="register"){
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ok:false,error:"รูปแบบอีเมลไม่ถูกต้อง"});
    const pw=String(body.password||""); if(pw.length<4) return res.status(400).json({ok:false,error:"รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร"});
    if(users.some(u=>u.email.toLowerCase()===email)) return res.status(409).json({ok:false,error:"อีเมลนี้ถูกใช้ลงทะเบียนแล้ว"});

    const roleCode = ROLE.USER;
    const institutions=await list("institutions"); 
    const defaultInst=institutions.find(i=>i.shortName==="KMITL") || institutions[0];
    const user=await insert(
      "users", 
      { email, passwordHash:await bcrypt.hash(pw,10), 
        name:body.name||email.split("@")[0], 
        username:body.username||email.split("@")[0], 
        roleCode, 
        institutionId:body.institutionId||defaultInst?.id||null, 
        status:"active", 
        createdAt:new Date().toISOString() 
      }
    );

    return res.json({ok:true,user:safeUser(user)});
  }
  if(body.action==="login"){
    const user=users.find(u=>u.email.toLowerCase()===email);
    if(!user || !user.passwordHash || !(await bcrypt.compare(String(body.password||""),user.passwordHash))) return res.status(401).json({ok:false,error:"อีเมลหรือรหัสผ่านไม่ถูกต้อง"});
    if(user.status!=="active") return res.status(403).json({ok:false,error:"บัญชีถูกระงับการใช้งาน"});
    const sessionId=createSession(user,user.roleCode,[]); return res.json({ok:true,user:safeUser(user),sessionId});
  }
  return res.status(400).json({ok:false,error:"action ไม่ถูกต้อง"});
}));

app.get("/api/ref/roles", requireSession, wrap(async(_req,res)=>res.json({ok:true,items:(await list("roles")).map(({code,name})=>({code,name}))})));
app.get("/api/ref/modules", requireSession, wrap(async(_req,res)=>res.json({ok:true,items:await list("modules")})));
app.get("/api/ref/faculties", requireSession, wrap(async(_req,res)=>res.json({ok:true,items:await list("faculties")})));
app.get("/api/ref/use-cases", requireSession, wrap(async(req,res)=>{
  const [ucs,links]=await Promise.all([list("useCases"),list("roleUseCases")]);
  const keys=new Set(links.filter(x=>x.roleCode===req.session.role).map(x=>x.useCaseKey));
  res.json({ok:true,items:ucs.filter(x=>keys.has(x.key) && !String(x.key).startsWith("common_")).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0))});
}));

app.get("/api/map/buildings", requireSession, wrap(async(_req,res)=>{
  const [buildings,floors]=await Promise.all([list("buildings"),list("floors")]);
  res.json({ok:true,items:buildings.map(b=>({...b,floors:floors.filter(f=>f.buildingId===b.id)}))});
}));
app.get("/api/map/floors/:floorId/graph", requireSession, wrap(async(req,res)=>{
  const [nodes,edges]=await Promise.all([list("nodes"),list("edges")]); const ns=nodes.filter(n=>n.floorId===req.params.floorId); const ids=new Set(ns.map(n=>n.id));
  res.json({ok:true,nodes:ns,edges:edges.filter(e=>ids.has(e.fromNodeId)&&ids.has(e.toNodeId))});
}));
app.get("/api/map/graph", requireSession, wrap(async(req,res)=>{
  const buildingId=String(req.query.building||""); const [floors,nodes,edges]=await Promise.all([list("floors"),list("nodes"),list("edges")]);
  const fids=new Set(floors.filter(f=>f.buildingId===buildingId).map(f=>f.id)); const ns=nodes.filter(n=>fids.has(n.floorId)); const nids=new Set(ns.map(n=>n.id));
  res.json({ok:true,nodes:ns,edges:edges.filter(e=>nids.has(e.fromNodeId)&&nids.has(e.toNodeId))});
}));

// Increment searches atomically when a user selects an event from map search.
app.post("/api/events/:id/search", requireSession, wrap(async (req, res) => {
  const event = (await list("events")).find(e => e.id === req.params.id);
  const now = Date.now();
  if (!event || !event.published || (event.endAt && new Date(event.endAt).getTime() <= now))
    return res.status(404).json({ ok: false, error: "ไม่พบกิจกรรมที่เผยแพร่" });
  if (USE_PG) {
    await pgQuery(`INSERT INTO event_stats (event_id, searched) VALUES ($1, 1)
      ON CONFLICT (event_id) DO UPDATE SET searched = event_stats.searched + 1`, [event.id]);
  } else {
    const current = (await list("eventStats")).find(row => row.eventId === event.id);
    if (current) await update("eventStats", event.id, { searched: Number(current.searched || 0) + 1 });
    else await insert("eventStats", { eventId: event.id, searched: 1 });
  }
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, eventId: event.id });
}));

app.get("/api/data/:name", requireSession, wrap(async(req,res)=>{
  if(!guard(req,res)) return;
  const name=req.params.name; let items=await list(name);
  // rooms.type มีค่า override ชั่วคราวจากกิจกรรม PR โดยไม่เขียนทับค่าจริงใน rooms
  // จึงคืนค่าเดิมอัตโนมัติทันทีเมื่อกิจกรรมยังไม่เริ่ม/สิ้นสุด/ไม่ได้เผยแพร่
  if(name === "rooms") {
    const now = Date.now();
    const events = await list("events");
    const activeOverrides = events
      .filter((e) => e.published && e.roomId && e.temporaryRoomType &&
        (!e.startAt || new Date(e.startAt).getTime() <= now) &&
        (!e.endAt || now < new Date(e.endAt).getTime()))
      .sort((a,b) => new Date(b.startAt || 0) - new Date(a.startAt || 0));
    const byRoom = new Map();
    for (const e of activeOverrides) if (!byRoom.has(String(e.roomId))) byRoom.set(String(e.roomId), e);
    items = items.map((room) => {
      const e = byRoom.get(String(room.id));
      return e ? { ...room, type: e.temporaryRoomType, originalType: room.type, typeOverrideEventId: e.id, typeOverrideUntil: e.endAt || null } : room;
    });
  }
  if(["users","contracts","institutionAccess"].includes(name)) {
    const institutions=await list("institutions"); const names=new Map(institutions.map(i=>[i.id,i.name]));
    items=items.map(x=>({...x,institutionName:names.get(x.institutionId)||null}));
  }
  if(name==="accessHistory") {
    const [access,institutions]=await Promise.all([list("institutionAccess"),list("institutions")]);
    const iidByAccess=new Map(access.map(a=>[a.id,a.institutionId])); const names=new Map(institutions.map(i=>[i.id,i.name]));
    items=items.map(x=>({...x,institutionName:names.get(iidByAccess.get(x.accessId))||null}));
  }
  res.json({ok:true,items:items.map(x=>name==="users"?safeUser(x):x)});
}));

app.post("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;

  const { name } = req.params;
  if (name === "users" && req.session.role !== ROLE.ADMIN) {
    return res.status(403).json({ ok: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขบัญชีผู้ใช้ได้" });
  }

  if (name === "users" && req.session.role === ROLE.ADMIN) {
      const target = (await list("users")).find((u) => sameId(u.id, id));
      if (target?.roleCode === ROLE.MARKETING || patch.roleCode === ROLE.MARKETING)
        return res.status(403).json({ ok: false, error: "ฝ่ายดูแลระบบไม่มีสิทธิ์จัดการบัญชีฝ่ายการตลาด" });
  }

  if (name === "roomTypes" && req.session.role !== ROLE.REGISTRAR) return res.status(403).json({ok:false,error:"เฉพาะฝ่ายทะเบียนที่จัดการประเภทห้องได้"});
  const { _actor, ...item } = req.body || {};
  if (MARKETING_COLLECTIONS.has(name) && req.session.role !== ROLE.MARKETING)
    return res.status(403).json({ ok: false, error: "เฉพาะฝ่ายการตลาดเท่านั้นที่แก้ไขข้อมูลชุดนี้ได้" });
  if ((name === "nodes" || name === "edges") && ![ROLE.GIS, ROLE.ADMIN].includes(req.session.role))
    return res.status(403).json({ ok: false, error: "ไม่มีสิทธิ์แก้ไขโครงข่ายแผนที่" });
  if (name === "requests" && !(await ensureRequestQuota(req.session.userId, res))) return;
  if (name === "requests") item.userId = req.session.userId;
  const row = await withTransaction(async () => {
    const created = await insert(name, item);
    if (name === "institutionAccessModules") await logAccessModuleChange(created.accessId, req.session.userId);
    if (name === "broadcasts") {
      const when = new Date(created.sendAt || created.createdAt || 0).getTime();
      if (!Number.isFinite(when) || when <= Date.now()) {
        const [users, institutions] = await Promise.all([list("users"), list("institutions")]);
        const institutionName = new Map(institutions.map((i) => [i.id, i.name]));
        const isAll = !created.audience || created.audience === "all" || created.audience === "ทุกมหาวิทยาลัย";
        const recipients = users.filter((u) => u.status === "active" &&
          (isAll || u.institutionId === created.audience || institutionName.get(u.institutionId) === created.audience));
        for (const u of recipients) {
          await insert("notifications", { userId: u.id, broadcastId: created.id, kind: "system",
            title: created.title, body: created.body || "", read: false, createdAt: new Date().toISOString() });
        }
      }
    }
    if (LOGGED_COLLECTIONS.has(name)) await logEdit({ userId: req.session.userId,
      action: `CREATE_${name}`, target: { type: name, id: rowId(name, created), label: labelOf(created) }, after: created });
    return created;
  });
  // Publish only after the transaction has committed and per-recipient notifications exist.
  if (name === "broadcasts") {
    const when = new Date(row.sendAt || row.createdAt || 0).getTime();
    if (!Number.isFinite(when) || when <= Date.now()) {
      const recipientNotifications = (await list("notifications"))
        .filter((n) => String(n.broadcastId) === String(row.id));
      for (const n of recipientNotifications) {
        publishNotification(n.userId, {
          type: "system-broadcast",
          id: n.id,
          broadcastId: row.id,
          title: n.title || row.title,
          body: n.body || row.body || "",
          createdAt: n.createdAt || row.sendAt || row.createdAt,
          audience: row.audience || "ทุกมหาวิทยาลัย",
        });
      }
    }
  }
  res.json({ ok: true, item: name === "users" ? safeUser(row) : row });
}));

app.patch("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;
  const { name } = req.params;
  if (name === "roomTypes" && req.session.role !== ROLE.REGISTRAR) return res.status(403).json({ok:false,error:"เฉพาะฝ่ายทะเบียนที่จัดการประเภทห้องได้"});
  const { id, _actor, ...rawPatch } = req.body || {};
  const auditReason = name === "users" ? (rawPatch.reason || null) : null;
  const patch = { ...rawPatch };
  if (name === "users") delete patch.reason;
  if (MARKETING_COLLECTIONS.has(name) && req.session.role !== ROLE.MARKETING)
    return res.status(403).json({ ok: false, error: "เฉพาะฝ่ายการตลาดเท่านั้นที่แก้ไขข้อมูลชุดนี้ได้" });
  if ((name === "nodes" || name === "edges") && ![ROLE.GIS, ROLE.ADMIN].includes(req.session.role))
    return res.status(403).json({ ok: false, error: "ไม่มีสิทธิ์แก้ไขโครงข่ายแผนที่" });
  if (name === "institutionAccess" && patch.accessStatus && !ACCESS_STATUS.has(patch.accessStatus))
    return res.status(400).json({ ok: false, error: "สถานะสิทธิ์ไม่ถูกต้อง" });
  if (name === "users" && patch.roleCode) {
    const current = (await list("users")).find((u) => sameId(u.id, id));
    if (current && current.status === "suspended" && patch.status !== "active" && patch.roleCode !== current.roleCode)
      return res.status(409).json({ ok: false, error: "บัญชีนี้ถูกระงับการใช้งาน ไม่สามารถเปลี่ยนสิทธิ์ได้" });
  }
  
  const result = await withTransaction(async () => {
    const before = (await list(name)).find((r) => sameId(rowId(name, r), id)) || null;
    if (!before) return null;
    const row = await update(name, id, patch);
    if (!row) return null;
    let revokeReason = null;
    if (name === "users") {
      if (patch.status === "suspended" && before.status !== row.status) {
        const cancelled = await cancelPendingRequestsByUser(id);
        for (const requestId of cancelled) {
          const cancelledRequest = (await list("requests")).find((r) => r.id === requestId);
          if (cancelledRequest) await logEdit({ userId: req.session.userId, action: "UPDATE_requests",
            target: { type: "requests", id: requestId, label: labelOf(cancelledRequest) }, after: cancelledRequest });
        }
        revokeReason = "ACCOUNT_SUSPENDED";
        await insert("accountHistory", { userId: id, changedBy: req.session.userId,
          action: "SUSPENDED", oldValue: before.status || null, newValue: row.status,
          reason: auditReason, changedAt: new Date().toISOString() });
      }
      if (patch.status === "active" && before.status === "suspended") {
        await insert("accountHistory", { userId: id, changedBy: req.session.userId,
          action: "RESTORED", oldValue: before.status, newValue: row.status,
          reason: auditReason, changedAt: new Date().toISOString() });
      }
      if (patch.roleCode && before.roleCode !== row.roleCode) {
        revokeReason = "ROLE_CHANGED";
        await insert("accountHistory", { userId: id, changedBy: req.session.userId,
          action: "ROLE_CHANGED", oldValue: before.roleCode || null, newValue: row.roleCode,
          reason: null, changedAt: new Date().toISOString() });
      }
    }
    if (name === "institutionAccess" && patch.accessStatus && before.accessStatus !== row.accessStatus)
      await insert("accessHistory", { accessId: row.id, actorId: req.session.userId,
        beforeStatus: before.accessStatus || "active", afterStatus: row.accessStatus,
        changedAt: new Date().toISOString() });

    if (name === "institutionAccessModules") await logAccessModuleChange(row.accessId, req.session.userId);
    
    if (LOGGED_COLLECTIONS.has(name)) await logEdit({ userId: req.session.userId,
      action: `UPDATE_${name}`, target: { type: name, id: rowId(name, row), label: labelOf(row) }, before, after: row });
    return { row, revokeReason };
  });
  if (!result) return res.status(404).json({ ok: false, error: "ไม่พบรายการ" });
  if (result.revokeReason) invalidateSession(id, result.revokeReason); // only after COMMIT
  if (name === "users" && patch.status === "active") clearRevokedForUser(id);
  res.json({ ok: true, item: name === "users" ? safeUser(result.row) : result.row });
}));

app.delete("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;
  const { name } = req.params;
  if (name === "roomTypes" && req.session.role !== ROLE.REGISTRAR) return res.status(403).json({ok:false,error:"เฉพาะฝ่ายทะเบียนที่จัดการประเภทห้องได้"});
  let id = req.query.id;
  if (typeof id === "string" && id.startsWith("{")) {
    try { id = JSON.parse(id); } catch { return res.status(400).json({ ok: false, error: "รูปแบบ ID ไม่ถูกต้อง" }); }
  }
  if (MARKETING_COLLECTIONS.has(name) && req.session.role !== ROLE.MARKETING)
    return res.status(403).json({ ok: false, error: "เฉพาะฝ่ายการตลาดเท่านั้นที่แก้ไขข้อมูลชุดนี้ได้" });
  if ((name === "nodes" || name === "edges") && ![ROLE.GIS, ROLE.ADMIN].includes(req.session.role))
    return res.status(403).json({ ok: false, error: "ไม่มีสิทธิ์แก้ไขโครงข่ายแผนที่" });
  const ok = await withTransaction(async () => {
    const before = (await list(name)).find((r) => sameId(rowId(name, r), id)) || null;
    if (!before) return false;
    // Log before DELETE while its target FK still exists. ON DELETE SET NULL
    // retains targetLabel and before when PostgreSQL deletes the target.
    if (LOGGED_COLLECTIONS.has(name)) await logEdit({ userId: req.session.userId,
      action: `DELETE_${name}`, target: { type: name, id: rowId(name, before), label: labelOf(before) }, before });
    const deleted = await remove(name, id);
    if (!deleted) throw Object.assign(new Error("Row changed during delete"), { code: "ROW_NOT_FOUND" });
    if (name === "institutionAccessModules") await logAccessModuleChange(before.accessId, req.session.userId);
    return true;
  });
  res.json({ ok });
}));

app.post("/api/report", requireSession, wrap(async (req, res) => {
  if (!(await ensureRequestQuota(req.session.userId, res))) return;
  const b = req.body || {};
  const row = await withTransaction(async () => {
    const rooms = await list("rooms");
    const room = rooms.find((r) => r.code === b.room || r.name === b.room);
    const created = await insert("requests", { userId: req.session.userId, roomId: room?.id || null,
      nodeId: room?.nodeId || null, subject: b.subject || "แจ้งแก้ไขข้อมูล", detail: b.detail || "",
      status: "pending", note: null, createdAt: new Date().toISOString() });
    await logEdit({ userId: req.session.userId, action: "CREATE_requests",
      target: { type: "requests", id: created.id, label: labelOf(created) }, after: created });
    return created;
  });
  res.json({ ok: true, item: row });
}));

app.get("/api/stats", requireSession, wrap(async(_req,res)=>{
  res.set("Cache-Control", "no-store");
  const [users,requests,feedback,news,events,eventStats,rooms,contracts,usageRows,buildings,eventInterest,editLogs,searchLogs]=await Promise.all(["users","requests","feedback","news","events","eventStats","rooms","contracts","usage","buildings","eventInterest","editLogs","searchLogs"].map(list));
  // ผู้ใช้ที่ใช้งานรายเดือน: นับจากกิจกรรมจริงของผู้ใช้/เจ้าหน้าที่ (คำร้อง ข้อเสนอแนะ ความสนใจกิจกรรม การแก้ไขแผนที่)
  // เดือนที่ไม่มีกิจกรรมเลยจะใช้ค่าจากตาราง usage แทน และไม่ให้เกินจำนวนผู้ใช้ทั้งหมด
  // เดือนนับตามเวลาไทย (ตรงกับ lib/datetime.js) เพื่อให้รอยต่อเดือนไม่เพี้ยนเมื่อเซิร์ฟเวอร์ใช้เวลา UTC
  const monthOf=v=>{const d=v?new Date(v):null;return d&&!isNaN(d)?d.toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}).slice(0,7):null;};
  const activeByMonth=new Map();
  for(const [rows,uid,at] of [[requests,"userId","createdAt"],[feedback,"userId","createdAt"],[eventInterest,"userId","createdAt"],[editLogs,"userId","editedAt"]])
    for(const r of rows){const m=monthOf(r[at]);if(m&&r[uid]){if(!activeByMonth.has(m))activeByMonth.set(m,new Set());activeByMonth.get(m).add(r[uid]);}}
  // ค้นหา/นำทางรายเดือน: เดือนที่มี search_logs จริงใช้ค่าจาก log (navigate = นำทาง, อื่นๆ = ค้นหา) เดือนที่ไม่มี log ใช้ค่าจากตาราง usage
  const logByMonth=new Map();
  for(const r of searchLogs){const m=monthOf(r.createdAt);if(!m)continue;const c=logByMonth.get(m)||{searches:0,routes:0};if(r.kind==="navigate")c.routes++;else c.searches++;logByMonth.set(m,c);}
  // รายการเดือนต่อเนื่องจากเดือนแรกในตาราง usage ถึง "เดือนปัจจุบัน" เพื่อให้ตัวเลข "เดือนนี้" ขยับตามกิจกรรมจริง
  // (เดิมใช้แถวสุดท้ายของตาราง usage ซึ่งหยุดอยู่ที่เดือนสุดท้ายที่พิมพ์ไว้) เดือนที่ไม่มีแถว usage เริ่มจาก 0
  const currentMonth=monthOf(Date.now());
  const firstMonth=[...usageRows.map(u=>u.month),...logByMonth.keys(),...activeByMonth.keys(),currentMonth].filter(Boolean).sort()[0];
  const monthList=[];
  for(let [y,m]=firstMonth.split("-").map(Number); `${y}-${String(m).padStart(2,"0")}`<=currentMonth; m===12?(y++,m=1):m++) monthList.push(`${y}-${String(m).padStart(2,"0")}`);
  const baseUsage=monthList.map(month=>usageRows.find(u=>u.month===month)||{month,activeUsers:0,searches:0,routes:0});
  const usage=baseUsage.map(u=>({...u,...(logByMonth.get(u.month)||{}),activeUsers:Math.min(users.length,activeByMonth.has(u.month)?activeByMonth.get(u.month).size:(u.activeUsers||0))}));
  const last=usage[usage.length-1]||{}; const byStatus=requests.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}); const byType=requests.reduce((a,r)=>{const k=r.subject||"อื่นๆ";a[k]=(a[k]||0)+1;return a;},{}); const daysLeft=d=>d?Math.ceil((new Date(d)-new Date())/86400000):null;
  res.json({ok:true,overview:{totalUsers:users.length,activeUsers:last.activeUsers||0,suspendedUsers:users.filter(u=>u.status!=="active").length,searches:last.searches||0,routes:last.routes||0,pendingRequests:requests.filter(r=>r.status==="pending").length,totalFeedback:feedback.length,publishedNews:news.filter(n=>n.published).length,buildings:buildings.length,rooms:rooms.length},usage,requestsByStatus:byStatus,requestsByType:byType,contracts:contracts.map(c=>({...c,daysLeft:daysLeft(c.endDate)})),eventStats:eventStats.map(s=>({...s,title:events.find(e=>e.id===s.eventId)?.name||s.eventId}))});
}));

const SEARCH_LOG_KINDS = new Set(["search", "route", "navigate"]);
const clipText = (v, n) => (v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, n));
// บันทึกการค้นหา/นำทางของผู้ใช้ (ทุก role ที่ล็อกอินเรียกได้) — userId มาจาก session เท่านั้น
//   kind: search = เลือกผลค้นหา · route = ค้นหาเส้นทาง A→B · navigate = เริ่มนำทาง
app.post("/api/search-log", requireSession, wrap(async (req, res) => {
  const b = req.body || {};
  const kind = String(b.kind || "");
  const placeLabel = clipText(b.placeLabel, 200);
  if (!SEARCH_LOG_KINDS.has(kind) || !placeLabel) return res.status(400).json({ ok: false, error: "ข้อมูลบันทึกการค้นหาไม่ถูกต้อง" });
  await insert("searchLogs", {
    userId: req.session.userId, kind, query: clipText(b.query, 200), buildingId: clipText(b.buildingId, 64), roomId: clipText(b.roomId, 64),
    placeLabel, fromLabel: clipText(b.fromLabel, 200), createdAt: new Date().toISOString(),
  });
  res.json({ ok: true });
}));

// สถิติอาคาร/จุดสนใจที่ถูกค้นหามากที่สุด — เฉพาะผู้บริหาร (?days=N จำกัดช่วงเวลา, 0/ไม่ส่ง = ทั้งหมด)
//   อันดับนับ kind search + route (ครั้งที่ผู้ใช้เลือก/ค้นหาสถานที่นั้น) ส่วน navigate แยกนับเป็น "เริ่มนำทาง"
app.get("/api/stats/searches", requireSession, wrap(async (req, res) => {
  if (req.session.role !== ROLE.EXEC) return res.status(403).json({ ok: false, error: "เฉพาะฝ่ายบริหารเท่านั้น" });
  const days = Math.max(0, Math.min(3650, parseInt(req.query.days, 10) || 0));
  const since = days ? Date.now() - days * 86400000 : 0;
  const rows = (await list("searchLogs")).filter((r) => !since || new Date(r.createdAt).getTime() >= since);
  const byPlace = new Map();
  for (const r of rows) {
    const p = byPlace.get(r.placeLabel) || { place: r.placeLabel, searches: 0, navigations: 0, lastAt: null };
    if (r.kind === "navigate") p.navigations++; else p.searches++;
    if (!p.lastAt || new Date(r.createdAt) > new Date(p.lastAt)) p.lastAt = r.createdAt;
    byPlace.set(r.placeLabel, p);
  }
  const places = [...byPlace.values()].sort((a, b) => (b.searches - a.searches) || (b.navigations - a.navigations) || a.place.localeCompare(b.place)).slice(0, 20);
  // คู่ "ต้นทาง → ปลายทาง": นับจาก route/navigate ที่ผู้ใช้กรอกต้นทางไว้เท่านั้น (search ไม่มีต้นทาง)
  const byPair = new Map();
  for (const r of rows) {
    if (r.kind === "search" || !r.fromLabel) continue;
    const k = `${r.fromLabel}\u0000${r.placeLabel}`;
    const p = byPair.get(k) || { from: r.fromLabel, to: r.placeLabel, requests: 0, navigations: 0 };
    if (r.kind === "navigate") p.navigations++; else p.requests++;
    byPair.set(k, p);
  }
  const pairs = [...byPair.values()].sort((a, b) => ((b.requests + b.navigations) - (a.requests + a.navigations)) || (b.navigations - a.navigations) || a.from.localeCompare(b.from)).slice(0, 20);
  res.json({ ok: true, days, total: rows.length, placeCount: byPlace.size, pairs, totalSearches: rows.filter((r) => r.kind !== "navigate").length,
    totalNavigations: rows.filter((r) => r.kind === "navigate").length, places });
}));

app.get("/api/osm",osmHandler); app.get("/api/walknet",walknetHandler);
app.use((err,_req,res,_next)=>{
  if (err.code === "23505") return res.status(409).json({ ok: false, error: "ข้อมูลนี้มีอยู่แล้ว (รหัสหรือค่าที่ต้องไม่ซ้ำ)" });
  if (err.code === "23503" || err.code === "23514" || err.code === "23502")
    return res.status(400).json({ ok: false, error: "ข้อมูลไม่ผ่านเงื่อนไขของฐานข้อมูล" });
  if (err.code === "ROW_NOT_FOUND") return res.status(409).json({ ok: false, error: "ข้อมูลถูกเปลี่ยนระหว่างดำเนินการ กรุณาลองใหม่" });
  console.error("[scimap-backend] error:",err);
  res.status(500).json({ok:false,error:"เกิดข้อผิดพลาดภายในระบบ"});
});
process.on("unhandledRejection",e=>console.error("[scimap-backend] unhandledRejection:",e));
const PORT=Number(process.env.PORT)||4000; app.listen(PORT,"0.0.0.0",()=>console.log(`[scimap-backend] listening on :${PORT} · storage=${USE_PG?"postgres":"memory"}`));