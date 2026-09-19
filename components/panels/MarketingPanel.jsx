"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Btn,
  Card,
  Field,
  Input,
  Pill,
  SearchBar,
  Select,
  Status,
  Table,
  Textarea,
  Tiles,
  UCHead,
  useCollection,
} from "../ui";

// Actor: ฝ่ายการตลาด — UC4 สัญญาบริการ · UC5 แจ้งเตือนทุกมหาวิทยาลัย · UC6 สิทธิ์ระดับสถาบัน

export default function MarketingPanel({ uc, user }) {
  if (uc === "contracts") return <Contracts user={user} />;
  if (uc === "broadcast") return <Broadcast user={user} />;
  return <Access user={user} />;
}

/* =========================================================
   UC-4 : ติดตามสัญญาบริการ
========================================================= */

const daysLeft = (d) =>
  Math.ceil((new Date(d) - new Date()) / 86400000);

function Contracts({ user }) {
  const { items, patch } = useCollection("contracts");
  const { items: institutionAccess } =
    useCollection("institutionAccess");

  const [q, setQ] = useState("");

  const [renewing, setRenewing] = useState(null);
  const [renewDate, setRenewDate] = useState("");
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewDoc, setRenewDoc] = useState(null);

  const [canceling, setCanceling] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelDoc, setCancelDoc] = useState(null);

  // เมื่อสัญญาหมดอายุ ให้หยุดสิทธิ์ชั่วคราวอัตโนมัติ
  useEffect(() => {
    let stopped = false;

    async function pauseExpiredAccess() {
      const today = new Date()
        .toISOString()
        .slice(0, 10);

      const expired = items.filter(
        (c) =>
          c.status !== "cancelled" &&
          c.endDate &&
          String(c.endDate).slice(0, 10) < today
      );

      for (const contract of expired) {
        const access = institutionAccess.find(
          (a) =>
            a.institution === contract.institution
        );

        if (
          !stopped &&
          access &&
          (access.accessStatus || "active") === "active"
        ) {
          try {
            await patch(
              access.id,
              {
                accessStatus: "paused",
                updatedAt: today,
              },
              user
            );
          } catch (error) {
            console.error(
              "[UC-4] auto pause access failed:",
              error
            );
          }
        }
      }
    }

    if (
      items.length > 0 &&
      institutionAccess.length > 0
    ) {
      pauseExpiredAccess();
    }

    return () => {
      stopped = true;
    };
  }, [items, institutionAccess]);

  const rows = items
    .map((c) => ({
      ...c,
      left: daysLeft(c.endDate),
    }))
    .filter((c) =>
      `${c.institution || ""}${c.plan || ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
    .sort((a, b) => a.left - b.left);

  const soon = rows.filter(
    (c) => c.left >= 0 && c.left <= 30
  ).length;

  const expired = rows.filter(
    (c) => c.left < 0
  ).length;

  function openRenew(c) {
    setRenewing(c);
    setRenewDate(c.endDate || "");
  }

  function openCancel(c) {
    setCanceling(c);
    setCancelReason("");
    setCancelConfirmed(false);
  }

  async function confirmRenew() {
    if (!renewing || !renewDate) {
      alert("กรุณาระบุวันที่ต่ออายุ");
      return;
    }

    if (renewDate <= (renewing.endDate || "")) {
      alert(
        "วันสิ้นสุดสัญญาใหม่ต้องมากกว่าวันสิ้นสุดเดิม"
      );
      return;
    }

    if (renewSaving) return;

    try {
      setRenewSaving(true);

      await patch(
        renewing.id,
        {
          endDate: renewDate,
          status: "active",
        },
        user
      );

      const access = institutionAccess.find(
        (a) =>
          a.institution === renewing.institution
      );

      if (access) {
        await patch(
          access.id,
          {
            accessStatus: "active",
            updatedAt: new Date()
              .toISOString()
              .slice(0, 10),
          },
          user
        );
      }

      setRenewDoc({
        docNo:
          "REN-" +
          new Date()
            .toISOString()
            .slice(0, 10)
            .replaceAll("-", "") +
          "-" +
          renewing.id,
        institution: renewing.institution,
        plan: renewing.plan,
        oldEndDate: renewing.endDate,
        newEndDate: renewDate,
        renewedBy:
          user?.name || "ฝ่ายการตลาด",
        renewedAt:
          new Date().toLocaleString("th-TH"),
      });

      setRenewing(null);
      alert("ต่ออายุสัญญาเรียบร้อย");
    } catch (error) {
      alert(
        error?.message ||
          "ต่ออายุสัญญาไม่สำเร็จ"
      );
    } finally {
      setRenewSaving(false);
    }
  }

  async function confirmCancel() {
    if (!canceling) return;

    if (!cancelReason.trim()) {
      alert("กรุณาระบุเหตุผลในการยกเลิกสัญญา");
      return;
    }

    if (!cancelConfirmed) {
      alert("กรุณายืนยันการยกเลิกสัญญา");
      return;
    }

    if (cancelSaving) return;

    try {
      setCancelSaving(true);

      await patch(
        canceling.id,
        {
          status: "cancelled",
        },
        user
      );

      const access = institutionAccess.find(
        (a) =>
          a.institution === canceling.institution
      );

      if (access) {
        await patch(
          access.id,
          {
            accessStatus: "suspended",
            updatedAt: new Date()
              .toISOString()
              .slice(0, 10),
          },
          user
        );
      }

      setCancelDoc({
        docNo:
          "CAN-" +
          new Date()
            .toISOString()
            .slice(0, 10)
            .replaceAll("-", "") +
          "-" +
          canceling.id,
        institution: canceling.institution,
        plan: canceling.plan,
        endDate: canceling.endDate,
        reason: cancelReason.trim(),
        cancelledBy:
          user?.name || "ฝ่ายการตลาด",
        cancelledAt:
          new Date().toLocaleString("th-TH"),
      });

      setCanceling(null);
      setCancelReason("");
      setCancelConfirmed(false);

      alert("ยกเลิกสัญญาเรียบร้อย");
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
        desc="เรียงตามวันที่ใกล้หมดอายุที่สุด — เมื่อหมดอายุจะหยุดสิทธิ์ชั่วคราว และฝ่ายการตลาดสามารถต่ออายุหรือยกเลิกสัญญาได้"
      />

      <Tiles
        items={[
          {
            label: "สัญญาทั้งหมด",
            value: rows.length,
          },
          {
            label: "สัญญาใกล้หมดอายุ (≤30 วัน)",
            value: soon,
          },
          {
            label: "สิ้นสุดสัญญา",
            value: expired,
          },
          {
            label: "อยู่ในระยะสัญญา",
            value: rows.filter(
              (c) =>
                c.left >= 0 &&
                c.status !== "cancelled"
            ).length,
          },
        ]}
      />

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาชื่อสถาบัน / แพ็กเกจ"
      />

      <Table
        columns={[
          {
            key: "institution",
            label: "สถาบัน",
          },
          {
            key: "plan",
            label: "ประเภทการใช้งาน",
          },
          {
            key: "endDate",
            label: "วันสิ้นอายุสัญญา",
          },
          {
            key: "left",
            label: "ระยะคงเหลือสัญญา",
            render: (c) =>
              c.left < 0 ? (
                <Pill
                  color="#D93025"
                  bg="#FCE8E6"
                >
                  หมดอายุ {Math.abs(c.left)} วัน
                </Pill>
              ) : c.left <= 30 ? (
                <Pill
                  color="#B06000"
                  bg="#FEF7E0"
                >
                  เหลือ {c.left} วัน
                </Pill>
              ) : (
                <Pill
                  color="#188038"
                  bg="#E6F4EA"
                >
                  เหลือ {c.left} วัน
                </Pill>
              ),
          },
          {
            key: "status",
            label: "สถานะ",
            render: (c) => (
              <Status value={c.status} />
            ),
          },
          {
            key: "act",
            label: "การจัดการ",
            render: (c) => (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <Btn
                  kind="ghost"
                  onClick={() => openRenew(c)}
                  disabled={c.status === "cancelled"}
                >
                  ต่ออายุ
                </Btn>

                <Btn
                  kind="ghost"
                  onClick={() => openCancel(c)}
                  disabled={c.status === "cancelled"}
                >
                  ยกเลิกสัญญา
                </Btn>
              </div>
            ),
          },
        ]}
        rows={rows}
      />

      {/* Modal ต่ออายุ */}
      {renewing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <Card
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <b style={{ fontSize: 16 }}>
              ต่ออายุสัญญา
            </b>

            <div
              style={{
                fontSize: 13,
                color: "#5F6368",
                marginTop: 6,
              }}
            >
              {renewing.institution}
            </div>

            <Field label="วันสิ้นสุดสัญญาใหม่">
              <Input
                type="date"
                value={renewDate}
                onChange={(e) =>
                  setRenewDate(e.target.value)
                }
              />
            </Field>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 10,
              }}
            >
              <Btn
                kind="ghost"
                onClick={() => setRenewing(null)}
              >
                ย้อนกลับ
              </Btn>

              <Btn
                onClick={confirmRenew}
                disabled={renewSaving}
              >
                {renewSaving
                  ? "กำลังบันทึก..."
                  : "ยืนยันต่ออายุ"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* เอกสารต่ออายุ */}
      {renewDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1001,
          }}
        >
          <Card
            style={{
              width: "min(600px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              <b style={{ fontSize: 18 }}>
                เอกสารยืนยันการต่ออายุสัญญา
              </b>

              <div
                style={{
                  fontSize: 12,
                  color: "#5F6368",
                  marginTop: 4,
                }}
              >
                เลขที่เอกสาร {renewDoc.docNo}
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              <div>
                <b>สถาบัน:</b>{" "}
                {renewDoc.institution}
              </div>
              <div>
                <b>ประเภทการใช้งาน:</b>{" "}
                {renewDoc.plan || "-"}
              </div>
              <div>
                <b>วันสิ้นสุดเดิม:</b>{" "}
                {renewDoc.oldEndDate || "-"}
              </div>
              <div>
                <b>วันสิ้นสุดใหม่:</b>{" "}
                {renewDoc.newEndDate}
              </div>
              <div>
                <b>ดำเนินการโดย:</b>{" "}
                {renewDoc.renewedBy}
              </div>
              <div>
                <b>วันที่ดำเนินการ:</b>{" "}
                {renewDoc.renewedAt}
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 10,
                border: "1px solid #DADCE0",
                borderRadius: 10,
                background: "#F8F9FA",
                fontSize: 12.5,
              }}
            >
              สถานะสัญญา: <b>ใช้งานอยู่</b>
              <br />
              สถานะสิทธิ์สถาบัน:{" "}
              <b>เปิดใช้งาน</b>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <Btn
                kind="ghost"
                onClick={() => setRenewDoc(null)}
              >
                ปิดเอกสาร
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Modal ยกเลิกสัญญา */}
      {canceling && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <Card
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <b style={{ fontSize: 16 }}>
              ยกเลิกสัญญา
            </b>

            <div
              style={{
                fontSize: 13,
                color: "#5F6368",
                marginTop: 6,
              }}
            >
              {canceling.institution}
            </div>

            <Field label="เหตุผลในการยกเลิก">
              <Textarea
                value={cancelReason}
                onChange={(e) =>
                  setCancelReason(e.target.value)
                }
                placeholder="ระบุเหตุผลในการยกเลิกสัญญา"
              />
            </Field>

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              <input
                type="checkbox"
                checked={cancelConfirmed}
                onChange={(e) =>
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
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <Btn
                kind="ghost"
                onClick={() => setCanceling(null)}
              >
                ย้อนกลับ
              </Btn>

              <Btn
                kind="danger"
                onClick={confirmCancel}
                disabled={cancelSaving}
              >
                {cancelSaving
                  ? "กำลังยกเลิก..."
                  : "ยืนยันยกเลิกสัญญา"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* เอกสารยกเลิกสัญญา */}
      {cancelDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1001,
          }}
        >
          <Card
            style={{
              width: "min(600px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              <b style={{ fontSize: 18 }}>
                เอกสารยืนยันการยกเลิกสัญญา
              </b>

              <div
                style={{
                  fontSize: 12,
                  color: "#5F6368",
                  marginTop: 4,
                }}
              >
                เลขที่เอกสาร {cancelDoc.docNo}
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              <div>
                <b>สถาบัน:</b>{" "}
                {cancelDoc.institution}
              </div>
              <div>
                <b>ประเภทการใช้งาน:</b>{" "}
                {cancelDoc.plan || "-"}
              </div>
              <div>
                <b>วันสิ้นสุดสัญญา:</b>{" "}
                {cancelDoc.endDate || "-"}
              </div>
              <div>
                <b>เหตุผล:</b>{" "}
                {cancelDoc.reason}
              </div>
              <div>
                <b>ดำเนินการโดย:</b>{" "}
                {cancelDoc.cancelledBy}
              </div>
              <div>
                <b>วันที่ดำเนินการ:</b>{" "}
                {cancelDoc.cancelledAt}
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 10,
                border: "1px solid #DADCE0",
                borderRadius: 10,
                background: "#F8F9FA",
                fontSize: 12.5,
              }}
            >
              สถานะสัญญา: <b>ยกเลิก</b>
              <br />
              สถานะสิทธิ์สถาบัน:{" "}
              <b>ระงับสิทธิ์</b>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <Btn
                kind="ghost"
                onClick={() => setCancelDoc(null)}
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

function Broadcast({ user }) {
  const { items, create } =
    useCollection("broadcasts");

  const { items: institutions } =
    useCollection("institutionAccess");

  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "ทุกมหาวิทยาลัย",
  });

  const [sending, setSending] = useState(false);

  const set = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  async function send() {
    if (
      !form.title.trim() ||
      !form.body.trim()
    ) {
      alert(
        "กรุณากรอกหัวข้อและเนื้อหา"
      );
      return;
    }

    if (sending) return;

    try {
      setSending(true);

      await create(
        {
          ...form,

          // ใช้ sendAt ให้ตรงกับ backend
          sendAt: new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),

          sentBy: user?.name || "ฝ่ายการตลาด",
        },
        user
      );

      setForm({
        title: "",
        body: "",
        audience: "ทุกมหาวิทยาลัย",
      });

      alert(
        "ส่งข้อความแจ้งเตือนเรียบร้อย"
      );
    } catch (error) {
      alert(
        error?.message ||
          "ส่งข้อความแจ้งเตือนไม่สำเร็จ"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <UCHead
        title="ส่งข้อความแจ้งเตือนระบบถึงทุกมหาวิทยาลัยในระบบ"
        desc="ข้อความจะแสดงบนหน้าแรกของผู้ใช้ทุกคนในสถาบันที่เลือก"
      />

      <Card>
        <Field label="หัวข้อ">
          <Input
            value={form.title}
            onChange={set("title")}
            placeholder="เช่น แจ้งปิดปรับปรุงระบบ"
          />
        </Field>

        <Field label="เนื้อหา">
          <Textarea
            value={form.body}
            onChange={set("body")}
            placeholder="รายละเอียดที่ต้องการแจ้ง"
          />
        </Field>

        <Field label="ผู้รับ">
          <Select
            value={form.audience}
            onChange={set("audience")}
          >
            <option>
              ทุกมหาวิทยาลัย
            </option>

            {institutions.map((i) => (
              <option
                key={i.id}
                value={i.institution}
              >
                {i.institution}
              </option>
            ))}
          </Select>
        </Field>

        <Btn
          onClick={send}
          disabled={sending}
        >
          {sending
            ? "กำลังส่ง..."
            : "ส่งข้อความแจ้งเตือน"}
        </Btn>
      </Card>

      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: "#202124",
          margin: "14px 0 6px",
        }}
      >
        ประวัติการส่ง
      </div>

      {items.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "#5F6368",
          }}
        >
          ยังไม่มีประวัติการส่ง
        </div>
      ) : (
        items.map((b) => (
          <Card key={b.id}>
            <b
              style={{
                fontSize: 14,
                color: "#202124",
              }}
            >
              {b.title}
            </b>

            <div
              style={{
                fontSize: 13,
                color: "#3C4043",
                marginTop: 4,
              }}
            >
              {b.body}
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: "#5F6368",
                marginTop: 8,
              }}
            >
              ถึง {b.audience} ·{" "}
              {b.sendAt ||
                b.sentAt ||
                b.createdAt ||
                "-"}{" "}
              · โดย{" "}
              {b.sentBy || "-"}
            </div>
          </Card>
        ))
      )}
    </>
  );
}

/* =========================================================
   UC-6 : จัดการสิทธิ์ระดับสถาบัน
========================================================= */

const LEVELS = {
  full: "เต็มรูปแบบ",
  standard: "มาตรฐาน",
  readonly: "อ่านอย่างเดียว",
};

const ACCESS_STATUS = {
  active: {
    label: "เปิดใช้งาน",
    color: "#188038",
    bg: "#E6F4EA",
  },

  paused: {
    label: "หยุดชั่วคราว",
    color: "#B06000",
    bg: "#FEF7E0",
  },

  suspended: {
    label: "ระงับสิทธิ์",
    color: "#D93025",
    bg: "#FCE8E6",
  },
};

const MODULES = [
  ["map", "แผนที่"],
  ["events", "กิจกรรม"],
  ["rooms", "ข้อมูลห้อง"],
  ["reports", "รายงาน"],
];

function Access({ user }) {
  const {
    items,
    patch,
  } = useCollection("institutionAccess");

  const {
    items: users,
  } = useCollection("users");

  const {
    items: history,
  } = useCollection("accessHistory");

  const [q, setQ] = useState("");

  // เก็บสถานะที่กำลังเปลี่ยนไว้ก่อน backend reload
  const [
    statusOverrides,
    setStatusOverrides,
  ] = useState({});

  /*
   * สำคัญ:
   * sort สำเนาใหม่ ไม่แก้ items ต้นฉบับ
   * จึงไม่ทำให้ Card สลับตำแหน่งหลังแก้ Module
   */
  const rows = useMemo(() => {
    return items
      .map((row) => ({
        ...row,

        accessStatus:
          statusOverrides[row.id] ||
          row.accessStatus ||
          "active",

        modules: Array.isArray(row.modules)
          ? row.modules
          : [],
      }))
      .filter((row) =>
        String(row.institution || "")
          .toLowerCase()
          .includes(q.toLowerCase())
      )
      .sort((a, b) =>
        String(a.id || "").localeCompare(
          String(b.id || ""),
          undefined,
          {
            numeric: true,
          }
        )
      );
  }, [
    items,
    q,
    statusOverrides,
  ]);

  function staffFor(institution) {
    return users.filter(
      (u) =>
        u.institution === institution &&
        u.role !== "user"
    );
  }

  /* -------------------------------------------------------
     เปลี่ยนสถานะสิทธิ์
  ------------------------------------------------------- */

  async function changeAccess(
    row,
    accessStatus
  ) {
    const config =
      ACCESS_STATUS[accessStatus];

    if (!config) return;

    const currentStatus =
      row.accessStatus || "active";

    if (
      currentStatus === accessStatus
    ) {
      return;
    }

    const confirmed = confirm(
      `เปลี่ยนสิทธิ์ ${row.institution} เป็น “${config.label}” หรือไม่?`
    );

    if (!confirmed) return;

    const previousStatus =
      currentStatus;

    // เปลี่ยนหน้าจอทันที
    setStatusOverrides((prev) => ({
      ...prev,
      [row.id]: accessStatus,
    }));

    try {
      const updated = await patch(
        row.id,
        {
          accessStatus,

          updatedAt: new Date()
            .toISOString()
            .slice(0, 10),
        },
        user
      );

      // ใช้ค่าที่ backend ยืนยัน
      const confirmedStatus =
        updated?.accessStatus ||
        accessStatus;

      setStatusOverrides((prev) => ({
        ...prev,
        [row.id]: confirmedStatus,
      }));

      alert(
        `อัปเดตสถานะ ${config.label} เรียบร้อย`
      );
    } catch (error) {
      // ถ้า backend ไม่สำเร็จ ให้ย้อนกลับ
      setStatusOverrides((prev) => ({
        ...prev,
        [row.id]: previousStatus,
      }));

      alert(
        error?.message ||
          "อัปเดตสถานะไม่สำเร็จ"
      );
    }
  }

  /* -------------------------------------------------------
     เปิด / ปิด Module
  ------------------------------------------------------- */

  async function toggleModule(
    row,
    moduleKey
  ) {
    const currentModules =
      Array.isArray(row.modules)
        ? row.modules
        : [];

    const hasModule =
      currentModules.includes(
        moduleKey
      );

    const modules = hasModule
      ? currentModules.filter(
          (x) => x !== moduleKey
        )
      : [
          ...currentModules,
          moduleKey,
        ];

    try {
      await patch(
        row.id,
        {
          modules,

          updatedAt: new Date()
            .toISOString()
            .slice(0, 10),
        },
        user
      );
    } catch (error) {
      alert(
        error?.message ||
          "อัปเดตโมดูลไม่สำเร็จ"
      );
    }
  }

  return (
    <>
      <UCHead
        title="จัดการสิทธิ์การเข้าถึงระดับสถาบัน"
        desc="ดูรายชื่อสถาบัน เจ้าหน้าที่ สถานะสิทธิ์ และปรับเปิดใช้/หยุดชั่วคราว/ระงับสิทธิ์ได้ทันที"
      />

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาชื่อสถาบัน"
      />

      {rows.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "#5F6368",
            padding: "10px 2px",
          }}
        >
          ไม่พบข้อมูลสถาบัน
        </div>
      ) : (
        rows.map((row) => {
          const access =
            ACCESS_STATUS[
              row.accessStatus
            ] ||
            ACCESS_STATUS.active;

          const staff =
            staffFor(row.institution);

          return (
            <Card key={row.id}>
              {/* หัว Card */}
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <b
                  style={{
                    fontSize: 14.5,
                    color: "#202124",
                  }}
                >
                  {row.institution}
                </b>

                <Pill
                  color={access.color}
                  bg={access.bg}
                >
                  {access.label}
                </Pill>
              </div>

              {/* เจ้าหน้าที่ */}
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#5F6368",
                }}
              >
                <b
                  style={{
                    color: "#202124",
                  }}
                >
                  เจ้าหน้าที่ประจำสถาบัน
                </b>

                {staff.length === 0
                  ? " — ไม่พบข้อมูล"
                  : " " +
                    staff
                      .map(
                        (u) =>
                          `${u.name} (${u.email})`
                      )
                      .join(" · ")}
              </div>

              {/* ตั้งค่า */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                {/* ระดับสิทธิ์ */}
                <Field label="ระดับสิทธิ์">
                  <Select
                    value={
                      row.level ||
                      "standard"
                    }
                    onChange={async (
                      e
                    ) => {
                      try {
                        await patch(
                          row.id,
                          {
                            level:
                              e.target
                                .value,

                            updatedAt:
                              new Date()
                                .toISOString()
                                .slice(
                                  0,
                                  10
                                ),
                          },
                          user
                        );
                      } catch (error) {
                        alert(
                          error?.message ||
                            "อัปเดตระดับสิทธิ์ไม่สำเร็จ"
                        );
                      }
                    }}
                    style={{
                      width: 170,
                    }}
                  >
                    {Object.entries(
                      LEVELS
                    ).map(
                      ([key, value]) => (
                        <option
                          key={key}
                          value={key}
                        >
                          {value}
                        </option>
                      )
                    )}
                  </Select>
                </Field>

                {/* จำนวนบัญชี */}
                <Field label="จำนวนบัญชีสูงสุด">
                  <Input
                    type="number"
                    min="0"
                    defaultValue={
                      row.seats ?? 0
                    }
                    onBlur={async (e) => {
                      try {
                        await patch(
                          row.id,
                          {
                            seats: Math.max(
                              0,
                              Number(
                                e.target
                                  .value
                              ) || 0
                            ),

                            updatedAt:
                              new Date()
                                .toISOString()
                                .slice(
                                  0,
                                  10
                                ),
                          },
                          user
                        );
                      } catch (error) {
                        alert(
                          error?.message ||
                            "อัปเดตจำนวนบัญชีไม่สำเร็จ"
                        );
                      }
                    }}
                    style={{
                      width: 130,
                    }}
                  />
                </Field>
              </div>

              {/* โมดูล */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#5F6368",
                  marginBottom: 5,
                  marginTop: 4,
                }}
              >
                โมดูลที่เปิดใช้
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                }}
              >
                {MODULES.map(
                  ([key, label]) => {
                    const enabled =
                      row.modules.includes(
                        key
                      );

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          toggleModule(
                            row,
                            key
                          )
                        }
                        style={{
                          border:
                            "1px solid",
                          borderColor:
                            enabled
                              ? "#1A73E8"
                              : "#DADCE0",
                          background:
                            enabled
                              ? "#E8F0FE"
                              : "#fff",
                          color:
                            enabled
                              ? "#1A73E8"
                              : "#5F6368",
                          borderRadius: 999,
                          padding:
                            "5px 12px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor:
                            "pointer",
                        }}
                      >
                        {enabled
                          ? "✓ "
                          : ""}
                        {label}
                      </button>
                    );
                  }
                )}
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  color: "#5F6368",
                  marginTop: 9,
                }}
              >
                อัปเดตล่าสุด{" "}
                {row.updatedAt || "-"}
              </div>

              {/* ปุ่มเปลี่ยนสถานะ */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {Object.entries(
                  ACCESS_STATUS
                ).map(
                  ([key, value]) => (
                    <Btn
                      key={key}
                      kind={
                        key ===
                        row.accessStatus
                          ? "primary"
                          : "ghost"
                      }
                      onClick={() =>
                        changeAccess(
                          row,
                          key
                        )
                      }
                    >
                      {value.label}
                    </Btn>
                  )
                )}
              </div>
            </Card>
          );
        })
      )}

      {/* ประวัติ */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: "#202124",
          margin: "16px 0 6px",
        }}
      >
        ประวัติการเปลี่ยนสิทธิ์
      </div>

      {history.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "#5F6368",
          }}
        >
          ยังไม่มีประวัติ
        </div>
      ) : (
        history
          .slice(0, 20)
          .map((h) => (
            <Card key={h.id}>
              <div
                style={{
                  fontSize: 13,
                  color: "#202124",
                }}
              >
                <b>
                  {h.institution}
                </b>{" "}
                ·{" "}
                {h.beforeStatusLabel ||
                  h.beforeStatus ||
                  "-"}{" "}
                →{" "}
                {h.afterStatusLabel ||
                  h.afterStatus ||
                  "-"}
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  color: "#5F6368",
                  marginTop: 5,
                }}
              >
                {h.changedAt ||
                  h.createdAt ||
                  "-"}{" "}
                · โดย{" "}
                {h.actorName ||
                  "ระบบ"}
              </div>
            </Card>
          ))
      )}
    </>
  );
}