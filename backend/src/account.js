import { list, update, insert } from "./store.js";

// ล้างคิวคำร้องคนที่ถูกระงับ
export async function cancelPendingRequestsByUser(userId) {
  const requests = await list("requests");
  const cancelled = [];

  for (const r of requests) {
    if (r.userId === userId && r.status === "pending") {
      await update("requests", r.id, {
        status: "cancelled",
        note: "ยกเลิก: บัญชีผู้ยื่นถูกระงับ"
      });

      cancelled.push(r.id);
    }
  }

  return cancelled;
}

// แจ้งเตือนผู้ใช้
export function notifyUser(userId, title, message) {
  return insert("notifications", {
    userId,
    title,
    body: message,
    read: false
  });
}