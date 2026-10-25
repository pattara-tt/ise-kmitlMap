"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Textarea, UCHead, useCollection } from "./ui";
import { dayKey, formatDateTime, monthKey, todayKey } from "../lib/datetime";

// Actor: ผู้ใช้งานทั่วไป — ส่งข้อเสนอแนะถึงผู้บริหาร (ตาราง feedback) และติดตามผล
// โครงหน้าเหมือน "คำร้องของฉัน": รายการ + โควต้า → ส่งใหม่ → รายละเอียด/ความคืบหน้า
// คำร้อง (requests) ไปที่ฝ่ายทะเบียน/ดูแลระบบ ส่วนข้อเสนอแนะ (feedback) ไปที่ผู้บริหารโดยตรง

const EMPTY_FORM = { topic: "", detail: "" };

function FeedbackDetail({ item, onBack }) {
  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Btn kind="ghost" onClick={onBack}>กลับ</Btn>
          <h2 style={{ margin: 0, fontSize: 18 }}>รายละเอียดข้อเสนอแนะ</h2>
        </div>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b style={{ fontSize: 15 }}>{item.topic}</b>
          </div>
          <div style={{ fontSize: 12, color: "#5F6368", marginTop: 6 }}>
            {item.id} · ส่งเมื่อ {formatDateTime(item.createdAt)}
          </div>
          {item.detail ? (
            <div style={{ fontSize: 13, marginTop: 8 }}><b>รายละเอียดที่ส่ง:</b> {item.detail}</div>
          ) : null}
        </Card>

      </div>
    </div>
  );
}

export default function FeedbackPage({ user }) {
  const { items, create } = useCollection("feedback");
  const { items: quotaItems } = useCollection("requestQuota");
  const [view, setView] = useState("list");          // list | new
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const mine = items
    .filter((f) => f.userId === user.id)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  // โควต้าใช้ค่าเดียวกับคำร้อง (ตั้งโดยฝ่ายดูแลระบบ) — หน้านี้แสดงและกันการส่งเกินฝั่งหน้าเว็บ
  const dailyLimit = quotaItems[0]?.perUserPerDay ?? 3;
  const monthlyLimit = quotaItems[0]?.perUserPerMonth ?? 20;
  const dailyLeft = Math.max(0, dailyLimit - mine.filter((f) => dayKey(f.createdAt) === todayKey()).length);
  const monthlyLeft = Math.max(0, monthlyLimit - mine.filter((f) => monthKey(f.createdAt) === monthKey()).length);
  const canSend = dailyLeft > 0 && monthlyLeft > 0;

  const selected = mine.find((f) => f.id === selectedId);
  if (selected) return <FeedbackDetail item={selected} onBack={() => setSelectedId(null)} />;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    if (!form.topic.trim() || !form.detail.trim()) {
      setStatus({ type: "error", message: "กรุณากรอกหัวข้อและรายละเอียด" });
      return;
    }
    if (!canSend) {
      setStatus({ type: "error", message: dailyLeft === 0 ? `ส่งข้อเสนอแนะครบ ${dailyLimit} ครั้งต่อวันแล้ว` : `ส่งข้อเสนอแนะครบ ${monthlyLimit} ครั้งต่อเดือนแล้ว` });
      return;
    }
    try {
      setSubmitting(true);
      const created = await create({
        topic: form.topic.trim(), detail: form.detail.trim(),
        userId: user.id,
      }, user);
      setForm(EMPTY_FORM);
      setView("list");
      setStatus({ type: "success", message: `ส่งข้อเสนอแนะเรียบร้อย เลขที่ ${created?.id || ""}`.trim() });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSubmitting(false);
    }
  }

  const pill = (
    <div style={{
      display: "inline-block", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, margin: "-4px 0 12px",
      background: canSend ? "#E8F0FE" : "#FDE8E7", color: canSend ? "#1A73E8" : "#D93025",
    }}>
      {canSend
        ? `โควต้าคงเหลือ: วันนี้ ${dailyLeft}/${dailyLimit} ครั้ง · เดือนนี้ ${monthlyLeft}/${monthlyLimit} ครั้ง`
        : dailyLeft === 0
          ? `ส่งข้อเสนอแนะครบ ${dailyLimit} ครั้งต่อวันแล้ว`
          : `ส่งข้อเสนอแนะครบ ${monthlyLimit} ครั้งต่อเดือนแล้ว`}
    </div>
  );

  const message = status.message ? (
    <div style={{
      fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, marginBottom: 12,
      background: status.type === "error" ? "#FDE8E7" : "#E6F4EA", color: status.type === "error" ? "#D93025" : "#188038",
    }}>{status.message}</div>
  ) : null;

  if (view === "new") {
    return (
      <div className="bdi-page">
        <div className="bdi-page-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Btn kind="ghost" onClick={() => { setView("list"); setStatus({ type: "", message: "" }); }}>กลับ</Btn>
            <h2 style={{ margin: 0, fontSize: 18 }}>ส่งข้อเสนอแนะถึงผู้บริหาร</h2>
          </div>
          {pill}
          {message}
          <form onSubmit={handleSubmit}>
            <Card>
              <div style={{ fontSize: 12.5, color: "#5F6368", marginBottom: 10 }}>
                ข้อเสนอแนะหรือคำขอฟีเจอร์ใหม่ของคุณจะถูกส่งถึงฝ่ายบริหารโดยตรง
                (หากต้องการแจ้งแก้ไขข้อมูลสถานที่บนแผนที่ ให้ใช้คำร้องแทน)
              </div>
              <Field label="ชื่อผู้ส่ง">
                <Input value={user.name || user.email || ""} readOnly />
              </Field>
              <Field label="หัวข้อ">
                <Input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="เช่น อยากให้ค้นหาด้วยรหัสวิชาได้" />
              </Field>
              <Field label="รายละเอียด">
                <Textarea value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} placeholder="อธิบายข้อเสนอแนะ คำขอฟีเจอร์ หรือปัญหาที่พบ" />
              </Field>
              <Btn type="submit" disabled={submitting || !canSend}>{submitting ? "กำลังส่ง…" : "ส่งข้อเสนอแนะ"}</Btn>
            </Card>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bdi-page">
      <div className="bdi-page-inner">
        <UCHead title="ข้อเสนอแนะของฉัน" desc="ส่งข้อเสนอแนะถึงผู้บริหาร และติดตามผลการพิจารณา" />
        {pill}
        {message}
        <div style={{ marginBottom: 12 }}>
          <Btn onClick={() => { setStatus({ type: "", message: "" }); setView("new"); }}>+ ส่งข้อเสนอแนะ</Btn>
        </div>

        {mine.length === 0 ? (
          <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่มีข้อเสนอแนะที่ส่งไป</div>
        ) : (
          mine.map((f) => (
            <Card key={f.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b style={{ fontSize: 14 }}>{f.topic}</b>
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{f.detail}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                <span style={{ fontSize: 11.5, color: "#5F6368" }}>{formatDateTime(f.createdAt)} · {f.id}</span>
                <button
                  type="button"
                  className="sm-plain"
                  onClick={() => setSelectedId(f.id)}
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
