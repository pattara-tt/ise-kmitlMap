"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Pill, SearchBar, Select, Status, Table, UCHead, useCollection } from "../ui";

// Actor: ฝ่ายทะเบียน — UC21 ข้อมูลห้อง · UC22 ข้อมูลชั้นอาคาร
export default function RegistrarPanel({ uc, user }) {
  return uc === "rooms" ? <Rooms user={user} /> : <Floors user={user} />;
}

function Rooms({ user }) {
  const { items, create, patch, destroy } = useCollection("rooms");
  const { items: floors } = useCollection("floors");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ building: "Sc8", floor: "1", code: "", name: "", type: "ห้องเรียน", capacity: 40, teacher: "", nodeId: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const rows = items.filter((r) => (r.code + r.name + r.teacher + r.type).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <UCHead title="จัดการรายละเอียดข้อมูลห้องต่างๆ บนตึก บนแผนที่" desc="ข้อมูลห้องนี้จะถูกใช้ในการค้นหาห้องเรียน/ชื่ออาจารย์ของผู้ใช้งานทั่วไป และผูกกับหมุดบนผังชั้น" />

      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>เพิ่มห้องใหม่</b>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <div style={{ flex: 1 }}><Field label="อาคาร"><Input value={form.building} onChange={set("building")} /></Field></div>
          <div style={{ flex: 1 }}>
            <Field label="ชั้น">
              <Select value={form.floor} onChange={set("floor")}>
                {(floors.length ? floors : [{ floor: "1" }]).map((f) => <option key={f.floor} value={f.floor}>{f.floor}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="รหัสห้อง"><Input value={form.code} onChange={set("code")} placeholder="108" /></Field></div>
          <div style={{ flex: 2 }}><Field label="ชื่อห้อง"><Input value={form.name} onChange={set("name")} placeholder="ห้อง 108" /></Field></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="ประเภท"><Input value={form.type} onChange={set("type")} /></Field></div>
          <div style={{ flex: 1 }}><Field label="ความจุ"><Input type="number" value={form.capacity} onChange={set("capacity")} /></Field></div>
        </div>
        <Field label="อาจารย์ประจำห้อง"><Input value={form.teacher} onChange={set("teacher")} placeholder="อ.ดร. ..." /></Field>
        <Field label="รหัส node บนผังชั้น (ถ้ามี)"><Input value={form.nodeId} onChange={set("nodeId")} placeholder="Sc8StudyRoom4F1" /></Field>
        <Btn onClick={async () => {
          if (!form.code.trim() || !form.name.trim()) return alert("กรุณาระบุรหัสห้องและชื่อห้อง");
          await create({ ...form, capacity: Number(form.capacity) }, user);
          setForm({ ...form, code: "", name: "", teacher: "", nodeId: "" });
        }}>เพิ่มห้อง</Btn>
      </Card>

      <SearchBar value={q} onChange={setQ} placeholder="ค้นหารหัสห้อง / ชื่อห้อง / อาจารย์" />
      <Table
        columns={[
          { key: "code", label: "รหัส" },
          { key: "name", label: "ชื่อห้อง" },
          { key: "floor", label: "ชั้น", render: (r) => <Pill>{r.building} · ชั้น {r.floor}</Pill> },
          { key: "type", label: "ประเภท" },
          { key: "capacity", label: "ความจุ" },
          { key: "teacher", label: "อาจารย์ประจำห้อง" },
          {
            key: "act", label: "",
            render: (r) => (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn kind="ghost" onClick={() => { const t = prompt("แก้ไขชื่ออาจารย์ประจำห้อง", r.teacher); if (t !== null) patch(r.id, { teacher: t }, user); }}>แก้ไข</Btn>
                <Btn kind="danger" onClick={() => confirm(`ลบ ${r.name}?`) && destroy(r.id, user)}>ลบ</Btn>
              </div>
            ),
          },
        ]}
        rows={rows}
        empty="ไม่พบห้องตามเงื่อนไข"
      />
    </>
  );
}

function Floors({ user }) {
  const { items, create, patch, destroy } = useCollection("floors");
  const { items: rooms } = useCollection("rooms");
  const [form, setForm] = useState({ building: "Sc8", floor: "", name: "", svg: "", note: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead title="จัดการรายละเอียดข้อมูลชั้นต่างๆ บนตึก บนแผนที่" desc="กำหนดชั้นของอาคารและไฟล์ผังชั้นที่จะถูกซ้อนทับบนแผนที่เมื่อผู้ใช้ซูมเข้าอาคาร" />

      <Card>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="อาคาร"><Input value={form.building} onChange={set("building")} /></Field></div>
          <div style={{ flex: 1 }}><Field label="ชั้น"><Input value={form.floor} onChange={set("floor")} placeholder="3" /></Field></div>
        </div>
        <Field label="ชื่อที่แสดง"><Input value={form.name} onChange={set("name")} placeholder="ชั้น 3" /></Field>
        <Field label="ไฟล์ผังชั้น (SVG)"><Input value={form.svg} onChange={set("svg")} placeholder="/data/floorplans/Sc8/floor3.svg" /></Field>
        <Field label="หมายเหตุ"><Input value={form.note} onChange={set("note")} placeholder="เช่น ห้องปฏิบัติการ" /></Field>
        <Btn onClick={async () => {
          if (!form.floor.trim()) return alert("กรุณาระบุชั้น");
          await create({ ...form, name: form.name || "ชั้น " + form.floor, status: "active" }, user);
          setForm({ building: "Sc8", floor: "", name: "", svg: "", note: "" });
        }}>เพิ่มชั้น</Btn>
      </Card>

      {items.map((f) => (
        <Card key={f.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b style={{ fontSize: 14.5, color: "#202124" }}>{f.building} — {f.name}</b>
            <Status value={f.status} />
          </div>
          <div style={{ fontSize: 12.5, color: "#5F6368", marginTop: 4 }}>{f.note}</div>
          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 4, wordBreak: "break-all" }}>{f.svg || "ยังไม่ผูกไฟล์ผังชั้น"}</div>
          <div style={{ marginTop: 6 }}><Pill color="#1A73E8" bg="#E8F0FE">{rooms.filter((r) => r.building === f.building && r.floor === f.floor).length} ห้องในชั้นนี้</Pill></div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn kind="ghost" onClick={() => { const s = prompt("แก้ไขพาธไฟล์ผังชั้น", f.svg); if (s !== null) patch(f.id, { svg: s }, user); }}>แก้ไขผังชั้น</Btn>
            {f.status === "active"
              ? <Btn kind="ghost" onClick={() => patch(f.id, { status: "draft" }, user)}>ซ่อนชั้นนี้</Btn>
              : <Btn kind="ok" onClick={() => patch(f.id, { status: "active" }, user)}>เปิดใช้งาน</Btn>}
            <Btn kind="danger" onClick={() => confirm(`ลบ ${f.name}?`) && destroy(f.id, user)}>ลบ</Btn>
          </div>
        </Card>
      ))}
    </>
  );
}
