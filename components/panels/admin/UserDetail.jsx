"use client";

import { useState } from "react";
import { Btn, Card, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import AccountHistoryDetail from "./AccountHistoryDetail";
import { StatBox, formatAdminDateTime, getHistoryActionLabel } from "./shared";

export default function UserDetail({
  user,
  requests,
  onBack
}) {
  const {
    roleLabels,
    roles
  } = useRefData(true);
  const {
    items: accountHistory
  } = useCollection("accountHistory");
  const {
    items: users
  } = useCollection("users");
  const [historyDetailId, setHistoryDetailId] = useState(null);
  if (historyDetailId) {
    return <AccountHistoryDetail historyId={historyDetailId} onBack={() => setHistoryDetailId(null)} />;
  }
  const userRequests = requests.filter(r => r.userId === user.id);
  const userHistory = accountHistory.filter(h => h.userId === user.id).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  const requestStats = {
    total: userRequests.length,
    pending: userRequests.filter(r => r.status === "pending").length,
    approved: userRequests.filter(r => r.status === "approved").length,
    rejected: userRequests.filter(r => r.status === "rejected").length
  };
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
        <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 20,
        flexWrap: "wrap"
      }}>
          <div>
            <div style={{
            fontSize: 20,
            fontWeight: 800
          }}>
              {user.name}
            </div>

            <div style={{
            color: "#5F6368",
            marginTop: 4
          }}>
              {user.email}
            </div>
          </div>

          <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 14px",
          borderRadius: 999,
          background: user.status === "suspended" ? "#FCE8E6" : "#E6F4EA",
          color: user.status === "suspended" ? "#B3261E" : "#137333",
          fontSize: 14,
          fontWeight: 800
        }}>
            <span style={{
            fontSize: 11
          }}>●</span>
            {user.status === "suspended" ? "ถูกระงับการใช้งาน" : "ใช้งาน"}
          </div>
        </div>

        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 16,
        marginTop: 20
      }}>
          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              รหัสผู้ใช้งาน
            </div>
            <b>{user.id}</b>
          </div>

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              บทบาท
            </div>
            <b>
              {roleLabels[user.roleCode] || user.roleCode}
            </b>
          </div>

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              สถาบัน
            </div>
            <b>{user.institutionId || "-"}</b>
          </div>

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              วันที่สมัคร
            </div>
            <b>{formatAdminDateTime(user.createdAt)}</b>
          </div>
        </div>
      </Card>

      {user.roleCode === "user" && <Card>
          <div style={{
        fontWeight: 800,
        fontSize: 14,
        marginBottom: 14
      }}>
            สถิติการส่งคำร้อง
          </div>

          <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12
      }}>
            <StatBox label="ทั้งหมด" value={requestStats.total} />

            <StatBox label="รอตรวจสอบ" value={requestStats.pending} />

            <StatBox label="อนุมัติ" value={requestStats.approved} />

            <StatBox label="ไม่อนุมัติ" value={requestStats.rejected} />
          </div>
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
    </>;
}
