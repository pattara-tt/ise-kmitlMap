const sessions = new Map();
// sessionId -> { reason, userId, at } : session ที่ระบบเพิกถอน (เปลี่ยนบทบาท / ระงับบัญชี)
const revokedSessions = new Map();

const IDLE_TIMEOUT = (Number(process.env.SESSION_IDLE_MINUTES) || 30) * 60 * 1000;
const ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

function isExpired(session, now = Date.now()) {
  return (
    now - session.lastActivityAt > IDLE_TIMEOUT ||
    now - session.createdAt > ABSOLUTE_TIMEOUT
  );
}

// ลบเหตุผลที่เก่าเกินอายุ session สูงสุด (กัน memory โตเรื่อย ๆ)
function pruneRevoked() {
  const now = Date.now();
  for (const [id, r] of revokedSessions) {
    if (now - r.at > ABSOLUTE_TIMEOUT) revokedSessions.delete(id);
  }
}

// ผู้ใช้ login ใหม่ / ถูกคืนสิทธิ์ → เหตุผลเก่าหมดความหมาย
export function clearRevokedForUser(userId) {
  for (const [id, r] of revokedSessions) {
    if (r.userId === userId) revokedSessions.delete(id);
  }
}

export function createSession(user, role, activities = []) {
  pruneRevoked();
  clearRevokedForUser(user.id);

  const now = Date.now();

  const sessionId =
    "S-" + now + "-" + Math.random().toString(36).slice(2, 10);

  sessions.set(sessionId, {
    userId: user.id,
    role,
    activities,
    createdAt: now,
    lastActivityAt: now,
  });

  return sessionId;
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  const now = Date.now();

  if (isExpired(session, now)) {
    sessions.delete(sessionId);
    return null;
  }

  // User is still active, so refresh idle timeout.
  session.lastActivityAt = now;

  return session;
}

export function invalidateSession(userId, reason = "SESSION_INVALID") {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId !== userId) continue;
    sessions.delete(sessionId);
    // session ที่หมดอายุไปก่อนแล้ว ไม่จดเหตุผล → ผู้ใช้จะเห็น "Session หมดอายุ" ตามจริง
    if (!isExpired(session, now)) {
      revokedSessions.set(sessionId, { reason, userId, at: now });
    }
  }
}

export function getRevokedReason(sessionId) {
  const r = revokedSessions.get(sessionId);
  if (!r) return null;
  if (Date.now() - r.at > ABSOLUTE_TIMEOUT) {
    revokedSessions.delete(sessionId);
    return null;
  }
  return r.reason;
}