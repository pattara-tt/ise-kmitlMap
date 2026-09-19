// ────────────────────────────────────────────────────────────────
// SciMap Backend — Express API
// แยกออกจาก frontend เพื่อให้ deploy เป็นคนละคอนเทนเนอร์ได้
// endpoint เหมือนเดิมทุกตัว frontend จึงไม่ต้องแก้โค้ดที่เรียก fetch
// ────────────────────────────────────────────────────────────────
import express from "express";
import cors from "cors";
import { list, insert, update, remove, logMapEdit, ROLES, USE_PG } from "./store.js";
import { osmHandler, walknetHandler } from "./overpass.js";
import { cancelPendingRequestsByUser, notifyUser } from "./account.js";
import { createSession, invalidateSession, getSession, getRevokedReason } from "./auth.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Express 4 ไม่จับ rejection ของ async handler เอง — ถ้าไม่ห่อไว้ error ตัวเดียว
// จะกลายเป็น unhandled rejection แล้ว Node 22 จะ kill process ทั้งคอนเทนเนอร์
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function requireSession(req, res, next) {
  const sessionId = req.headers["x-session-id"];

  if (!sessionId) {
    return res.status(401).json({
      ok: false,
      error: "กรุณาเข้าสู่ระบบ",
      code: "NO_SESSION",
    });
  }

  const session = getSession(sessionId);

  if (!session) {
    const revokedReason = getRevokedReason(sessionId);

    if (revokedReason === "ROLE_CHANGED") {
      return res.status(401).json({
        ok: false,
        error: "มีการเปลี่ยนบทบาทในระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        code: "ROLE_CHANGED",
      });
    }

    if (revokedReason === "ACCOUNT_SUSPENDED") {
      return res.status(401).json({
        ok: false,
        error: "บัญชีถูกระงับการใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    return res.status(401).json({
      ok: false,
      error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
      code: "SESSION_EXPIRED",
    });
  }

  req.session = session;
  next();
}

// ── health check สำหรับ docker healthcheck / load balancer ──
app.get("/health", (_req, res) => res.json({ ok: true, backend: "scimap", storage: USE_PG ? "postgres" : "memory" }));

/* ═══════════════ auth ═══════════════ */
app.get("/api/auth/session", requireSession, wrap(async (req, res) => {
  const users = await list("users");
  const user = users.find((u) => u.id === req.session.userId);

  if (!user) {
    return res.status(401).json({
      ok: false,
      error: "ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่",
      code: "SESSION_EXPIRED",
    });
  }

  const { password, ...safe } = user;

  return res.json({
    ok: true,
    user: safe,
    session: req.session,
  });
}));


app.post("/api/auth", wrap(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const users = await list("users");

  if (body.action === "register") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: "รูปแบบอีเมลไม่ถูกต้อง" });
    if (!body.password || String(body.password).length < 4) return res.status(400).json({ ok: false, error: "รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร" });
    if (users.some((u) => u.email.toLowerCase() === email)) return res.status(409).json({ ok: false, error: "อีเมลนี้ถูกใช้ลงทะเบียนแล้ว" });
    const role = ROLES[body.role] ? body.role : "user";
    // TODO(prod): เก็บ bcrypt hash แทนรหัสผ่านตรงๆ
    const user = await insert("users", {
      id: "U" + String(users.length + 1).padStart(3, "0"),
      email, password: String(body.password),
      name: body.name || email.split("@")[0],
      username: body.username || email.split("@")[0],
      role, institution: body.institution || "KMITL", status: "active",
    });
    const { password, ...safe } = user;
    return res.json({ ok: true, user: safe });
  }

  if (body.action === "login") {
    const user = users.find((u) => u.email.toLowerCase() === email);

    if (!user || user.password !== String(body.password || "")) {
      return res.status(401).json({
        ok: false,
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        ok: false,
        error: "บัญชีนี้ถูกระงับการใช้งาน"
      });
    }

    const role = user.role;
    const activities = [];

    const sessionId = createSession(user, role, activities);

    const { password, ...safe } = user;
    return res.json({ ok: true, user: safe, sessionId });
  }

  return res.status(400).json({ ok: false, error: "action ไม่ถูกต้อง" });
}));

