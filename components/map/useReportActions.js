"use client";



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
      // มีข้อมูลห้องอยู่ในระบบ (rooms) แล้ว → prefill เป็นข้อมูลเดิมให้แก้
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
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        teacher: room.teacher,
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
    if (!reportForm.note?.trim()) {
      alert("กรุณากรอกรายละเอียดปัญหา");
      return;
    }
    if (reportForm.roomId != null) {
      const before = reportForm.before || {};
      const after = {
        name: String(reportForm.name ?? "").trim(),
        type: String(reportForm.type ?? "").trim(),
        capacity: reportForm.capacity === "" || reportForm.capacity == null ? null : Number(reportForm.capacity),
        teacher: String(reportForm.teacher ?? "").trim()
      };
      const changed = after.name !== String(before.name ?? "").trim() || after.type !== String(before.type ?? "").trim() || after.capacity !== (before.capacity == null ? null : Number(before.capacity)) || after.teacher !== String(before.teacher ?? "").trim();
      if (!changed) {
        alert("กรุณาแก้ไขข้อมูลอย่างน้อย 1 รายการก่อนส่งคำร้อง");
        return;
      }
    }
    const dailyLimit = Number(requestQuota?.perUserPerDay ?? 3);
    const monthlyLimit = Number(requestQuota?.perUserPerMonth ?? 20);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    const userRequests = requests.filter(r => r.userId === user.id && r.status !== "cancelled");
    const todayCount = userRequests.filter(r => String(r.createdAt || "").slice(0, 10) === today).length;
    const monthlyCount = userRequests.filter(r => String(r.createdAt || "").slice(0, 7) === currentMonth).length;
    if (todayCount >= dailyLimit) {
      alert(`ส่งคำร้องได้สูงสุด ${dailyLimit} เรื่องต่อวัน`);
      return;
    }
    if (monthlyCount >= monthlyLimit) {
      alert(`ส่งคำร้องได้สูงสุด ${monthlyLimit} เรื่องต่อเดือน`);
      return;
    }
    setReportSending(true);
    const after = reportForm.roomId != null ? {
      name: String(reportForm.name ?? "").trim(),
      type: String(reportForm.type ?? "").trim(),
      capacity: reportForm.capacity === "" || reportForm.capacity == null ? null : Number(reportForm.capacity),
      teacher: String(reportForm.teacher ?? "").trim()
    } : {
      name: String(reportForm.name ?? "").trim()
    };
    try {
      await createRequest({
        userId: user.id,
        roomId: reportForm.roomId,
        nodeId: reportForm.nodeId,
        subject: reportForm.subject?.trim() || "แจ้งแก้ไขข้อมูลสถานที่",
        detail: reportForm.note.trim(),
        before: reportForm.before,
        after,
        status: "pending"
      });
      alert("ส่งคำร้องแจ้งปัญหาเรียบร้อย รอผู้ดูแลระบบตรวจสอบ");
      setReportOpen(false);
      setReportForm(null);
    } catch (e) {
      console.error("submitReport error:", e);
      alert(`ส่งคำร้องไม่สำเร็จ: ${e.message}`);
    } finally {
      setReportSending(false);
    }
  }
  
  // เปิด/ปิดเลเยอร์บนแผนที่ตาม chip (ทางเชื่อม/skywalk, ห้องน้ำ) — ตัด Street light chip ออกแล้ว

  return { openReportForm, submitReport };
}
