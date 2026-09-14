"use client";

import { useEffect, useState } from "react";

// หน้า EVENT (เปลี่ยนจาก MISSION เดิม) — ดึงข้อมูลจาก /api/events (mock backend)
// ฟิลด์ตามที่ขอ: สถานที่, event, ชื่อ, user name, ประวัติการเข้าร่วมกิจกรรม, กิจกรรมที่เข้าร่วมได้
// (ตัดส่วน "แจ้งปัญหา" ออกทั้งหมดแล้ว)

export default function EventPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then(setData).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div className="bdi-page">โหลดข้อมูลไม่สำเร็จ: {err}</div>;
  if (!data) return <div className="bdi-page" style={{ color: "#5F6368" }}>กำลังโหลด…</div>;

  const { user, history, joinable } = data;

  return (
    <div className="bdi-page">
      {/* โปรไฟล์: ชื่อ + user name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8F0FE", border: "2px solid #AECBFA", display: "grid", placeItems: "center", fontSize: 26 }}>👤</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#202124" }}>{user.name}</div>
          <div style={{ fontSize: 12.5, color: "#5F6368" }}>@{user.username}</div>
        </div>
      </div>

      {/* ประวัติการเข้าร่วมกิจกรรม */}
      <div className="bdi-h3"><span>ประวัติการเข้าร่วมกิจกรรม</span><a href="#">ดูทั้งหมด</a></div>
      {history.length ? history.map((h) => (
        <div className="bdi-coupon" key={h.id}>
          <div className="body">
            <div style={{ fontSize: 12.5, color: "#5F6368" }}>{h.location}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#188038" }}>{h.eventName}</div>
          </div>
          <div className="foot">
            <span>{h.date}</span>
            <span style={{ color: "#5F6368", fontSize: 12 }}>{h.status}</span>
          </div>
        </div>
      )) : <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่เคยเข้าร่วมกิจกรรมใด</div>}

      {/* กิจกรรมที่เข้าร่วมได้ */}
      <div className="bdi-h3"><span>กิจกรรมที่เข้าร่วมได้</span><a href="#">ดูทั้งหมด</a></div>
      {joinable.map((ev) => (
        <div className="bdi-coupon" key={ev.id} style={{ position: "relative" }}>
          <div className="body">
            <div style={{ fontSize: 12.5, color: "#5F6368" }}>{ev.location}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#188038" }}>{ev.eventName}</div>
            <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 2 }}>{ev.desc}</div>
          </div>
          <div className="foot">
            <span>{ev.date}</span>
            <button className="use">เข้าร่วม</button>
          </div>
        </div>
      ))}
    </div>
  );
}