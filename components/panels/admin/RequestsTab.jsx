"use client";

import { useState } from "react";
import { Btn, Field, SearchBar, Select, Status, Table, useCollection, formatDateTime } from "../../ui";
import RequestDetail from "./RequestDetail";

// ── UC11 ค้นหาและเรียกดูข้อมูลคำร้อง ──────────────────────
function Requests({
  user,
  onReport,
  onQuota
}) {
  const {
    items,
    reload
  } = useCollection("requests");
  const {
    items: users
  } = useCollection("users");
  const {
    items: rooms
  } = useCollection("rooms");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const rows = items.filter(r => {
    // if (r.status === "cancelled") return false;

    const user = users.find(u => u.id === r.userId);
    return (!status || r.status === status) && ((r.id || "") + (r.subject || "") + (r.detail || "") + (user?.email || "") + (r.userId || "")).toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === "newest") {
      const dateCompare = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(a.id || "").localeCompare(String(b.id || ""));
    }
    if (sortBy === "oldest") {
      const dateCompare = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(a.id || "").localeCompare(String(b.id || ""));
    }
    return 0;
  });
  if (selectedRequest) {
    return <RequestDetail request={selectedRequest} onBack={async () => {
      await reload();
      setSelectedRequest(null);
    }} user={user} />;
  }
  return <>
      <h3>ค้นหาและเรียกดูข้อมูลคำร้อง</h3>

      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาคำร้อง" />

      <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 12
    }}>
        <Field label="กรองตามสถานะ">
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="pending">รอพิจารณา</option>
            <option value="processing">กำลังดำเนินการ</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ไม่อนุมัติ</option>
            <option value="cancelled">ยกเลิกแล้ว</option>
          </Select>
        </Field>

        <Field label="เรียงลำดับ">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">วันที่ส่งล่าสุด</option>
            <option value="oldest">วันที่ส่งเก่าสุด</option>
          </Select>
        </Field>
      </div>

      <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
      flexWrap: "wrap"
    }}>
        <h3 style={{
        margin: 0
      }}>ค้นหาและเรียกดูข้อมูลคำร้อง</h3>
        <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }}>
          <Btn onClick={onQuota}>
            กำหนดจำนวนคำร้อง
          </Btn>

          <Btn onClick={onReport}>
            จัดทำสรุปคำร้อง
          </Btn>
        </div>
      </div>

      <Table columns={[{
      key: "id",
      label: "เลขที่"
    }, {
      key: "userId",
      label: "ผู้ยื่น",
      render: r => {
        const user = users.find(u => u.id === r.userId);
        return user?.email || "-";
      }
    }, {
      key: "subject",
      label: "หัวข้อ"
    }, {
      key: "roomId",
      label: "สถานที่",
      render: r => {
        const room = rooms.find(room => room.id === r.roomId);
        return room?.name || r.roomId || "-";
      }
    }, {
      key: "createdAt",
      label: "วันที่ส่งคำร้อง",
      render: r => formatDateTime(r.createdAt)
    }, {
      key: "status",
      label: "สถานะ",
      render: r => <Status value={r.status} />
    }, {
      key: "action",
      label: "การดำเนินการ",
      render: r => <Btn onClick={() => setSelectedRequest(r)}>
                {r.status === "pending" ? "ตรวจสอบ" : "ดูรายละเอียด"}
              </Btn>
    }]} rows={rows} empty="ไม่พบคำร้องตามเงื่อนไข" />
    </>;
}

// Selected Request page

export default Requests;