
"use client";

import { useState } from "react";
import { Btn, Card, Status, useCollection, notify, askConfirm } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { FIELD_LABEL, formatAdminDateTime } from "./shared";

const TIMELINE_LABEL = {
  pending: "ส่งคำร้อง",
  processing: "ตรวจสอบแล้ว ส่งต่อให้ฝ่ายทะเบียน",
  approved: "อนุมัติคำร้อง",
  rejected: "ไม่อนุมัติคำร้อง",
  cancelled: "ยกเลิกคำร้อง",
};

const TIMELINE_COLOR = {
  pending: "#B06000",
  processing: "#1A73E8",
  approved: "#188038",
  rejected: "#D93025",
  cancelled: "#5F6368",
};

// Selected Request page
function RequestDetail({ request, rooms = [], onBack, user }) {
  const { patch: patchRequest } = useCollection("requests");
  const { items: users } = useCollection("users");

  const [currentStatus, setCurrentStatus] = useState(request.status);
  const [reviewedBy, setReviewedBy] = useState(request.reviewedBy);
  const [reviewedAt, setReviewedAt] = useState(request.reviewedAt);

  const requestUser = users.find((u) => u.id === request.userId);
  const emailOf = (id) =>
    users.find((u) => u.id === id)?.email || id || "-";

  // ข้อมูลปัจจุบันของห้องจาก rooms ที่ RequestsTab โหลดไว้แล้ว
  // ไม่ใช้ request.before เพราะเป็น snapshot ตอนส่งคำร้อง
  const currentRoom = rooms.find((room) => room.id === request.roomId);

  // รองรับ after ทั้งกรณีที่เป็น object และ JSON string
  const proposedAfter = (() => {
    if (!request.after) return {};
    if (typeof request.after === "object") return request.after;

    try {
      return JSON.parse(request.after);
    } catch {
      return {};
    }
  })();

  const { roleLabels } = useRefData(true);
  const { items: editLogs } = useCollection("editLogs");

  // รวมเหตุการณ์จาก editLogs ของคำร้องนี้ (เรียงเก่า → ใหม่)
  // เฉพาะเหตุการณ์ที่มีสถานะ
  const events = [];

  editLogs
    .filter((l) => l.requestId === request.id)
    .sort((a, b) =>
      String(a.editedAt).localeCompare(String(b.editedAt))
    )
    .forEach((l) => {
      let status = null;

      try {
        const after =
          typeof l.after === "string" ? JSON.parse(l.after) : l.after;
        status = after?.status || null;
      } catch {}

      if (!status) return;

      if (
        events.length &&
        events[events.length - 1].status === status
      ) {
        return;
      }

      events.push({
        status,
        userId: l.userId,
        at: l.editedAt,
      });
    });

  // ไม่มี log หรือ log ยังโหลดไม่ครบ ให้เติมข้อมูลจากคำร้อง
  if (!events.length || events[0].status !== "pending") {
    events.unshift({
      status: "pending",
      userId: request.userId,
      at: request.createdAt,
    });
  }

  if (events[events.length - 1].status !== currentStatus) {
    events.push({
      status: currentStatus,
      userId: reviewedBy,
      at: reviewedAt,
    });
  }

  // ขั้นที่ยังรออยู่
  const waiting =
    currentStatus === "pending"
      ? "รอผู้ดูแลระบบตรวจสอบ"
      : currentStatus === "processing"
        ? "รอฝ่ายทะเบียนพิจารณา"
        : null;

  const isProcessing = currentStatus === "processing";
  const [saving, setSaving] = useState(false);

  async function decide(status) {
    const isReject = status === "rejected";

    const confirmed = await askConfirm(
      isReject
        ? `ยืนยันการปฏิเสธคำร้องเลขที่ ${request.id} หรือไม่?`
        : `ยืนยันส่งต่อคำร้องเลขที่ ${request.id} ให้ฝ่ายทะเบียนดำเนินการหรือไม่?`,
      {
        title: isReject
          ? "ยืนยันการปฏิเสธคำร้อง"
          : "ยืนยันการส่งต่อคำร้อง",
        confirmLabel: isReject ? "ปฏิเสธคำร้อง" : "ส่งต่อคำร้อง",
        cancelLabel: "กลับไปตรวจสอบ",
        tone: isReject ? "danger" : "question",
      }
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const at = new Date().toISOString();
      const by = user?.id || "";

      // คง flow เดิม: เปลี่ยนสถานะคำร้องผ่าน patchRequest
      await patchRequest(
        request.id,
        {
          status,
          reviewedBy: by,
          reviewedAt: at,
        },
        user
      );

      setCurrentStatus(status);
      setReviewedBy(by);
      setReviewedAt(at);

      await notify(
        isReject
          ? "ปฏิเสธคำร้องเรียบร้อยแล้ว"
          : "ส่งต่อคำร้องให้ฝ่ายทะเบียนเรียบร้อยแล้ว",
        {
          title: "ดำเนินการสำเร็จ",
          tone: "success",
        }
      );
    } catch (error) {
      await notify(
        `ดำเนินการคำร้องไม่สำเร็จ: ${
          error?.message || "เกิดข้อผิดพลาด"
        }`,
        {
          title: "ไม่สามารถดำเนินการได้",
          tone: "error",
        }
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Btn kind="ghost" onClick={onBack}>
          กลับ
        </Btn>

        <h2>ตรวจสอบคำร้อง</h2>
      </div>

      {/* ข้อมูลคำร้อง */}
      <Card>
        <div style={{ marginBottom: 12 }}>
          <b>เลขที่:</b> {request.id}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>ผู้ยื่น:</b>{" "}
          {requestUser?.email || request.userId || "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>หัวข้อ:</b> {request.subject || "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>รายละเอียด:</b> {request.detail || "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>วันที่ส่งคำร้อง:</b>{" "}
          {formatAdminDateTime(request.createdAt)}
        </div>

        <div>
          <b>สถานะ:</b> <Status value={currentStatus} />
        </div>
      </Card>

      {/* เปรียบเทียบข้อมูลห้องปัจจุบันกับข้อมูลที่ขอแก้ไข */}
      <Card>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          ข้อมูลที่ขอแก้ไข
        </div>

        <div
          style={{
            border: "1px solid #DADCE0",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              background: "#F8F9FA",
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 800,
              color: "#5F6368",
            }}
          >
            <span>ข้อมูล</span>
            <span>ข้อมูลเดิม</span>
            <span>ข้อมูลที่ขอแก้ไข</span>
          </div>

          {Object.keys(proposedAfter).map((key) => {
            // อ่านข้อมูลเดิมจากห้องปัจจุบันเท่านั้น
            // ถ้าไม่มีข้อมูลปัจจุบัน ให้แสดง "-" ไม่ใช้ snapshot เก่า
            const oldValue = currentRoom?.[key];
            const newValue = proposedAfter[key];

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "10px 12px",
                  fontSize: 12.5,
                  borderTop: "1px solid #E8EAED",
                }}
              >
                <span>{FIELD_LABEL[key] || key}</span>

                <span>
                  {currentRoom &&
                  oldValue !== undefined &&
                  oldValue !== null
                    ? String(oldValue)
                    : "-"}
                </span>

                <span
                  style={{
                    fontWeight: oldValue !== newValue ? 700 : 400,
                  }}
                >
                  {newValue ?? "-"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* การพิจารณา */}
      {currentStatus === "pending" ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            marginBottom: 10,
          }}
        >
          <Btn
            kind="danger"
            disabled={saving}
            onClick={() => decide("rejected")}
          >
            {saving ? "กำลังบันทึก..." : "ปฏิเสธ"}
          </Btn>

          <Btn
            kind="ok"
            disabled={saving}
            onClick={() => decide("processing")}
          >
            {saving ? "กำลังบันทึก..." : "ดำเนินการต่อ"}
          </Btn>
        </div>
      ) : (
        <Card>
          <div>
            <b>ผลการพิจารณา:</b>{" "}
            <Status value={currentStatus} />
          </div>

          {/* กำลังดำเนินการ = Admin ยังไม่ได้พิมพ์หมายเหตุ */}
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
            <b>
              {isProcessing ? "วันที่ดำเนินการ" : "วันที่พิจารณา"}:
            </b>{" "}
            {formatAdminDateTime(reviewedAt)}
          </div>
        </Card>
      )}

      {/* ความคืบหน้าของคำร้อง */}
      <Card>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 14,
          }}
        >
          ความคืบหน้าของคำร้อง
        </div>

        <div>
          {events.map((ev, i) => {
            const isLast = i === events.length - 1 && !waiting;
            const actor = users.find((u) => u.id === ev.userId);

            return (
              <div
                key={`${ev.status}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr",
                  columnGap: 14,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background:
                        TIMELINE_COLOR[ev.status] || "#1F2937",
                      marginTop: 5,
                      zIndex: 1,
                    }}
                  />

                  {!isLast && (
                    <div
                      style={{
                        position: "absolute",
                        top: 15,
                        bottom: 0,
                        width: 1,
                        background: "#DADCE0",
                      }}
                    />
                  )}
                </div>

                <div style={{ paddingBottom: isLast ? 0 : 20 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color:
                        TIMELINE_COLOR[ev.status] || "#202124",
                    }}
                  >
                    {TIMELINE_LABEL[ev.status] || ev.status}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12.5,
                      color: "#3C4043",
                      overflowWrap: "anywhere",
                    }}
                  >
                    โดย {actor?.name || emailOf(ev.userId)}
                    {actor?.roleCode
                      ? ` (${roleLabels[actor.roleCode] || actor.roleCode})`
                      : ""}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: "#5F6368",
                    }}
                  >
                    {formatAdminDateTime(ev.at)}
                  </div>

                  {(ev.status === "approved" ||
                    ev.status === "rejected") &&
                    i === events.length - 1 &&
                    request.note && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12.5,
                          color: "#5F6368",
                        }}
                      >
                        หมายเหตุ: {request.note}
                      </div>
                    )}
                </div>
              </div>
            );
          })}

          {waiting && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                columnGap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: "2px solid #9AA0A6",
                    background: "#fff",
                    marginTop: 5,
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#5F6368",
                  fontStyle: "italic",
                }}
              >
                {waiting}
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

// ── UC12 จัดการแก้ไขสิทธิ์ผู้ใช้งาน ───────────────────────

export default RequestDetail;