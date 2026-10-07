"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Card, Field, Input, Pill, SearchBar, Status, Table, Textarea, Tiles, UCHead, useCollection} from "../../ui";
import { formatDateTime } from "../../../lib/datetime";
import { contractDaysLeft, contractDisplayStatus, datePart, todayLocalISO } from "./shared";
import { todayKey } from "../../../lib/datetime";

export default function Contracts({
  user
}) {
  const {
    items,
    patch
  } = useCollection("contracts");
  const {
    items: institutionAccess,
    patch: patchAccess
  } = useCollection("institutionAccess");
  const [q, setQ] = useState("");
  const [today, setToday] = useState(() => todayLocalISO());
  const [expirySyncError, setExpirySyncError] = useState("");
  const syncingContracts = useRef(new Set());

  // Keep the visible status up to date when the page remains open overnight.
  useEffect(() => {
    const timer = setInterval(() => setToday(todayLocalISO()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // รายการที่กำลังจะต่ออายุ
  const [renewing, setRenewing] = useState(null);

  // วันต่อสัญญา
  const [renewStartDate, setRenewStartDate] = useState("");

  // ระยะสัญญา
  const [renewDurationValue, setRenewDurationValue] = useState("");
  const [renewDurationUnit, setRenewDurationUnit] = useState("year");

  // หมายเหตุ
  const [renewNote, setRenewNote] = useState("");

  // checkbox ยืนยัน
  const [confirmed, setConfirmed] = useState(false);

  // กำลังบันทึก
  const [saving, setSaving] = useState(false);

  // เอกสารยืนยันหลังต่ออายุสำเร็จ
  const [renewedDoc, setRenewedDoc] = useState(null);

  // สถานะยกเลิกสัญญา
  const [canceling, setCanceling] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelDoc, setCancelDoc] = useState(null);

  // Display the effective status immediately. Persist date-expired contracts
  // through the normal write flow when Marketing opens this screen.
  // This does not alter the database schema or re-run seed.sql.
  useEffect(() => {
    let stopped = false;

    async function synchronizeExpiredContracts() {
      const overdue = items.filter(
        c =>
          datePart(c.endDate) &&
          datePart(c.endDate) < today
      );

      for (const contract of overdue) {
        if (stopped) return;

        if (
          contract.status !== "expired" &&
          !syncingContracts.current.has(contract.id)
        ) {
          syncingContracts.current.add(contract.id);

          try {
            await patch(
              contract.id,
              {
                status: "expired"
              },
              user
            );
          } catch (error) {
            console.error(
              "[UC-4] contract expiration sync failed:",
              error
            );

            if (!stopped) {
              setExpirySyncError(
                "ไม่สามารถบันทึกสถานะสัญญาที่หมดอายุลงฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
              );
            }
          } finally {
            syncingContracts.current.delete(
              contract.id
            );
          }
        }

        if (stopped) return;

        const access =
          institutionAccess.find(
            a =>
              a.institutionId ===
              contract.institutionId
          );

        // Do not suspend an institution that still has another valid contract.
        const hasValidContract =
          items.some(
            other =>
              other.id !== contract.id &&
              other.institutionId ===
                contract.institutionId &&
              contractDisplayStatus(
                other,
                today
              ) === "active"
          );

        if (
          access &&
          (access.accessStatus ||
            "active") === "active" &&
          !hasValidContract
        ) {
          try {
            await patchAccess(
              access.id,
              {
                accessStatus: "paused",
                updatedAt: today
              },
              user
            );
          } catch (error) {
            console.error(
              "[UC-4] auto pause access failed:",
              error
            );

            if (!stopped) {
              setExpirySyncError(
                "ไม่สามารถหยุดสิทธิ์สถาบันที่สัญญาหมดอายุได้ กรุณาตรวจสอบสิทธิ์การใช้งาน"
              );
            }
          }
        }
      }
    }

    // Avoid racing with a Marketing user renewing/cancelling a contract.
    if (
      !renewing &&
      !canceling &&
      !saving &&
      !cancelSaving &&
      items.length > 0
    ) {
      synchronizeExpiredContracts();
    }

    return () => {
      stopped = true;
    };
  }, [
    items,
    institutionAccess,
    patch,
    patchAccess,
    today,
    user,
    renewing,
    canceling,
    saving,
    cancelSaving
  ]);

  const rows = items
    .map(c => {
      const left = contractDaysLeft(
        c.endDate,
        today
      );

      const pastDate =
        left !== null && left < 0;

      return {
        ...c,
        left,
        pastDate,
        displayStatus:
          contractDisplayStatus(
            c,
            today
          )
      };
    })
    .filter(c =>
      `${c.institutionName || c.institutionId || ""}${c.plan || ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
    .sort(
      (a, b) =>
        (a.left ?? Infinity) -
        (b.left ?? Infinity)
    );

  const soon = rows.filter(
    c =>
      c.displayStatus === "active" &&
      c.left !== null &&
      c.left >= 0 &&
      c.left <= 30
  ).length;

  const expired = rows.filter(
    c =>
      c.displayStatus === "expired"
  ).length;

  // =========================================================
  // คำนวณวันเริ่มต้นของการต่อสัญญา
  // =========================================================

  function getNextRenewalStartDate(c) {
    const oldDate = datePart(
      c.endDate
    );

    // ถ้าสัญญาหมดแล้ว ให้เริ่มสัญญาใหม่ตั้งแต่วันนี้
    if (
      !oldDate ||
      c.displayStatus === "expired"
    ) {
      return todayLocalISO();
    }

    // ถ้ายังไม่หมดสัญญา
    // วันต่อสัญญาเริ่มวันถัดจากวันสิ้นสุดเดิม
    const d = new Date(
      `${oldDate}T00:00:00`
    );

    d.setDate(d.getDate() + 1);

    return [
      d.getFullYear(),
      String(
        d.getMonth() + 1
      ).padStart(2, "0"),
      String(
        d.getDate()
      ).padStart(2, "0")
    ].join("-");
  }

  // =========================================================
  // คำนวณวันสิ้นสุดสัญญาจาก
  // วันต่อสัญญา + จำนวนเดือน/ปี
  // =========================================================

  function calculateRenewEndDate(
    startDate,
    durationValue,
    durationUnit
  ) {
    if (
      !startDate ||
      !durationValue
    ) {
      return "";
    }

    const value =
      Number(durationValue);

    if (
      !Number.isInteger(value) ||
      value <= 0
    ) {
      return "";
    }

    const start = new Date(
      `${startDate}T00:00:00`
    );

    let anniversary;

    if (
      durationUnit === "month"
    ) {
      // รองรับวันที่ 29-31 ของเดือน
      // เช่น 31 ม.ค. + 1 เดือน
      const targetYear =
        start.getFullYear();

      const targetMonth =
        start.getMonth() + value;

      const targetDay =
        start.getDate();

      const lastDay =
        new Date(
          targetYear,
          targetMonth + 1,
          0
        ).getDate();

      anniversary =
        new Date(
          targetYear,
          targetMonth,
          Math.min(
            targetDay,
            lastDay
          )
        );
    } else {
      const targetYear =
        start.getFullYear() +
        value;

      const targetMonth =
        start.getMonth();

      const targetDay =
        start.getDate();

      const lastDay =
        new Date(
          targetYear,
          targetMonth + 1,
          0
        ).getDate();

      anniversary =
        new Date(
          targetYear,
          targetMonth,
          Math.min(
            targetDay,
            lastDay
          )
        );
    }

    // วันสิ้นสุด = 1 วันก่อนวันครบรอบ
    anniversary.setDate(
      anniversary.getDate() - 1
    );

    return [
      anniversary.getFullYear(),
      String(
        anniversary.getMonth() + 1
      ).padStart(2, "0"),
      String(
        anniversary.getDate()
      ).padStart(2, "0")
    ].join("-");
  }

  // =========================================================
  // เปิดแบบฟอร์มต่ออายุ
  // =========================================================

  function openRenew(c) {
    setRenewing(c);

    setRenewStartDate(
      getNextRenewalStartDate(c)
    );

    setRenewDurationValue("");
    setRenewDurationUnit("year");

    setRenewNote("");
    setConfirmed(false);
    setRenewedDoc(null);
  }

  // =========================================================
  // ปิดแบบฟอร์มต่ออายุ
  // =========================================================

  function closeRenew() {
    if (saving) return;

    setRenewing(null);
    setRenewStartDate("");
    setRenewDurationValue("");
    setRenewDurationUnit("year");
    setRenewNote("");
    setConfirmed(false);
  }

  // =========================================================
  // เปิดแบบฟอร์มยกเลิกสัญญา
  // =========================================================

  function openCancel(c) {
    setCanceling(c);
    setCancelReason("");
    setCancelConfirmed(false);
  }

  // =========================================================
  // ยืนยันการต่ออายุ
  // =========================================================

  async function confirmRenew() {
    if (!renewing) return;

    // ตรวจสอบวันต่อสัญญา
    if (!renewStartDate) {
      alert(
        "กรุณาระบุวันต่อสัญญา"
      );
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        renewStartDate
      )
    ) {
      alert(
        "รูปแบบวันต่อสัญญาไม่ถูกต้อง"
      );
      return;
    }

    // ตรวจสอบระยะสัญญา
    if (
      !renewDurationValue ||
      !Number.isInteger(
        Number(renewDurationValue)
      ) ||
      Number(renewDurationValue) <= 0
    ) {
      alert(
        renewDurationUnit ===
          "month"
          ? "กรุณาระบุระยะสัญญาเป็นจำนวนเดือน เช่น 3 เดือน"
          : "กรุณาระบุระยะสัญญาเป็นจำนวนปี เช่น 3 ปี"
      );
      return;
    }

    // ระบบคำนวณวันสิ้นสุดภายใน
    const renewDate =
      calculateRenewEndDate(
        renewStartDate,
        renewDurationValue,
        renewDurationUnit
      );

    if (!renewDate) {
      alert(
        "ไม่สามารถคำนวณวันสิ้นสุดสัญญาได้"
      );
      return;
    }

    // วันต่อสัญญาต้องไม่ย้อนหลัง
    if (
      renewStartDate <
      todayLocalISO()
    ) {
      alert(
        "วันต่อสัญญาต้องไม่เป็นวันที่ผ่านมาแล้ว"
      );
      return;
    }

    // หากสัญญาเดิมยังไม่หมด
    // วันต่อสัญญาต้องเริ่มหลังวันสิ้นสุดเดิม
    const oldDate =
      datePart(
        renewing.endDate
      );

    if (
      oldDate &&
      renewing.displayStatus !==
        "expired" &&
      renewStartDate <= oldDate
    ) {
      alert(
        "วันต่อสัญญาต้องมากกว่าวันสิ้นสุดสัญญาเดิม"
      );
      return;
    }

    if (!confirmed) {
      alert(
        "กรุณาติ๊กยืนยันการต่ออายุสัญญา"
      );
      return;
    }

    try {
      setSaving(true);

      // =====================================================
      // บันทึกข้อมูลลง contracts
      // endDate คือวันที่ระบบคำนวณ
      // =====================================================

      await patch(
        renewing.id,
        {
          endDate: renewDate,
          status: "active"
        },
        user
      );

      // =====================================================
      // ปรับสถานะสิทธิ์สถาบันกลับมาเป็น active
      // =====================================================

      const access =
        institutionAccess.find(
          a =>
            a.institutionId ===
            renewing.institutionId
        );

      if (access) {
        await patchAccess(
          access.id,
          {
            accessStatus: "active",
            updatedAt: todayKey()
          },
          user
        );
      }

      // =====================================================
      // สร้างเลขที่เอกสาร
      // =====================================================

      const docNo =
        "REN-" +
        todayKey().replace(
          /-/g,
          ""
        ) +
        "-" +
        String(
          renewing.id
        ).replace(
          /[^a-zA-Z0-9]/g,
          ""
        );

      setRenewedDoc({
        docNo,

        institution:
          renewing.institutionName ||
          renewing.institutionId,

        plan: renewing.plan,

        oldEndDate:
          datePart(
            renewing.endDate
          ),

        renewalStartDate:
          renewStartDate,

        durationValue:
          Number(
            renewDurationValue
          ),

        durationUnit:
          renewDurationUnit,

        newEndDate:
          renewDate,

        note: renewNote,

        renewedBy:
          user?.name ||
          "ฝ่ายการตลาด",

        renewedAt:
          formatDateTime(
            new Date()
          )
      });

      setRenewing(null);
      setRenewStartDate("");
      setRenewDurationValue("");
      setRenewDurationUnit("year");
      setRenewNote("");
      setConfirmed(false);

    } catch (error) {
      alert(
        error?.message ||
        "ต่ออายุสัญญาไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // ยืนยันการยกเลิกสัญญา
  // =========================================================

  async function confirmCancel() {
    if (!canceling) return;

    if (!cancelReason.trim()) {
      alert(
        "กรุณาระบุเหตุผลในการยกเลิกสัญญา"
      );
      return;
    }

    if (!cancelConfirmed) {
      alert(
        "กรุณายืนยันการยกเลิกสัญญา"
      );
      return;
    }

    if (cancelSaving) return;

    try {
      setCancelSaving(true);

      await patch(
        canceling.id,
        {
          status: "expired"
        },
        user
      );

      const access =
        institutionAccess.find(
          a =>
            a.institutionId ===
            canceling.institutionId
        );

      const hasOtherActiveContract =
        items.some(
          other =>
            other.id !==
              canceling.id &&
            other.institutionId ===
              canceling.institutionId &&
            contractDisplayStatus(
              other,
              todayLocalISO()
            ) === "active"
        );

      if (
        access &&
        !hasOtherActiveContract
      ) {
        await patchAccess(
          access.id,
          {
            accessStatus:
              "suspended",
            updatedAt:
              todayLocalISO()
          },
          user
        );
      }

      setCancelDoc({
        docNo:
          "CAN-" +
          todayKey().replaceAll(
            "-",
            ""
          ) +
          "-" +
          canceling.id,

        institution:
          canceling.institutionName ||
          canceling.institutionId,

        plan: canceling.plan,

        endDate:
          canceling.endDate,

        reason:
          cancelReason.trim(),

        cancelledBy:
          user?.name ||
          "ฝ่ายการตลาด",

        cancelledAt:
          formatDateTime(
            new Date()
          ),

        accessKeptActive:
          hasOtherActiveContract
      });

      setCanceling(null);
      setCancelReason("");
      setCancelConfirmed(false);

    } catch (error) {
      alert(
        error?.message ||
        "ยกเลิกสัญญาไม่สำเร็จ"
      );
    } finally {
      setCancelSaving(false);
    }
  }

  return (
    <>
      <UCHead
        title="ติดตามระยะสัญญาบริการ"
        desc="เรียงตามวันที่ใกล้หมดอายุที่สุด — สัญญาใหม่ก่อนหมดอายุสัญญา"
      />

      <Tiles
        items={[
          {
            label: "สัญญาทั้งหมด",
            value: rows.length
          },
          {
            label:
              "สัญญาใกล้หมดอายุ (≤30 วัน)",
            value: soon
          },
          {
            label: "สิ้นสุดสัญญา",
            value: expired
          },
          {
            label: "อยู่ในระยะสัญญา",
            value: rows.filter(
              c =>
                c.displayStatus ===
                "active"
            ).length
          }
        ]}
      />

      {expirySyncError && (
        <div
          role="alert"
          style={{
            color: "#B06000",
            background: "#FEF7E0",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12
          }}
        >
          {expirySyncError}
        </div>
      )}

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาชื่อสถาบัน / แพ็กเกจ"
      />

      <Table
        columns={[
          {
            key: "institutionName",
            label: "สถาบัน"
          },
          {
            key: "plan",
            label: "ประเภทการใช้งาน"
          },
          {
            key: "endDate",
            label:
              "วันสิ้นอายุสัญญา",
            render: c =>
              datePart(
                c.endDate
              ) || "-"
          },
          {
            key: "left",
            label:
              "ระยะคงเหลือสัญญา",
            render: c =>
              c.pastDate ? (
                <Pill
                  color="#D93025"
                  bg="#FCE8E6"
                >
                  หมดอายุ{" "}
                  {Math.abs(
                    c.left
                  )} วัน
                </Pill>
              ) : c.displayStatus ===
                "expired" ? (
                <Pill
                  color="#5F6368"
                  bg="#F1F3F4"
                >
                  ยกเลิกแล้ว
                </Pill>
              ) : c.left ===
                null ? (
                <Pill>
                  ไม่ระบุวันสิ้นสุด
                </Pill>
              ) : c.left <= 30 ? (
                <Pill
                  color="#B06000"
                  bg="#FEF7E0"
                >
                  เหลือ{" "}
                  {c.left} วัน
                </Pill>
              ) : (
                <Pill
                  color="#188038"
                  bg="#E6F4EA"
                >
                  เหลือ{" "}
                  {c.left} วัน
                </Pill>
              )
          },
          {
            key: "status",
            label: "สถานะ",
            render: c =>
              c.displayStatus ===
                "expired" &&
              !c.pastDate ? (
                <Pill
                  color="#5F6368"
                  bg="#F1F3F4"
                >
                  ยกเลิกแล้ว
                </Pill>
              ) : (
                <Status
                  value={
                    c.displayStatus
                  }
                />
              )
          },
          {
            key: "act",
            label: "การจัดการ",
            render: c => (
              <div
                style={{
                  display:
                    "flex",
                  gap: 6,
                  flexWrap:
                    "wrap"
                }}
              >
                <Btn
                  kind="ghost"
                  onClick={() =>
                    openRenew(c)
                  }
                >
                  ต่ออายุ
                </Btn>

                <Btn
                  kind="ghost"
                  onClick={() =>
                    openCancel(c)
                  }
                >
                  ยกเลิกสัญญา
                </Btn>
              </div>
            )
          }
        ]}
        rows={rows}
      />

      {/* =================================================
          FORM : แบบฟอร์มต่ออายุสัญญา
       ================================================= */}

      {renewing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(32,33,36,.45)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 650,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 16,
              boxShadow:
                "0 8px 30px rgba(0,0,0,.25)",
              padding: 24
            }}
          >
            <div
              style={{
                textAlign: "center",
                borderBottom:
                  "2px solid #1A73E8",
                paddingBottom: 15,
                marginBottom: 20
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#5F6368",
                  marginBottom: 5
                }}
              >
                SciMap
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#202124"
                }}
              >
                แบบฟอร์มต่ออายุสัญญาบริการ
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#5F6368",
                  marginTop: 5
                }}
              >
                สำหรับดำเนินการโดยฝ่ายการตลาด
              </div>
            </div>

            <Card
              style={{
                background: "#F8F9FA",
                boxShadow: "none"
              }}
            >
              <Field label="สถาบัน">
                <Input
                  value={
                    renewing.institutionName ||
                    renewing.institutionId ||
                    "-"
                  }
                  disabled
                />
              </Field>

              <Field label="ประเภทการใช้งาน">
                <Input
                  value={
                    renewing.plan ||
                    "-"
                  }
                  disabled
                />
              </Field>

              <Field label="วันสิ้นสุดสัญญาปัจจุบัน">
                <Input
                  value={datePart(
                    renewing.endDate
                  )}
                  disabled
                />
              </Field>
            </Card>

            {/* วันต่อสัญญา */}

            <Field label="วันต่อสัญญา">
              <Input
                type="date"
                value={
                  renewStartDate
                }
                min={today}
                onChange={e =>
                  setRenewStartDate(
                    e.target.value
                  )
                }
              />
            </Field>

            {/* ระยะสัญญา */}

            <Field label="ระยะสัญญา">
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 8
                }}
              >
                {/* เลือกหน่วย: เดือน / ปี */}
                <select
                  value={renewDurationUnit}
                  onChange={e => {
                    setRenewDurationUnit(e.target.value);
                    setRenewDurationValue(""); // ล้างค่าตัวเลขเมื่อเปลี่ยนหน่วย
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #DADCE0",
                    background: "#fff",
                    color: "#202124",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >
                  <option value="month">เดือน</option>
                  <option value="year">ปี</option>
                </select>

                {/* เลือกจำนวนตามหน่วยที่เลือก (1, 3, 6, 12 สำหรับเดือน และ 2, 3, 5 สำหรับปี) */}
                <select
                  value={renewDurationValue}
                  onChange={e => setRenewDurationValue(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #DADCE0",
                    background: "#fff",
                    color: "#202124",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >
                  <option value="" disabled>
                    -- เลือกจำนวน {renewDurationUnit === "month" ? "เดือน" : "ปี"} --
                  </option>
                  {renewDurationUnit === "month" ? (
                    <>
                      <option value="1">1 เดือน</option>
                      <option value="3">3 เดือน</option>
                      <option value="6">6 เดือน</option>
                      <option value="12">12 เดือน</option>
                    </>
                  ) : (
                    <>
                      <option value="2">2 ปี</option>
                      <option value="3">3 ปี</option>
                      <option value="5">5 ปี</option>
                    </>
                  )}
                </select>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#5F6368",
                  marginTop: 6
                }}
              >
                ระยะสัญญาที่เลือก:{" "}
                {renewDurationValue ? `${renewDurationValue} ${renewDurationUnit === "month" ? "เดือน" : "ปี"}` : "-"}
              </div>
            </Field>

            {/* หมายเหตุ */}

            <Field label="หมายเหตุ">
              <Textarea
                value={renewNote}
                onChange={e =>
                  setRenewNote(
                    e.target.value
                  )
                }
                placeholder="ระบุรายละเอียดเพิ่มเติมเกี่ยวกับการต่ออายุสัญญา"
              />
            </Field>

            {/* ยืนยัน */}

            <div
              style={{
                border:
                  "1px solid #DADCE0",
                borderRadius: 10,
                padding: 13,
                marginBottom: 16,
                background: "#fff"
              }}
            >
              <label
                style={{
                  display:
                    "flex",
                  gap: 9,
                  alignItems:
                    "flex-start",
                  cursor:
                    "pointer",
                  fontSize: 13,
                  color:
                    "#202124"
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    confirmed
                  }
                  onChange={e =>
                    setConfirmed(
                      e.target.checked
                    )
                  }
                  style={{
                    marginTop: 3
                  }}
                />

                <span>
                  ข้าพเจ้ายืนยันว่าต้องการต่ออายุสัญญาของสถาบันนี้
                  และตรวจสอบวันต่อสัญญาและระยะสัญญาแล้ว
                </span>
              </label>
            </div>

            {/* ปุ่ม */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: 10
              }}
            >
              <Btn
                kind="ghost"
                onClick={
                  closeRenew
                }
                disabled={
                  saving
                }
              >
                ยกเลิก
              </Btn>

              <Btn
                onClick={
                  confirmRenew
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "กำลังบันทึก..."
                  : "ยืนยันการต่ออายุ"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          DOCUMENT : เอกสารยืนยันหลังต่ออายุ
       ================================================= */}

      {renewedDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(32,33,36,.45)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1100,
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 650,
              background: "#fff",
              borderRadius: 16,
              boxShadow:
                "0 8px 30px rgba(0,0,0,.25)",
              padding: 28
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 22
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius:
                    "50%",
                  background:
                    "#E6F4EA",
                  color:
                    "#188038",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize: 25,
                  fontWeight: 900,
                  marginBottom: 10
                }}
              >
                ✓
              </div>

              <div
                style={{
                  fontSize: 19,
                  fontWeight: 900
                }}
              >
                ต่ออายุสัญญาสำเร็จ
              </div>

              <div
                style={{
                  color: "#5F6368",
                  fontSize: 12,
                  marginTop: 4
                }}
              >
                ระบบได้บันทึกข้อมูลการต่ออายุแล้ว
              </div>
            </div>

            <div
              style={{
                border:
                  "1px solid #DADCE0",
                borderRadius: 12,
                padding: 20,
                background: "#fff"
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
                  fontWeight: 900,
                  fontSize: 16,
                  marginBottom: 18,
                  borderBottom:
                    "1px solid #DADCE0",
                  paddingBottom: 12
                }}
              >
                ใบยืนยันการต่ออายุสัญญาบริการ
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "170px 1fr",
                  gap:
                    "10px 15px",
                  fontSize: 13
                }}
              >
                <b>
                  เลขที่เอกสาร
                </b>
                <span>
                  {renewedDoc.docNo}
                </span>

                <b>สถาบัน</b>
                <span>
                  {renewedDoc.institution ||
                    "-"}
                </span>

                <b>
                  ประเภทการใช้งาน
                </b>
                <span>
                  {renewedDoc.plan ||
                    "-"}
                </span>

                <b>
                  วันสิ้นสุดเดิม
                </b>
                <span>
                  {renewedDoc.oldEndDate}
                </span>

                <b>
                  วันต่อสัญญา
                </b>
                <span>
                  {
                    renewedDoc.renewalStartDate
                  }
                </span>

                <b>
                  ระยะสัญญา
                </b>
                <span>
                  {
                    renewedDoc.durationValue
                  }{" "}
                  {renewedDoc.durationUnit ===
                  "month"
                    ? "เดือน"
                    : "ปี"}
                </span>

                <b>
                  วันสิ้นสุดใหม่
                </b>
                <span
                  style={{
                    fontWeight: 900,
                    color:
                      "#188038"
                  }}
                >
                  {
                    renewedDoc.newEndDate
                  }
                </span>

                <b>
                  ผู้ดำเนินการ
                </b>
                <span>
                  {
                    renewedDoc.renewedBy
                  }
                </span>

                <b>
                  วันที่ดำเนินการ
                </b>
                <span>
                  {
                    renewedDoc.renewedAt
                  }
                </span>
              </div>

              {renewedDoc.note && (
                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 15,
                    borderTop:
                      "1px solid #DADCE0"
                  }}
                >
                  <b
                    style={{
                      fontSize: 13
                    }}
                  >
                    หมายเหตุ
                  </b>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color:
                        "#5F6368"
                    }}
                  >
                    {
                      renewedDoc.note
                    }
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                marginTop: 18
              }}
            >
              <Btn
                onClick={() =>
                  setRenewedDoc(
                    null
                  )
                }
              >
                ปิดเอกสาร
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยกเลิกสัญญา */}

      {canceling && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.35)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 1000
          }}
        >
          <Card
            style={{
              width:
                "min(520px, 100%)",
              maxHeight: "90vh",
              overflow:
                "auto"
            }}
          >
            <b
              style={{
                fontSize: 16
              }}
            >
              ยกเลิกสัญญา
            </b>

            <div
              style={{
                fontSize: 13,
                color:
                  "#5F6368",
                marginTop: 6
              }}
            >
              {
                canceling.institutionName ||
                canceling.institutionId
              }
            </div>

            <Field label="เหตุผลในการยกเลิก">
              <Textarea
                value={
                  cancelReason
                }
                onChange={e =>
                  setCancelReason(
                    e.target.value
                  )
                }
                placeholder="ระบุเหตุผลในการยกเลิกสัญญา"
              />
            </Field>

            <label
              style={{
                display:
                  "flex",
                gap: 8,
                alignItems:
                  "flex-start",
                fontSize: 13,
                marginTop: 8
              }}
            >
              <input
                type="checkbox"
                checked={
                  cancelConfirmed
                }
                onChange={e =>
                  setCancelConfirmed(
                    e.target.checked
                  )
                }
              />

              <span>
                ยืนยันการยกเลิกสัญญา
                และระงับสิทธิ์การเข้าถึง
                ของสถาบันนี้
              </span>
            </label>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: 8,
                marginTop: 14
              }}
            >
              <Btn
                kind="ghost"
                onClick={() =>
                  setCanceling(
                    null
                  )
                }
              >
                ย้อนกลับ
              </Btn>

              <Btn
                kind="danger"
                onClick={
                  confirmCancel
                }
                disabled={
                  cancelSaving
                }
              >
                {cancelSaving
                  ? "กำลังยกเลิก..."
                  : "ยืนยันยกเลิกสัญญา"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* เอกสารยืนยันการยกเลิกสัญญา */}

      {cancelDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.35)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 1001
          }}
        >
          <Card
            style={{
              width:
                "min(600px, 100%)",
              maxHeight: "90vh",
              overflow:
                "auto"
            }}
          >
            <div
              style={{
                textAlign:
                  "center",
                marginBottom: 18
              }}
            >
              <b
                style={{
                  fontSize: 18
                }}
              >
                เอกสารยืนยันการยกเลิกสัญญา
              </b>

              <div
                style={{
                  fontSize: 12,
                  color:
                    "#5F6368",
                  marginTop: 4
                }}
              >
                เลขที่เอกสาร{" "}
                {
                  cancelDoc.docNo
                }
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight:
                  1.8
              }}
            >
              <div>
                <b>สถาบัน:</b>{" "}
                {
                  cancelDoc.institution
                }
              </div>

              <div>
                <b>
                  ประเภทการใช้งาน:
                </b>{" "}
                {
                  cancelDoc.plan ||
                  "-"
                }
              </div>

              <div>
                <b>
                  วันสิ้นสุดสัญญา:
                </b>{" "}
                {datePart(
                  cancelDoc.endDate
                ) || "-"}
              </div>

              <div>
                <b>เหตุผล:</b>{" "}
                {
                  cancelDoc.reason
                }
              </div>

              <div>
                <b>
                  ดำเนินการโดย:
                </b>{" "}
                {
                  cancelDoc.cancelledBy
                }
              </div>

              <div>
                <b>
                  วันที่ดำเนินการ:
                </b>{" "}
                {
                  cancelDoc.cancelledAt
                }
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 10,
                border:
                  "1px solid #DADCE0",
                borderRadius: 10,
                background:
                  "#F8F9FA",
                fontSize: 12.5
              }}
            >
              สถานะสัญญา:{" "}
              <b>ยกเลิก</b>

              <br />

              สถานะสิทธิ์สถาบัน:{" "}
              <b>
                {
                  cancelDoc.accessKeptActive
                    ? "คงสิทธิ์ตามสัญญาอื่นที่ยังใช้งานได้"
                    : "ระงับสิทธิ์"
                }
              </b>
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                marginTop: 14
              }}
            >
              <Btn
                kind="ghost"
                onClick={() =>
                  setCancelDoc(
                    null
                  )
                }
              >
                ปิดเอกสาร
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/* =========================================================
   UC-5 : ส่งข้อความแจ้งเตือน
========================================================= */