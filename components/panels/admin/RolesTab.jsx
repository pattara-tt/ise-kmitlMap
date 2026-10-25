"use client";

import { useState } from "react";
import { Card, Field, Pill, SearchBar, Select, useCollection, notify } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { isManageableUser, isManageableRole } from "./shared";

// ── UC12 จัดการแก้ไขสิทธิ์ผู้ใช้งาน ───────────────────────
function Roles({ user }) {
  const { roles } = useRefData(true);
  const { items, patch } = useCollection("users");

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | name

  const rows = items
    .filter(isManageableUser)
    .filter(u => !roleFilter || u.roleCode === roleFilter)
    .filter(u => ((u.id || "") + (u.name || "") + (u.email || "")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      // ผู้ถูกระงับอยู่ล่างสุดเสมอ
      const sa = a.status === "suspended" ? 1 : 0;
      const sb = b.status === "suspended" ? 1 : 0;
      if (sa !== sb) return sa - sb;

      if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""), "th");
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return sortBy === "oldest" ? da - db : db - da;
    });

  async function changeRole(u, newRole) {
    try {
      await patch(u.id, { roleCode: newRole }, user);
      await notify("เปลี่ยนสิทธิ์ผู้ใช้เรียบร้อย", { title: "ดำเนินการสำเร็จ", tone: "success" });
    } catch (error) {
      await notify(`เปลี่ยนสิทธิ์ไม่สำเร็จ: ${error?.message || "เกิดข้อผิดพลาด"}`, {
        title: "ไม่สามารถดำเนินการได้",
        tone: "error",
      });
    }
  }

  return <>
      <h3>จัดการแก้ไขสิทธิ์ผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาด้วยรหัส ชื่อ หรืออีเมล" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 8 }}>
        <Field label="กรองตามบทบาท">
          <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {roles.filter(isManageableRole).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="เรียงลำดับ">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">สมัครล่าสุด</option>
            <option value="oldest">สมัครเก่าสุด</option>
            <option value="name">ชื่อ ก–ฮ</option>
          </Select>
        </Field>
      </div>

      {rows.length === 0 && <div style={{ fontSize: 13, color: "#5F6368", padding: "10px 2px" }}>ไม่พบผู้ใช้งานตามเงื่อนไข</div>}

      {rows.map(u => {
        const suspended = u.status === "suspended";
        return <Card key={u.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 14, color: "#202124" }}>{u.name}</b>

              <div style={{ fontSize: 11.5, color: "#5F6368", overflowWrap: "anywhere" }}>
                {u.email} · {u.id}
              </div>

              <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {suspended && <Pill color="#B3261E" bg="#FDE8E7">ถูกระงับการใช้งาน</Pill>}
              </div>
            </div>

            <Select
              value={u.roleCode}
              disabled={suspended}
              title={suspended ? "บัญชีถูกระงับ ไม่สามารถเปลี่ยนสิทธิ์ได้" : undefined}
              onChange={e => changeRole(u, e.target.value)}
              style={{
                width: 210,
                ...(suspended ? { background: "#EDEDED", color: "#9AA0A6", cursor: "not-allowed" } : {}),
              }}
            >
              {roles.filter(isManageableRole).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </Select>
          </div>
        </Card>;
      })}
    </>;
}

export default Roles;