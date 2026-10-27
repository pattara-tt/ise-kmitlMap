"use client";

import { useState } from "react";
import { Btn, Field, Pill, SearchBar, Select, Status, Table, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import UserDetail from "./UserDetail";
import { isManageableUser, isManageableRole } from "./shared";

// ── UC10 ค้นหาและเรียกดูข้อมูลผู้ใช้งาน ───────────────────
function Users({ user }) {
  const {
    roleLabels,
    roles
  } = useRefData(true);
  const {
    items: users
  } = useCollection("users");
  const {
    items: requests
  } = useCollection("requests");

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "active" | "suspended"
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest
  const [selectedUser, setSelectedUser] = useState(null);

  const rows = users
    .filter(isManageableUser)
    .filter(u => !user?.institutionId || String(u.institutionId) === String(user.institutionId))
    .filter(u => !role || u.roleCode === role)
    .filter(u => !statusFilter || u.status === statusFilter)
    .filter(u => (u.email || "").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return sortBy === "oldest" ? da - db : db - da;
    });

  if (selectedUser) {
    return <UserDetail user={selectedUser} adminUser={user} requests={requests} onBack={() => setSelectedUser(null)} />;
  }

  return <>
      <h3>ค้นหาและเรียกดูข้อมูลผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาด้วยอีเมล" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Field label="กรองตามบทบาท">
          <Select value={role} onChange={e => setRole(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {roles.filter(isManageableRole).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="กรองตามสถานะ">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="suspended">ระงับ</option>
          </Select>
        </Field>
        <Field label="เรียงตามวันที่สมัคร">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">สมัครล่าสุด</option>
            <option value="oldest">สมัครเก่าสุด</option>
          </Select>
        </Field>
      </div>
      <div style={{
      fontSize: 12,
      color: "#5F6368",
      margin: "2px 0 8px"
    }}>พบ {rows.length} รายการ</div>
      <Table columns={[{
      key: "id",
      label: "รหัส"
    }, {
      key: "name",
      label: "ชื่อ"
    }, {
      key: "email",
      label: "อีเมล"
    }, {
      key: "role",
      label: "บทบาท",
      render: u => <Pill> {roleLabels[u.roleCode] || u.roleCode} </Pill>
    }, {
      key: "institution",
      label: "สถาบัน",
      render: u => u.institutionName || u.institutionId || "-"
    }, {
      key: "status",
      label: "สถานะ",
      render: u => <Status value={u.status} />
    }, {
      key: "detail",
      label: "",
      render: u => <div style={{ display: "flex", justifyContent: "center" }}>
        <Btn onClick={() => setSelectedUser(u)}> รายละเอียด </Btn>
      </div>
    }]} rows={rows} empty="ไม่พบผู้ใช้งานตามเงื่อนไข" />
    </>;
}

export default Users;