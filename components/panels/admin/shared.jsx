export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// Actor: ฝ่ายดูแลระบบ — UC10–UC16

export function formatAdminDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("th-TH");
}

export function getHistoryActionLabel(action) {
  if (action === "ROLE_CHANGED") {
    return "เปลี่ยนสิทธิ์ผู้ใช้งาน";
  }
  if (action === "SUSPENDED") {
    return "ระงับบัญชีผู้ใช้งาน";
  }
  if (action === "RESTORED") {
    return "คืนสิทธิ์การใช้งาน";
  }
  return action || "-";
}

// ชื่อ field ที่อาจถูกขอแก้ไข → label ภาษาไทยสำหรับแสดงผล
export const FIELD_LABEL = {
  teacher: "อาจารย์ประจำ",
  capacity: "ความจุ",
  name: "ชื่อ",
  role: "บทบาท",
  status: "สถานะ",
  label: "ชื่อสถานที่",
  type: "ประเภทสถานที่"
};

// ── UC14 จัดทำสรุปคำร้อง ───────────────────────

export function StatBox({
  label,
  value
}) {
  return <div style={{
    border: "1px solid #E8EAED",
    borderRadius: 10,
    padding: 14
  }}>
      <div style={{
      fontSize: 12,
      color: "#5F6368"
    }}>
        {label}
      </div>

      <div style={{
      fontSize: 22,
      fontWeight: 800,
      marginTop: 4
    }}>
        {value}
      </div>
    </div>;
}

// ── UC11 ค้นหาและเรียกดูข้อมูลคำร้อง ──────────────────────
