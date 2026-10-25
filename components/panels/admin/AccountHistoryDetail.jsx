"use client";

import { useEffect } from "react";
import { useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { formatAdminDateTime, getHistoryActionLabel } from "./shared";

function Row({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#80868B", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: "#202124", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

export default function AccountHistoryDetail({ historyId, onClose }) {
  const { roleLabels } = useRefData(true);
  const { items: accountHistory } = useCollection("accountHistory");
  const { items: users } = useCollection("users");
  const history = accountHistory.find(item => item.id === historyId);

  // กด Esc เพื่อปิด
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const oldRole = roleLabels[history?.oldValue] || history?.oldValue || "-";
  const newRole = roleLabels[history?.newValue] || history?.newValue || "-";

  return (
    <div className="sm-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="รายละเอียดการเปลี่ยนแปลงบัญชี"
        style={{
          width: "min(440px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto",
          background: "#fff", borderRadius: 18, padding: "18px 20px 22px",
          boxShadow: "0 16px 48px rgba(0,0,0,.3)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <b style={{ fontSize: 16 }}>รายละเอียดการเปลี่ยนแปลงบัญชี</b>
          <button type="button" className="round-btn" onClick={onClose} aria-label="ปิด" title="ปิด">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!history ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#5F6368" }}>
            ไม่พบข้อมูลประวัติการเปลี่ยนแปลง
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <Row label="การกระทำ"><b>{getHistoryActionLabel(history.action)}</b></Row>

            {history.action === "ROLE_CHANGED" && (
              <Row label="บทบาท">{oldRole} → <b>{newRole}</b></Row>
            )}

            <Row label="เหตุผล">{history.reason || "-"}</Row>
            <Row label="ผู้ดำเนินการ">{users.find(u => u.id === history.changedBy)?.name || "-"}</Row>
            <Row label="วันที่ดำเนินการ">{formatAdminDateTime(history.changedAt)}</Row>
          </div>
        )}
      </div>
    </div>
  );
}