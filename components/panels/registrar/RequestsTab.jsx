"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, SearchBar, Select, Status, Table, Textarea, useCollection, formatDateTime } from "../../ui";

const FIELD_LABEL = {
  name: "ชื่อห้อง",
  type: "ประเภท",
  capacity: "ความจุ",
  teacher: "อาจารย์",
};

export default function RegistrarRequestsTab({ user }) {
  const {
    items: requests,
    reload: reloadRequests,
    patch: patchRequest,
  } = useCollection("requests");

  const {
    items: users,
  } = useCollection("users");

  const {
    items: rooms,
    patch: patchRoom,
  } = useCollection("rooms");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("oldest");

  const forwardedAt = (r) => String(r.reviewedAt || r.createdAt || "");

  // เอาเฉพาะคำร้องที่ Admin อนุมัติแล้วและรอ Registrar ดำเนินการ
  const processingRequests = requests
    .filter((r) => r.status === "processing")
    .filter((r) => {
      const requestUser = users.find((u) => u.id === r.userId);
      const room = rooms.find((x) => x.id === r.roomId);
      return (
        (requestUser?.email || "") +
        (room?.name || "")
      )
        .toLowerCase()
        .includes(q.toLowerCase());
    })
    .sort((a, b) => {
      const c =
        sortBy === "oldest"
          ? forwardedAt(a).localeCompare(forwardedAt(b))
          : forwardedAt(b).localeCompare(forwardedAt(a));
      return c !== 0 ? c : String(a.id || "").localeCompare(String(b.id || ""));
    });

  if (selectedRequest) {
    return (
      <RegistrarRequestDetail
        request={selectedRequest}
        users={users}
        rooms={rooms}
        patchRequest={patchRequest}
        patchRoom={patchRoom}
        user={user}
        onBack={async () => {
          await reloadRequests();
          setSelectedRequest(null);
        }}
      />
    );
  }

  return (
    <>
      <h3>คำร้องที่รอดำเนินการ ({processingRequests.length})</h3>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาจากอีเมลผู้ยื่น หรือสถานที่"
      />

      <div style={{ maxWidth: 260, marginBottom: 12 }}>
        <Field label="เรียงลำดับ">
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="oldest">รับเรื่องเก่าสุด</option>
            <option value="newest">รับเรื่องล่าสุด</option>
          </Select>
        </Field>
      </div>      

      <Table
        columns={[
          {
            key: "id",
            label: "เลขที่",
          },
          {
            key: "userId",
            label: "ผู้ยื่น",
            render: (r) => {
              const requestUser = users.find((u) => u.id === r.userId);
              return requestUser?.email || r.userId || "-";
            },
          },
          {
            key: "subject",
            label: "หัวข้อ",
          },
          {
            key: "roomId",
            label: "สถานที่",
            render: (r) => {
              const room = rooms.find((room) => room.id === r.roomId);
              return room?.name || r.roomId || "-";
            },
          },
          {
            key: "reviewedAt",
            label: "วันที่รับเรื่อง",
            render: (r) => formatDateTime(r.reviewedAt),
          },
          {
            key: "action",
            label: "การดำเนินการ",
            render: (r) => (
              <Btn onClick={() => setSelectedRequest(r)}>
                ตรวจสอบ
              </Btn>
            ),
          },
        ]}
        rows={processingRequests}
        empty="ไม่มีคำร้องที่รอดำเนินการ"
      />
    </>
  );
}


/* =========================================================
   รายละเอียดคำร้องของ Registrar
   ========================================================= */

function RegistrarRequestDetail({ request, users, rooms, patchRequest, patchRoom, user, onBack, }) {
  const parseData = (value) => {
    if (!value) return {};

    if (typeof value === "object") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  const before = parseData(request.before);
  const initialAfter = parseData(request.after);

  // Registrar แก้ after โดยตรง
  const [form, setForm] = useState(initialAfter);

  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(request.note || "");

  const requestUser = users.find((u) => u.id === request.userId);
  const room = rooms.find((r) => r.id === request.roomId);

  const setValue = (key) => (e) => {
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  async function approve() {
    if (!request.roomId) return;

    setSaving(true);

    try {
      /* 1. เอาข้อมูลที่ Registrar แก้ใน after ไปอัปเดตห้องจริง */
      await patchRoom(request.roomId, form, user);

      /*
       * 2. เก็บ after ที่แก้แล้วกลับเข้า request
       * 3. เปลี่ยน processing -> approved
       */
      await patchRequest(
        request.id,
        {
          after: form,
          status: "approved",
          note,
          reviewedBy: user?.id || "",
          reviewedAt: new Date().toISOString(),
        },
        user
      );

      await onBack();
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    setSaving(true);

    try {
      // ไม่แตะข้อมูลห้อง และไม่เก็บ after ที่แก้ไว้
      // แค่ปิดคำร้องเป็น rejected พร้อมบันทึกผู้พิจารณา/วันที่/หมายเหตุ
      await patchRequest(
        request.id,
        {
          status: "rejected",
          note,
          reviewedBy: user?.id || "",
          reviewedAt: new Date().toISOString(),
        },
        user
      );

      await onBack();
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

        <h2 style={{ margin: 0 }}>
          ดำเนินการคำร้อง
        </h2>
      </div>

      {/* ข้อมูลคำร้อง */}
      <Card>
        <div style={{ marginBottom: 10 }}>
          <b>เลขที่:</b> {request.id}
        </div>

        <div style={{ marginBottom: 10 }}>
          <b>ผู้ยื่น:</b>{" "}
          {requestUser?.email || request.userId || "-"}
        </div>

        <div style={{ marginBottom: 10 }}>
          <b>หัวข้อ:</b> {request.subject || "-"}
        </div>

        <div style={{ marginBottom: 10 }}>
          <b>รายละเอียด:</b> {request.detail || "-"}
        </div>

        <div style={{ marginBottom: 10 }}>
          <b>วันที่ส่งคำร้อง:</b>{" "}
          {formatDateTime(request.createdAt)}
        </div>

        <div>
          <b>สถานะ:</b>{" "}
          <Status value={request.status} />
        </div>
      </Card>

      {/* เปรียบเทียบ Before / After */}
      <Card>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          ข้อมูลคำร้อง
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
            <span>ข้อมูลที่จะบันทึก</span>
          </div>

          {Object.keys(form).map((key) => {
            const oldValue = before[key];
            const newValue = form[key];

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "10px 12px",
                  fontSize: 12.5,
                  borderTop: "1px solid #E8EAED",
                  alignItems: "center",
                }}
              >
                <span>
                  {FIELD_LABEL[key] || key}
                </span>

                <span>
                  {oldValue ?? "-"}
                </span>

                <Input
                  value={newValue ?? ""}
                  onChange={setValue(key)}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* หมายเหตุ */}
      <Card>
        <Field label="หมายเหตุ">
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
            placeholder="หมายเหตุเพิ่มเติม"
            style={{ minHeight: 90 }}
          />
        </Field>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          }}
        >
          <Btn kind="ghost" onClick={onBack}>
            ยกเลิก
          </Btn>

          <Btn kind="danger" disabled={saving} onClick={reject}>
            ไม่อนุมัติ
          </Btn>

          <Btn kind="ok" disabled={saving} onClick={approve}>
            {saving ? "กำลังบันทึก..." : "บันทึกและอนุมัติ"}
          </Btn>
        </div>
      </Card>
    </>
  );
}