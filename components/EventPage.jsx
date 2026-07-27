"use client";

import { useEffect, useState } from "react";

// หน้า EVENT (เปลี่ยนจาก MISSION เดิม) — ดึงข้อมูลจาก /api/events (mock backend)
// ฟิลด์ตามที่ขอ: แจ้งปัญหา (ช่องพิมพ์เฉยๆ), สถานที่, event, ชื่อ, user name, ประวัติการเข้าร่วมกิจกรรม, กิจกรรมที่เข้าร่วมได้

export default function EventPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  // ฟอร์มแจ้งปัญหา
  const [reportMsg, setReportMsg] = useState("");        // ช่องให้พิมพ์เฉยๆ
  const [reportLocation, setReportLocation] = useState(""); // สถานที่
  const [reportEventId, setReportEventId] = useState(""); // เลือก event ที่เกี่ยวข้อง (ถ้ามี)
  const [reportSending, setReportSending] = useState(false);
  const [reportResult, setReportResult] = useState(null); // {ok:true} หรือ {error:"..."}

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then(setData).catch((e) => setErr(String(e)));
  }, []);

  async function submitReport() {
    if (!reportMsg.trim()) { setReportResult({ error: "กรุณากรอกข้อความก่อนส่ง" }); return; }
    setReportSending(true); setReportResult(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reportMsg, location: reportLocation, eventId: reportEventId || null }),
      });
      const j = await res.json();
      if (!res.ok) { setReportResult({ error: j.error || "ส่งไม่สำเร็จ" }); return; }
      setReportResult({ ok: true });
      setReportMsg(""); setReportLocation(""); setReportEventId("");
    } catch (e) {
      setReportResult({ error: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setReportSending(false);
    }
  }

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

      {/* แจ้งปัญหา */}
      <div className="bdi-h3"><span>แจ้งปัญหา</span></div>
      <div style={{ borderRadius: 14, padding: "12px 14px", background: "#FFFFFF", border: "1px solid #DADCE0", boxShadow: "0 1px 3px rgba(60,64,67,.15)", display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={reportMsg}
          onChange={(e) => setReportMsg(e.target.value)}
          placeholder="พิมพ์รายละเอียดปัญหาที่พบ..."
          rows={3}
          style={{ width: "100%", border: "1px solid #DADCE0", borderRadius: 10, padding: 10, fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
        />
        <input
          value={reportLocation}
          onChange={(e) => setReportLocation(e.target.value)}
          placeholder="สถานที่ (เช่น หน้าอาคาร A-Building)"
          style={{ width: "100%", border: "1px solid #DADCE0", borderRadius: 10, padding: "9px 10px", fontSize: 14, boxSizing: "border-box" }}
        />
        <select
          value={reportEventId}
          onChange={(e) => setReportEventId(e.target.value)}
          style={{ width: "100%", border: "1px solid #DADCE0", borderRadius: 10, padding: "9px 10px", fontSize: 14, color: reportEventId ? "#202124" : "#5F6368" }}
        >
          <option value="">เกี่ยวข้องกับ event (ถ้ามี) — ไม่บังคับ</option>
          {joinable.map((ev) => <option key={ev.id} value={ev.id}>{ev.eventName}</option>)}
          {history.map((ev) => <option key={ev.id} value={ev.id}>{ev.eventName}</option>)}
        </select>
        <button
          onClick={submitReport}
          disabled={reportSending}
          className="use"
          style={{ alignSelf: "flex-end", opacity: reportSending ? 0.6 : 1 }}
        >
          {reportSending ? "กำลังส่ง..." : "ส่งแจ้งปัญหา"}
        </button>
        {reportResult?.ok ? <div style={{ color: "#188038", fontSize: 12.5 }}>✓ ส่งเรียบร้อยแล้ว ขอบคุณที่แจ้ง</div> : null}
        {reportResult?.error ? <div style={{ color: "#D93025", fontSize: 12.5 }}>{reportResult.error}</div> : null}
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
