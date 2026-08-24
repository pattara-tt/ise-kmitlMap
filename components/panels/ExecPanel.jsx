"use client";

import { useState } from "react";
import { BarChart, Btn, Card, Pill, SearchBar, Status, Table, Tiles, UCHead, useCollection, useStats } from "../ui";

// Actor: บริหาร — UC1 สถิติภาพรวม · UC2 ข้อเสนอแนะจากผู้ใช้ · UC3 ประวัติแก้ไขข้อมูลแผนที่
export default function ExecPanel({ uc, user }) {
  if (uc === "overview") return <Overview />;
  if (uc === "feedback") return <Feedback user={user} />;
  return <Audit />;
}

function Overview() {
  const stats = useStats();
  const [metric, setMetric] = useState("activeUsers");
  if (!stats) return <div style={{ color: "#5F6368", fontSize: 13 }}>กำลังโหลดข้อมูล…</div>;
  const o = stats.overview;

  const METRICS = [["activeUsers", "ผู้ใช้ที่ใช้งาน"], ["searches", "การค้นหา"], ["routes", "การนำทาง"]];

  return (
    <>
      <UCHead code="UC1" title="ดูรายงานและสถิติภาพรวมระบบ" desc="ภาพรวมการใช้งาน KMITL MAP ประจำเดือนล่าสุด และแนวโน้มย้อนหลัง 6 เดือน" />
      <Tiles items={[
        { label: "ผู้ใช้ทั้งหมด", value: o.totalUsers },
        { label: "ผู้ใช้ที่ใช้งานเดือนนี้", value: o.activeUsers.toLocaleString() },
        { label: "การค้นหาเดือนนี้", value: o.searches.toLocaleString() },
        { label: "การนำทางเดือนนี้", value: o.routes.toLocaleString() },
        { label: "คำร้องรอพิจารณา", value: o.pendingRequests },
        { label: "ข้อเสนอแนะใหม่", value: o.newFeedback },
      ]} />

      <Card>
        <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          {METRICS.map(([k, label]) => (
            <button key={k} onClick={() => setMetric(k)} style={{ border: "1px solid", borderColor: metric === k ? "#1A73E8" : "#DADCE0", background: metric === k ? "#E8F0FE" : "#fff", color: metric === k ? "#1A73E8" : "#5F6368", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
        <BarChart data={stats.usage} labelKey="month" valueKey={metric} />
        <div style={{ fontSize: 11.5, color: "#5F6368" }}>หน่วย: ครั้ง/คน ต่อเดือน (มี.ค.–ส.ค. 2026)</div>
      </Card>

      <Card>
        <b style={{ fontSize: 14, color: "#202124" }}>ข้อมูลแผนที่ในระบบ</b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Pill color="#1A73E8" bg="#E8F0FE">อาคาร {o.buildings}</Pill>
          <Pill color="#188038" bg="#E6F4EA">ห้อง {o.rooms}</Pill>
          <Pill color="#E37400" bg="#FEF7E0">ข่าว/กิจกรรมที่เผยแพร่ {o.publishedNews}</Pill>
          <Pill color="#D93025" bg="#FCE8E6">บัญชีถูกระงับ {o.suspendedUsers}</Pill>
        </div>
      </Card>
    </>
  );
}

function Feedback({ user }) {
  const { items, patch } = useCollection("feedback");
  const [q, setQ] = useState("");
  const rows = items.filter((f) => (f.topic + f.detail + f.userName).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <UCHead code="UC2" title="ตรวจสอบข้อเสนอแนะและคำขอจากผู้ใช้งานทั่วไป" desc="อ่านข้อเสนอแนะที่ผู้ใช้ส่งเข้ามา (UC25) และบันทึกผลการพิจารณา" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาหัวข้อ / เนื้อหา / ผู้ส่ง" />
      {rows.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ไม่พบข้อเสนอแนะ</div> : null}
      {rows.map((f) => (
        <Card key={f.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14.5, color: "#202124" }}>{f.topic}</b>
            <Status value={f.status} />
          </div>
          <div style={{ fontSize: 13, color: "#3C4043", marginTop: 6 }}>{f.detail}</div>
          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 8 }}>โดย {f.userName} · {f.createdAt} · {f.id}</div>
          {f.reply ? <div style={{ fontSize: 12.5, color: "#188038", marginTop: 6 }}>ผลการพิจารณา: {f.reply}</div> : null}
          {f.status === "new" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn kind="ok" onClick={() => patch(f.id, { status: "reviewed", reply: "รับทราบและส่งต่อฝ่ายที่เกี่ยวข้องแล้ว" }, user)}>รับทราบ / ส่งต่อ</Btn>
            </div>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function Audit() {
  const { items } = useCollection("mapEdits");
  const [q, setQ] = useState("");
  const rows = items.filter((r) => (r.action + r.target + r.actorName).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <UCHead code="UC3" title="ตรวจสอบบันทึกประวัติการแก้ไขข้อมูลแผนที่" desc="ระบบบันทึกอัตโนมัติทุกครั้งที่มีการเพิ่ม/แก้ไข/ลบข้อมูลแผนผัง ห้อง ชั้น หรือตำแหน่งกิจกรรม" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาผู้แก้ไข / รายการที่ถูกแก้ไข" />
      <Table
        columns={[
          { key: "at", label: "เวลา" },
          { key: "actorName", label: "ผู้แก้ไข" },
          { key: "action", label: "การกระทำ" },
          { key: "target", label: "รายการ" },
          { key: "after", label: "ค่าหลังแก้ไข", render: (r) => <span style={{ color: "#5F6368" }}>{String(r.after).slice(0, 60)}</span> },
        ]}
        rows={rows}
        empty="ยังไม่มีประวัติการแก้ไข"
      />
    </>
  );
}
