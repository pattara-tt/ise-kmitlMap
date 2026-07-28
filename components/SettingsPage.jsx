"use client";

import { useEffect, useState } from "react";

// หน้า SETTINGS — โปรไฟล์ / บัญชี / คำแนะนำ / ออกจากระบบ
// ดึงชื่อผู้ใช้จาก /api/events (endpoint เดิมที่มี user.name/user.username อยู่แล้ว กันสร้าง endpoint ซ้ำ)
// TODO(prod): ต่อระบบ login จริง แล้วเปลี่ยนปุ่ม logout ให้เรียก API/clear session จริง

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  function handleLogout() {
    setLoggingOut(true);
    // TODO(prod): เรียก API logout จริง + เคลียร์ session/token + redirect ไปหน้า login
    setTimeout(() => {
      setLoggingOut(false);
      alert("ออกจากระบบแล้ว (โหมดทดสอบ — ยังไม่ได้ต่อระบบ login จริง)");
    }, 400);
  }

  const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", borderBottom: "1px solid #E8EAED", cursor: "pointer" };
  const cardStyle = { borderRadius: 14, background: "#FFFFFF", border: "1px solid #DADCE0", boxShadow: "0 1px 3px rgba(60,64,67,.15)", overflow: "hidden", marginBottom: 4 };

  return (
    <div className="bdi-page">
      {/* โปรไฟล์: รูป + ชื่อ + user name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E8F0FE", border: "2px solid #AECBFA", display: "grid", placeItems: "center", fontSize: 30 }}>👤</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#202124" }}>{user ? user.name : "กำลังโหลด…"}</div>
          <div style={{ fontSize: 13, color: "#5F6368" }}>@{user ? user.username : "…"}</div>
        </div>
      </div>

      {/* บัญชี */}
      <div className="bdi-h3"><span>บัญชี</span></div>
      <div style={cardStyle}>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: "#202124" }}>✏️ แก้ไขโปรไฟล์</span>
          <span style={{ color: "#5F6368" }}>›</span>
        </div>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: "#202124" }}>🔒 เปลี่ยนรหัสผ่าน</span>
          <span style={{ color: "#5F6368" }}>›</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={{ fontSize: 14, color: "#202124" }}>🔔 การแจ้งเตือน</span>
          <span style={{ color: "#5F6368" }}>›</span>
        </div>
      </div>

      {/* คำแนะนำ */}
      <div className="bdi-h3"><span>คำแนะนำ</span></div>
      <div style={cardStyle}>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: "#202124" }}>❓ วิธีใช้งานแอป</span>
          <span style={{ color: "#5F6368" }}>›</span>
        </div>
        <div style={rowStyle}>
          <span style={{ fontSize: 14, color: "#202124" }}>💬 ติดต่อ/ส่งความคิดเห็น</span>
          <span style={{ color: "#5F6368" }}>›</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={{ fontSize: 14, color: "#202124" }}>📄 เงื่อนไขการใช้งาน & ความเป็นส่วนตัว</span>
          <span style={{ color: "#5F6368" }}>›</span>
        </div>
      </div>

      {/* ออกจากระบบ */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          width: "100%", marginTop: 22, padding: "13px 0", border: "1px solid #F5C2C0", borderRadius: 14,
          background: "#FFFFFF", color: "#D93025", fontWeight: 800, fontSize: 15, cursor: "pointer",
          opacity: loggingOut ? 0.6 : 1,
        }}
      >
        {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
      </button>
    </div>
  );
}
