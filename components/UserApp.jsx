"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Btn, Card, Field, Icon, Input, Pill, Status, Textarea, UCHead, useCollection} from "./ui";
import { formatDateTime } from "../lib/datetime";
import FeedbackPage from "./FeedbackPage";
import { EVENT_STATE_LABEL, eventState, fmt, newsState } from "../lib/schedule";
import { dayKey, monthKey, todayKey } from "../lib/datetime";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, fontSize: 16, color: "#5F6368" }}>กำลังโหลดแผนที่…</div>,
});

// Actor: ผู้ใช้งานทั่วไป — แผนที่/นำทาง · กิจกรรม · แจ้งเตือน · แจ้งปัญหา
export default function UserApp({ user, tab, onTabChange, viewMode = "auto" }) {
  const mapApi = useRef(null);
  const { items: accessRows, loading: accessLoading } = useCollection("institutionAccess");
  const { items: institutions, loading: institutionsLoading } = useCollection("institutions");
  const access = accessRows.find((x) => x.institutionId === user.institutionId);

  if (accessLoading || institutionsLoading) return <div className="bdi-page"><div className="bdi-page-inner"><div style={{ padding: 24, color: "#5F6368" }}>กำลังตรวจสอบสิทธิ์สถาบัน…</div></div></div>;

  // institutionId is an internal key (e.g. INST-01), not the institution name.
  // Resolve the selected institution before deciding whether the KMITL map is available.
  const institution = institutions.find((x) => String(x.id) === String(user.institutionId));
  const institutionIdentity = `${institution?.name || user.institutionName || ""} ${institution?.shortName || ""} ${institution?.id || user.institutionId || ""}`;
  const hasKmitlMap = /KMITL|สจล|ลาดกระบัง/i.test(institutionIdentity);

  if (!hasKmitlMap) {
    return <div className="bdi-page"><div className="bdi-page-inner"><Card><b style={{ fontSize: 16 }}>ยังไม่มีข้อมูลสำหรับสถาบันนี้</b><div style={{ marginTop: 8, fontSize: 13, color: "#5F6368", lineHeight: 1.7 }}>ระบบยังไม่มีข้อมูลของสถาบันนี้</div></Card></div></div>;
  }

  if (access && access.accessStatus && access.accessStatus !== "active") {
    const paused = access.accessStatus === "paused";
    return (
      <div className="bdi-page"><div className="bdi-page-inner">
        <Card>
          <b style={{ fontSize: 16, color: paused ? "#B06000" : "#D93025" }}>{paused ? "ระบบถูกหยุดชั่วคราว" : "สิทธิ์การใช้งานถูกระงับ"}</b>
          <div style={{ marginTop: 8, fontSize: 13, color: "#5F6368", lineHeight: 1.7 }}>สถาบัน {user.institutionName || user.institutionId} ไม่สามารถใช้งานระบบได้ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบหรือฝ่ายการตลาดของสถาบัน</div>
        </Card>
      </div></div>
    );
  }

  return (
    <>
      {/* แผนที่ mount ค้างไว้เสมอ กันโหลด Leaflet ใหม่ทุกครั้งที่สลับแท็บ */}
      <div style={{ position: "absolute", inset: 0, visibility: tab === "map" ? "visible" : "hidden" }}>
        <MapView 
          apiRef={mapApi} 
          viewMode={viewMode} 
          user={user}
          publishedOnly={true} />
      </div>
      {tab === "events" ? <EventsPage user={user} mapApi={mapApi} onOpenMap={() => onTabChange?.("map")} /> : null}
      {tab === "notifications" ? <NotificationsPage user={user} /> : null}
      {tab === "feedback" ? <FeedbackPage user={user} /> : null}
      {tab === "requests" ? <MyRequests user={user} /> : null}
    </>
  );
}

