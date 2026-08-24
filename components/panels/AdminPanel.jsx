"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Pill, SearchBar, Select, Status, Table, Textarea, Tiles, UCHead, useCollection, useStats } from "../ui";
import { ROLE_LABEL } from "../../lib/usecases";

// Actor: ฝ่ายดูแลระบบ — UC10–UC16
export default function AdminPanel({ uc, user }) {
  if (uc === "users") return <Users />;
  if (uc === "requests") return <Requests />;
  if (uc === "roles") return <Roles user={user} />;
  if (uc === "review") return <Review user={user} />;
  if (uc === "report") return <ReportUC14 />;
  if (uc === "quota") return <Quota user={user} />;
  return <AccountStatus user={user} />;
}

// ── UC10 ค้นหาและเรียกดูข้อมูลผู้ใช้งาน ───────────────────
function Users() {
  const { items } = useCollection("users");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const rows = items.filter((u) =>
    (!role || u.role === role) &&
    (u.name + u.email + u.username + u.institution).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <UCHead code="UC10" title="ค้นหาและเรียกดูข้อมูลผู้ใช้งาน" desc="ค้นหาด้วยชื่อ อีเมล ชื่อผู้ใช้ หรือสถาบัน และกรองตามบทบาท" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาผู้ใช้งาน" />
      <Field label="กรองตามบทบาท">
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">ทั้งหมด</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <div style={{ fontSize: 12, color: "#5F6368", margin: "2px 0 8px" }}>พบ {rows.length} รายการ</div>
      <Table
        columns={[
          { key: "id", label: "รหัส" },
          { key: "name", label: "ชื่อ", render: (u) => (<div><b>{u.name}</b><div style={{ fontSize: 11.5, color: "#5F6368" }}>@{u.username}</div></div>) },
          { key: "email", label: "อีเมล" },
          { key: "role", label: "บทบาท", render: (u) => <Pill>{ROLE_LABEL[u.role]}</Pill> },
          { key: "institution", label: "สถาบัน" },
          { key: "status", label: "สถานะ", render: (u) => <Status value={u.status} /> },
          { key: "createdAt", label: "วันที่สมัคร" },
        ]}
        rows={rows}
        empty="ไม่พบผู้ใช้งานตามเงื่อนไข"
      />
    </>
  );
}

// ── UC11 ค้นหาและเรียกดูข้อมูลคำร้อง ──────────────────────
function Requests() {
  const { items } = useCollection("requests");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const rows = items.filter((r) =>
    (!status || r.status === status) &&
    (r.id + r.type + r.detail + r.userName).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <UCHead code="UC11" title="ค้นหาและเรียกดูข้อมูลคำร้อง" desc="ค้นหาคำร้องจากรหัส ประเภท เนื้อหา หรือชื่อผู้ยื่น" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาคำร้อง" />
      <Field label="กรองตามสถานะ">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">ทั้งหมด</option>
          <option value="pending">รอพิจารณา</option>
          <option value="approved">อนุมัติ</option>
          <option value="rejected">ไม่อนุมัติ</option>
        </Select>
      </Field>
      <Table
        columns={[
          { key: "id", label: "เลขที่" },
          { key: "userName", label: "ผู้ยื่น" },
          { key: "type", label: "ประเภท" },
          { key: "detail", label: "รายละเอียด" },
          { key: "createdAt", label: "วันที่ยื่น" },
          { key: "status", label: "สถานะ", render: (r) => <Status value={r.status} /> },
        ]}
        rows={rows}
        empty="ไม่พบคำร้องตามเงื่อนไข"
      />
    </>
  );
}

