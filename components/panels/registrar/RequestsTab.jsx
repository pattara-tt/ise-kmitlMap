"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Card, Field, Input, SearchBar, Select, Status, Table, Textarea, useCollection, notify, askConfirm } from "../../ui";
import { formatDateTime } from "../../../lib/datetime";
import RequestDetail from "../admin/RequestDetail";

const FIELD_LABEL = {
  name: "ชื่อห้อง",
  type: "ประเภท",
  capacity: "ความจุ",
  teacher: "อาจารย์",
};

export default function RegistrarRequestsTab({ user, onNavigate }) {
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
    reload: reloadRooms,
    patch: patchRoom,
  } = useCollection("rooms");

  const { items: roomTypes, loading: roomTypesLoading, reload: reloadRoomTypes } = useCollection("roomTypes");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("oldest");
  const [view, setView] = useState("pending"); // "pending" | "history"
  const [resultFilter, setResultFilter] = useState(""); // "" | "approved" | "rejected"
  const [selectedHistory, setSelectedHistory] = useState(null);

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

  // คำร้องที่ฝ่ายทะเบียนคนนี้เป็นผู้พิจารณาขั้นสุดท้าย (อนุมัติ / ไม่อนุมัติ)
  const historyRequests = requests
    .filter((r) => (r.status === "approved" || r.status === "rejected") && r.reviewedBy === user?.id)
    .filter((r) => !resultFilter || r.status === resultFilter)
    .filter((r) => {
      const requestUser = users.find((u) => u.id === r.userId);
      const room = rooms.find((x) => x.id === r.roomId);
      return ((requestUser?.email || "") + (room?.name || "") + (r.id || "") + (r.subject || ""))
        .toLowerCase()
        .includes(q.toLowerCase());
    })
    .sort((a, b) => String(b.reviewedAt || "").localeCompare(String(a.reviewedAt || "")));

  if (selectedHistory) {
    return (
      <RequestDetail
        request={selectedHistory}
        user={user}
        onBack={async () => {
          await reloadRequests();
          setSelectedHistory(null);
        }}
      />
    );
  }

  if (selectedRequest) {
    return (
      <RegistrarRequestDetail
        request={selectedRequest}
        users={users}
        rooms={rooms}
        reloadRooms={reloadRooms}
        patchRequest={patchRequest}
        patchRoom={patchRoom}
        roomTypes={roomTypes}
        roomTypesLoading={roomTypesLoading}
        reloadRoomTypes={reloadRoomTypes}
        onNavigate={onNavigate}
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
      <h3>คำร้อง</h3>

      {/* สลับมุมมอง: แท็บขีดเส้นใต้ */}
      <div role="tablist" style={{ display: "flex", gap: 22, borderBottom: "1px solid #DADCE0", marginBottom: 14 }}>
        {[
          { key: "pending", label: "รอดำเนินการ" },
          { key: "history", label: "ดำเนินการแล้ว" },
        ].map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(t.key)}
              style={{
                padding: "8px 2px", marginBottom: -1, background: "none", cursor: "pointer",
                font: "inherit", fontSize: 14, fontWeight: 700,
                border: "none", borderBottom: `2px solid ${active ? "#1A73E8" : "transparent"}`,
                color: active ? "#1A73E8" : "#5F6368",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาจากอีเมลผู้ยื่น หรือสถานที่"
      />

      <div style={{ maxWidth: 260, marginBottom: 12 }}>
        {view === "pending" ? (
          <Field label="เรียงลำดับ">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="oldest">รับเรื่องเก่าสุด</option>
              <option value="newest">รับเรื่องล่าสุด</option>
            </Select>
          </Field>
        ) : (
          <Field label="กรองตามผลการพิจารณา">
            <Select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
              <option value="">ทั้งหมด</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </Select>
          </Field>
        )}
      </div>

      {view === "pending" ? (
        <Table
          columns={[
            { key: "id", label: "เลขที่" },
            {
              key: "userId",
              label: "ผู้ยื่น",
              render: (r) => users.find((u) => u.id === r.userId)?.email || r.userId || "-",
            },
            { key: "subject", label: "หัวข้อ" },
            {
              key: "roomId",
              label: "สถานที่",
              render: (r) => rooms.find((room) => room.id === r.roomId)?.name || r.roomId || "-",
            },
            { key: "reviewedAt", label: "วันที่รับเรื่อง", render: (r) => formatDateTime(r.reviewedAt) },
            {
              key: "action",
              label: "การดำเนินการ",
              render: (r) => <Btn onClick={() => setSelectedRequest(r)}>ตรวจสอบ</Btn>,
            },
          ]}
          rows={processingRequests}
          empty="ไม่มีคำร้องที่รอดำเนินการ"
        />
      ) : (
        <Table
          columns={[
            { key: "id", label: "เลขที่" },
            {
              key: "userId",
              label: "ผู้ยื่น",
              render: (r) => users.find((u) => u.id === r.userId)?.email || r.userId || "-",
            },
            { key: "subject", label: "หัวข้อ" },
            {
              key: "roomId",
              label: "สถานที่",
              render: (r) => rooms.find((room) => room.id === r.roomId)?.name || r.roomId || "-",
            },
            { key: "status", label: "ผลการพิจารณา", render: (r) => <Status value={r.status} /> },
            { key: "reviewedAt", label: "วันที่พิจารณา", render: (r) => formatDateTime(r.reviewedAt) },
            {
              key: "action",
              label: "",
              render: (r) => (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Btn kind="ghost" onClick={() => setSelectedHistory(r)}>ดูรายละเอียด</Btn>
                </div>
              ),
            },
          ]}
          rows={historyRequests}
          empty="ยังไม่มีคำร้องตามเงื่อนไขดังกล่าว"
        />
      )}
    </>
  );
}


/* =========================================================
   รายละเอียดคำร้องของ Registrar
   ========================================================= */

function RegistrarRequestDetail({ request, users, rooms, reloadRooms, patchRequest, patchRoom, roomTypes, roomTypesLoading, reloadRoomTypes, onNavigate, user, onBack, }) {
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

  const sameValue = (a, b) => String(a ?? "") === String(b ?? "");

  // snapshot ที่ผู้ใช้เห็นตอนกดยื่น และค่าที่ผู้ใช้เสนอ (after มีครบทุกฟิลด์ ฟิลด์ที่ไม่ได้แก้ = สำเนา snapshot)
  const snapshotBefore = parseData(request.before);
  const proposedAfter = parseData(request.after);

  // ข้อมูลห้อง "ปัจจุบัน" — อ่านจาก rooms ที่ useCollection โหลด/รีโหลดไว้ จึงอัปเดตตามข้อมูลล่าสุดเสมอ
  // ถ้าไม่มีห้อง (roomId = null) หรือยังโหลดไม่เสร็จ ให้ fallback ไปใช้ snapshot
  const room = rooms.find((r) => r.id === request.roomId);
  const before = room
    ? Object.fromEntries(
        Object.keys(proposedAfter).map((key) => [
          key,
          room[key] !== undefined ? room[key] : snapshotBefore[key],
        ])
      )
    : snapshotBefore;

  // เฉพาะฟิลด์ที่ผู้ยื่น "ตั้งใจแก้จริง" (ต่างจาก snapshot ตอนยื่น)
  const userChanges = Object.fromEntries(
    Object.entries(proposedAfter).filter(([key, value]) => !sameValue(value, snapshotBefore[key]))
  );

  // ช่องที่ฝ่ายทะเบียนพิมพ์แก้เอง
  const [edited, setEdited] = useState({});

  // ข้อมูลที่จะบันทึก = ข้อมูลห้องปัจจุบัน + สิ่งที่ผู้ยื่นขอเปลี่ยนจริง + สิ่งที่ฝ่ายทะเบียนแก้เพิ่ม
  const form = { ...before, ...userChanges, ...edited };

  // เปิดหน้ารายละเอียดแล้วรีโหลดห้องอีกรอบ เพื่อให้ "ข้อมูลเดิม" เป็นค่าล่าสุด (ใช้ GET /api/data/rooms เดิม)
  useEffect(() => {
    if (typeof reloadRooms === "function") reloadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false); // ตัดสินใจแล้ว → ห้ามกดซ้ำ
  const busyRef = useRef(false); // กันกดซ้ำในจังหวะที่ state ยังไม่อัปเดต
  const actionable = request.status === "processing" && !done;
  const [note, setNote] = useState(request.note || "");

  const requestUser = users.find((u) => u.id === request.userId);
  // Room type names are the current linkage used by existing rooms/markers.
  const proposedType = String(form.type ?? room?.type ?? "").trim();
  const knownType = !proposedType || roomTypes.some((type) =>
    String(type.name || "").trim().toLocaleLowerCase() === proposedType.toLocaleLowerCase()
  );
  const missingType = !roomTypesLoading && !knownType;
  const [actionError, setActionError] = useState("");

  const navigateToTypes = () => {
    if (typeof onNavigate === "function") onNavigate("room_types");
  };

  const setValue = (key) => (e) => {
    setEdited((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  async function approve() {
    if (!actionable || busyRef.current) return;

    // กรณีที่ 2: คำร้องแจ้งปัญหาของสถานที่ที่ไม่มีข้อมูลห้อง (เช่น ห้องน้ำ ลิฟต์) → ไม่มีอะไรให้แก้
    if (!request.roomId) {
      await notify(
        "คำร้องนี้เป็นการแจ้งปัญหาของสถานที่ที่ไม่มีข้อมูลห้องในระบบ จึงไม่มีข้อมูลแผนที่ให้แก้ไข",
        { title: "ไม่มีข้อมูลแผนที่ให้แก้ไข", tone: "warning" }
      );
      return;
    }

    setActionError("");

    if (missingType || roomTypesLoading) {
      setActionError(
        "ไม่สามารถอนุมัติได้: ต้องเลือกประเภทห้องที่มีในระบบก่อน"
      );
      return;
    }

    const confirmed = await askConfirm(
      `ยืนยันอนุมัติคำร้องเลขที่ ${request.id} หรือไม่?\n\nข้อมูลที่แก้ไขจะอัปเดตข้อมูลห้องจริงในระบบ`,
      {
        title: "ยืนยันการอนุมัติคำร้อง",
        confirmLabel: "อนุมัติและบันทึก",
        cancelLabel: "กลับไปตรวจสอบ",
        tone: "question",
      }
    );

    if (!confirmed || busyRef.current) return;

    busyRef.current = true;
    setSaving(true);

    try {
      // ส่งเฉพาะฟิลด์ที่ต่างจากข้อมูลห้องปัจจุบัน → ไม่เขียนทับค่าที่มีคนอื่นเพิ่งแก้ระหว่างรอพิจารณา
      const roomPatch = Object.fromEntries(
        Object.entries(form).filter(([key, value]) => !sameValue(value, before[key]))
      );
      if (Object.keys(roomPatch).length > 0) {
        await patchRoom(request.roomId, roomPatch, user);
      }

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

      setDone(true);

      await notify("อนุมัติคำร้องและบันทึกข้อมูลห้องแล้ว", {
        title: "อนุมัติสำเร็จ",
        tone: "success",
      });

      await onBack(); // ออกจากหน้านี้ทันที ไม่ให้กดอนุมัติซ้ำ
    } catch (error) {
      await notify(
        `อนุมัติคำร้องไม่สำเร็จ: ${error?.message || "เกิดข้อผิดพลาด"}`,
        {
          title: "ไม่สามารถอนุมัติได้",
          tone: "error",
        }
      );
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  }

  async function reject() {
  if (!actionable || busyRef.current) return;

  const confirmed = await askConfirm(
    `ยืนยันปฎืเสธคำร้องเลขที่ ${request.id} หรือไม่?\n\nข้อมูลห้องจะไม่ถูกอัปเดต`,
    {
      title: "ยืนยันการปฏิเสธคำร้อง",
      confirmLabel: "ปฏิเสธ",
      cancelLabel: "กลับไปตรวจสอบ",
      tone: "danger",
    }
  );

  if (!confirmed || busyRef.current) return;

  busyRef.current = true;
  setSaving(true);

  try {
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

    setDone(true);

    await notify("ปฏิเสธคำร้องเสร็จสิ้น", {
      title: "บันทึกผลการพิจารณาแล้ว",
      tone: "success",
    });

    await onBack(); // ออกจากหน้านี้ทันที ไม่ให้กดซ้ำ
  } catch (error) {
    await notify(
      `ไม่สามารถปฏิเสธคำร้องได้: ${error?.message || "เกิดข้อผิดพลาด"}`,
      {
        title: "ดำเนินการไม่สำเร็จ",
        tone: "error",
      }
    );
  } finally {
    busyRef.current = false;
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

      {missingType && (
        <div role="alert" style={{padding:14,border:"1px solid #F3C989",borderRadius:10,background:"#FFF8E9",marginBottom:14}}>
          <strong>ยังไม่มีประเภทห้อง “{proposedType}” ในระบบ</strong>
          <p style={{margin:"7px 0",fontSize:13}}>ต้องสร้างประเภทและกำหนดรูปไอคอนก่อน จึงจะอนุมัติคำร้องเพื่ออัปเดต Marker/Popup ได้</p>
          <Btn onClick={navigateToTypes}>ไปสร้างประเภทห้องและไอคอน</Btn>
        </div>
      )}
      {actionError && <p role="alert" style={{color:"#B3261E"}}>{actionError}</p>}

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

          <Btn kind="danger" disabled={saving || !actionable} onClick={reject}>
            ไม่อนุมัติ
          </Btn>

          <Btn kind="ok" disabled={saving || !actionable || roomTypesLoading || missingType} onClick={approve}>
            {saving ? "กำลังบันทึก..." : "บันทึกและอนุมัติ"}
          </Btn>
        </div>
      </Card>
    </>
  );
}