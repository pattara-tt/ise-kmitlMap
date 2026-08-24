"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Pill, Select, Status, Table, Textarea, Tiles, UCHead, useCollection, useStats } from "../ui";

// Actor: ฝ่ายประชาสัมพันธ์ — UC17 ข่าว/กิจกรรม · UC18 ตำแหน่งบนแผนที่ · UC19 จัดหมวดหมู่ · UC20 สถิติความสนใจ · UC29 จัดการหมวดหมู่
export default function PrPanel({ uc, user }) {
  if (uc === "news") return <News user={user} />;
  if (uc === "locations") return <Locations user={user} />;
  if (uc === "assign") return <Assign user={user} />;
  if (uc === "interest") return <Interest />;
  return <Categories user={user} />;
}

function News({ user }) {
  const { items, create, patch, destroy } = useCollection("news");
  const { items: cats } = useCollection("categories");
  const eventCats = cats.filter((c) => c.kind === "event");
  const [form, setForm] = useState({ title: "", body: "", categoryId: "", date: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead code="UC17" title="จัดการข้อมูลข่าวสารและกิจกรรมของภาควิชา" desc="เพิ่ม แก้ไข เผยแพร่ หรือลบข่าวสาร/กิจกรรมที่จะแสดงให้ผู้ใช้งานทั่วไปเห็น" />

      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>เพิ่มข่าว/กิจกรรมใหม่</b>
        <div style={{ marginTop: 8 }}>
          <Field label="หัวข้อ"><Input value={form.title} onChange={set("title")} placeholder="เช่น ISE Open House 2026" /></Field>
          <Field label="รายละเอียด"><Textarea value={form.body} onChange={set("body")} /></Field>
          <Field label="หมวดหมู่">
            <Select value={form.categoryId} onChange={set("categoryId")}>
              <option value="">— เลือกหมวดหมู่ —</option>
              {eventCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="วันที่จัดกิจกรรม"><Input type="date" value={form.date} onChange={set("date")} /></Field>
          <Btn onClick={async () => {
            if (!form.title.trim()) return alert("กรุณาระบุหัวข้อ");
            await create({ ...form, status: "draft", author: user.name }, user);
            setForm({ title: "", body: "", categoryId: "", date: "" });
          }}>บันทึกเป็นฉบับร่าง</Btn>
        </div>
      </Card>

      {items.map((n) => {
        const cat = cats.find((c) => c.id === n.categoryId);
        return (
          <Card key={n.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b style={{ fontSize: 14.5, color: "#202124" }}>{n.title}</b>
              <Status value={n.status} />
            </div>
            <div style={{ fontSize: 13, color: "#3C4043", marginTop: 5 }}>{n.body}</div>
            <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              {cat ? <Pill color="#fff" bg={cat.color}>{cat.name}</Pill> : <Pill>ยังไม่จัดหมวดหมู่</Pill>}
              <span style={{ fontSize: 11.5, color: "#5F6368" }}>{n.date} · โดย {n.author}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {n.status === "draft"
                ? <Btn kind="ok" onClick={() => patch(n.id, { status: "published" }, user)}>เผยแพร่</Btn>
                : <Btn kind="ghost" onClick={() => patch(n.id, { status: "draft" }, user)}>ถอนกลับร่าง</Btn>}
              <Btn kind="ghost" onClick={() => { const t = prompt("แก้ไขหัวข้อ", n.title); if (t) patch(n.id, { title: t }, user); }}>แก้ไขหัวข้อ</Btn>
              <Btn kind="danger" onClick={() => confirm("ลบข่าวนี้?") && destroy(n.id, user)}>ลบ</Btn>
            </div>
          </Card>
        );
      })}
    </>
  );
}

function Locations({ user }) {
  const { items, create, patch, destroy } = useCollection("eventLocations");
  const { items: news } = useCollection("news");
  const [form, setForm] = useState({ newsId: "", label: "", lat: "", lon: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead code="UC18" title="จัดการข้อมูลตำแหน่งกิจกรรมและการค้นหาบนแผนที่" desc="ผูกพิกัดของกิจกรรมเข้ากับแผนที่ และกำหนดว่าให้ค้นหาเจอบนแผนที่หรือไม่" />

      <Card>
        <Field label="กิจกรรม">
          <Select value={form.newsId} onChange={set("newsId")}>
            <option value="">— เลือกกิจกรรม —</option>
            {news.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </Select>
        </Field>
        <Field label="ชื่อตำแหน่งที่แสดง"><Input value={form.label} onChange={set("label")} placeholder="เช่น ลานหน้าอาคารพระจอมเกล้าฯ (Sc8)" /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Latitude"><Input value={form.lat} onChange={set("lat")} placeholder="13.729721" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Longitude"><Input value={form.lon} onChange={set("lon")} placeholder="100.780099" /></Field></div>
        </div>
        <Btn onClick={async () => {
          if (!form.newsId || !form.label.trim()) return alert("กรุณาเลือกกิจกรรมและระบุชื่อตำแหน่ง");
          await create({ ...form, lat: Number(form.lat), lon: Number(form.lon), searchable: true }, user);
          setForm({ newsId: "", label: "", lat: "", lon: "" });
        }}>เพิ่มตำแหน่งกิจกรรม</Btn>
      </Card>

      <Table
        columns={[
          { key: "label", label: "ตำแหน่ง" },
          { key: "newsId", label: "กิจกรรม", render: (l) => (news.find((n) => n.id === l.newsId) || {}).title || l.newsId },
          { key: "coord", label: "พิกัด", render: (l) => <span style={{ fontSize: 11.5, color: "#5F6368" }}>{l.lat}, {l.lon}</span> },
          {
            key: "searchable", label: "ค้นหาบนแผนที่",
            render: (l) => (
              <Btn kind={l.searchable ? "ok" : "ghost"} onClick={() => patch(l.id, { searchable: !l.searchable }, user)}>
                {l.searchable ? "เปิดอยู่" : "ปิดอยู่"}
              </Btn>
            ),
          },
          { key: "act", label: "", render: (l) => <Btn kind="danger" onClick={() => confirm("ลบตำแหน่งนี้?") && destroy(l.id, user)}>ลบ</Btn> },
        ]}
        rows={items}
      />
    </>
  );
}

function Assign({ user }) {
  const { items: cats } = useCollection("categories");
  const { items: news, patch: patchNews } = useCollection("news");
  const { items: rooms, patch: patchRoom } = useCollection("rooms");
  const placeCats = cats.filter((c) => c.kind === "place");
  const eventCats = cats.filter((c) => c.kind === "event");

  return (
    <>
      <UCHead code="UC19" title="จัดหมวดหมู่สถานที่และกิจกรรม" desc="กำหนดหมวดหมู่ให้กับกิจกรรมและสถานที่ เพื่อใช้กรองและแสดงสีบนแผนที่" />

      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "0 0 8px" }}>กิจกรรม</div>
      {news.map((n) => (
        <Card key={n.id}>
          <b style={{ fontSize: 14, color: "#202124" }}>{n.title}</b>
          <div style={{ marginTop: 8 }}>
            <Select value={n.categoryId || ""} onChange={(e) => patchNews(n.id, { categoryId: e.target.value }, user)}>
              <option value="">— ยังไม่จัดหมวดหมู่ —</option>
              {eventCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </Card>
      ))}

      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "16px 0 8px" }}>สถานที่ / ห้อง</div>
      {rooms.map((r) => (
        <Card key={r.id}>
          <b style={{ fontSize: 14, color: "#202124" }}>{r.name} <span style={{ fontWeight: 400, color: "#5F6368", fontSize: 12 }}>· {r.building} ชั้น {r.floor}</span></b>
          <div style={{ marginTop: 8 }}>
            <Select value={r.categoryId || ""} onChange={(e) => patchRoom(r.id, { categoryId: e.target.value }, user)}>
              <option value="">— ยังไม่จัดหมวดหมู่ —</option>
              {placeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </Card>
      ))}
    </>
  );
}

function Interest() {
  const stats = useStats();
  const { items: interest } = useCollection("eventInterest");
  if (!stats) return <div style={{ color: "#5F6368", fontSize: 13 }}>กำลังโหลด…</div>;
  const rows = stats.eventStats || [];
  const total = rows.reduce((a, r) => a + r.interested, 0);

  return (
    <>
      <UCHead code="UC20" title="ตรวจสอบสถิติความสนใจของกิจกรรม" desc="จำนวนการเข้าชม การกดสนใจ (UC26) และการค้นหากิจกรรมบนแผนที่" />
      <Tiles items={[
        { label: "กิจกรรมที่มีสถิติ", value: rows.length },
        { label: "ยอดกดสนใจรวม", value: total },
        { label: "ผู้กดสนใจล่าสุด", value: interest.length },
        { label: "ยอดเข้าชมรวม", value: rows.reduce((a, r) => a + r.views, 0).toLocaleString() },
      ]} />
      {rows.map((r) => (
        <Card key={r.newsId}>
          <b style={{ fontSize: 14, color: "#202124" }}>{r.title}</b>
          <div style={{ marginTop: 9 }}>
            {[["เข้าชม", r.views, "#1A73E8"], ["กดสนใจ", r.interested, "#188038"], ["ค้นหาบนแผนที่", r.searched, "#E37400"]].map(([label, v, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ width: 100, fontSize: 12.5, color: "#3C4043" }}>{label}</span>
                <div style={{ flex: 1, height: 10, background: "#F1F3F4", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (v / Math.max(1, r.views)) * 100)}%`, height: "100%", background: color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

function Categories({ user }) {
  const { items, create, patch, destroy } = useCollection("categories");
  const [form, setForm] = useState({ name: "", kind: "event", color: "#1A73E8" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <UCHead code="UC29" title="เพิ่ม / แก้ไข / ลบหมวดหมู่กิจกรรมและสถานที่" desc="หมวดหมู่ที่สร้างไว้จะไปปรากฏให้เลือกใน UC17 และ UC19" />

      <Card>
        <Field label="ชื่อหมวดหมู่"><Input value={form.name} onChange={set("name")} placeholder="เช่น สัมมนา / หอพัก" /></Field>
        <Field label="ใช้กับ">
          <Select value={form.kind} onChange={set("kind")}>
            <option value="event">กิจกรรม</option>
            <option value="place">สถานที่</option>
          </Select>
        </Field>
        <Field label="สีประจำหมวดหมู่"><Input type="color" value={form.color} onChange={set("color")} style={{ height: 42, padding: 4 }} /></Field>
        <Btn onClick={async () => {
          if (!form.name.trim()) return alert("กรุณาระบุชื่อหมวดหมู่");
          await create(form, user);
          setForm({ name: "", kind: "event", color: "#1A73E8" });
        }}>เพิ่มหมวดหมู่</Btn>
      </Card>

      <Table
        columns={[
          { key: "name", label: "หมวดหมู่", render: (c) => <Pill color="#fff" bg={c.color}>{c.name}</Pill> },
          { key: "kind", label: "ใช้กับ", render: (c) => (c.kind === "event" ? "กิจกรรม" : "สถานที่") },
          {
            key: "act", label: "",
            render: (c) => (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn kind="ghost" onClick={() => { const n = prompt("แก้ไขชื่อหมวดหมู่", c.name); if (n) patch(c.id, { name: n }, user); }}>แก้ไข</Btn>
                <Btn kind="danger" onClick={() => confirm("ลบหมวดหมู่นี้?") && destroy(c.id, user)}>ลบ</Btn>
              </div>
            ),
          },
        ]}
        rows={items}
      />
    </>
  );
}
