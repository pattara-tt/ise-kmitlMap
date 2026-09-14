"use client";

import { useEffect, useState } from "react";

// Status bar จำลองแบบ iOS — เวลา (ซ้าย) / WiFi + แบตเตอรี่ (ขวา) ขนาบ dynamic island
// โชว์เฉพาะตอนเป็นกรอบ iPhone บนจอคอม (จอมือถือจริงมี status bar ของเครื่องอยู่แล้ว — คุมด้วย CSS .bdi-statusbar)
export default function StatusBar() {
  const [time, setTime] = useState("");
  const [batt, setBatt] = useState(1); // 0..1 — อ่านจาก Battery API ของเบราว์เซอร์ถ้ามี ไม่มีก็โชว์เต็ม

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 15000); // อัปเดตทุก 15 วิ พอสำหรับนาฬิกาแบบ ชม.:นาที

    let battery = null;
    const onLevel = () => battery && setBatt(battery.level);
    if (typeof navigator !== "undefined" && navigator.getBattery) {
      navigator.getBattery().then((b) => {
        battery = b;
        onLevel();
        b.addEventListener("levelchange", onLevel);
      }).catch(() => {});
    }
    return () => {
      clearInterval(t);
      if (battery) battery.removeEventListener("levelchange", onLevel);
    };
  }, []);

  return (
    <div className="bdi-statusbar" aria-hidden="true">
      <span className="time">{time}</span>
      <span className="icons">
        {/* WiFi — 3 คลื่นแบบ iOS */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.5 2.55C11.02 2.55 13.32 3.51 15.06 5.08L16.42 3.57C14.31 1.68 11.53 0.55 8.5 0.55C5.47 0.55 2.69 1.68 0.58 3.57L1.94 5.08C3.68 3.51 5.98 2.55 8.5 2.55Z" fill="currentColor" />
          <path d="M8.5 6.05C9.99 6.05 11.35 6.6 12.4 7.5L13.76 5.99C12.35 4.77 10.51 4.03 8.5 4.03C6.49 4.03 4.65 4.77 3.24 5.99L4.6 7.5C5.65 6.6 7.01 6.05 8.5 6.05Z" fill="currentColor" />
          <path d="M10.73 9.28C10.12 8.79 9.34 8.5 8.5 8.5C7.66 8.5 6.88 8.79 6.27 9.28L8.5 11.75L10.73 9.28Z" fill="currentColor" />
        </svg>
        {/* แบตเตอรี่ — ความยาวแท่งข้างในตาม batt (0..1) */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.2" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width={Math.max(2, Math.round(18 * batt))} height="8" rx="1.6" fill="currentColor" />
          <path d="M22.8 4V8C23.7 7.72 24.3 6.9 24.3 6C24.3 5.1 23.7 4.28 22.8 4Z" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}
