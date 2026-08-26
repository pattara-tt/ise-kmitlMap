// app/api/report/route.js — endpoint จริงคือ /api/report (ต้องตรงกับ fetch("/api/report", ...) ฝั่ง NotificationPage.jsx)

let reports = []; // ⚠️ เก็บในหน่วยความจำเฉยๆ (reset ทุกครั้งที่ restart server / บน serverless แต่ละ instance ก็คนละก้อนกัน) — ใช้ได้แค่เดโม ถ้าจะขึ้นจริงต้องต่อฐานข้อมูล

export async function GET() {
  return Response.json({
    success: true,
    reports,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    // 🔍 validate ฝั่ง server ด้วย (กันกรณี client bypass การเช็คในฟอร์ม หรือมีคนยิง request ตรงๆ)
    const subject = (body.subject || "").trim();
    const detail = (body.detail || "").trim();
    const faculty = body.faculty || "";
    const building = body.building || "";
    const floor = body.floor || "";
    const room = (body.room || "").trim();

    if (!subject || !detail) {
      return Response.json({ success: false, error: "กรุณากรอกหัวเรื่องและรายละเอียด" }, { status: 400 });
    }
    if (!faculty || !building || !floor || !room) {
      return Response.json({ success: false, error: "กรุณาระบุสถานที่ให้ครบ: คณะ อาคาร ชั้น และห้อง" }, { status: 400 });
    }

    // 🗂️ รับโครงสร้างแบนตามที่ NotificationPage.jsx ส่งจริง ({name, subject, type, date, detail, faculty, building, floor, room})
    // ไม่ใช่ {requester, category, location:{...}} แบบเดิม — ของเดิมทำให้ข้อมูลหายหมดเพราะฟิลด์ไม่ตรงกันเลย
    const report = {
      id: "RPT-" + Date.now(),
      requester: body.name || "",
      subject,
      category: body.type || "ทั่วไป",
      date: body.date || new Date().toISOString().slice(0, 10),
      detail,
      location: { faculty, building, floor, room },
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    reports.unshift(report);

    return Response.json({
      success: true,
      message: "Report submitted successfully.",
      report,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}