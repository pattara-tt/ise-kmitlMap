import crypto from "node:crypto";
import { USE_PG } from "./store.js";
import { query } from "./pg.js";

// Session policy: fixed lifetime from login, no idle timeout.
// A tab left open stays signed in until the lifetime ends (default 7 days).
const MAX_DAYS = Number(process.env.SESSION_MAX_DAYS) > 0 ? Number(process.env.SESSION_MAX_DAYS) : 7;
const SESSION_TTL = MAX_DAYS * 24 * 60 * 60 * 1000;
const PURGE_EVERY = 60 * 60 * 1000;

// ── storage ────────────────────────────────────────────────────────────────
// PostgreSQL when configured (sessions survive restarts / deploys and work
// with several backend instances); in-memory Map otherwise (dev only).
// Only a SHA-256 hash of the session id is stored, so a DB leak can't be
// replayed as live sessions.
const mem = new Map(); // hash -> row

const hash = (id) => crypto.createHash("sha256").update(String(id)).digest("hex");
const rowToSession = (r) => ({
  userId: r.user_id,
  role: r.role,
  activities: r.activities || [],
  createdAt: new Date(r.created_at).getTime(),
  expiresAt: new Date(r.expires_at).getTime(),
});

let ready;
function ensureTable() {
  if (!USE_PG) return Promise.resolve();
  if (!ready) {
    ready = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS auth_sessions (
        id_hash        text PRIMARY KEY,
        user_id        text NOT NULL,
        role           text NOT NULL,
        activities     jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at     timestamptz NOT NULL DEFAULT now(),
        expires_at     timestamptz NOT NULL,
        revoked_reason text,
        revoked_at     timestamptz
      )`);
      await query("CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id)");
      await query("CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions (expires_at)");
    })().catch((e) => { ready = undefined; throw e; });
  }
  return ready;
}

async function purge() {
  const now = Date.now();
  if (!USE_PG) {
    for (const [k, r] of mem) if (r.expiresAt <= now) mem.delete(k);
    return;
  }
  await ensureTable();
  await query("DELETE FROM auth_sessions WHERE expires_at <= now()");
}
const timer = setInterval(() => purge().catch((e) => console.error("[auth] purge failed:", e.message)), PURGE_EVERY);
timer.unref?.();

// ── API ────────────────────────────────────────────────────────────────────
export async function createSession(user, role, activities = []) {
  const sessionId = "S-" + crypto.randomBytes(32).toString("base64url");
  const h = hash(sessionId);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL;

  if (!USE_PG) {
    await clearRevokedForUser(user.id);
    mem.set(h, { userId: String(user.id), role, activities, createdAt: now, expiresAt, revokedReason: null });
    return sessionId;
  }
  await ensureTable();
  await query(
    "INSERT INTO auth_sessions (id_hash, user_id, role, activities, created_at, expires_at) VALUES ($1,$2,$3,$4,to_timestamp($5/1000.0),to_timestamp($6/1000.0))",
    [h, String(user.id), role, JSON.stringify(activities), now, expiresAt],
  );
  // a fresh login / restored account makes older revocation reasons meaningless
  await clearRevokedForUser(user.id);
  return sessionId;
}

// Returns the session, or null if missing / expired / revoked. Does NOT extend life.
export async function getSession(sessionId) {
  if (!sessionId) return null;
  const h = hash(sessionId);
  if (!USE_PG) {
    const r = mem.get(h);
    if (!r || r.revokedReason) return null;
    if (r.expiresAt <= Date.now()) { mem.delete(h); return null; }
    return { userId: r.userId, role: r.role, activities: r.activities, createdAt: r.createdAt, expiresAt: r.expiresAt };
  }
  await ensureTable();
  const { rows } = await query(
    "SELECT * FROM auth_sessions WHERE id_hash=$1 AND revoked_at IS NULL AND expires_at > now()",
    [h],
  );
  return rows[0] ? rowToSession(rows[0]) : null;
}

export async function destroySession(sessionId) {
  if (!sessionId) return;
  const h = hash(sessionId);
  if (!USE_PG) { mem.delete(h); return; }
  await ensureTable();
  await query("DELETE FROM auth_sessions WHERE id_hash=$1", [h]);
}

// Role change / suspension: kill every live session of the user, remember why.
export async function invalidateSession(userId, reason = "SESSION_INVALID") {
  const uid = String(userId);
  if (!USE_PG) {
    for (const r of mem.values()) {
      if (r.userId === uid && !r.revokedReason && r.expiresAt > Date.now()) r.revokedReason = reason;
    }
    return;
  }
  await ensureTable();
  await query(
    "UPDATE auth_sessions SET revoked_reason=$2, revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > now()",
    [uid, reason],
  );
}

// Reason shown to the user when a revoked session id comes back.
export async function getRevokedReason(sessionId) {
  if (!sessionId) return null;
  const h = hash(sessionId);
  if (!USE_PG) {
    const r = mem.get(h);
    return r && r.revokedReason && r.expiresAt > Date.now() ? r.revokedReason : null;
  }
  await ensureTable();
  const { rows } = await query(
    "SELECT revoked_reason FROM auth_sessions WHERE id_hash=$1 AND revoked_at IS NOT NULL AND expires_at > now()",
    [h],
  );
  return rows[0]?.revoked_reason || null;
}

// User re-activated / logged in again → drop old revocation records.
export async function clearRevokedForUser(userId) {
  const uid = String(userId);
  if (!USE_PG) {
    for (const [k, r] of mem) if (r.userId === uid && r.revokedReason) mem.delete(k);
    return;
  }
  await ensureTable();
  await query("DELETE FROM auth_sessions WHERE user_id=$1 AND revoked_at IS NOT NULL", [uid]);
}