/* ═══════════════ CRUD กลางของทุก collection ═══════════════ */
const ALLOWED = new Set([
  "users", "requests", "feedback", "mapEdits", "contracts", "institutionAccess", "accessHistory", "broadcasts",
  "mapBoundaries", "mapAssets", "mapDrafts", "categories", "news", "events",
  "eventInterest", "eventStats", "floors", "rooms", "usage", "requestQuota", "notifications",
]);
// collection ที่ถือว่าเป็นข้อมูลแผนที่ → บันทึกประวัติให้ผู้บริหารตรวจสอบ
const ACCESS_STATUS_LABEL = { active: "เปิดใช้งาน", paused: "หยุดชั่วคราว", suspended: "ระงับสิทธิ์" };

const MAP_COLLECTIONS = {
  mapBoundaries: "ขอบเขตแผนผัง", mapAssets: "ข้อมูลประกอบแผนผัง", mapDrafts: "ข้อมูลแผนที่",
  rooms: "ข้อมูลห้อง", floors: "ข้อมูลชั้นอาคาร", events: "ข้อมูลกิจกรรม",
};

function guard(req, res) {
  if (ALLOWED.has(req.params.name)) return true;
  res.status(404).json({ ok: false, error: "ไม่พบชุดข้อมูล" });
  return false;
}


app.get("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;
  res.json({ ok: true, items: await list(req.params.name) });
}));

app.post("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;
  const { name } = req.params;
  const { _actor, ...item } = req.body || {};
  if (["contracts", "broadcasts", "institutionAccess", "accessHistory"].includes(name) && _actor?.role && _actor.role !== "marketing") {
    return res.status(403).json({ ok: false, error: "เฉพาะฝ่ายการตลาดเท่านั้นที่แก้ไขข้อมูลชุดนี้ได้" });
  }
  const row = await insert(name, item);

  // UC-5: เมื่อฝ่ายการตลาดส่งประกาศ ให้สร้าง notification จริง
  // ให้ผู้ใช้งานทั่วไปที่ active ทันที (สำหรับประกาศที่ถึงกำหนดส่งแล้ว)
  if (name === "broadcasts") {
    const sendAt = row.sendAt || row.sentAt || row.createdAt;
    const sendTime = new Date(sendAt || "").getTime();
    const due = !Number.isFinite(sendTime) || sendTime <= Date.now();

    if (due) {
      const users = await list("users");
      const recipients = users.filter((u) => {
        if (u.role !== "user" || u.status !== "active") return false;
        return !row.audience || row.audience === "ทุกมหาวิทยาลัย" || u.institution === row.audience;
      });

      await Promise.all(recipients.map((u) => insert("notifications", {
        id: "NT-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        userId: u.id,
        kind: "system",
        title: row.title,
        body: row.body || "",
        read: false,
      })));
    }
  }

  if (MAP_COLLECTIONS[name]) {
    await logMapEdit({ actorName: _actor?.name, actorId: _actor?.id, action: "เพิ่ม" + MAP_COLLECTIONS[name], target: row.name || row.label || row.code || row.id, after: "สร้างใหม่" });
  }
  res.json({ ok: true, item: row });
}));

