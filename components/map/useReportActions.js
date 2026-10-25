"use client";

import { askConfirm, notify } from "../dialogs";

// ป้ายชื่อช่องข้อมูลห้อง ใช้แสดงในกล่องยืนยัน
const FIELD_LABELS = { name: "ชื่อสถานที่", type: "ประเภท", capacity: "ความจุ (คน)", teacher: "อาจารย์ประจำห้อง" };
const show = v => (v === null || v === undefined || String(v).trim() === "" ? "-" : String(v));
const clean = v => String(v ?? "").trim();

export function useReportActions({ 
  nodeIdByKey,
  placeCard,
  rooms,
  setReportForm,
  setReportOpen,
  createRequest,
  reportForm,
  requestQuota,
  requests,
  setReportSending,
  user
 }) {
  // เปิดฟอร์มแจ้งปัญหาของสถานที่ที่กำลังเปิดการ์ดอยู่
  function openReportForm() {
    if (!placeCard) return;
    const room = rooms.find(r => r.nodeId === (nodeIdByKey[placeCard.nodeId] || placeCard.nodeId));
    if (room) {
      // มีข้อมูลห้องอยู่ในระบบ (rooms) แล้ว → เก็บข้อมูลเดิมไว้ใน before ส่วนช่องกรอกเริ่มต้นเป็นค่าว่าง
      // (ช่องว่าง = ไม่แก้ไข ระบบจะใช้ข้อมูลปัจจุบันของช่องนั้นตามเดิม)
      setReportForm({
        roomId: room.id,
        nodeId: room.nodeId,
        before: {
          name: room.name,
          type: room.type,
          capacity: room.capacity,
          teacher: room.teacher
        },
        subject: "",
        name: "",
        type: "",
        capacity: "",
        teacher: "",
        note: ""
      });
    } else {
      // สถานที่ประเภทนี้ยังไม่มีข้อมูลโครงสร้างใน rooms (เช่น ห้องน้ำ/ลิฟต์) → ใช้ฟอร์มข้อความอย่างเดียว
      setReportForm({
        roomId: null,
        nodeId: nodeIdByKey[placeCard.nodeId] || placeCard.nodeId || null,
        before: {
          name: placeCard.name
        },
        subject: "",
        name: placeCard.name,
        note: ""
      });
    }
    setReportOpen(true);
  }

  async function submitReport() {
    if (!reportForm || !user) return;
    const isRoomForm = reportForm.roomId != null;
    const note = clean(reportForm.note);
    const subject = clean(reportForm.subject);
    const before = reportForm.before || {};
    let after;
    let changes = [];

    // 0) ต้องระบุหัวข้อเสมอ (ทุกฟอร์ม)
    if (!subject) {
      await notify("กรุณาระบุหัวข้อของคำร้อง", { tone: "warning", title: "ยังไม่ได้ระบุหัวข้อ" });
      return;
    }

    if (isRoomForm) {
      const typed = {
        name: clean(reportForm.name),
        type: clean(reportForm.type),
        capacity: clean(reportForm.capacity),
        teacher: clean(reportForm.teacher)
      };
      const filled = Object.keys(typed).filter(k => typed[k] !== "");
      // 1) ต้องกรอกข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ช่อง
      if (!filled.length) {
        await notify("กรุณากรอกข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 รายการ\nช่องที่ไม่ได้กรอก ระบบจะใช้ข้อมูลปัจจุบันตามเดิม", { tone: "warning", title: "ยังไม่ได้ระบุข้อมูลที่ต้องการแก้ไข" });
        return;
      }
      if (typed.capacity !== "") {
        const n = Number(typed.capacity);
        if (!Number.isInteger(n) || n < 0) {
          await notify("ความจุต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป", { tone: "warning", title: "ข้อมูลความจุไม่ถูกต้อง" });
          return;
        }
      }
      // ช่องที่ไม่ได้กรอก → ใช้ข้อมูลปัจจุบันในระบบ
      const beforeNorm = {
        name: clean(before.name),
        type: clean(before.type),
        capacity: before.capacity == null ? null : Number(before.capacity),
        teacher: clean(before.teacher)
      };
      after = {
        name: typed.name || beforeNorm.name,
        type: typed.type || beforeNorm.type,
        capacity: typed.capacity !== "" ? Number(typed.capacity) : beforeNorm.capacity,
        teacher: typed.teacher || beforeNorm.teacher
      };
      changes = filled.filter(k => after[k] !== beforeNorm[k]).map(k => ({ label: FIELD_LABELS[k], from: show(beforeNorm[k]), value: show(after[k]) }));
      // 2) ข้อมูลที่กรอกต้องต่างจากข้อมูลปัจจุบันอย่างน้อย 1 รายการ
      if (!changes.length) {
        await notify("ข้อมูลที่กรอกตรงกับข้อมูลปัจจุบันในระบบ จึงไม่มีรายการที่ต้องแก้ไข", { tone: "warning", title: "ไม่พบรายการที่เปลี่ยนแปลง" });
        return;
      }
      // 3) ต้องแนบเหตุผลเสมอ
      if (!note) {
        await notify("กรุณาระบุเหตุผลประกอบการขอแก้ไขข้อมูล", { tone: "warning", title: "ยังไม่ได้ระบุเหตุผล" });
        return;
      }
    } else {
      if (!note) {
        await notify("กรุณากรอกรายละเอียดปัญหา", { tone: "warning", title: "ยังไม่ได้ระบุรายละเอียด" });
        return;
      }
      after = { name: clean(reportForm.name) };
    }

    // กล่องยืนยันก่อนส่งจริง
    const placeLabel = clean(before.name) || clean(placeCard?.name) || "สถานที่นี้";
    const notePreview = note.length > 120 ? `${note.slice(0, 120)}…` : note;
    const details = isRoomForm
      ? [...changes, { label: "เหตุผล", value: notePreview }]
      : [{ label: "รายละเอียด", value: notePreview }];
    const confirmed = await askConfirm(
      isRoomForm
        ? `ต้องการส่งคำร้องขอแก้ไขข้อมูล “${placeLabel}” ใช่หรือไม่?`
        : `ต้องการส่งคำร้องแจ้งปัญหา “${placeLabel}” ใช่หรือไม่?`,
      {
        title: "ยืนยันการส่งคำร้อง",
        tone: "question",
        details,
        footnote: "คำร้องจะถูกส่งให้ผู้ดูแลระบบตรวจสอบ และนับเป็น 1 ครั้งในโควต้าของคุณ",
        confirmLabel: "ยืนยันส่งคำร้อง",
        cancelLabel: "ตรวจสอบอีกครั้ง"
      }
    );
    if (!confirmed) return;

    setReportSending(true);
    try {
      await createRequest({
        userId: user.id,
        roomId: reportForm.roomId,
        nodeId: reportForm.nodeId,
        subject,
        detail: note,
        before: reportForm.before,
        after,
        status: "pending"
      });
      setReportOpen(false);
      setReportForm(null);
      notify("ส่งคำร้องเรียบร้อยแล้ว ผู้ดูแลระบบจะตรวจสอบและแจ้งผลให้ทราบ", { tone: "success", title: "ส่งคำร้องสำเร็จ" });
    } catch (e) {
      console.error("submitReport error:", e);
      notify(`ส่งคำร้องไม่สำเร็จ: ${e.message}`, { tone: "error", title: "ส่งคำร้องไม่สำเร็จ" });
    } finally {
      setReportSending(false);
    }
  }

  // เปิด/ปิดเลเยอร์บนแผนที่ตาม chip (ทางเชื่อม/skywalk, ห้องน้ำ) — ตัด Street light chip ออกแล้ว

  return { openReportForm, submitReport };
}