// ── กิจกรรมที่สนใจเข้าร่วม ─────────────────────
function EventsPage({ user, mapApi, onOpenMap }) {
  const { items: events } = useCollection("events");
  const { items: cats } = useCollection("categories");
  const { items: news } = useCollection("news");
  const { items: interest, create, destroy } = useCollection("eventInterest");

  const open = events.filter((e) => e.published && eventState(e) !== "ended");
  const mine = interest.filter((i) => i.userId === user.id);
  const isInterested = (id) => mine.find((i) => i.eventId === id);
  const liveNews = news.filter((n) => newsState(n) === "live");

  const openEventOnMap = (ev) => {
    onOpenMap?.();
    // MapView remains mounted while tabs change; wait one frame so Leaflet becomes visible before focusing.
    setTimeout(() => mapApi?.current?.openEvent?.(ev), 80);
  };

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
          <Card key={`${i.userId}:${i.eventId}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div>
                <b style={{ fontSize: 14, color: "#188038" }}>{ev.name}</b>
                <button type="button" onClick={() => openEventOnMap(ev)} title="เปิดตำแหน่งกิจกรรมบนแผนที่" style={{ display: "block", marginTop: 3, padding: 0, border: 0, background: "transparent", color: "#1A73E8", fontSize: 11.5, cursor: "pointer", textAlign: "left", textDecoration: "underline" }}>{fmt(ev.startAt)} · 📍 {ev.placeName}</button>
              </div>
              <Btn kind="danger" onClick={() => destroy({ userId: i.userId, eventId: i.eventId }, user)}>ยกเลิก</Btn>
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
              {fmt(ev.startAt)} — {fmt(ev.endAt)}<br />
              <button type="button" onClick={() => openEventOnMap(ev)} title="เปิดตำแหน่งกิจกรรมบนแผนที่" style={{ padding: 0, border: 0, background: "transparent", color: "#1A73E8", fontSize: "inherit", cursor: "pointer", textAlign: "left", textDecoration: "underline" }}>📍 {ev.placeName || "ไม่ระบุสถานที่"}</button>
            </div>
            <div style={{ marginTop: 10 }}>
              {on
                ? <Btn kind="ghost" onClick={() => destroy({ userId: on.userId, eventId: on.eventId }, user)}>✓ บันทึกแล้ว — กดเพื่อยกเลิก</Btn>
                : <Btn kind="primary" onClick={() => create({ eventId: ev.id, userId: user.id }, user)}>สนใจเข้าร่วม</Btn>}
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

// ── ศูนย์รวมการแจ้งเตือน: ประกาศระบบ / กิจกรรม / ข่าวสารจากประชาสัมพันธ์ ──
const NOTI_KINDS = {
  system: { label: "ประกาศแจ้งเตือนจากระบบ", icon: "notification", color: "#D93025", bg: "#FCE8E6" },
  event: { label: "ประกาศกิจกรรม", icon: "bullhorn", color: "#1A73E8", bg: "#E8F0FE" },
  news: { label: "ข่าวสารจากฝ่ายประชาสัมพันธ์", icon: "news", color: "#188038", bg: "#E6F4EA" },
};

function NotificationsPage({ user }) {
  const { items: notifications } = useCollection("notifications");
  const { items: broadcasts } = useCollection("broadcasts");
  const { items: events } = useCollection("events");
  const { items: news } = useCollection("news");
  const [filter, setFilter] = useState("all");

  // รวมประกาศทั้งสามแหล่งเป็นสายเดียว เรียงตามเวลาใหม่สุดก่อน
  const feed = useMemo(() => {
    const out = [];

    // ประกาศจากฝ่ายการตลาดที่ส่งจริงจะถูกสร้างเป็น notification รายผู้ใช้
    // จึงแสดงจาก notifications เป็นหลัก เพื่อให้เป็นการแจ้งเตือนของผู้ใช้จริง
    const notifiedBroadcastIds = new Set();
    for (const n of notifications) {
      if (n.userId !== user.id || n.kind !== "system") continue;
      const b = n.broadcastId ? broadcasts.find((x) => x.id === n.broadcastId) : null;
      const at = n.createdAt || b?.sendAt || b?.sentAt || b?.createdAt;
      const t = new Date(at || "").getTime();
      if (Number.isFinite(t) && t > Date.now()) continue;
      if (b) notifiedBroadcastIds.add(b.id);
      out.push({
        id: n.id,
        kind: "system",
        title: n.title,
        body: n.body,
        at,
        meta: `ถึง ${b?.audience || "ทุกมหาวิทยาลัย"}`,
      });
    }

    // รองรับประกาศเก่าที่มีอยู่ก่อนระบบ notification รายผู้ใช้
    // โดยจะไม่แสดงซ้ำกับ notification ที่สร้างจากประกาศนั้นแล้ว
    for (const b of broadcasts) {
      if (notifiedBroadcastIds.has(b.id)) continue;
      if (b.audience && b.audience !== "ทุกมหาวิทยาลัย" && b.audience !== (user.institutionName || user.institutionId)) continue;
      const at = b.sendAt || b.sentAt || b.createdAt;
      const t = new Date(at || "").getTime();
      if (Number.isFinite(t) && t > Date.now()) continue;
      out.push({ id: b.id, kind: "system", title: b.title, body: b.body, at, meta: `ถึง ${b.audience || "ทุกมหาวิทยาลัย"}` });
    }
    for (const ev of events) {
      if (!ev.published) continue;
      const state = eventState(ev);
      if (state === "ended") continue;
      out.push({
        id: ev.id, kind: "event", title: ev.name, body: ev.detail,
        at: ev.createdAt,
        meta: `${fmt(ev.startAt)} · ${ev.placeName || "ไม่ระบุสถานที่"}`,
        badge: EVENT_STATE_LABEL[state],
      });
    }
    for (const n of news) {
      if (newsState(n) !== "live") continue;
      out.push({ id: n.id, kind: "news", title: n.title, body: n.body, at: n.publishAt || n.createdAt, meta: `เผยแพร่ ${fmt(n.publishAt)}` });
    }

    return out.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }, [notifications, broadcasts, events, news, user.id, user.institutionName, user.institutionId]);

  const rows = feed.filter((f) => filter === "all" || f.kind === filter);
  const countOf = (k) => feed.filter((f) => f.kind === k).length;

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
      <UCHead title="การแจ้งเตือน" desc="ประกาศจากระบบ กิจกรรม และข่าวสารจากฝ่ายประชาสัมพันธ์ รวมไว้ที่เดียว" />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[["all", "ทั้งหมด", feed.length], ...Object.entries(NOTI_KINDS).map(([k, v]) => [k, v.label, countOf(k)])].map(([k, label, n]) => {
          const on = filter === k;
          const cfg = NOTI_KINDS[k];
          return (
            <button key={k} onClick={() => setFilter(k)}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid", borderColor: on ? (cfg?.color || "#1A73E8") : "#DADCE0",
                background: on ? (cfg?.bg || "#E8F0FE") : "#fff", color: on ? (cfg?.color || "#5F6368") : "#5F6368",
                borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              {cfg ? <Icon name={cfg.icon} size={14} color={on ? cfg.color : "#5F6368"} /> : null}
              {label} ({n})
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่มีการแจ้งเตือน</div> : null}

      {rows.map((f) => {
        const cfg = NOTI_KINDS[f.kind];
        return (
          <Card key={f.kind + f.id}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: cfg.bg, display: "grid", placeItems: "center" }}>
                <Icon name={cfg.icon} size={19} color={cfg.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill color={cfg.color} bg={cfg.bg}>{cfg.label}</Pill>
                  {f.badge ? <Pill>{f.badge}</Pill> : null}
                </div>
                <b style={{ display: "block", fontSize: 14.5, color: "#202124", marginTop: 6 }}>{f.title}</b>
                <div style={{ fontSize: 13, color: "#3C4043", marginTop: 4 }}>{f.body}</div>
                <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 7 }}>{f.meta}{f.at ? ` · ${formatDateTime(f.at)}` : ""}</div>
              </div>
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

// ── รายการคำร้องที่ส่งไป ───────────
const REQUEST_FIELD_LABEL = {
  name: "ชื่อสถานที่",
  type: "ประเภท",
  capacity: "ความจุ (คน)",
  teacher: "อาจารย์ประจำห้อง",
};

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

// ขั้นตอนที่ผู้ใช้เห็น (ไม่เปิดเผยว่าใครเป็นผู้ดำเนินการ)
function requestSteps(status, times = {}) {
  // คำร้องที่ถูกยกเลิก (เช่น บัญชีถูกระงับ) ไม่เคยผ่านขั้นตรวจสอบ → ไม่แสดงขั้น "รอการตรวจสอบ" คั่น
  if (status === "cancelled") {
    return [
      { label: "ส่งคำร้องแล้ว", state: "done", time: times.submitted },
      { label: "ยกเลิกแล้ว", state: "fail", time: times.decided },
    ];
  }
  const decided = status === "approved" || status === "rejected";
  const inProgress = status === "pending" || status === "processing";
  const failed = status === "rejected" || status === "cancelled";
  return [
    { label: "ส่งคำร้องแล้ว", state: "done", time: times.submitted },
    {
      label: status === "processing"
        ? "รับเรื่องแล้ว กำลังดำเนินการ"
        : decided && times.received ? "รับเรื่องและตรวจสอบแล้ว" : "รอการตรวจสอบ",
      state: decided ? "done" : inProgress ? "active" : "idle",
      time: times.received,
    },
    {
      label: status === "approved" ? "อนุมัติ" : status === "rejected" ? "ไม่อนุมัติ" : status === "cancelled" ? "ยกเลิกแล้ว" : "ผลการพิจารณา",
      state: decided || status === "cancelled" ? (failed ? "fail" : "done") : "idle",
      time: times.decided,
    },
  ];
}

// เวลาของแต่ละขั้น: ดึงจากประวัติการเปลี่ยนสถานะ (editLogs) ถ้าไม่มีใช้ reviewedAt ของคำร้องแทน
function requestStepTimes(request, editLogs = []) {
  const FINAL = ["approved", "rejected", "cancelled"];
  const stages = [];
  for (const l of editLogs) {
    if (l.requestId !== request.id) continue;
    const st = parseJson(l.after)?.status;
    if (st) stages.push({ status: st, at: l.editedAt });
  }
  stages.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const received = stages.find((s) => s.status === "processing")?.at
    || (request.status === "processing" ? request.reviewedAt : null);
  const decidedAt = [...stages].reverse().find((s) => FINAL.includes(s.status))?.at
    || request.reviewedAt;
  return {
    submitted: request.createdAt,
    received: received || null,
    decided: FINAL.includes(request.status) ? decidedAt || null : null,
  };
}

function RequestProgress({ status, times }) {
  const COLORS = { done: "#188038", active: "#1A73E8", fail: "#D93025", idle: "#BDC1C6" };
  const MARK = { done: "✓", fail: "✕", idle: "" };
  const steps = requestSteps(status, times);
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", boxSizing: "border-box", flex: "none",
              background: s.state === "idle" ? "#fff" : COLORS[s.state],
              border: `2px solid ${COLORS[s.state]}`,
              color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {s.state === "active"
                ? <span style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                : MARK[s.state]}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, flex: 1, minHeight: 16, background: s.state === "done" ? COLORS.done : "#E8EAED" }} />
            )}
          </div>
          <div style={{ paddingBottom: 14 }}>
            <div style={{
              fontSize: 13.5,
              fontWeight: s.state === "active" ? 800 : 600,
              color: s.state === "idle" ? "#80868B" : "#202124",
            }}>{s.label}</div>
            {s.time ? (
              <div style={{ fontSize: 11.5, color: "#80868B", marginTop: 2 }}>{formatDateTime(s.time)}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function MyRequestDetail({ request, roomName, onBack }) {
  const before = parseJson(request.before);
  const after = parseJson(request.after);
  const approved = request.status === "approved";
  const decided = approved || request.status === "rejected";
  const { items: editLogs } = useCollection("editLogs");
  const times = requestStepTimes(request, editLogs);

  // แสดงเฉพาะช่องที่ขอแก้และค่าต่างจากของเดิม
  const changes = Object.keys(REQUEST_FIELD_LABEL).filter((k) =>
    after[k] !== undefined && after[k] !== null && String(after[k]) !== "" &&
    String(after[k]) !== String(before[k] ?? "")
  );

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Btn kind="ghost" onClick={onBack}>กลับ</Btn>
          <h2 style={{ margin: 0, fontSize: 18 }}>รายละเอียดคำร้อง</h2>
        </div>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 15 }}>{request.subject || request.type}</b>
            <Status value={request.status} />
          </div>
          <div style={{ fontSize: 12, color: "#5F6368", marginTop: 6 }}>
            {request.id} · ส่งเมื่อ {formatDateTime(request.createdAt)}
          </div>
          {roomName ? (
            <div style={{ fontSize: 13, marginTop: 8 }}><b>สถานที่:</b> {roomName}</div>
          ) : null}
          {request.detail ? (
            <div style={{ fontSize: 13, marginTop: 8 }}><b>รายละเอียดที่แจ้ง:</b> {request.detail}</div>
          ) : null}
        </Card>

        <Card>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>ความคืบหน้า</div>
          <RequestProgress status={request.status} times={times} />
          {decided && request.note ? (
            <div style={{ fontSize: 13, color: "#3C4043", marginTop: 8 }}>
              <b>เหตุผลจากผู้พิจารณา:</b> {request.note}
            </div>
          ) : null}
        </Card>

        {changes.length > 0 && (
          <Card>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
              {approved ? "ข้อมูลที่ได้รับการแก้ไข" : "ข้อมูลที่คุณขอแก้ไข"}
            </div>
            <div style={{ border: "1px solid #DADCE0", borderRadius: 10, overflow: "hidden", fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#F8F9FA", fontWeight: 800 }}>
                <div style={{ padding: 10 }}>หัวข้อ</div>
                <div style={{ padding: 10 }}>ข้อมูลเดิม</div>
                <div style={{ padding: 10 }}>{approved ? "ข้อมูลใหม่" : "ที่ขอแก้ไข"}</div>
              </div>
              {changes.map((k) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #E8EAED" }}>
                  <div style={{ padding: 10, color: "#5F6368" }}>{REQUEST_FIELD_LABEL[k]}</div>
                  <div style={{ padding: 10 }}>{String(before[k] ?? "") || "-"}</div>
                  <div style={{ padding: 10, fontWeight: 700 }}>{String(after[k])}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MyRequests({ user }) {
  const { items: requests } = useCollection("requests");
  const { items: rooms } = useCollection("rooms");
  const { items: quotaItems } = useCollection("requestQuota");
  const [selectedId, setSelectedId] = useState(null);

  const mine = requests
    .filter((r) => r.userId === user.id)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  // โควต้าคงเหลือ (นับเหมือน backend: ไม่รวมที่ยกเลิก, ตามเวลาไทย)
  const dailyLimit = quotaItems[0]?.perUserPerDay ?? 3;
  const monthlyLimit = quotaItems[0]?.perUserPerMonth ?? 20;
  const counted = mine.filter((r) => r.status !== "cancelled");
  const dailyLeft = Math.max(0, dailyLimit - counted.filter((r) => dayKey(r.createdAt) === todayKey()).length);
  const monthlyLeft = Math.max(0, monthlyLimit - counted.filter((r) => monthKey(r.createdAt) === monthKey()).length);

  const selected = mine.find((r) => r.id === selectedId);
  if (selected) {
    const room = rooms.find((x) => x.id === selected.roomId);
    return (
      <MyRequestDetail
        request={selected}
        roomName={room?.name || ""}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
      <UCHead title="การส่งคำร้อง" desc="ตรวจสอบสถานะและรายละเอียดคำร้องที่คุณส่ง" />
        <div style={{
          display: "inline-block",
          fontSize: 12,
          fontWeight: 700,
          padding: "4px 10px",
          borderRadius: 999,
          margin: "-4px 0 12px",
          background: dailyLeft > 0 && monthlyLeft > 0 ? "#E8F0FE" : "#FDE8E7",
          color: dailyLeft > 0 && monthlyLeft > 0 ? "#1A73E8" : "#D93025"
        }}>
          {dailyLeft > 0 && monthlyLeft > 0
            ? `โควต้าคงเหลือ: วันนี้ ${dailyLeft}/${dailyLimit} ครั้ง · เดือนนี้ ${monthlyLeft}/${monthlyLimit} ครั้ง`
            : dailyLeft === 0
              ? `ส่งคำร้องครบ ${dailyLimit} ครั้งต่อวันแล้ว`
              : `ส่งคำร้องครบ ${monthlyLimit} ครั้งต่อเดือนแล้ว`}
        </div>

        {mine.length === 0 ? (
          <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่มีคำร้อง</div>
        ) : (
          mine.map((r) => (
            <Card key={r.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 14 }}>{r.subject || r.type}</b>
                <Status value={r.status} />
              </div>

              <div style={{ fontSize: 13, marginTop: 6 }}>{r.detail}</div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                <span style={{ fontSize: 11.5, color: "#5F6368" }}>
                  {formatDateTime(r.createdAt)} · {r.id}
                </span>
                <button
                  type="button"
                  className="sm-plain"
                  onClick={() => setSelectedId(r.id)}
                  style={{ background: "none", border: 0, padding: "4px 0 4px 8px", cursor: "pointer", fontSize: 12, color: "#1A73E8", fontWeight: 700 }}
                >ดูรายละเอียด ›</button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}