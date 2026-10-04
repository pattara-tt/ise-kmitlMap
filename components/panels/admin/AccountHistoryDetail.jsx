"use client";

import { Btn, Card, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { formatAdminDateTime, getHistoryActionLabel } from "./shared";

export default function AccountHistoryDetail({
  historyId,
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
  const history = accountHistory.find(item => item.id === historyId);
  if (!history) {
    return <>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20
      }}>
          <Btn kind="ghost" onClick={onBack}>
            กลับ
          </Btn>

          <h3 style={{
          margin: 0
        }}>
            รายละเอียดการเปลี่ยนแปลงบัญชี
          </h3>
        </div>

        <Card>
          <div style={{
          padding: "20px 0",
          textAlign: "center",
          color: "#5F6368"
        }}>
            ไม่พบข้อมูลประวัติการเปลี่ยนแปลง
          </div>
        </Card>
      </>;
  }
  const oldRole = roleLabels[history.oldValue] || history.oldValue || "-";
  const newRole = roleLabels[history.newValue] || history.newValue || "-";
  return <>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }}>
        <Btn kind="ghost" onClick={onBack}>
          กลับ
        </Btn>

        <h3 style={{
        margin: 0
      }}>
          รายละเอียดการเปลี่ยนแปลงบัญชี
        </h3>
      </div>

      <Card>
        <div style={{
        display: "grid",
        gap: 18
      }}>
          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              ID
            </div>

            <b>{history.id}</b>
          </div>

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              การกระทำ
            </div>

            <b>
              {getHistoryActionLabel(history.action)}
            </b>
          </div>

          {history.action === "ROLE_CHANGED" && <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16
        }}>
              <div>
                <div style={{
              fontSize: 12,
              color: "#5F6368"
            }}>
                  บทบาทเดิม
                </div>

                <b>{oldRole}</b>
              </div>

              <div>
                <div style={{
              fontSize: 12,
              color: "#5F6368"
            }}>
                  บทบาทใหม่
                </div>

                <b>{newRole}</b>
              </div>
            </div>}

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              เหตุผล
            </div>

            <div>
              {history.reason || "-"}
            </div>
          </div>

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              ผู้ดำเนินการ
            </div>

            <div>
              {users.find(u => u.id === history.changedBy)?.name || "-"}
            </div>
          </div>

          <div>
            <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
              วันที่ดำเนินการ
            </div>

            <div>
              {formatAdminDateTime(history.changedAt)}
            </div>
          </div>
        </div>
      </Card>
    </>;
}
