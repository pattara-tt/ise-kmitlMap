const KMITL_RE = /KMITL|สจล|ลาดกระบัง/i;

export function isKmitlUser(u) {
  return KMITL_RE.test(`${u?.institutionName || ""} ${u?.institutionId || ""}`);
}

const numOf = (id) => parseInt(String(id ?? "").replace(/\D/g, ""), 10) || 0;

// สร้างแผนที่ id -> "KMITL-00X" จากผู้ใช้ KMITL ทั้งหมด เรียงตามวันที่สมัคร (เก่า → ใหม่)
// ต้องส่งรายการ users "ทั้งหมด" (ก่อนกรองบทบาท/สถานะ/คำค้น) เลขจึงไม่ขยับตามตัวกรอง
export function buildUserCodeMap(users = []) {
  const kmitl = users
    .filter(isKmitlUser)
    .sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      if (ta !== tb) return ta - tb;
      return numOf(a.id) - numOf(b.id) || String(a.id).localeCompare(String(b.id));
    });
  return new Map(kmitl.map((u, i) => [u.id, `KMITL-${String(i + 1).padStart(3, "0")}`]));
}

export function displayUserId(u, codeMap) {
  if (!u?.id) return "-";
  return codeMap?.get(u.id) || String(u.id); // สถาบันอื่น → รหัส U… เดิม
}