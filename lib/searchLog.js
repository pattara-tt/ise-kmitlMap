"use client";

import { apiFetch } from "./api";

// บันทึกการค้นหา/นำทางของผู้ใช้ลง search_logs (ใช้ทำสถิติให้ผู้บริหาร)
//   kind: "search" = เลือกผลค้นหา · "route" = ค้นหาเส้นทาง A→B · "navigate" = เริ่มนำทาง
// ยิงแล้วไม่รอผล และกลืนข้อผิดพลาดทุกกรณี — บันทึกไม่สำเร็จต้องไม่กระทบการค้นหา/นำทางของผู้ใช้
export function logSearch({ kind, placeLabel, query, fromLabel, buildingId, roomId }) {
  const label = String(placeLabel || "").trim();
  if (!label) return;
  try {
    apiFetch("/api/search-log", {
      method: "POST",
      body: { kind, placeLabel: label, query, fromLabel, buildingId, roomId },
    }).catch(() => {});
  } catch {
    // ignore
  }
}
