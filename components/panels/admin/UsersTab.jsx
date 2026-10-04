"use client";

import { useState } from "react";
import { Btn, Field, Pill, SearchBar, Select, Status, Table, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import UserDetail from "./UserDetail";
import { isManageableUser, isManageableRole } from "./shared";

// ── UC10 ค้นหาและเรียกดูข้อมูลผู้ใช้งาน ───────────────────
function Users() {
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
  const [selectedUser, setSelectedUser] = useState(null);
  const rows = users.filter(isManageableUser).filter(u => (!role || u.roleCode === role) && (u.email || "").toLowerCase().includes(q.toLowerCase()));

  if (selectedUser) {
    return <UserDetail user={selectedUser} requests={requests} onBack={() => setSelectedUser(null)} />;
  }

  return <>
      <h3>ค้นหาและเรียกดูข้อมูลผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาด้วยอีเมล" />
      <Field label="กรองตามบทบาท">
        <Select value={role} onChange={e => setRole(e.target.value)}>
          <option value="">ทั้งหมด</option>
          {roles.filter(isManageableRole).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
        </Select>
      </Field>
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
      render: u => <Btn onClick={() => setSelectedUser(u)}> รายละเอียด </Btn>
    }]} rows={rows} empty="ไม่พบผู้ใช้งานตามเงื่อนไข" />
    </>;
}

export default Users;