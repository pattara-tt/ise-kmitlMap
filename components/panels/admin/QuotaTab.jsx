"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, useCollection, formatDateTime } from "../../ui";

// ── UC15 กำหนดจำนวนการส่งคำร้อง ──────────────────────────
function Quota({
  user,
  onBack
}) {
  const {
    items,
    patch,
    create
  } = useCollection("requestQuota");
  const q = items[0];
  const [form, setForm] = useState(null);
  const cur = form || q || {
    perUserPerDay: 3,
    perUserPerMonth: 20
  };
  async function save() {
    const payload = {
      perUserPerDay: Number(cur.perUserPerDay),
      perUserPerMonth: Number(cur.perUserPerMonth),
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };
    if (q?.id) await patch(q.id, payload, user);else await create(payload, user);
    alert("บันทึกการตั้งค่าเรียบร้อย");
  }
  return <>
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12
    }}>
          <Btn kind="ghost" onClick={onBack}>กลับ</Btn>
          <h3>กำหนดจำนวนการส่งคำร้อง</h3>
      </div>
      <Card>
        <Field label="จำนวนคำร้องสูงสุดต่อคน ต่อวัน">
          <Input type="number" min={1} value={cur.perUserPerDay} onChange={e => setForm({
          ...cur,
          perUserPerDay: e.target.value
        })} />
        </Field>
        <Field label="จำนวนคำร้องสูงสุดต่อคน ต่อเดือน">
          <Input type="number" min={1} value={cur.perUserPerMonth} onChange={e => setForm({
          ...cur,
          perUserPerMonth: e.target.value
        })} />
        </Field>
        <Btn onClick={save}>บันทึกการตั้งค่า</Btn>
        {q ? <div style={{
        fontSize: 11.5,
        color: "#5F6368",
        marginTop: 9
      }}>แก้ไขล่าสุด {formatDateTime(q.updatedAt)}</div> : null}
      </Card>
    </>;
}

// ── UC16 จัดการสถานะบัญชีของผู้ใช้งาน ────────────────────

export default Quota;