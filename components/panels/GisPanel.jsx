"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Pill, Select, Status, Table, Textarea, UCHead, useCollection } from "../ui";

// Actor: ผู้ดูแลข้อมูลสถานที่และอาคาร — UC7 ขอบเขตแผนผัง · UC8 ข้อมูลประกอบแผนผัง · UC9 บันทึกข้อมูลแผนที่
export default function GisPanel({ uc, user }) {
  if (uc === "boundary") return <Boundary user={user} />;
  if (uc === "assets") return <Assets user={user} />;
  return <SaveMap user={user} />;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function Boundary({ user }) {
  const { items, create, patch, destroy } = useCollection("mapBoundaries");
  const [form, setForm] = useState({ name: "", type: "building", points: 4 });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead code="UC7" title="จัดการขอบเขตแผนผัง" desc="กำหนดขอบเขตวิทยาเขต/อาคารที่ใช้ตัดพื้นที่แสดงผลบนแผนที่ — ทุกการแก้ไขถูกบันทึกลงประวัติ (UC3)" />

      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>เพิ่มขอบเขตใหม่</b>
        <div style={{ marginTop: 8 }}>
          <Field label="ชื่อขอบเขต"><Input value={form.name} onChange={set("name")} placeholder="เช่น ขอบเขตอาคารเรียนรวม" /></Field>
          <Field label="ประเภท">
            <Select value={form.type} onChange={set("type")}>
              <option value="campus">วิทยาเขต</option>
              <option value="building">อาคาร</option>
              <option value="zone">โซน/พื้นที่ย่อย</option>
            </Select>
          </Field>
          <Field label="จำนวนจุดพิกัด (points)"><Input type="number" value={form.points} onChange={set("points")} /></Field>
          <Btn onClick={async () => {
            if (!form.name.trim()) return alert("กรุณาระบุชื่อขอบเขต");
            await create({ ...form, points: Number(form.points), updatedAt: todayStr(), status: "draft" }, user);
            setForm({ name: "", type: "building", points: 4 });
          }}>เพิ่มขอบเขต</Btn>
        </div>
      </Card>

      <Table
        columns={[
          { key: "name", label: "ชื่อขอบเขต" },
          { key: "type", label: "ประเภท", render: (r) => <Pill>{r.type}</Pill> },
          { key: "points", label: "จุดพิกัด" },
          { key: "updatedAt", label: "แก้ไขล่าสุด" },
          { key: "status", label: "สถานะ", render: (r) => <Status value={r.status} /> },
          {
            key: "act", label: "",
            render: (r) => (
              <div style={{ display: "flex", gap: 6 }}>
                {r.status === "draft"
                  ? <Btn kind="ok" onClick={() => patch(r.id, { status: "published", updatedAt: todayStr() }, user)}>เผยแพร่</Btn>
                  : <Btn kind="ghost" onClick={() => patch(r.id, { status: "draft", updatedAt: todayStr() }, user)}>ถอนกลับร่าง</Btn>}
                <Btn kind="danger" onClick={() => confirm("ลบขอบเขตนี้?") && destroy(r.id, user)}>ลบ</Btn>
              </div>
            ),
          },
        ]}
        rows={items}
      />
    </>
  );
}

function Assets({ user }) {
  const { items, create, destroy } = useCollection("mapAssets");
  const [form, setForm] = useState({ name: "", kind: "floorplan", file: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead code="UC8" title="จัดการข้อมูลประกอบแผนผัง" desc="ไฟล์ผังชั้น (SVG) ภาพประกอบ และไอคอน ที่ใช้แสดงบนแผนที่ — อ้างอิงจากโฟลเดอร์ /public/data" />

      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>เพิ่มไฟล์ประกอบ</b>
        <div style={{ marginTop: 8 }}>
          <Field label="ชื่อรายการ"><Input value={form.name} onChange={set("name")} placeholder="เช่น ผังชั้น 3 อาคาร Sc8" /></Field>
          <Field label="ประเภท">
            <Select value={form.kind} onChange={set("kind")}>
              <option value="floorplan">ผังชั้น (SVG)</option>
              <option value="image">ภาพประกอบ</option>
              <option value="icon">ไอคอน</option>
            </Select>
          </Field>
          <Field label="พาธไฟล์ใน /public"><Input value={form.file} onChange={set("file")} placeholder="/data/floorplans/Sc8/floor3.svg" /></Field>
          <Btn onClick={async () => {
            if (!form.name.trim() || !form.file.trim()) return alert("กรุณากรอกชื่อและพาธไฟล์");
            await create({ ...form, updatedAt: todayStr() }, user);
            setForm({ name: "", kind: "floorplan", file: "" });
          }}>เพิ่มไฟล์</Btn>
        </div>
      </Card>

      {items.map((a) => (
        <Card key={a.id}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 62, height: 62, flex: "none", borderRadius: 10, border: "1px solid #DADCE0", background: "#F8F9FA", overflow: "hidden", display: "grid", placeItems: "center" }}>
              <img src={a.file} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 14, color: "#202124" }}>{a.name}</b>
              <div style={{ fontSize: 11.5, color: "#5F6368", wordBreak: "break-all" }}>{a.file}</div>
              <div style={{ marginTop: 5 }}><Pill>{a.kind}</Pill> <span style={{ fontSize: 11, color: "#5F6368" }}>อัปเดต {a.updatedAt}</span></div>
            </div>
            <Btn kind="danger" onClick={() => confirm("ลบไฟล์ประกอบนี้?") && destroy(a.id, user)}>ลบ</Btn>
          </div>
        </Card>
      ))}
    </>
  );
}

function SaveMap({ user }) {
  const { items, create, patch } = useCollection("mapDrafts");
  const [form, setForm] = useState({ name: "", note: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead code="UC9" title="บันทึกข้อมูลแผนที่" desc="บันทึกการเปลี่ยนแปลงเป็นฉบับร่างก่อน แล้วจึงยืนยันเผยแพร่ขึ้นระบบจริง" />

      <Card>
        <Field label="ชื่อรายการที่บันทึก"><Input value={form.name} onChange={set("name")} placeholder="เช่น ปรับพิกัดทางเข้าอาคาร" /></Field>
        <Field label="บันทึกช่วยจำ / รายละเอียดการแก้ไข"><Textarea value={form.note} onChange={set("note")} /></Field>
        <Btn onClick={async () => {
          if (!form.name.trim()) return alert("กรุณาระบุชื่อรายการ");
          await create({ ...form, savedAt: new Date().toISOString().slice(0, 16).replace("T", " "), savedBy: user.name, status: "draft" }, user);
          setForm({ name: "", note: "" });
        }}>บันทึกเป็นฉบับร่าง</Btn>
      </Card>

      {items.map((d) => (
        <Card key={d.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14, color: "#202124" }}>{d.name}</b>
            <Status value={d.status} />
          </div>
          <div style={{ fontSize: 13, color: "#3C4043", marginTop: 4 }}>{d.note}</div>
          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 7 }}>บันทึกเมื่อ {d.savedAt} โดย {d.savedBy}</div>
          {d.status === "draft" ? (
            <div style={{ marginTop: 9 }}>
              <Btn kind="ok" onClick={() => patch(d.id, { status: "published" }, user)}>ยืนยันเผยแพร่ขึ้นระบบจริง</Btn>
            </div>
          ) : null}
        </Card>
      ))}
    </>
  );
}
