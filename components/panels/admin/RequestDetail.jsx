"use client";

import { useState } from "react";
import { Btn, Card, Status, useCollection } from "../../ui";
import { FIELD_LABEL, formatAdminDateTime } from "./shared";

// Selected Request page
function RequestDetail({ request, onBack, user }) {
  const {
    patch: patchRequest
  } = useCollection("requests");
  const {
    items: users
  } = useCollection("users");
  
  const [currentStatus, setCurrentStatus] = useState(request.status);
  const [reviewedBy, setReviewedBy] = useState(request.reviewedBy);
  const [reviewedAt, setReviewedAt] = useState(request.reviewedAt);

  const requestUser = users.find(u => u.id === request.userId);
  const emailOf = id => users.find(u => u.id === id)?.email || id || "-";
  const isProcessing = currentStatus === "processing";

  async function decide(status) {
    const at = new Date().toISOString();
    const by = user?.id || "";

    await patchRequest(request.id, {
      status,
      reviewedBy: by,
      reviewedAt: at
    }, user);

    setCurrentStatus(status);
    setReviewedBy(by);
    setReviewedAt(at);
  }

  return <>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }}>
        <Btn kind="ghost" onClick={onBack}>กลับ</Btn>

        <h2>
          ตรวจสอบคำร้อง
        </h2>
      </div>

      {/* ข้อมูลคำร้อง */}
      <Card>
        <div style={{
        marginBottom: 12
      }}>
          <b>เลขที่:</b> {request.id}
        </div>

        <div style={{
        marginBottom: 12
      }}>
          <b>ผู้ยื่น:</b>{" "}
          {requestUser?.email || request.userId || "-"}
        </div>

        <div style={{
        marginBottom: 12
      }}>
          <b>หัวข้อ:</b> {request.subject || "-"}
        </div>

        <div style={{
        marginBottom: 12
      }}>
          <b>รายละเอียด:</b> {request.detail || "-"}
        </div>

        <div style={{
        marginBottom: 12
      }}>
          <b>วันที่ส่งคำร้อง:</b>{" "}
          {formatAdminDateTime(request.createdAt)}
        </div>

        <div>
          <b>สถานะ:</b>{" "}
          <Status value={currentStatus} />
        </div>
      </Card>

      {/* เปรียบเทียบข้อมูลเดิมกับข้อมูลที่ขอแก้ไข */}
      <Card>
        <div style={{
        fontWeight: 800,
        fontSize: 14,
        marginBottom: 12
      }}>
          ข้อมูลที่ขอแก้ไข
        </div>

        <div style={{
        border: "1px solid #DADCE0",
        borderRadius: 10,
        overflow: "hidden"
      }}>
          <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          background: "#F8F9FA",
          padding: "10px 12px",
          fontSize: 12,
          fontWeight: 800,
          color: "#5F6368"
        }}>
            <span>ข้อมูล</span>
            <span>ข้อมูลเดิม</span>
            <span>ข้อมูลที่ขอแก้ไข</span>
          </div>

          {Object.keys(request.after || {}).map(key => {
          const oldValue = request.before?.[key];
          const newValue = request.after?.[key];
          return <div key={key} style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            padding: "10px 12px",
            fontSize: 12.5,
            borderTop: "1px solid #E8EAED"
          }}>
                <span>
                  {FIELD_LABEL[key] || key}
                </span>

                <span>
                  {oldValue ?? "-"}
                </span>

                <span style={{
              fontWeight: oldValue !== newValue ? 700 : 400
            }}>
                  {newValue ?? "-"}
                </span>
              </div>;
        })}
        </div>
      </Card>

      {/* การพิจารณา */}
      {currentStatus === "pending" ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn kind="danger" onClick={() => decide("rejected")}>
            ปฏิเสธ
          </Btn>
          <Btn kind="ok" onClick={() => decide("processing")}>
            ดำเนินการต่อ
          </Btn>
        </div>
      ) : (
        <Card>
          <div>
            <b>ผลการพิจารณา:</b>{" "}
            <Status value={currentStatus} />
          </div>

          {/* กำลังดำเนินการ = Admin ยังไม่ได้พิมพ์หมายเหตุ จึงไม่แสดง */}
          {!isProcessing && (
            <div style={{ marginTop: 10 }}>
              <b>หมายเหตุ:</b> {request.note || "-"}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <b>{isProcessing ? "ผู้ดำเนินการ" : "ผู้พิจารณา"}:</b>{" "}
            {emailOf(reviewedBy)}
          </div>

          <div style={{ marginTop: 10 }}>
            <b>{isProcessing ? "วันที่ดำเนินการ" : "วันที่พิจารณา"}:</b>{" "}
            {formatAdminDateTime(reviewedAt)}
          </div>
        </Card>
      )}
    </>;
}

// ── UC12 จัดการแก้ไขสิทธิ์ผู้ใช้งาน ───────────────────────

export default RequestDetail;