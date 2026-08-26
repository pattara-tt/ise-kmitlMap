// Mock backend สำหรับหน้า EVENT — โครง response ออกแบบไว้ให้สลับเป็น DB จริงได้ภายหลัง
// TODO(prod): ต่อ database จริง (เช่น Supabase) + ผูกกับ user id จากระบบ login
export const dynamic = "force-dynamic";

const MOCK = {
  user: {
    name: "สมชาย ใจดี",     // ชื่อ (แสดงผล)
    username: "user01",     // user name (สำหรับ login/อ้างอิง)
  },
  // ประวัติการเข้าร่วมกิจกรรม — event ที่ผู้ใช้เข้าร่วมไปแล้ว
  history: [
    { id: "h1", eventName: "เดินวิ่งการกุศล สจล.", location: "ลานพระจอม สจล.", date: "12 ก.ค. 69", status: "เข้าร่วมแล้ว" },
    { id: "h2", eventName: "ปั่นจักรยานรอบเมือง", location: "ลาดกระบัง", date: "1 ก.ค. 69", status: "เข้าร่วมแล้ว" },
  ],
  // กิจกรรมที่เข้าร่วมได้ — event ที่เปิดรับสมัครอยู่ตอนนี้
  joinable: [
    { id: "e1", eventName: "เดิน-วิ่งเก็บระยะทางประจำเดือน", location: "รอบ สจล.", date: "1-31 ส.ค. 69", desc: "เดินสะสมระยะทางแลกคูปอง" },
    { id: "e2", eventName: "ปั่นสำรวจเส้นทางลาดกระบัง", location: "เขตลาดกระบัง", date: "15 ส.ค. 69", desc: "ช่วยสำรวจ/รายงานปัญหาทางเท้า" },
  ],
};

export async function GET() {
  return Response.json(MOCK, { headers: { "Cache-Control": "no-store" } });
}

// รับแจ้งปัญหาแบบง่าย — แค่ข้อความ (location/event ผูกมาจาก context ฝั่ง client ถ้ามี)
export async function POST(req) {
  try {
    const body = await req.json();
    const { message, location, eventId } = body || {};
    if (!message || !message.trim()) {
      return Response.json({ error: "กรุณากรอกข้อความแจ้งปัญหา" }, { status: 400 });
    }
    // TODO(prod): บันทึกลง DB จริง พร้อม user id / timestamp
    console.log("[report]", { message, location, eventId, at: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  }
}