// ศูนย์กลางวันเวลาของทั้งระบบ — ห้ามจัดรูปแบบวันเวลาเองที่อื่น ให้ import จากไฟล์นี้เท่านั้น
export const APP_TIMEZONE = "Asia/Bangkok"; // ต้องตรงกับ QUOTA_TIMEZONE ของ backend

const PARTS_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parts(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = {};
  for (const x of PARTS_FMT.formatToParts(d)) p[x.type] = x.value;
  return p;
}

// คีย์วัน/เดือนตามเวลาไทย — ใช้นับโควต้า กรองช่วงวันที่ ตั้งชื่อไฟล์ ฯลฯ
export function dayKey(value = Date.now()) {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;
  const p = parts(value);
  return p ? `${p.year}-${p.month}-${p.day}` : "";
}
export const monthKey = (value = Date.now()) => dayKey(value).slice(0, 7);
export const todayKey = () => dayKey(Date.now());

// แสดงผล: yyyy-mm-dd
export function formatDate(value) {
  if (!value) return "-";
  return dayKey(value) || String(value);
}
// แสดงผล: hh:mm AM/PM
export function formatTime(value) {
  const p = parts(value);
  if (!p) return "-";
  const h = Number(p.hour);
  return `${String(h % 12 || 12).padStart(2, "0")}:${p.minute} ${h < 12 ? "AM" : "PM"}`;
}
// แสดงผล: yyyy-mm-dd hh:mm AM/PM (ค่าที่เป็นวันที่ล้วนจะแสดงแค่วันที่)
export function formatDateTime(value) {
  if (!value) return "-";
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;
  const p = parts(value);
  if (!p) return String(value);
  return `${p.year}-${p.month}-${p.day} ${formatTime(value)}`;
}

// สำหรับ <input type="date|datetime-local"> (เตรียมไว้ใช้ในขั้นถัดไป)
export function nowInput(withTime = true) { return isoToInput(Date.now(), withTime); }
export function isoToInput(value, withTime = true) {
  const p = parts(value);
  if (!p) return "";
  return withTime ? `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` : `${p.year}-${p.month}-${p.day}`;
}
export function inputToISO(v) {
  if (!v) return null;
  const s = String(v);
  if (DATE_ONLY.test(s)) return s;
  const d = new Date(`${s.length === 16 ? s + ":00" : s}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}