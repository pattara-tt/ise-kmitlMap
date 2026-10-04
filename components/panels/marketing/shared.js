/* =========================================================
   UC-4 : ติดตามสัญญาบริการ
========================================================= */
import { dayKey, todayKey } from "../../../lib/datetime";

// DATE columns arrive from PostgreSQL as YYYY-MM-DD or an ISO timestamp.
// Compare their calendar date rather than the UTC midnight timestamp.
export const datePart = value => (value == null || value === "" ? "" : dayKey(value));

export const todayLocalISO = () => todayKey();

export const contractDaysLeft = (endDate, today = todayLocalISO()) => {
  const end = datePart(endDate);
  if (!end) return null;
  return Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
};

export const contractDisplayStatus = (contract, today = todayLocalISO()) =>
  contract.status === "expired" || (datePart(contract.endDate) && datePart(contract.endDate) < today)
    ? "expired" : "active";

export const minRenewalDate = (endDate, today = todayLocalISO()) => {
  const previous = datePart(endDate);
  const dayAfterOld = previous ? new Date(Date.parse(previous + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10) : today;
  return dayAfterOld > today ? dayAfterOld : today;
};

/* =========================================================
   UC-6 : จัดการสิทธิ์ระดับสถาบัน
========================================================= */

export const LEVELS = {
  full: "เต็มรูปแบบ",
  standard: "มาตรฐาน",
  readonly: "อ่านอย่างเดียว"
};

export const ACCESS_STATUS = {
  active: {
    label: "เปิดใช้งาน",
    color: "#188038",
    bg: "#E6F4EA"
  },
  paused: {
    label: "หยุดชั่วคราว",
    color: "#B06000",
    bg: "#FEF7E0"
  },
  suspended: {
    label: "ระงับสิทธิ์",
    color: "#D93025",
    bg: "#FCE8E6"
  }
};