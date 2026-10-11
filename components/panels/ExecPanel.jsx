"use client";

import { useEffect, useState } from "react";
import { BarChart, Card, Pill, SearchBar, Status, Table, Tiles, UCHead, useCollection, useStats } from "../ui";
import { apiFetch } from "../../lib/api";
import { formatDateTime } from "../../lib/datetime";
import { contractDaysLeft, datePart } from "./marketing/shared";

// Actor: บริหาร — สถิติภาพรวม · ข้อเสนอแนะจากผู้ใช้ · คำร้องจากผู้ใช้ · สถิติการค้นหา · ตรวจสอบสัญญาบริการ · ประวัติแก้ไขข้อมูลแผนที่
export default function ExecPanel({ uc, user }) {
  if (uc === "overview") return <Overview />;
  if (uc === "feedback") return <Feedback />;
  if (uc === "exec_requests") return <Requests />;
  if (uc === "search_stats") return <SearchStats />;
  if (uc === "contracts") return <Contracts user={user} />;
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
      <UCHead title="ดูรายงานและสถิติภาพรวมระบบ" desc="ภาพรวมการใช้งาน SciMap ประจำเดือนล่าสุด และแนวโน้มย้อนหลัง 6 เดือน" />
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
        <div style={{ fontSize: 11.5, color: "#5F6368" }}>หน่วย: ครั้ง/คน ต่อเดือน{stats.usage.length ? ` (${stats.usage[0].month} ถึง ${stats.usage[stats.usage.length - 1].month})` : ""}</div>
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

function Feedback() {
  const { items } = useCollection("feedback");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  // ข้อเสนอแนะที่ผู้ใช้ส่งใหม่มีสถานะ "open" ส่วน seed เดิมใช้ "new" — ถือเป็นสถานะ "ยังไม่ได้ตรวจ" เหมือนกัน
  const isNew = (f) => f.status === "new" || f.status === "open";
  const rows = items.filter((f) =>
    (filter === "all" || (filter === "new" ? isNew(f) : f.status === filter)) &&
    `${f.topic} ${f.detail} ${f.userName ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <UCHead title="ตรวจสอบข้อเสนอแนะจากผู้ใช้งานทั่วไป" desc="ดูข้อเสนอแนะที่ผู้ใช้งานทั่วไปส่งเข้ามา (ดูได้อย่างเดียว)" />
      <Tiles items={[
        { label: "ทั้งหมด", value: items.length },
        { label: "ยังไม่ได้ตรวจ", value: items.filter(isNew).length },
        { label: "ตรวจแล้ว", value: items.filter((f) => f.status === "reviewed").length },
      ]} />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาหัวข้อ / เนื้อหา / ผู้ส่ง" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[["all", "ทั้งหมด"], ["new", "ยังไม่ได้ตรวจ"], ["reviewed", "ตรวจแล้ว"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ border: "1px solid", borderColor: filter === k ? "#1A73E8" : "#DADCE0", background: filter === k ? "#E8F0FE" : "#fff",
              color: filter === k ? "#1A73E8" : "#5F6368", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ไม่พบข้อเสนอแนะตามเงื่อนไข</div> : null}
      {rows.map((f) => (
        <Card key={f.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14.5, color: "#202124" }}>{f.topic}</b>
            <Status value={f.status} />
          </div>
          <div style={{ fontSize: 13, color: "#3C4043", marginTop: 6 }}>{f.detail}</div>
          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 8 }}>โดย {f.userName} · {formatDateTime(f.createdAt)} · {f.id}</div>
          {f.reply ? <div style={{ fontSize: 12.5, color: "#188038", marginTop: 6 }}>ผลการพิจารณา: {f.reply}</div> : null}
        </Card>
      ))}
    </>
  );
}

const REQUEST_STATUSES = [["pending", "รอพิจารณา"], ["processing", "กำลังดำเนินการ"], ["approved", "อนุมัติ"], ["rejected", "ไม่อนุมัติ"], ["cancelled", "ยกเลิก"]];

// คำร้องแก้ไขข้อมูลแผนที่จากผู้ใช้ (ตาราง requests) — แยกจากข้อเสนอแนะ (ตาราง feedback)
function Requests() {
  const { items } = useCollection("requests");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = items.filter((r) =>
    (filter === "all" || r.status === filter) &&
    `${r.subject} ${r.detail ?? ""} ${r.userName ?? ""} ${r.id}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <UCHead title="ตรวจสอบคำร้องจากผู้ใช้งานทั่วไป" desc="ดูคำร้องขอแก้ไขข้อมูลบนแผนที่ที่ผู้ใช้งานทั่วไปส่งเข้ามาและสถานะการดำเนินการ (ดูได้อย่างเดียว)" />
      <Tiles items={[
        { label: "ทั้งหมด", value: items.length },
        ...REQUEST_STATUSES.map(([k, label]) => ({ label, value: items.filter((r) => r.status === k).length })),
      ]} />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาเรื่อง / รายละเอียด / ผู้ส่ง / รหัสคำร้อง" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[["all", "ทั้งหมด"], ...REQUEST_STATUSES].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ border: "1px solid", borderColor: filter === k ? "#1A73E8" : "#DADCE0", background: filter === k ? "#E8F0FE" : "#fff",
              color: filter === k ? "#1A73E8" : "#5F6368", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ไม่พบคำร้องตามเงื่อนไข</div> : null}
      {rows.map((r) => (
        <Card key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 14.5, color: "#202124" }}>{r.subject}</b>
            <Status value={r.status} />
          </div>
          {r.detail ? <div style={{ fontSize: 13, color: "#3C4043", marginTop: 6 }}>{r.detail}</div> : null}
          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 8 }}>โดย {r.userName ?? "-"} · {formatDateTime(r.createdAt)} · {r.id}</div>
          {r.note ? <div style={{ fontSize: 12.5, color: "#188038", marginTop: 6 }}>ผลการพิจารณา: {r.note}</div> : null}
        </Card>
      ))}
    </>
  );
}

