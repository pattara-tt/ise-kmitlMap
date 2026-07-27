"use client";

import { useEffect, useState } from "react";

// หน้า MISSION ตาม Figma (missionPage 65:1730) — ดึงข้อมูลจาก /api/missions (mock backend)

// เลือกรูปมุมขวาบนของคูปองตามชื่อร้าน — ไฟล์อยู่ใน public/ (คืน null ถ้าไม่เข้าเงื่อนไขไหนเลย)
function shopIcon(shop = "") {
  if (shop.includes("กาแฟ") || shop.includes("คาเฟ่")) return "/pic_coffee.svg";
  if (shop.includes("นวด")) return "/pic_message.svg";
  return null;
}

// รูปแปะมุมขวาบนของการ์ดคูปอง (ต้องให้การ์ดเป็น position: relative)
function CornerIcon({ shop }) {
  const src = shopIcon(shop);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={40}
      height={38}
      style={{ position: "absolute", top: 8, right: 10, pointerEvents: "none", opacity: 0.9 }}
    />
  );
}

export default function MissionPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/missions").then((r) => r.json()).then(setData).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div className="bdi-page">โหลดข้อมูลไม่สำเร็จ: {err}</div>;
  if (!data) return <div className="bdi-page" style={{ color: "#5F6368" }}>กำลังโหลด…</div>;

  const { user, stats, couponHistory, campaigns } = data;
  return (
    <div className="bdi-page">
      {/* โปรไฟล์ */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8F0FE", border: "2px solid #AECBFA", display: "grid", placeItems: "center", fontSize: 26 }}>👤</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#202124" }}>{user.name}</div>
          <div style={{ fontSize: 12.5, color: "#5F6368" }}>{user.email}</div>
        </div>
      </div>

      {/* สถิติ */}
      <div className="bdi-stat-tiles">
        <div className="bdi-tile"><b>{stats.totalKm}</b><span>ระยะทางรวม (km.)</span></div>
        <div className="bdi-tile"><b>{stats.couponCount}</b><span>จำนวนคูปองทั้งหมด</span></div>
      </div>

      {/* streak รายวัน (ย้ายมาจาก HUD บนแผนที่) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 14, padding: "12px 14px", background: "#FFFFFF", border: "1px solid #DADCE0", boxShadow: "0 1px 3px rgba(60,64,67,.15)" }}>
        <div style={{ width: 46, height: 46, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", background: `conic-gradient(#188038 ${stats.progressPct}%, #E8EAED 0)` }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFFFFF", display: "grid", placeItems: "center", fontSize: 17 }}>🔥</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#202124" }}>เดิน {stats.streakDays} วันติด</div>
          <div style={{ fontSize: 12, color: "#5F6368" }}>อีก {stats.kmToNextCoupon} กม. เพื่อรับ{stats.nextCouponLabel}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 19, color: "#188038" }}>{stats.todayKm}</div>
          <div style={{ fontSize: 10, color: "#5F6368", letterSpacing: 1 }}>KM วันนี้</div>
        </div>
      </div>

      {/* ประวัติการใช้คูปอง */}
      <div className="bdi-h3"><span>ประวัติการใช้คูปอง</span><a href="#">ดูทั้งหมด</a></div>
      {couponHistory.map((c) => (
        // position: relative เพื่อให้ CornerIcon เกาะมุมขวาบนของการ์ดใบนี้
        <div className="bdi-coupon" key={c.id} style={{ position: "relative" }}>
          <CornerIcon shop={c.shop} />
          {/* paddingRight กันข้อความยาวชนรูปมุมขวาบน */}
          <div className="body" style={{ paddingRight: 54 }}>
            <div style={{ fontSize: 12.5, color: "#5F6368" }}>{c.shop}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#188038" }}>{c.title}</div>
          </div>
          <div className="foot">
            <span>EXP: {c.exp}</span>
            {c.usable ? <button className="use">ใช้เลย</button> : null}
          </div>
        </div>
      ))}

      {/* แคมเพนที่เข้าร่วมได้ */}
      <div className="bdi-h3"><span>แคมเพนที่เข้าร่วมได้</span><a href="#">ดูทั้งหมด</a></div>
      {campaigns.map((m) => (
        <div className="bdi-coupon" key={m.id} style={{ position: "relative" }}>
          <CornerIcon shop={m.shop} />
          <div className="body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingRight: shopIcon(m.shop) ? 54 : 0 }}>
            <div>
              <div style={{ fontSize: 12.5, color: "#5F6368" }}>{m.shop}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#188038" }}>{m.title}</div>
              <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 2 }}>{m.cond}</div>
            </div>
            {/* ถ้ามีรูป SVG มุมขวาบนแล้ว ไม่ต้องโชว์ emoji ซ้ำ — โชว์ emoji เฉพาะร้านที่ยังไม่มีรูป */}
            {!shopIcon(m.shop) ? <div style={{ fontSize: 30 }}>{m.icon}</div> : null}
          </div>
          <div className="foot">
            <span>EXP: {m.exp}</span>
            <button className="use">เข้าร่วม</button>
          </div>
        </div>
      ))}
    </div>
  );
}