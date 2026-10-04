import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { list, insert, update, remove, logEdit, withTransaction, getRequestQuota, EDIT_TARGET_FK, USE_PG } from "./store.js";
import { osmHandler, walknetHandler } from "./overpass.js";
import { cancelPendingRequestsByUser } from "./account.js";
import { createSession, invalidateSession, clearRevokedForUser, getSession, getRevokedReason } from "./auth.js";
import { ROLE, MARKETING_COLLECTIONS as MARKETING_COLLECTION_LIST, ACCESS_STATUS as ACCESS_STATUS_LIST } from "./constants.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const wrap = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

const MARKETING_COLLECTIONS = new Set(MARKETING_COLLECTION_LIST);
const LOGGED_COLLECTIONS = new Set(Object.keys(EDIT_TARGET_FK));
const ALLOWED = new Set([
  "institutions","roles","useCases","roleUseCases","users","accountHistory","faculties","buildings","floors","nodes","edges",
  "categories","rooms","mapBoundaries","mapAssets","mapDrafts","requests","requestQuota","broadcasts","notifications","feedback",
  "news","events","eventInterest","eventStats","contracts","modules","institutionAccess","institutionAccessModules","accessHistory","editLogs","usage"
]);
const ACCESS_STATUS = new Set(ACCESS_STATUS_LIST);

function safeUser(user) { if(!user) return user; const { passwordHash, password, ...safe } = user; return safe; }
function requireSession(req,res,next) {
  const id=req.headers["x-session-id"];
  if(!id) return res.status(401).json({ok:false,error:"กรุณาเข้าสู่ระบบ",code:"NO_SESSION"});
  const session=getSession(id);
  if(!session){
    const reason=getRevokedReason(id);
    if(reason==="ROLE_CHANGED") return res.status(401).json({ok:false,error:"มีการเปลี่ยนบทบาทในระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง",code:reason});
    if(reason==="ACCOUNT_SUSPENDED") return res.status(401).json({ok:false,error:"บัญชีถูกระงับการใช้งาน",code:reason});
    return res.status(401).json({ok:false,error:"Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",code:"SESSION_EXPIRED"});
  }
  req.session=session; next();
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

app.get("/api/auth/session", requireSession, wrap(async(req,res)=>{
  const user=(await list("users")).find(u=>u.id===req.session.userId);
  if(!user) return res.status(401).json({ok:false,error:"ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่",code:"SESSION_EXPIRED"});
  res.json({ok:true,user:safeUser(user),session:req.session});
}));

app.post("/api/auth", wrap(async(req,res)=>{
  const body=req.body||{}; const email=String(body.email||"").trim().toLowerCase(); const users=await list("users");
  if(body.action==="register"){
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ok:false,error:"รูปแบบอีเมลไม่ถูกต้อง"});
    const pw=String(body.password||""); if(pw.length<4) return res.status(400).json({ok:false,error:"รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร"});
    if(users.some(u=>u.email.toLowerCase()===email)) return res.status(409).json({ok:false,error:"อีเมลนี้ถูกใช้ลงทะเบียนแล้ว"});
    const roles=await list("roles"); const roleCode=roles.some(r=>r.code===body.role)?body.role:ROLE.USER;
    const institutions=await list("institutions"); const defaultInst=institutions.find(i=>i.shortName==="KMITL") || institutions[0];
    const user=await insert("users", { email, passwordHash:await bcrypt.hash(pw,10), name:body.name||email.split("@")[0], username:body.username||email.split("@")[0], roleCode, institutionId:body.institutionId||defaultInst?.id||null, status:"active", createdAt:new Date().toISOString() });
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

app.get("/api/data/:name", requireSession, wrap(async(req,res)=>{
  if(!guard(req,res)) return;
  const name=req.params.name; let items=await list(name);
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
        const recipients = users.filter((u) => u.roleCode === ROLE.USER && u.status === "active" &&
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
  res.json({ ok: true, item: name === "users" ? safeUser(row) : row });
}));

app.patch("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;
  const { name } = req.params;
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

    if (name === "users" && req.session.role === ROLE.ADMIN) {
      const target = (await list("users")).find((u) => sameId(u.id, id));
      if (target?.roleCode === ROLE.MARKETING || patch.roleCode === ROLE.MARKETING)
        return res.status(403).json({ ok: false, error: "ฝ่ายดูแลระบบไม่มีสิทธิ์จัดการบัญชีฝ่ายการตลาด" });
    }

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
  const [users,requests,feedback,news,events,eventStats,rooms,contracts,usage,buildings]=await Promise.all(["users","requests","feedback","news","events","eventStats","rooms","contracts","usage","buildings"].map(list));
  const last=usage[usage.length-1]||{}; const byStatus=requests.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}); const byType=requests.reduce((a,r)=>{const k=r.subject||"อื่นๆ";a[k]=(a[k]||0)+1;return a;},{}); const daysLeft=d=>d?Math.ceil((new Date(d)-new Date())/86400000):null;
  res.json({ok:true,overview:{totalUsers:users.length,activeUsers:last.activeUsers||0,suspendedUsers:users.filter(u=>u.status!=="active").length,searches:last.searches||0,routes:last.routes||0,pendingRequests:requests.filter(r=>r.status==="pending").length,newFeedback:feedback.filter(f=>f.status==="new"||f.status==="open").length,publishedNews:news.filter(n=>n.published).length,buildings:buildings.length,rooms:rooms.length},usage,requestsByStatus:byStatus,requestsByType:byType,contracts:contracts.map(c=>({...c,daysLeft:daysLeft(c.endDate)})),eventStats:eventStats.map(s=>({...s,title:events.find(e=>e.id===s.eventId)?.name||s.eventId}))});
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