app.patch("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;

  const { name } = req.params;
  const { id, _actor, ...patch } = req.body || {};

  if (
    ["contracts", "broadcasts", "institutionAccess", "accessHistory"].includes(name) &&
    _actor?.role &&
    _actor.role !== "marketing"
  ) {
    return res.status(403).json({
      ok: false,
      error: "เฉพาะฝ่ายการตลาดเท่านั้นที่แก้ไขข้อมูลชุดนี้ได้",
    });
  }

  if (
    name === "institutionAccess" &&
    patch.accessStatus &&
    !ACCESS_STATUS_LABEL[patch.accessStatus]
  ) {
    return res.status(400).json({
      ok: false,
      error: "สถานะสิทธิ์ไม่ถูกต้อง",
    });
  }

  const before = name === "institutionAccess" || name === "users"? (await list(name)).find((r) => r.id === id) : null;
  const row = await update(name, id, patch);

  if (!row) {
    return res.status(404).json({
      ok: false,
      error: "ไม่พบรายการ",
    });
  }

  if (name === "users" && patch.status === "suspended") {
    await cancelPendingRequestsByUser(id);
    invalidateSession(id, "ACCOUNT_SUSPENDED");
  }

  if (name === "users" && patch.role && before?.role !== row.role) {
    invalidateSession(id, "ROLE_CHANGED");
  }

  // ประวัติการเปลี่ยนสิทธิ์เป็นข้อมูลประกอบ
  // ถ้าบันทึก history ไม่สำเร็จ ต้องไม่ทำให้การเปลี่ยนสิทธิ์หลักล้มเหลว
  if (
    name === "institutionAccess" &&
    patch.accessStatus &&
    before?.accessStatus !== row.accessStatus
  ) {
    try {
      await insert("accessHistory", {
        id:
          "AH-" +
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2, 6),
        institution: row.institution,
        institutionAccessId: row.id,
        beforeStatus:
          before?.accessStatus || "active",
        afterStatus: row.accessStatus,
        beforeStatusLabel:
          ACCESS_STATUS_LABEL[
            before?.accessStatus || "active"
          ],
        afterStatusLabel:
          ACCESS_STATUS_LABEL[row.accessStatus],
        actorId: _actor?.id || "-",
        actorName: _actor?.name || "ระบบ",
        changedAt: new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
      });
    } catch (historyError) {
      console.error(
        "[scimap-backend] accessHistory insert failed:",
        historyError
      );
    }
  }

  if (MAP_COLLECTIONS[name]) {
    await logMapEdit({
      actorName: _actor?.name,
      actorId: _actor?.id,
      action: "แก้ไข" + MAP_COLLECTIONS[name],
      target:
        row.name ||
        row.label ||
        row.code ||
        row.id,
      after: JSON.stringify(patch).slice(0, 80),
    });
  }

  res.json({ ok: true, item: row });
}));

app.delete("/api/data/:name", requireSession, wrap(async (req, res) => {
  if (!guard(req, res)) return;
  const { name } = req.params;
  const id = req.query.id;
  const actor = req.query.actor || "";
  const before = (await list(name)).find((r) => r.id === id) || {};
  const ok = await remove(name, id);
  if (ok && MAP_COLLECTIONS[name]) {
    await logMapEdit({ actorName: actor, action: "ลบ" + MAP_COLLECTIONS[name], target: before.name || before.label || before.code || id, before: "มีอยู่", after: "ถูกลบ" });
  }
  res.json({ ok });
}));

/* ═══════════════ สถิติรวม ═══════════════ */
app.get("/api/stats", requireSession, wrap(async (_req, res) => {
  const [users, requests, feedback, news, events, eventStats, rooms, contracts, usage] = await Promise.all([
    list("users"), list("requests"), list("feedback"), list("news"),
    list("events"), list("eventStats"), list("rooms"), list("contracts"), list("usage"),
  ]);

  const last = usage[usage.length - 1] || {};
  const requestsByStatus = requests.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {});
  const requestsByType = requests.reduce((a, r) => {
    const k = r.subject || r.type || "อื่นๆ";
    return { ...a, [k]: (a[k] || 0) + 1 };
  }, {});
  const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

  res.json({
    ok: true,
    overview: {
      totalUsers: users.length,
      activeUsers: last.activeUsers || 0,
      suspendedUsers: users.filter((u) => u.status !== "active").length,
      searches: last.searches || 0,
      routes: last.routes || 0,
      pendingRequests: requests.filter((r) => r.status === "pending").length,
      newFeedback: feedback.filter((f) => f.status === "new").length,
      publishedNews: news.filter((n) => n.published).length,
      buildings: new Set(rooms.map((r) => r.building)).size,
      rooms: rooms.length,
    },
    usage,
    requestsByStatus,
    requestsByType,
    contracts: contracts.map((c) => ({ ...c, daysLeft: daysLeft(c.endDate) })),
    eventStats: eventStats.map((s) => ({ ...s, title: (events.find((e) => e.id === s.eventId) || {}).name || s.eventId })),
  });
}));

/* ═══════════════ พร็อกซี OpenStreetMap ═══════════════ */
app.get("/api/osm", osmHandler);
app.get("/api/walknet", walknetHandler);

// ── ตัวจับ error สุดท้าย: ตอบ 500 แทนที่จะให้ process ตาย ──
app.use((err, _req, res, _next) => {
  console.error("[scimap-backend] error:", err);
  res.status(500).json({ ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" });
});

// กันไม่ให้ error ที่หลุดรอดออกมาทำให้คอนเทนเนอร์ restart วนไปเรื่อยๆ
process.on("unhandledRejection", (e) => console.error("[scimap-backend] unhandledRejection:", e));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[scimap-backend] listening on :${PORT} · storage=${USE_PG ? "postgres" : "memory"}`);
});
