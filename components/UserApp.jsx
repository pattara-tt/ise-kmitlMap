"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Btn, Card, Field, Input, Pill, SearchBar, Status, Textarea, UCHead, useCollection } from "./ui";
import { EVENT_STATE_LABEL, eventState, fmt } from "../lib/schedule";
import { newsState } from "../lib/schedule";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, fontSize: 16, color: "#5F6368" }}>กำลังโหลดแผนที่…</div>,
});

// Actor: ผู้ใช้งานทั่วไป — UC23 ค้นหา · UC24 นำทาง · UC25 ข้อเสนอแนะ · UC26 กิจกรรมที่สนใจ
export default function UserApp({ user, tab, viewMode = "auto" }) {
  const mapApi = useRef(null);

  return (
    <>
      {/* แผนที่ mount ค้างไว้เสมอ กันโหลด Leaflet ใหม่ทุกครั้งที่สลับแท็บ */}
      <div style={{ position: "absolute", inset: 0, visibility: tab === "map" ? "visible" : "hidden" }}>
        <MapView apiRef={mapApi} viewMode={viewMode} />
      </div>
      {tab === "search" ? <SearchPage mapApi={mapApi} /> : null}
      {tab === "events" ? <EventsPage user={user} /> : null}
      {tab === "feedback" ? <FeedbackPage user={user} /> : null}
    </>
  );
}

// ── UC23 ค้นหาห้องเรียน อาคาร หรือชื่ออาจารย์ + UC24 นำทาง ──
function SearchPage({ mapApi }) {
  const { items: rooms } = useCollection("rooms");
  const { items: floors } = useCollection("floors");
  const { items: events } = useCollection("events");
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    const out = [];
    for (const r of rooms) {
      if ((r.code + r.name + r.teacher + r.type + r.building).toLowerCase().includes(k)) {
        out.push({ kind: "ห้อง", title: r.name, sub: `${r.building} ชั้น ${r.floor} · ${r.type}`, extra: r.teacher && r.teacher !== "-" ? "อาจารย์: " + r.teacher : "", target: r.name });
      }
    }
    const buildings = [...new Set(floors.map((f) => f.building))];
    for (const b of buildings) {
      if (b.toLowerCase().includes(k)) out.push({ kind: "อาคาร", title: b, sub: `${floors.filter((f) => f.building === b).length} ชั้น`, target: b });
    }
    for (const ev of events) {
      if (!ev.published || eventState(ev) === "ended") continue;
      if ((ev.placeName + ev.name).toLowerCase().includes(k)) {
        out.push({ kind: "จุดกิจกรรม", title: ev.placeName, sub: `${ev.name} · ${fmt(ev.startAt)}`, target: ev.placeName });
      }
    }
    return out;
  }, [q, rooms, floors, events]);

  function navigateTo(target) {
    try { mapApi?.current?.showRoutes?.(null, target); } catch (e) {}
    alert(`กำลังคำนวณเส้นทางไป "${target}" — เปิดแท็บแผนที่เพื่อดูผลลัพธ์`);
  }

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
      <UCHead code="UC23 / UC24" title="ค้นหาและนำทาง" desc="ค้นหาห้องเรียน อาคาร ชื่ออาจารย์ หรือจุดจัดกิจกรรม แล้วกดนำทางเพื่อคำนวณเส้นทางเดินบนแผนที่" />
      <SearchBar value={q} onChange={setQ} placeholder="เช่น 106, Coworking, อ.ดร. ปรีชา, Sc8" />
      {!q.trim() ? <div style={{ fontSize: 13, color: "#5F6368" }}>พิมพ์คำค้นเพื่อเริ่มค้นหา</div> : null}
      {q.trim() && results.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ไม่พบผลลัพธ์ที่ตรงกับ “{q}”</div> : null}
      {results.map((r, i) => (
        <Card key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <Pill color="#1A73E8" bg="#E8F0FE">{r.kind}</Pill>
                <b style={{ fontSize: 14.5, color: "#202124" }}>{r.title}</b>
              </div>
              <div style={{ fontSize: 12.5, color: "#5F6368", marginTop: 4 }}>{r.sub}</div>
              {r.extra ? <div style={{ fontSize: 12.5, color: "#3C4043", marginTop: 2 }}>{r.extra}</div> : null}
            </div>
            <Btn onClick={() => navigateTo(r.target)}>นำทาง</Btn>
          </div>
        </Card>
      ))}
    </div>
    </div>
  );
}

