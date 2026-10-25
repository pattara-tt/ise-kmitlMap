"use client";

import { useEffect, useRef, useState } from "react";

// ───────── กล่องแจ้งเตือน / ยืนยัน กลางของระบบ ─────────
// ใช้แทน alert() และ confirm() ของเบราว์เซอร์ ("<เว็บ> says ...")
//   await notify("บันทึกเรียบร้อย");
//   const ok = await askConfirm("ลบรายการนี้?", { tone: "danger", confirmLabel: "ลบ" });
// <DialogHost /> ต้อง mount ไว้ครั้งเดียวที่ app/layout.jsx และจะเขียนทับ window.alert ให้อัตโนมัติ

const nativeAlert = typeof window !== "undefined" ? window.alert.bind(window) : null;
const nativeConfirm = typeof window !== "undefined" ? window.confirm.bind(window) : null;

let enqueue = null; // <DialogHost /> เป็นคนลงทะเบียน

export function notify(message, options = {}) {
  return new Promise((resolve) => {
    if (!enqueue) {
      nativeAlert?.(String(message ?? ""));
      resolve(true);
      return;
    }
    enqueue({ kind: "notify", message: String(message ?? ""), ...options, resolve });
  });
}

export function askConfirm(message, options = {}) {
  return new Promise((resolve) => {
    if (!enqueue) {
      resolve(nativeConfirm ? nativeConfirm(String(message ?? "")) : false);
      return;
    }
    enqueue({ kind: "confirm", message: String(message ?? ""), ...options, resolve });
  });
}

const TONES = {
  success: { icon: "✓", color: "#188038", bg: "#E6F4EA", title: "ดำเนินการสำเร็จ" },
  error: { icon: "!", color: "#D93025", bg: "#FCE8E6", title: "เกิดข้อผิดพลาด" },
  warning: { icon: "!", color: "#B06000", bg: "#FEF7E0", title: "โปรดตรวจสอบ" },
  info: { icon: "i", color: "#1A73E8", bg: "#E8F0FE", title: "แจ้งให้ทราบ" },
  question: { icon: "?", color: "#1A73E8", bg: "#E8F0FE", title: "ยืนยันการดำเนินการ" },
  danger: { icon: "!", color: "#D93025", bg: "#FCE8E6", title: "ยืนยันการดำเนินการ" },
};

// alert() เดิมไม่ได้ส่ง tone มา → เดาจากข้อความ เพื่อให้สีและไอคอนตรงความหมาย
function inferTone(message) {
  if (/^กรุณา/.test(message)) return "warning";
  if (/ไม่สำเร็จ|ผิดพลาด|ไม่สามารถ|ไม่พบ|ไม่ถูกต้อง|ไม่ได้/.test(message)) return "error";
  if (/เรียบร้อย|สำเร็จ|แล้ว/.test(message)) return "success";
  if (/หมดอายุ|ต้อง/.test(message)) return "warning";
  return "info";
}

export function DialogHost() {
  const [queue, setQueue] = useState([]);
  const okRef = useRef(null);
  const current = queue[0] || null;

  useEffect(() => {
    enqueue = (item) => setQueue((q) => [...q, item]);
    const previousAlert = window.alert;
    window.alert = (message) => { notify(message); };
    return () => {
      enqueue = null;
      window.alert = previousAlert;
    };
  }, []);

  function close(result) {
    if (!current) return;
    current.resolve(result);
    setQueue((q) => q.slice(1));
  }

  // โฟกัสปุ่มหลักทุกครั้งที่กล่องขึ้น (กด Enter ยืนยันได้ / Esc = ยกเลิก)
  useEffect(() => {
    if (!current) return undefined;
    okRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(current.kind === "confirm" ? false : true); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  const isConfirm = current.kind === "confirm";
  const toneKey = current.tone || (isConfirm ? "question" : inferTone(current.message));
  const tone = TONES[toneKey] || TONES.info;
  const destructive = isConfirm && current.tone === "danger";

  return (
    <div
      className="sm-dialog-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(isConfirm ? false : true); }}
    >
      <div
        className="sm-dialog"
        role={isConfirm ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="sm-dialog-title"
        aria-describedby="sm-dialog-msg"
      >
        <div className="sm-dialog-icon" style={{ background: tone.bg, color: tone.color }}>{tone.icon}</div>
        <div id="sm-dialog-title" className="sm-dialog-title">{current.title || tone.title}</div>
        <div id="sm-dialog-msg" className="sm-dialog-msg">{current.message}</div>
        {Array.isArray(current.details) && current.details.length ? (
          <div className="sm-dialog-details">
            {current.details.map((d, i) => (
              <div className="sm-dialog-row" key={i}>
                <div className="sm-dialog-row-label">{d.label}</div>
                <div className="sm-dialog-row-value">
                  {d.from !== undefined ? (
                    <>
                      <span className="sm-dialog-from">{d.from}</span>
                      <span className="sm-dialog-arrow" aria-hidden="true">→</span>
                      <b>{d.value}</b>
                    </>
                  ) : d.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {current.footnote ? <div className="sm-dialog-footnote">{current.footnote}</div> : null}
        <div className="sm-dialog-actions">
          {isConfirm ? (
            <button type="button" className="sm-btn ghost" onClick={() => close(false)}>
              {current.cancelLabel || "ยกเลิก"}
            </button>
          ) : null}
          <button
            type="button"
            ref={okRef}
            className={"sm-btn " + (destructive ? "danger" : "primary")}
            onClick={() => close(true)}
          >
            {isConfirm ? (current.confirmLabel || "ยืนยัน") : (current.okLabel || "ตกลง")}
          </button>
        </div>
      </div>
    </div>
  );
}