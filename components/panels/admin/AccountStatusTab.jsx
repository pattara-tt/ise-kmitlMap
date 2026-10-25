"use client";

import { useState } from "react";
import { Btn, Card, Field, Pill, SearchBar, Select, Status, Table, Textarea, useCollection, notify, askConfirm } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { isManageableUser, isManageableRole } from "./shared";

// ── UC16 จัดการสถานะบัญชีของผู้ใช้งาน ────────────────────
function AccountStatus({
  user
}) {
  const { roleLabels, roles } = useRefData(true);
  const { items, patch } = useCollection("users");
  const { items: requests } = useCollection("requests");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "active" | "suspended"
  const [roleFilter, setRoleFilter] = useState("");
  const [suspending, setSuspending] = useState(null); // user object ที่กำลังจะระงับ
  const [reason, setReason] = useState("");
  const [restoring, setRestoring] = useState(null);
  const [restoreReason, setRestoreReason] = useState("");
  const rows = items
    .filter(isManageableUser)
    .filter(u => !statusFilter || u.status === statusFilter)
    .filter(u => !roleFilter || u.roleCode === roleFilter)
    .filter(u => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  
  async function confirmSuspend() {
    if (!reason.trim()) {
      return notify("กรุณาระบุเหตุผลการระงับบัญชี");
    }

    const ok = await askConfirm(
      `ต้องการระงับบัญชีของ ${suspending.name} ใช่หรือไม่?`,
      {
        title: "ยืนยันการระงับบัญชี",
        confirmLabel: "ระงับบัญชี",
        tone: "danger",
      }
    );
    if (!ok) return;

    try {
      // นับคำร้องของผู้ใช้ก่อนระงับบัญชี
      const requestCount = requests.filter(
        (r) => String(r.userId) === String(suspending.id) && r.status === "pending"
      ).length;

      const result = await patch(
        suspending.id,
        {
          status: "suspended",
          reason,
        },
        user
      );

      console.log("SUSPEND SUCCESS:", result);

      setSuspending(null);
      setReason("");

      notify(
        requestCount > 0
          ? `ระงับบัญชีสำเร็จ และมีคำร้องของผู้ใช้ถูกนำออกจากคิวตรวจสอบ ${requestCount} รายการ`
          : "ระงับบัญชีสำเร็จ โดยไม่พบคำร้องของผู้ใช้รายนี้",
        {
          title: "ระงับบัญชีแล้ว",
          tone: "success",
        }
      );
    } catch (error) {
      console.error("SUSPEND ERROR:", error);
      notify(`ระงับบัญชีไม่สำเร็จ: ${error?.message || "เกิดข้อผิดพลาด"}`, { title: "ไม่สามารถดำเนินการได้", tone: "error" });
    }
  }

  async function confirmRestore() {
    if (!restoreReason.trim()) {
      return notify("กรุณาระบุเหตุผลการคืนสิทธิ์");
    }

    const ok = await askConfirm(
      `ต้องการปลดระงับบัญชีของ ${restoring.name} ใช่หรือไม่?`,
      { title: "ยืนยันการปลดระงับบัญชี", confirmLabel: "ปลดระงับบัญชี", tone: "danger" }
    );
    if (!ok) return;

    try {
      const result = await patch(restoring.id, {
        status: "active",
        reason: restoreReason
      }, user);
      console.log("RESTORE SUCCESS:", result);
      setRestoring(null);
      setRestoreReason("");
      notify("คืนสิทธิ์สำเร็จ", { title: "ปลดการระงับบัญชีแล้ว", tone: "success" });
    } catch (error) {
      console.error("RESTORE ERROR:", error);
      notify(`คืนสิทธิ์ไม่สำเร็จ: ${error?.message || "เกิดข้อผิดพลาด"}`, { title: "ไม่สามารถดำเนินการได้", tone: "error" });
    }
  }

  return <>
      <h3>จัดการสถานะบัญชีของผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาบัญชีผู้ใช้" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 8 }}>
        <Field label="กรองตามบทบาท">
          <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {roles.filter(isManageableRole).map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="กรองตามสถานะ">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="suspended">ระงับ</option>
          </Select>
        </Field>
      </div>
      <div style={{ fontSize: 12, color: "#5F6368", margin: "2px 0 8px" }}>พบ {rows.length} รายการ</div>

      {suspending ? <Card style={{
      border: "1px solid #F5C2C0"
    }}>
        <b style={{
        fontSize: 13.5,
        color: "#D93025"
      }}>ระงับบัญชี: {suspending.name}</b>
          <div style={{
        fontSize: 12,
        color: "#5F6368",
        margin: "4px 0 10px"
      }}>{suspending.email}</div>
          <Field label="เหตุผลการระงับบัญชี">
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="ระบุเหตุผล เช่น ละเมิดข้อตกลงการใช้งาน" />
          </Field>
          <div style={{
        display: "flex",
        gap: 8
      }}>
            <Btn kind="danger" onClick={confirmSuspend}>ยืนยันระงับบัญชี</Btn>
            <Btn kind="ghost" onClick={() => {
          setSuspending(null);
          setReason("");
        }}>ยกเลิก</Btn>
          </div>
        </Card> : null}

      {restoring ? <Card>
          <b>คืนสิทธิ์บัญชี: {restoring.name}</b>

          <div style={{
        fontSize: 12,
        color: "#5F6368",
        margin: "4px 0 10px"
      }}>
            {restoring.email}
          </div>

          <Field label="เหตุผลการคืนสิทธิ์บัญชี">
            <Textarea value={restoreReason} onChange={e => setRestoreReason(e.target.value)} placeholder="ระบุเหตุผลการคืนสิทธิ์บัญชี" />
          </Field>

          <div style={{
        display: "flex",
        gap: 8
      }}>
            <Btn kind="ok" onClick={confirmRestore}>
              ยืนยันคืนสิทธิ์
            </Btn>

            <Btn kind="ghost" onClick={() => {
          setRestoring(null);
          setRestoreReason("");
        }}>
              ยกเลิก
            </Btn>
          </div>
        </Card> : null}

      <Table columns={[{
      key: "name",
      label: "ผู้ใช้",
      render: u => <div><b>{u.name}</b><div style={{
          fontSize: 11.5,
          color: "#5F6368"
        }}>{u.email}</div></div>
    }, {
      key: "role",
      label: "บทบาท",
      render: u => <Pill>{roleLabels[u.roleCode]}</Pill>
    }, {
      key: "status",
      label: "สถานะ",
      render: u => <Status value={u.status} />
    }, {
      key: "act",
      label: "",
      render: u => <div style={{ display: "flex", justifyContent: "center" }}>
        {u.status === "active"
          ? <Btn kind="danger" onClick={() => {
              setSuspending(u);
              setReason("");
            }}>ระงับบัญชี</Btn>
          : <Btn kind="ok" onClick={() => {
              setRestoring(u);
              setRestoreReason("");
            }}>คืนสิทธิ์</Btn>}
      </div>
    }]} rows={rows} empty="ไม่พบบัญชีผู้ใช้ตามเงื่อนไข" />
    </>;
}

export default AccountStatus;