// ข้อมูลตัวอย่าง (placeholder) — ใช้แสดงเฉพาะเมื่อตาราง search_logs ยังไม่มีข้อมูลจริง
const SAMPLE_SEARCHES = [
  { place: "อาคาร Sc8 (คณะวิศวกรรมศาสตร์นานาชาติ)", searches: 214, navigations: 96 },
  { place: "ห้องสมุดกลาง", searches: 187, navigations: 81 },
  { place: "โรงอาหารกลาง", searches: 162, navigations: 70 },
  { place: "ห้องน้ำ (ทุกอาคาร)", searches: 139, navigations: 52 },
  { place: "อาคารคณะเทคโนโลยีสารสนเทศ", searches: 118, navigations: 47 },
  { place: "Coworking Space KDAI", searches: 96, navigations: 33 },
  { place: "ลานหน้าอาคาร Sc8", searches: 74, navigations: 21 },
  { place: "ห้อง 107 ชั้น 1 อาคาร Sc8", searches: 58, navigations: 17 },
];
const SEARCH_RANGES = [[7, "7 วันล่าสุด"], [30, "30 วันล่าสุด"], [0, "ทั้งหมด"]];

function SearchStats() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);     // null = กำลังโหลด
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setData(null); setError("");
    apiFetch(`/api/stats/searches?days=${days}`)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || "โหลดข้อมูลไม่สำเร็จ"); });
    return () => { alive = false; };
  }, [days]);

  const header = <UCHead title="สถิติการค้นหาอาคารและจุดสนใจ" desc="อันดับอาคารและจุดสนใจที่ผู้ใช้งานค้นหาบ่อยที่สุด เพื่อใช้วางแผนบริหารและปรับปรุงพื้นที่" />;
  if (error) return <>{header}<div style={{ color: "#D93025", fontSize: 13 }}>{error}</div></>;
  if (!data) return <>{header}<div style={{ color: "#5F6368", fontSize: 13 }}>กำลังโหลดข้อมูล…</div></>;

  const isSample = data.total === 0;
  const rows = isSample ? SAMPLE_SEARCHES : data.places;
  const totalSearches = rows.reduce((n, r) => n + r.searches, 0);
  const totalNav = rows.reduce((n, r) => n + r.navigations, 0);
  const max = Math.max(1, ...rows.map((r) => r.searches));

  return (
    <>
      {header}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {SEARCH_RANGES.map(([d, label]) => (
          <button key={d} onClick={() => setDays(d)}
            style={{ border: "1px solid", borderColor: days === d ? "#1A73E8" : "#DADCE0", background: days === d ? "#E8F0FE" : "#fff",
              color: days === d ? "#1A73E8" : "#5F6368", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>
      {isSample ? (
        <Card>
          <Pill color="#B06000" bg="#FEF7E0">ข้อมูลตัวอย่าง</Pill>
          <span style={{ fontSize: 12.5, color: "#5F6368", marginLeft: 8 }}>ยังไม่มีประวัติการค้นหาในช่วงเวลานี้ ตัวเลขด้านล่างเป็นค่าตัวอย่างสำหรับแสดงรูปแบบรายงาน</span>
        </Card>
      ) : null}
      <Tiles items={[
        { label: isSample ? "การค้นหาทั้งหมด (ตัวอย่าง)" : "การค้นหาทั้งหมด", value: totalSearches.toLocaleString() },
        { label: "เริ่มนำทาง", value: totalNav.toLocaleString() },
        { label: "จำนวนสถานที่ที่ถูกค้นหา", value: rows.length },
        { label: "ค้นหามากที่สุด", value: rows[0]?.place.split(" (")[0] ?? "-" },
      ]} />
      <Table
        columns={[
          { key: "rank", label: "อันดับ", render: (r) => rows.indexOf(r) + 1 },
          { key: "place", label: "อาคาร / จุดสนใจ" },
          { key: "searches", label: "จำนวนการค้นหา", render: (r) => r.searches.toLocaleString() },
          { key: "navigations", label: "เริ่มนำทาง", render: (r) => r.navigations.toLocaleString() },
          {
            key: "share", label: "สัดส่วน",
            render: (r) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
                <div style={{ flex: 1, height: 8, background: "#F1F3F4", borderRadius: 999 }}>
                  <div style={{ width: `${(r.searches / max) * 100}%`, height: "100%", background: "#1A73E8", borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11.5, color: "#5F6368" }}>{totalSearches ? ((r.searches / totalSearches) * 100).toFixed(0) : 0}%</span>
              </div>
            ),
          },
        ]}
        rows={rows}
        empty="ยังไม่มีประวัติการค้นหา"
      />
    </>
  );
}

function Contracts({ user }) {
  const { items } = useCollection("contracts");

  const rows = items
    .filter((c) => c.institutionId === user?.institutionId)
    .map((c) => ({ ...c, left: contractDaysLeft(c.endDate) }))
    .sort((a, b) => (a.left ?? Infinity) - (b.left ?? Infinity));

  return (
    <>
      <UCHead
        title="ตรวจสอบสัญญา"
        desc="แสดงข้อมูลสัญญาของมหาวิทยาลัยตนเองเท่านั้น"
      />
      <Table
        columns={[
          { key: "plan", label: "ประเภทการใช้งาน" },
          { key: "endDate", label: "วันสิ้นอายุสัญญา", render: (c) => datePart(c.endDate) || "-" },
          {
            key: "left", label: "ระยะคงเหลือสัญญา",
            render: (c) => c.left === null
              ? <Pill>ไม่ระบุวันสิ้นสุด</Pill>
              : c.left < 0
                ? <Pill color="#D93025" bg="#FCE8E6">หมดอายุ {Math.abs(c.left)} วัน</Pill>
                : c.left <= 30
                  ? <Pill color="#B06000" bg="#FEF7E0">เหลือ {c.left} วัน</Pill>
                  : <Pill color="#188038" bg="#E6F4EA">เหลือ {c.left} วัน</Pill>,
          },
          { key: "status", label: "สถานะ", render: (c) => <Status value={c.status} /> },
        ]}
        rows={rows}
        empty="ไม่พบข้อมูลสัญญาของมหาวิทยาลัยนี้"
      />
    </>
  );
}

// ── แปลงค่า before/after ของ edit log (เก็บเป็น JSON ทั้งแถว) ให้อ่านง่าย ──
const ENTITY_LABEL = {
  nodes: "จุดนำทาง", edges: "เส้นทาง", floors: "ชั้น", rooms: "ห้อง", mapBoundaries: "ขอบเขตแผนผัง", mapAssets: "ข้อมูลประกอบแผนผัง",
  news: "ข่าวสาร", events: "กิจกรรม", categories: "หมวดหมู่", broadcasts: "ประกาศ", requestQuota: "โควตาคำร้อง", requests: "คำร้อง", feedback: "ข้อเสนอแนะ",
};
const VERB_LABEL = { CREATE: "เพิ่ม", UPDATE: "แก้ไข", DELETE: "ลบ" };
const FIELD_LABEL = {
  name: "ชื่อ", title: "หัวข้อ", code: "รหัส", type: "ประเภท", status: "สถานะ", subject: "เรื่อง", detail: "รายละเอียด", body: "เนื้อหา",
  capacity: "ความจุ", teacher: "อาจารย์", published: "เผยแพร่", startAt: "เริ่ม", endAt: "สิ้นสุด", publishAt: "เริ่มเผยแพร่", expireAt: "หมดอายุ",
  placeName: "สถานที่", audience: "กลุ่มเป้าหมาย", reply: "ตอบกลับ", note: "หมายเหตุ", color: "สี", kind: "ชนิด", floorNo: "ชั้นที่",
  x: "พิกัด X", y: "พิกัด Y", distance: "ระยะทาง", accessible: "เข้าถึงได้", perUserPerDay: "ต่อวัน", perUserPerMonth: "ต่อเดือน",
};
const SUMMARY_KEYS = ["name", "title", "subject", "code", "type", "status"];   // ฟิลด์ที่เลือกแสดงตอนเพิ่ม/ลบ
const SKIP_KEYS = new Set(["id", "createdAt", "updatedAt", "editedAt", "savedAt", "userId", "authorId", "reviewedBy", "updatedBy", "sentBy"]);
const BULKY_KEYS = new Set(["svg", "geometry", "outline", "bounds", "file"]);   // ข้อมูลก้อนใหญ่ แสดงแค่ว่ามีการเปลี่ยน

function parseLogValue(v) {
  if (v == null || v === "") return null;
  if (typeof v === "object") return v;
  const t = String(v).trim();
  if (!t.startsWith("{")) return null;
  try { const o = JSON.parse(t); return o && typeof o === "object" ? o : null; } catch { return null; }
}
const showVal = (v) => (v === null || v === undefined || v === "" ? "-" : typeof v === "boolean" ? (v ? "ใช่" : "ไม่") : typeof v === "object" ? "(ข้อมูลซับซ้อน)" : String(v));
const fieldName = (k) => FIELD_LABEL[k] || k;

function actionLabel(action) {
  const m = /^(CREATE|UPDATE|DELETE)_(.+)$/.exec(String(action || ""));
  return m ? `${VERB_LABEL[m[1]]}${ENTITY_LABEL[m[2]] || m[2]}` : action;
}

function changeSummary(r) {
  const before = parseLogValue(r.before);
  const after = parseLogValue(r.after);
  if (!before && !after) return r.after == null || r.after === "" ? "-" : String(r.after);   // ข้อความธรรมดา (เช่น ข้อมูล seed)
  if (before && after) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((k) => !SKIP_KEYS.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    if (!keys.length) return "ไม่มีการเปลี่ยนแปลงค่า";
    return keys.map((k) => BULKY_KEYS.has(k) ? `${fieldName(k)}: มีการแก้ไข` : `${fieldName(k)}: ${showVal(before[k])} → ${showVal(after[k])}`).join(" · ");
  }
  const row = after || before;
  const parts = SUMMARY_KEYS.filter((k) => row[k] != null && row[k] !== "").map((k) => `${fieldName(k)}: ${showVal(row[k])}`);
  return parts.length ? parts.join(" · ") : "-";
}

function Audit() {
  const { items } = useCollection("editLogs");
  const [q, setQ] = useState("");
  const rows = items.filter((r) =>
  [r.id, r.action, actionLabel(r.action), r.targetLabel, r.userName, changeSummary(r)]
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase()
    .includes(q.toLowerCase())
  );

  return (
    <>
      <UCHead title="ตรวจสอบบันทึกประวัติการแก้ไขข้อมูลแผนที่" desc="ระบบบันทึกอัตโนมัติทุกครั้งที่มีการเพิ่ม/แก้ไข/ลบข้อมูลแผนผัง ห้อง ชั้น หรือตำแหน่งกิจกรรม" />
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหา ID / ผู้แก้ไข / รายการที่ถูกแก้ไข" />
      <Table
        columns={[
          { key: "id", label: "ID" },
          { key: "editedAt", label: "เวลา", render: (r) => formatDateTime(r.editedAt) },
          { key: "userName", label: "ผู้แก้ไข" },
          { key: "action", label: "การกระทำ", render: (r) => actionLabel(r.action) },
          { key: "targetLabel", label: "รายการ" },
          {
            key: "after",
            label: "รายละเอียดการเปลี่ยนแปลง",
            render: (r) => <span style={{ color: "#5F6368" }}>{changeSummary(r)}</span>,
          },
        ]}
        rows={rows}
        empty="ยังไม่มีประวัติการแก้ไข"
      />
    </>
  );
}
