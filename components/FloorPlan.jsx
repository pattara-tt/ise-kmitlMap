"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapData } from "../lib/useMapData";

export default function FloorPlan({ onClose }) {
  const { data, loading, error } = useMapData();
  const floors = useMemo(() => data?.building?.floors || [], [data]);
  const [fl, setFl] = useState("");
  useEffect(() => {
    if (!fl && floors.length) setFl(String(floors[0].floorNo));
  }, [fl, floors]);
  const currentFloor = floors.find((f) => String(f.floorNo) === String(fl));
  if (loading) return <div className="bdi-card" style={{ padding: 16 }}>กำลังโหลดข้อมูลชั้น…</div>;
  if (error) return <div className="bdi-card" style={{ padding: 16 }}>โหลดข้อมูลชั้นไม่สำเร็จ: {error.message}</div>;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2500, background: "rgba(8,4,15,.88)", display: "flex", flexDirection: "column", padding: "56px 14px 14px" }}>
      {/* หัวเรื่อง */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: 1.5 }}>{data?.building?.name || "อาคาร"}</div>
          <div style={{ fontSize: 12, color: "var(--bdi-text-dim)" }}>{currentFloor?.note || currentFloor?.name || `ชั้น ${fl}` }</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "1px solid var(--bdi-line)", color: "var(--bdi-text)", borderRadius: 999, width: 34, height: 34, fontSize: 15, cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 10, minHeight: 0 }}>
        {/* ตัวเลือกชั้น 2/1/M/G ตาม Figma (Frame 59) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          {floors.map((row) => { const f = String(row.floorNo); return (
            <button key={f} onClick={() => setFl(f)}
              style={{ width: 40, height: 40, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", border: "1px solid " + (fl === f ? "var(--bdi-green)" : "var(--bdi-line)"), background: fl === f ? "var(--bdi-green)" : "rgba(255,255,255,.06)", color: fl === f ? "#14081f" : "var(--bdi-text)" }}>
              {f}
            </button>
          ); })}
        </div>

        {/* แผนผัง schematic */}
        <div className="bdi-card" style={{ flex: 1, padding: 8, minHeight: 0 }}>
          <svg viewBox="0 0 320 420" style={{ width: "100%", height: "100%" }}>
            {/* ตัวอาคาร */}
            <path d="M30 40 L290 40 L290 340 L200 390 L30 390 Z" fill="rgba(183,235,62,.07)" stroke="var(--bdi-line)" strokeWidth="2" />
            {/* โซน */}
            <rect x="45" y="60" width="110" height="120" rx="8" fill="rgba(183,235,62,.16)" stroke="var(--bdi-green)" strokeDasharray="4 3" />
            <text x="100" y="125" textAnchor="middle" fill="var(--bdi-green)" fontSize="20" fontWeight="800">A</text>
            <rect x="170" y="60" width="100" height="120" rx="8" fill="rgba(255,255,255,.05)" stroke="var(--bdi-line)" />
            <text x="220" y="125" textAnchor="middle" fill="rgba(244,239,252,.6)" fontSize="20" fontWeight="800">B</text>
            <rect x="45" y="200" width="225" height="90" rx="8" fill="rgba(255,255,255,.05)" stroke="var(--bdi-line)" />
            <text x="157" y="250" textAnchor="middle" fill="rgba(244,239,252,.6)" fontSize="13">โถงกลาง / Atrium</text>
            {/* ห้องน้ำ */}
            <circle cx="255" cy="310" r="13" fill="#2a9d8f" />
            <text x="255" y="315" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">WC</text>
            {/* จุดเข้า (จาก Don Don Donki / MBK) */}
            <circle cx="55" cy="370" r="9" fill="var(--bdi-green)" />
            <text x="72" y="374" fill="var(--bdi-text)" fontSize="11">เข้าจากทางเชื่อม MBK (ฝั่ง Don Don Donki)</text>
            {/* เส้นทางเดินในอาคาร */}
            {fl === "2" ? (
              <>
                <path d="M55 370 L55 250 L100 250 L100 120 L220 120 L220 60 L245 40" fill="none" stroke="var(--bdi-green)" strokeWidth="4" strokeDasharray="7 6" strokeLinecap="round" />
                <circle cx="245" cy="40" r="9" fill="var(--bdi-green)" />
                <text x="245" y="24" textAnchor="middle" fill="var(--bdi-green)" fontSize="11" fontWeight="700">ออก Skywalk → Paragon / BTS สยาม</text>
              </>
            ) : (
              <text x="160" y="330" textAnchor="middle" fill="rgba(244,239,252,.45)" fontSize="12">เส้นทางแนะนำอยู่ชั้น 2 (ทางเชื่อม Skywalk)</text>
            )}
          </svg>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--bdi-text-dim)", marginTop: 8, textAlign: "center" }}>แผนผังโครงร่างสำหรับเดโม — ตำแหน่งโซน/ทางออกโดยประมาณ</div>
    </div>
  );
}