// ── UC12 จัดการแก้ไขสิทธิ์ผู้ใช้งาน ───────────────────────
function Roles({ user }) {
  const { items, patch } = useCollection("users");
  const [q, setQ] = useState("");
  const rows = items.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <UCHead code="UC12" title="จัดการแก้ไขสิทธิ์ผู้ใช้งาน" desc="เปลี่ยนบทบาท (Actor) ของผู้ใช้ — มีผลกับเมนูและสิทธิ์ที่เข้าถึงได้ทันทีเมื่อผู้ใช้เข้าสู่ระบบครั้งถัดไป" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาผู้ใช้ที่ต้องการแก้สิทธิ์" />
      {rows.map((u) => (
        <Card key={u.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 14, color: "#202124" }}>{u.name}</b>
              <div style={{ fontSize: 11.5, color: "#5F6368" }}>{u.email} · {u.id}</div>
            </div>
            <Select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value }, user)} style={{ width: 210 }}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </Card>
      ))}
    </>
  );
}

// ── UC13 ตรวจสอบและพิจารณาคำร้อง ─────────────────────────
function Review({ user }) {
  const { items, patch } = useCollection("requests");
  const [notes, setNotes] = useState({});
  const pending = items.filter((r) => r.status === "pending");
  const done = items.filter((r) => r.status !== "pending");

  async function decide(r, status) {
    await patch(r.id, { status, note: notes[r.id] || (status === "approved" ? "อนุมัติตามคำร้อง" : "ไม่อนุมัติ"), reviewedBy: user.name, reviewedAt: new Date().toISOString().slice(0, 10) }, user);
  }

  return (
    <>
      <UCHead code="UC13" title="ตรวจสอบและพิจารณาคำร้อง" desc="อนุมัติหรือไม่อนุมัติคำร้อง พร้อมบันทึกเหตุผลประกอบการพิจารณา" />
      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "0 0 8px" }}>รอพิจารณา ({pending.length})</div>
      {pending.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ไม่มีคำร้องค้างพิจารณา</div> : null}
      {pending.map((r) => (
        <Card key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14, color: "#202124" }}>{r.type}</b>
            <Pill>{r.id}</Pill>
          </div>
          <div style={{ fontSize: 13, color: "#3C4043", marginTop: 5 }}>{r.detail}</div>
          <div style={{ fontSize: 11.5, color: "#5F6368", margin: "7px 0" }}>ยื่นโดย {r.userName} · {r.createdAt}</div>
          <Textarea placeholder="เหตุผลประกอบการพิจารณา" value={notes[r.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} style={{ minHeight: 56 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn kind="ok" onClick={() => decide(r, "approved")}>อนุมัติ</Btn>
            <Btn kind="danger" onClick={() => decide(r, "rejected")}>ไม่อนุมัติ</Btn>
          </div>
        </Card>
      ))}

      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "16px 0 8px" }}>พิจารณาแล้ว ({done.length})</div>
      <Table
        columns={[
          { key: "id", label: "เลขที่" },
          { key: "type", label: "ประเภท" },
          { key: "status", label: "ผล", render: (r) => <Status value={r.status} /> },
          { key: "note", label: "เหตุผล" },
        ]}
        rows={done}
      />
    </>
  );
}

