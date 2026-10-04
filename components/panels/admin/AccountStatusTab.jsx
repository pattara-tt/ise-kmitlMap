"use client";

import { useState } from "react";
import { Btn, Card, Field, Pill, SearchBar, Status, Table, Textarea, useCollection } from "../../ui";
import { useRefData } from "../../../lib/useRefData";
import { isManageableUser } from "./shared";

// ── UC16 จัดการสถานะบัญชีของผู้ใช้งาน ────────────────────
function AccountStatus({
  user
}) {
  const {
    roleLabels,
    roles
  } = useRefData(true);
  const {
    items,
    patch
  } = useCollection("users");

  const [q, setQ] = useState("");
  const [suspending, setSuspending] = useState(null); // user object ที่กำลังจะระงับ
  const [reason, setReason] = useState("");
  const [restoring, setRestoring] = useState(null);
  const [restoreReason, setRestoreReason] = useState("");
  const rows = items.filter(isManageableUser).filter(u => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  
  async function confirmSuspend() {
    if (!reason.trim()) {
      return alert("กรุณาระบุเหตุผลการระงับบัญชี");
    }
    try {
      const result = await patch(suspending.id, {
        status: "suspended",
        reason
      }, user);
      console.log("SUSPEND SUCCESS:", result);
      setSuspending(null);
      setReason("");
      alert("ระงับบัญชีเรียบร้อย");
    } catch (error) {
      console.error("SUSPEND ERROR:", error);
      alert(`ระงับบัญชีไม่สำเร็จ: ${error.message}`);
    }
  }

  async function confirmRestore() {
    if (!restoreReason.trim()) {
      return alert("กรุณาระบุเหตุผลการคืนสิทธิ์");
    }
    try {
      const result = await patch(restoring.id, {
        status: "active",
        reason: restoreReason
      }, user);
      console.log("RESTORE SUCCESS:", result);
      setRestoring(null);
      setRestoreReason("");
    } catch (error) {
      console.error("RESTORE ERROR:", error);
      alert(`คืนสิทธิ์ไม่สำเร็จ: ${error.message}`);
    }
  }

  return <>
      <h3>จัดการสถานะบัญชีของผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาบัญชีผู้ใช้" />

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
      render: u => u.status === "active" ? <Btn kind="danger" onClick={() => {
        setSuspending(u);
        setReason("");
      }}>ระงับบัญชี</Btn> : <Btn kind="ok" onClick={() => {
        setRestoring(u);
        setRestoreReason("");
      }}>
                  คืนสิทธิ์
                </Btn>
    }]} rows={rows} />
    </>;
}

export default AccountStatus;