"use client";

import { useState } from "react";
import { Card, SearchBar, Select, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { isManageableUser, isManageableRole } from "./shared";

// ── UC12 จัดการแก้ไขสิทธิ์ผู้ใช้งาน ───────────────────────
function Roles({ user }) {
  const {
    roleLabels,
    roles
  } = useRefData(true);
  const {
    items,
    patch
  } = useCollection("users");

  const [q, setQ] = useState("");
  const rows = items.filter(isManageableUser).filter(u => ((u.id || "") + (u.name || "") + (u.email || "")).toLowerCase().includes(q.toLowerCase()));

  return <>
      <h3>จัดการแก้ไขสิทธิ์ผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาด้วยรหัส ชื่อ หรืออีเมล" />
      {rows.map(u => <Card key={u.id}>
          <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap"
      }}>
            <div>
              <b style={{
            fontSize: 14,
            color: "#202124"
          }}>
                {u.name}
              </b>

              <div style={{
            fontSize: 11.5,
            color: "#5F6368"
          }}>
                {u.email} · {u.id}
              </div>

              {u.status === "suspended" && <div style={{
            marginTop: 5,
            display: "inline-block",
            padding: "3px 8px",
            borderRadius: 999,
            background: "#FDE8E7",
            color: "#B3261E",
            fontSize: 11,
            fontWeight: 700
          }}>
                  ถูกระงับการใช้งาน
                </div>}
            </div>
            <Select value={u.roleCode} disabled={u.status === "suspended"} title={u.status === "suspended" ? "บัญชีถูกระงับ ไม่สามารถเปลี่ยนสิทธิ์ได้" : undefined} onChange={async e => {
          const newRole = e.target.value;
          try {
            await patch(u.id, {
              roleCode: newRole
            }, user);
            alert("เปลี่ยนสิทธิ์ผู้ใช้เรียบร้อย");
          } catch (error) {
            alert(`เปลี่ยนสิทธิ์ไม่สำเร็จ: ${error.message}`);
          }
        }} style={{
          width: 210
        }}>
            {roles.filter(isManageableRole).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </Select>
          </div>
        </Card>)}
    </>;
}

// ชื่อ field ที่อาจถูกขอแก้ไข → label ภาษาไทยสำหรับแสดงผล

export default Roles;