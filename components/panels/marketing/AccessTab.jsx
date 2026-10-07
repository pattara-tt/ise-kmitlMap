"use client";

import { useMemo, useState } from "react";
import { useRefData } from "../../../lib/useRefData";
import { Btn, Card, Field, Input, Pill, SearchBar, Select, UCHead, useCollection} from "../../ui";
import { formatDateTime } from "../../../lib/datetime";
import { ACCESS_STATUS, LEVELS } from "./shared";

export default function Access({
  user
}) {
  const {
    modules: moduleRefs
  } = useRefData(true);
  const {
    items,
    patch
  } = useCollection("institutionAccess");
  const {
    items: accessModules,
    create: createAccessModule,
    destroy: destroyAccessModule
  } = useCollection("institutionAccessModules");
  const {
    items: users
  } = useCollection("users");
  const {
    items: history
  } = useCollection("accessHistory");
  const [q, setQ] = useState("");

  // เก็บสถานะที่กำลังเปลี่ยนไว้ก่อน backend reload
  const [statusOverrides, setStatusOverrides] = useState({});

  /*
   * สำคัญ:
   * sort สำเนาใหม่ ไม่แก้ items ต้นฉบับ
   * จึงไม่ทำให้ Card สลับตำแหน่งหลังแก้ Module
   */
  const rows = useMemo(() => {
    return items.map(row => ({
      ...row,
      accessStatus: statusOverrides[row.id] || row.accessStatus || "active",
      modules: accessModules.filter(m => m.accessId === row.id).map(m => m.moduleCode)
    })).filter(row => String(row.institutionName || row.institutionId || "").toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(a.id || "").localeCompare(String(b.id || ""), undefined, {
      numeric: true
    }));
  }, [items, q, statusOverrides, accessModules]);
  function staffFor(institution) {
    return users.filter(u => u.institutionId === institution && u.roleCode !== "user");
  }

  /* -------------------------------------------------------
     เปลี่ยนสถานะสิทธิ์
  ------------------------------------------------------- */

  async function changeAccess(row, accessStatus) {
    const config = ACCESS_STATUS[accessStatus];
    if (!config) return;
    const currentStatus = row.accessStatus || "active";
    if (currentStatus === accessStatus) {
      return;
    }
    const confirmed = confirm(`เปลี่ยนสิทธิ์ ${row.institutionName || row.institutionId} เป็น “${config.label}” หรือไม่?`);
    if (!confirmed) return;
    const previousStatus = currentStatus;

    // เปลี่ยนหน้าจอทันที
    setStatusOverrides(prev => ({
      ...prev,
      [row.id]: accessStatus
    }));
    try {
      const updated = await patch(row.id, {
        accessStatus,
        updatedAt: new Date().toISOString()
      }, user);

      // ใช้ค่าที่ backend ยืนยัน
      const confirmedStatus = updated?.accessStatus || accessStatus;
      setStatusOverrides(prev => ({
        ...prev,
        [row.id]: confirmedStatus
      }));
      alert(`อัปเดตสถานะ ${config.label} เรียบร้อย`);
    } catch (error) {
      // ถ้า backend ไม่สำเร็จ ให้ย้อนกลับ
      setStatusOverrides(prev => ({
        ...prev,
        [row.id]: previousStatus
      }));
      alert(error?.message || "อัปเดตสถานะไม่สำเร็จ");
    }
  }

  /* -------------------------------------------------------
     เปิด / ปิด Module
  ------------------------------------------------------- */

  async function toggleModule(row, moduleKey) {
    const currentModules = Array.isArray(row.modules) ? row.modules : [];
    const hasModule = currentModules.includes(moduleKey);
    try {
      if (hasModule) {
        await destroyAccessModule({
          accessId: row.id,
          moduleCode: moduleKey
        }, user);
      } else {
        await createAccessModule({
          accessId: row.id,
          moduleCode: moduleKey
        }, user);
      }
    } catch (error) {
      alert(error?.message || "อัปเดตโมดูลไม่สำเร็จ");
    }
  }
  return <>
      <UCHead title="จัดการสิทธิ์การเข้าถึงระดับสถาบัน" desc="ดูรายชื่อสถาบัน เจ้าหน้าที่ สถานะสิทธิ์ และปรับเปิดใช้/หยุดชั่วคราว/ระงับสิทธิ์ได้ทันที" />

      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาชื่อสถาบัน" />

      {rows.length === 0 ? <div style={{
      fontSize: 13,
      color: "#5F6368",
      padding: "10px 2px"
    }}>
          ไม่พบข้อมูลสถาบัน
        </div> : rows.map(row => {
      const access = ACCESS_STATUS[row.accessStatus] || ACCESS_STATUS.active;
      const staff = staffFor(row.institutionId);
      return <Card key={row.id}>
              {/* หัว Card */}
              <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap"
        }}>
                <b style={{
            fontSize: 14.5,
            color: "#202124"
          }}>
                  {row.institutionName || row.institutionId}
                </b>

                <Pill color={access.color} bg={access.bg}>
                  {access.label}
                </Pill>
              </div>

              {/* เจ้าหน้าที่ */}
              <div style={{
          marginTop: 10,
          fontSize: 12,
          color: "#5F6368"
        }}>
                <b style={{
            color: "#202124"
          }}>
                  เจ้าหน้าที่ประจำสถาบัน
                </b>

                {staff.length === 0 ? " — ไม่พบข้อมูล" : " " + staff.map(u => `${u.name} (${u.email})`).join(" · ")}
              </div>

              {/* ตั้งค่า */}
              <div style={{
          display: "flex",
          gap: 10,
          marginTop: 10,
          flexWrap: "wrap"
        }}>
                {/* ระดับสิทธิ์ */}
                <Field label="ระดับสิทธิ์">
                  <Select value={row.level || "standard"} onChange={async e => {
              try {
                await patch(row.id, {
                  level: e.target.value,
                  uupdatedAt: new Date().toISOString()
                }, user);
              } catch (error) {
                alert(error?.message || "อัปเดตระดับสิทธิ์ไม่สำเร็จ");
              }
            }} style={{
              width: 170
            }}>
                    {Object.entries(LEVELS).map(([key, value]) => <option key={key} value={key}>
                          {value}
                        </option>)}
                  </Select>
                </Field>

                {/* จำนวนบัญชี */}
                <Field label="จำนวนบัญชีสูงสุด">
                  <Input type="number" min="0" defaultValue={row.seats ?? 0} onBlur={async e => {
              try {
                await patch(row.id, {
                  seats: Math.max(0, Number(e.target.value) || 0),
                  updatedAt: new Date().toISOString()
                }, user);
              } catch (error) {
                alert(error?.message || "อัปเดตจำนวนบัญชีไม่สำเร็จ");
              }
            }} style={{
              width: 130
            }} />
                </Field>
              </div>

              {/* โมดูล */}
              <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#5F6368",
          marginBottom: 5,
          marginTop: 4
        }}>
                โมดูลที่เปิดใช้
              </div>

              <div style={{
          display: "flex",
          gap: 7,
          flexWrap: "wrap"
        }}>
                {moduleRefs.map(({
            code: key,
            name: label
          }) => {
            const enabled = row.modules.includes(key);
            return <button key={key} type="button" onClick={() => toggleModule(row, key)} style={{
              border: "1px solid",
              borderColor: enabled ? "#1A73E8" : "#DADCE0",
              background: enabled ? "#E8F0FE" : "#fff",
              color: enabled ? "#1A73E8" : "#5F6368",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer"
            }}>
                        {enabled ? "✓ " : ""}
                        {label}
                      </button>;
          })}
              </div>

              <div style={{
          fontSize: 11.5,
          color: "#5F6368",
          marginTop: 9
        }}>
                อัปเดตล่าสุด{" "}
                {formatDateTime(row.updatedAt)}
              </div>

              {/* ปุ่มเปลี่ยนสถานะ */}
              <div style={{
          marginTop: 10,
          display: "flex",
          gap: 6,
          flexWrap: "wrap"
        }}>
                {Object.entries(ACCESS_STATUS).map(([key, value]) => <Btn key={key} kind={key === row.accessStatus ? "primary" : "ghost"} onClick={() => changeAccess(row, key)}>
                      {value.label}
                    </Btn>)}
              </div>
            </Card>;
    })}

      {/* ประวัติ */}
      <div style={{
      fontSize: 13,
      fontWeight: 800,
      color: "#202124",
      margin: "16px 0 6px"
    }}>
        ประวัติการเปลี่ยนสิทธิ์
      </div>

      {history.length === 0 ? <div style={{
      fontSize: 13,
      color: "#5F6368"
    }}>
          ยังไม่มีประวัติ
        </div> : history.slice(0, 20).map(h => <Card key={h.id}>
              <div style={{
        fontSize: 13,
        color: "#202124"
      }}>
                <b>
                  {h.institutionName || h.accessId}
                </b>{" "}
                ·{" "}
                {ACCESS_STATUS[h.beforeStatus]?.label || h.beforeStatus || "-"}{" "}
                →{" "}
                {ACCESS_STATUS[h.afterStatus]?.label || h.afterStatus || "-"}
              </div>

              <div style={{
        fontSize: 11.5,
        color: "#5F6368",
        marginTop: 5
      }}>
                {formatDateTime(h.changedAt || h.createdAt)}{" "}
                · โดย{" "}
                {h.actorName || "ระบบ"}
              </div>
            </Card>)}
    </>;
}
