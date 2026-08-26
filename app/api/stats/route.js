import { db } from "../../../lib/store";

// UC1 รายงาน/สถิติภาพรวมระบบ · UC14 รายงานสรุปคำร้อง · UC20 สถิติความสนใจกิจกรรม
export async function GET() {
  const last = db.usage[db.usage.length - 1] || {};
  const requestsByStatus = db.requests.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {});
  const requestsByType = db.requests.reduce((a, r) => ({ ...a, [r.type]: (a[r.type] || 0) + 1 }), {});
  const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

  return Response.json({
    ok: true,
    overview: {
      totalUsers: db.users.length,
      activeUsers: last.activeUsers || 0,
      suspendedUsers: db.users.filter((u) => u.status !== "active").length,
      searches: last.searches || 0,
      routes: last.routes || 0,
      pendingRequests: db.requests.filter((r) => r.status === "pending").length,
      newFeedback: db.feedback.filter((f) => f.status === "new").length,
      publishedNews: db.news.filter((n) => n.status === "published").length,
      buildings: new Set(db.rooms.map((r) => r.building)).size,
      rooms: db.rooms.length,
    },
    usage: db.usage,
    requestsByStatus,
    requestsByType,
    contracts: db.contracts.map((c) => ({ ...c, daysLeft: daysLeft(c.endDate) })),
    eventStats: db.eventStats.map((s) => ({ ...s, title: (db.news.find((n) => n.id === s.newsId) || {}).title || s.newsId })),
  });
}
