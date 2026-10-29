"use client";

import { useMemo, useState } from "react";
import { Btn, Card, Status, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import AccountHistoryDetail from "./AccountHistoryDetail";
import RequestDetail from "./RequestDetail";
import { formatDateTime } from "../../../lib/datetime";
import { formatAdminDateTime, getHistoryActionLabel } from "./shared";
import { buildUserCodeMap, displayUserId } from "../../../lib/userDisplay";


export default function UserDetail({ user, adminUser, requests, onBack }) {
  const { roleLabels, roles } = useRefData(true);
  const { items: accountHistory } = useCollection("accountHistory");
  const { items: users } = useCollection("users");
  const codeMap = useMemo(() => buildUserCodeMap(users), [users]);
  const [historyDetailId, setHistoryDetailId] = useState(null);

  const [statFilter, setStatFilter] = useState(null); // null | "all" | "cancelled" | "approved" | "rejected"
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const PREVIEW_COUNT = 5;
  const { items: rooms } = useCollection("rooms");
  const { reload: reloadRequests } = useCollection("requests");

  const userRequests = requests.filter(r => r.userId === user.id);
  const userHistory = accountHistory.filter(h => h.userId === user.id).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  const statTiles = [
    { key: "all", label: "ทั้งหมด", value: userRequests.length },
    { key: "cancelled", label: "ยกเลิกแล้ว", value: userRequests.filter(r => r.status === "cancelled").length },
    { key: "approved", label: "อนุมัติ", value: userRequests.filter(r => r.status === "approved").length },
    { key: "rejected", label: "ไม่อนุมัติ", value: userRequests.filter(r => r.status === "rejected").length },
  ];
  const filteredRequests = userRequests
    .filter(r => statFilter === "all" || r.status === statFilter)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  
  function getHistoryDescription(history) {
    if (history.action === "ROLE_CHANGED") {
      const oldRole = roleLabels[history.oldValue] || history.oldValue || "-";
      const newRole = roleLabels[history.newValue] || history.newValue || "-";
      return `เปลี่ยนสิทธิ์จาก "${oldRole}" เป็น "${newRole}"`;
    }
    if (history.action === "SUSPENDED") {
      return "บัญชีผู้ใช้งานถูกระงับการใช้งาน";
    }
    if (history.action === "RESTORED") {
      return "บัญชีผู้ใช้งานได้รับการคืนสิทธิ์การใช้งาน";
    }
    return history.action || "-";
  }

  if (selectedRequest) {
    return <RequestDetail
      request={selectedRequest}
      user={adminUser}
      onBack={async () => {
        await reloadRequests();
        setSelectedRequest(null);
      }}
    />;
  }

  return <>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }}>
        <Btn kind="ghost" onClick={onBack}>กลับ</Btn>
        <h3 style={{
        margin: 0
      }}> ข้อมูลผู้ใช้งาน </h3>
      </div>

            <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div aria-hidden="true" style={{
            width: 52, height: 52, flex: "none", borderRadius: "50%",
            background: "#E8F0FE", color: "#1A73E8", display: "grid", placeItems: "center",
            fontSize: 22, fontWeight: 800
          }}>
            {String(user.name || user.email || "?").trim().charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#202124", lineHeight: 1.3, overflowWrap: "anywhere" }}>
              {user.name}
            </div>
            <div style={{ fontSize: 14, color: "#5F6368", marginTop: 2, overflowWrap: "anywhere" }}>
              {user.email}
            </div>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 14px", borderRadius: 999,
            background: user.status === "suspended" ? "#FCE8E6" : "#E6F4EA",
            color: user.status === "suspended" ? "#B3261E" : "#137333",
            fontSize: 14, fontWeight: 800
          }}>
            <span style={{ fontSize: 11 }}>●</span>
            {user.status === "suspended" ? "ถูกระงับการใช้งาน" : "ใช้งาน"}
          </div>
        </div>

        <div style={{ height: 1, background: "#E8EAED", margin: "18px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "18px 24px" }}>
          {[
            ["รหัสผู้ใช้งาน", displayUserId(user, codeMap)],
            ["บทบาท", (
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: "#E8F0FE", color: "#1A73E8", fontSize: 13.5, fontWeight: 700 }}>
                {roleLabels[user.roleCode] || user.roleCode}
              </span>
            )],
            ["สถาบัน", user.institutionName || user.institutionId || "-"],
            ["วันที่สมัคร", formatAdminDateTime(user.createdAt)]
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#80868B", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#202124", overflowWrap: "anywhere" }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {user.roleCode === "user" && <Card>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>
          สถิติการส่งคำร้อง
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {statTiles.map((t) => {
            const active = statFilter === t.key;
            return (
              <button
                type="button"
                key={t.key}
                className="bdi-tile"
                onClick={() => { setStatFilter(active ? null : t.key); setPage(1); }}
                aria-pressed={active}
                style={{
                  cursor: "pointer",
                  font: "inherit",
                  borderColor: active ? "#1A73E8" : undefined,
                  boxShadow: active ? "0 0 0 2px #E8F0FE" : undefined,
                  background: active ? "#F5F9FF" : undefined,
                }}
              >
                <b>{t.value}</b>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {statFilter && <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5F6368", marginBottom: 4 }}>
            คำร้อง: {statTiles.find(t => t.key === statFilter)?.label} ({filteredRequests.length} รายการ)
          </div>

          {filteredRequests.length === 0 ? (
            <div style={{ padding: "14px 0", fontSize: 13, color: "#5F6368" }}>ไม่พบคำร้องในหมวดนี้</div>
          ) : (
            <div>
            {pageRows.map((r, i, arr) => {
                const room = rooms.find(room => room.id === r.roomId);
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 12, flexWrap: "wrap", padding: "11px 2px",
                      borderBottom: i === arr.length - 1 ? "none" : "1px solid #E8EAED",
                    }}
                  >
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#202124", overflowWrap: "anywhere" }}>
                          {r.subject || "-"}
                        </span>
                        <Status value={r.status} />
                      </div>
                      <div style={{ marginTop: 3, fontSize: 12, color: "#80868B" }}>
                        {r.id}
                        {" · "}{room?.name || r.roomId || "ไม่ระบุสถานที่"}
                        {" · "}{formatDateTime(r.createdAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRequest(r)}
                      style={{
                        background: "none", border: "none", padding: "4px 2px", cursor: "pointer",
                        font: "inherit", fontSize: 12.5, fontWeight: 700, color: "#1A73E8", whiteSpace: "nowrap",
                      }}
                    >
                      ดูข้อมูลเต็ม ›
                    </button>
                  </div>
                );
              })}

              {totalPages > 1 && (() => {
                const pagerBtn = (disabled) => ({
                  width: 32, height: 32, display: "grid", placeItems: "center", padding: 0,
                  borderRadius: "50%", border: "1px solid #DADCE0", background: "#fff",
                  color: disabled ? "#BDC1C6" : "#3C4043",
                  cursor: disabled ? "not-allowed" : "pointer",
                });
                const chevron = (d) => (
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                );
                return (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, paddingTop: 12 }}>
                    <button type="button" aria-label="หน้าก่อนหน้า" title="หน้าก่อนหน้า"
                      disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}
                      style={pagerBtn(currentPage <= 1)}>
                      {chevron("M15 6l-6 6 6 6")}
                    </button>

                    <span style={{ fontSize: 13, fontWeight: 700, color: "#5F6368", minWidth: 48, textAlign: "center" }}>
                      {currentPage} / {totalPages}
                    </span>

                    <button type="button" aria-label="หน้าถัดไป" title="หน้าถัดไป"
                      disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}
                      style={pagerBtn(currentPage >= totalPages)}>
                      {chevron("M9 6l6 6-6 6")}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>}
      </Card>}

        <Card>
          <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
        gap: 12
      }}>
            <div style={{
          fontWeight: 800,
          fontSize: 14
        }}>
              ประวัติการเปลี่ยนแปลงบัญชี
            </div>

            <span style={{
          fontSize: 12,
          color: "#5F6368"
        }}>
              {userHistory.length} รายการ
            </span>
          </div>

          {userHistory.length === 0 ? <div style={{
        padding: "20px 0",
        textAlign: "center",
        color: "#5F6368",
        fontSize: 13
      }}>
              ยังไม่มีประวัติการเปลี่ยนแปลงบัญชี
            </div> : <div>
              {userHistory.map((history, index) => {
          const isLast = index === userHistory.length - 1;
          return <div key={history.id} style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr",
            columnGap: 14
          }}>
                    {/* Timeline line + dot */}
                    <div style={{
              position: "relative",
              display: "flex",
              justifyContent: "center"
            }}>
                      <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#1F2937",
                marginTop: 5,
                zIndex: 1
              }} />

                      {!isLast && <div style={{
                position: "absolute",
                top: 15,
                bottom: 0,
                width: 1,
                background: "#DADCE0"
              }} />}
                    </div>

                    {/* Event */}
                    <div style={{
              paddingBottom: isLast ? 0 : 22
            }}>
                      <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12
              }}>
                        <div>
                          <div style={{
                    fontWeight: 700,
                    fontSize: 13
                  }}>
                            {getHistoryActionLabel(history.action)}
                          </div>

                          {history.action === "ROLE_CHANGED" && <div style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "#3C4043"
                  }}>
                              {"เปลี่ยนจาก "}
                              {roleLabels[history.oldValue] || history.oldValue || "-"}
                              {" ไปเป็น "}
                              {roleLabels[history.newValue] || history.newValue || "-"}
                            </div>}

                          {history.action !== "ROLE_CHANGED" && history.reason && <div style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: "#5F6368"
                  }}>
                                เหตุผล: {history.reason}
                              </div>}

                          <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#5F6368"
                  }}>
                            {formatAdminDateTime(history.changedAt)}
                            {" · "}
                            {users.find(u => u.id === history.changedBy)?.name || "-"}
                          </div>
                        </div>

                        <Btn kind="ghost" onClick={() => setHistoryDetailId(history.id)}>
                          ดูรายละเอียด
                        </Btn>
                      </div>
                    </div>
                  </div>;
        })}
            </div>}
        </Card>
        {historyDetailId ? (
        <AccountHistoryDetail historyId={historyDetailId} onClose={() => setHistoryDetailId(null)} />
      ) : null}
    </>;
}