"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Select, Textarea, UCHead, useCollection } from "../../ui";
import { formatDateTime } from "../../../lib/datetime";

/* =========================================================
   UC-5 : ส่งข้อความแจ้งเตือน
========================================================= */

function Broadcast({
  user
}) {
  const {
    items,
    create
  } = useCollection("broadcasts");
  const {
    items: institutions
  } = useCollection("institutionAccess");
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "ทุกมหาวิทยาลัย"
  });
  const [sending, setSending] = useState(false);
  const set = key => e => {
    setForm(prev => ({
      ...prev,
      [key]: e.target.value
    }));
  };
  async function send() {
    if (!form.title.trim() || !form.body.trim()) {
      alert("กรุณากรอกหัวข้อและเนื้อหา");
      return;
    }
    if (sending) return;
    try {
      setSending(true);
      await create({
        ...form,
        // ใช้ sendAt ให้ตรงกับ backend
        sendAt: new Date().toISOString(),
        sentBy: user?.id || null
      }, user);
      setForm({
        title: "",
        body: "",
        audience: "ทุกมหาวิทยาลัย"
      });
      alert("ส่งข้อความแจ้งเตือนเรียบร้อย");
    } catch (error) {
      alert(error?.message || "ส่งข้อความแจ้งเตือนไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }
  return <>
      <UCHead title="ส่งข้อความแจ้งเตือนระบบถึงทุกมหาวิทยาลัยในระบบ" desc="ข้อความจะแสดงบนหน้าแรกของผู้ใช้ทุกคนในสถาบันที่เลือก" />

      <Card>
        <Field label="หัวข้อ">
          <Input value={form.title} onChange={set("title")} placeholder="เช่น แจ้งปิดปรับปรุงระบบ" />
        </Field>

        <Field label="เนื้อหา">
          <Textarea value={form.body} onChange={set("body")} placeholder="รายละเอียดที่ต้องการแจ้ง" />
        </Field>

        <Field label="ผู้รับ">
          <Select value={form.audience} onChange={set("audience")}>
            <option>
              ทุกมหาวิทยาลัย
            </option>

            {institutions.map(i => <option key={i.id} value={i.institutionName || i.institutionId}>
                {i.institutionName || i.institutionId}
              </option>)}
          </Select>
        </Field>

        <Btn onClick={send} disabled={sending}>
          {sending ? "กำลังส่ง..." : "ส่งข้อความแจ้งเตือน"}
        </Btn>
      </Card>

      <div style={{
      fontSize: 13,
      fontWeight: 800,
      color: "#202124",
      margin: "14px 0 6px"
    }}>
        ประวัติการส่ง
      </div>

      {items.length === 0 ? <div style={{
      fontSize: 13,
      color: "#5F6368"
    }}>
          ยังไม่มีประวัติการส่ง
        </div> : items.map(b => <Card key={b.id}>
            <b style={{
        fontSize: 14,
        color: "#202124"
      }}>
              {b.title}
            </b>

            <div style={{
        fontSize: 13,
        color: "#3C4043",
        marginTop: 4
      }}>
              {b.body}
            </div>

            <div style={{
        fontSize: 11.5,
        color: "#5F6368",
        marginTop: 8
      }}>
              ถึง {b.audience} ·{" "}
              {formatDateTime(b.sendAt || b.sentAt || b.createdAt)}{" "}
              · โดย{" "}
              {b.senderName || b.sentBy || "-"}
            </div>
          </Card>)}
    </>;
}

/* =========================================================
   UC-6 : จัดการสิทธิ์ระดับสถาบัน
========================================================= */

export default Broadcast;