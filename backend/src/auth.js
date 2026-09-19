const sessions = new Map();
const revokedSessions = new Map();

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSession(user, role, activities = []) {
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

  const idleExpired =
    now - session.lastActivityAt > IDLE_TIMEOUT;

  const absoluteExpired =
    now - session.createdAt > ABSOLUTE_TIMEOUT;

  if (idleExpired || absoluteExpired) {
    sessions.delete(sessionId);
    return null;
  }

  // User is still active, so refresh idle timeout.
  session.lastActivityAt = now;

  return session;
}

export function invalidateSession(userId, reason = "SESSION_INVALID") {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(sessionId);
      revokedSessions.set(sessionId, reason);
    }
  }
}

export function getRevokedReason(sessionId) {
  return revokedSessions.get(sessionId) || null;
}