// ── UC26 เพิ่มกิจกรรมที่สนใจเข้าร่วม ─────────────────────
function EventsPage({ user }) {
  const { items: events } = useCollection("events");
  const { items: cats } = useCollection("categories");
  const { items: news } = useCollection("news");
  const { items: interest, create, destroy } = useCollection("eventInterest");

  const open = events.filter((e) => e.published && eventState(e) !== "ended");
  const mine = interest.filter((i) => i.userId === user.id);
  const isInterested = (id) => mine.find((i) => i.eventId === id);
  const liveNews = news.filter((n) => newsState(n) === "live");

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
      <UCHead title="ข่าวสารและกิจกรรม" desc="ข่าวประชาสัมพันธ์ล่าสุด และกิจกรรมที่เปิดให้กดสนใจเข้าร่วม" />

      {liveNews.length ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "6px 0 8px" }}>ข่าวสารล่าสุด</div>
          {liveNews.map((n) => (
            <Card key={n.id}>
              <b style={{ fontSize: 14.5, color: "#202124" }}>{n.title}</b>
              <div style={{ fontSize: 13, color: "#3C4043", marginTop: 4 }}>{n.body}</div>
              <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 6 }}>เผยแพร่ {fmt(n.publishAt)}</div>
            </Card>
          ))}
        </>
      ) : null}

      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "16px 0 8px" }}>กิจกรรมที่สนใจของฉัน ({mine.length})</div>
      {mine.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368", marginBottom: 6 }}>ยังไม่มีกิจกรรมที่บันทึกไว้</div> : null}
      {mine.map((i) => {
        const ev = events.find((x) => x.id === i.eventId);
        if (!ev) return null;
        return (
          <Card key={i.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div>
                <b style={{ fontSize: 14, color: "#188038" }}>{ev.name}</b>
                <div style={{ fontSize: 11.5, color: "#5F6368" }}>{fmt(ev.startAt)} · {ev.placeName}</div>
              </div>
              <Btn kind="danger" onClick={() => destroy(i.id, user)}>ยกเลิก</Btn>
            </div>
          </Card>
        );
      })}

      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "16px 0 8px" }}>กิจกรรมทั้งหมด</div>
      {open.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่มีกิจกรรมที่เปิดรับ</div> : null}
      {open.map((ev) => {
        const cat = cats.find((c) => c.id === ev.categoryId);
        const on = isInterested(ev.id);
        return (
          <Card key={ev.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b style={{ fontSize: 14.5, color: "#202124" }}>{ev.name}</b>
              <Status value={eventState(ev)} />
            </div>
            <div style={{ fontSize: 13, color: "#3C4043", marginTop: 5 }}>{ev.detail}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
              {cat ? <Pill color="#fff" bg={cat.color}>{cat.name}</Pill> : null}
              <Pill>{EVENT_STATE_LABEL[eventState(ev)]}</Pill>
            </div>
            <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 7, lineHeight: 1.7 }}>
              {fmt(ev.startAt)} — {fmt(ev.endAt)}<br />📍 {ev.placeName}
            </div>
            <div style={{ marginTop: 10 }}>
              {on
                ? <Btn kind="ghost" onClick={() => destroy(on.id, user)}>✓ บันทึกแล้ว — กดเพื่อยกเลิก</Btn>
                : <Btn kind="ok" onClick={() => create({ eventId: ev.id, userId: user.id }, user)}>สนใจเข้าร่วม</Btn>}
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

// ── UC25 ส่งข้อเสนอแนะหรือแจ้งปัญหาการใช้ระบบ ───────────
function FeedbackPage({ user }) {
  const { items, create } = useCollection("feedback");
  const { items: quota } = useCollection("requestQuota");
  const [form, setForm] = useState({ topic: "การใช้งานแผนที่", detail: "" });
  const mine = items.filter((f) => f.userId === user.id);
  const limit = quota[0]?.perUserPerDay ?? 3;
  const todayCount = mine.filter((f) => f.createdAt === new Date().toISOString().slice(0, 10)).length;

  async function send() {
    if (!form.detail.trim()) return alert("กรุณากรอกรายละเอียด");
    if (todayCount >= limit) return alert(`ส่งได้สูงสุด ${limit} เรื่องต่อวัน (ตามที่ฝ่ายดูแลระบบกำหนดใน UC15)`);
    await create({ ...form, userId: user.id, userName: user.name, status: "new", reply: "" }, user);
    setForm({ topic: form.topic, detail: "" });
    alert("ส่งข้อเสนอแนะเรียบร้อย");
  }

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
      <UCHead code="UC25" title="ส่งข้อเสนอแนะหรือแจ้งปัญหาการใช้ระบบ" desc={`ส่งได้สูงสุด ${limit} เรื่องต่อวัน · วันนี้ส่งแล้ว ${todayCount} เรื่อง`} />
      <Card>
        <Field label="หัวข้อ">
          <Input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="เช่น ปัญหาการใช้ระบบ" />
        </Field>
        <Field label="รายละเอียด">
          <Textarea value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} placeholder="อธิบายปัญหาหรือข้อเสนอแนะของคุณ" />
        </Field>
        <Btn onClick={send}>ส่งข้อเสนอแนะ</Btn>
      </Card>

      <div style={{ fontSize: 13, fontWeight: 800, color: "#202124", margin: "14px 0 8px" }}>ประวัติที่ฉันส่ง</div>
      {mine.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่มีประวัติ</div> : null}
      {mine.map((f) => (
        <Card key={f.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14, color: "#202124" }}>{f.topic}</b>
            <Status value={f.status} />
          </div>
          <div style={{ fontSize: 13, color: "#3C4043", marginTop: 4 }}>{f.detail}</div>
          {f.reply ? <div style={{ fontSize: 12.5, color: "#188038", marginTop: 6 }}>ตอบกลับ: {f.reply}</div> : null}
          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 6 }}>{f.createdAt} · {f.id}</div>
        </Card>
      ))}
    </div>
    </div>
  );
}