// ── UC14 จัดทำรายงานสรุปข้อมูลคำร้อง ─────────────────────
function ReportUC14() {
  const stats = useStats();
  const { items } = useCollection("requests");
  if (!stats) return <div style={{ color: "#5F6368", fontSize: 13 }}>กำลังโหลด…</div>;

  const byStatus = stats.requestsByStatus || {};
  const byType = stats.requestsByType || {};

  function exportCsv() {
    const header = ["id", "userName", "type", "detail", "status", "createdAt", "note"];
    const lines = [header.join(","), ...items.map((r) => header.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kmitl-map-requests-report.csv";
    a.click();
  }

  return (
    <>
      <UCHead code="UC14" title="จัดทำรายงานสรุปข้อมูลคำร้อง" desc="สรุปคำร้องแยกตามสถานะและประเภท พร้อมส่งออกเป็นไฟล์ CSV" />
      <Tiles items={[
        { label: "คำร้องทั้งหมด", value: items.length },
        { label: "รอพิจารณา", value: byStatus.pending || 0 },
        { label: "อนุมัติ", value: byStatus.approved || 0 },
        { label: "ไม่อนุมัติ", value: byStatus.rejected || 0 },
      ]} />
      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>แยกตามประเภทคำร้อง</b>
        <div style={{ marginTop: 9 }}>
          {Object.entries(byType).map(([t, n]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <span style={{ width: 150, fontSize: 12.5, color: "#3C4043" }}>{t}</span>
              <div style={{ flex: 1, height: 10, background: "#F1F3F4", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(n / items.length) * 100}%`, height: "100%", background: "#1A73E8" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#1A73E8" }}>{n}</span>
            </div>
          ))}
        </div>
      </Card>
      <Btn onClick={exportCsv}>ส่งออกรายงาน (.csv)</Btn>
    </>
  );
}

// ── UC15 กำหนดจำนวนการส่งคำร้อง ──────────────────────────
function Quota({ user }) {
  const { items, patch, create } = useCollection("requestQuota");
  const q = items[0];
  const [form, setForm] = useState(null);
  const cur = form || q || { perUserPerDay: 3, perUserPerMonth: 20 };

  async function save() {
    const payload = { perUserPerDay: Number(cur.perUserPerDay), perUserPerMonth: Number(cur.perUserPerMonth), updatedAt: new Date().toISOString().slice(0, 10), updatedBy: user.id };
    if (q?.id) await patch(q.id, payload, user);
    else await create(payload, user);
    alert("บันทึกการตั้งค่าเรียบร้อย");
  }

  return (
    <>
      <UCHead code="UC15" title="กำหนดจำนวนการส่งคำร้อง" desc="จำกัดจำนวนคำร้องที่ผู้ใช้งานหนึ่งคนส่งได้ เพื่อป้องกันการส่งซ้ำเกินความจำเป็น" />
      <Card>
        <Field label="จำนวนคำร้องสูงสุดต่อคน ต่อวัน">
          <Input type="number" min={1} value={cur.perUserPerDay} onChange={(e) => setForm({ ...cur, perUserPerDay: e.target.value })} />
        </Field>
        <Field label="จำนวนคำร้องสูงสุดต่อคน ต่อเดือน">
          <Input type="number" min={1} value={cur.perUserPerMonth} onChange={(e) => setForm({ ...cur, perUserPerMonth: e.target.value })} />
        </Field>
        <Btn onClick={save}>บันทึกการตั้งค่า</Btn>
        {q ? <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 9 }}>แก้ไขล่าสุด {q.updatedAt}</div> : null}
      </Card>
    </>
  );
}

// ── UC16 จัดการสถานะบัญชีของผู้ใช้งาน ────────────────────
function AccountStatus({ user }) {
  const { items, patch } = useCollection("users");
  const [q, setQ] = useState("");
  const rows = items.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <UCHead code="UC16" title="จัดการสถานะบัญชีของผู้ใช้งาน" desc="ระงับหรือคืนสิทธิ์การใช้งานบัญชี — บัญชีที่ถูกระงับจะเข้าสู่ระบบไม่ได้" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาบัญชีผู้ใช้" />
      <Table
        columns={[
          { key: "name", label: "ผู้ใช้", render: (u) => (<div><b>{u.name}</b><div style={{ fontSize: 11.5, color: "#5F6368" }}>{u.email}</div></div>) },
          { key: "role", label: "บทบาท", render: (u) => <Pill>{ROLE_LABEL[u.role]}</Pill> },
          { key: "status", label: "สถานะ", render: (u) => <Status value={u.status} /> },
          {
            key: "act", label: "",
            render: (u) => u.status === "active"
              ? <Btn kind="danger" onClick={() => confirm(`ระงับบัญชี ${u.name}?`) && patch(u.id, { status: "suspended" }, user)}>ระงับบัญชี</Btn>
              : <Btn kind="ok" onClick={() => patch(u.id, { status: "active" }, user)}>คืนสิทธิ์</Btn>,
          },
        ]}
        rows={rows}
      />
    </>
  );
}
