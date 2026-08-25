// สารบัญ Use Case ของ SciMap — ใช้สร้างเมนูของแต่ละ Actor อัตโนมัติ
export const ROLE_LABEL = {
  exec: "บริหาร",
  marketing: "ฝ่ายการตลาด",
  gis: "ผู้ดูแลข้อมูลสถานที่และอาคาร",
  admin: "ฝ่ายดูแลระบบ",
  pr: "ฝ่ายประชาสัมพันธ์",
  registrar: "ฝ่ายทะเบียน",
  user: "ผู้ใช้งานทั่วไป",
};

export const USE_CASES = {
  exec: [
    { code: "UC1", key: "overview", title: "ดูรายงานและสถิติภาพรวมระบบ", icon: "📊" },
    { code: "UC2", key: "feedback", title: "ตรวจสอบข้อเสนอแนะและคำขอจากผู้ใช้งานทั่วไป", icon: "💬" },
    { code: "UC3", key: "audit", title: "ตรวจสอบบันทึกประวัติการแก้ไขข้อมูลแผนที่", icon: "🧾" },
  ],
  marketing: [
    { code: "UC4", key: "contracts", title: "ติดตามวันหมดอายุสัญญาบริการ", icon: "📄" },
    { code: "UC5", key: "broadcast", title: "ส่งข้อความแจ้งเตือนระบบถึงทุกมหาวิทยาลัย", icon: "📢" },
    { code: "UC6", key: "access", title: "จัดการสิทธิ์การเข้าถึงระดับสถาบัน", icon: "🏛️" },
  ],
  gis: [
    { code: "UC7", key: "boundary", title: "จัดการขอบเขตแผนผัง", icon: "🗺️" },
    { code: "UC8", key: "assets", title: "จัดการข้อมูลประกอบแผนผัง", icon: "🧩" },
    { code: "UC9", key: "save", title: "บันทึกข้อมูลแผนที่", icon: "💾" },
  ],
  admin: [
    { code: "UC10", key: "users", title: "ค้นหาและเรียกดูข้อมูลผู้ใช้งาน", icon: "👥" },
    { code: "UC11", key: "requests", title: "ค้นหาและเรียกดูข้อมูลคำร้อง", icon: "🔎" },
    { code: "UC12", key: "roles", title: "จัดการแก้ไขสิทธิ์ผู้ใช้งาน", icon: "🔑" },
    { code: "UC13", key: "review", title: "ตรวจสอบและพิจารณาคำร้อง", icon: "✅" },
    { code: "UC14", key: "report", title: "จัดทำรายงานสรุปข้อมูลคำร้อง", icon: "📑" },
    { code: "UC15", key: "quota", title: "กำหนดจำนวนการส่งคำร้อง", icon: "⚖️" },
    { code: "UC16", key: "status", title: "จัดการสถานะบัญชีของผู้ใช้งาน", icon: "🚦" },
  ],
  pr: [
    { code: "", key: "news", title: "ข้อมูลข่าวสาร", icon: "svg:news" },
    { code: "", key: "events", title: "ข้อมูลกิจกรรม", icon: "svg:bullhorn" },
    { code: "", key: "interest", title: "ตรวจสอบสถิติความสนใจของกิจกรรม", icon: "svg:growth" },
    { code: "", key: "categories", title: "เพิ่ม / แก้ไข / ลบหมวดหมู่กิจกรรมและสถานที่", icon: "svg:folder" },
  ],
  registrar: [
    { code: "UC21", key: "rooms", title: "จัดการรายละเอียดข้อมูลห้องต่างๆ บนตึก บนแผนที่", icon: "🚪" },
    { code: "UC22", key: "floors", title: "จัดการรายละเอียดข้อมูลชั้นต่างๆ บนตึก บนแผนที่", icon: "🏢" },
  ],
  user: [
    { code: "UC23", key: "search", title: "ค้นหาห้องเรียน อาคาร หรือชื่ออาจารย์", icon: "🔍" },
    { code: "UC24", key: "route", title: "ค้นหาวิธีไปยังจุดหมาย", icon: "🧭" },
    { code: "UC25", key: "feedback", title: "ส่งข้อเสนอแนะหรือแจ้งปัญหาการใช้ระบบ", icon: "✉️" },
    { code: "UC26", key: "events", title: "เพิ่มกิจกรรมที่สนใจเข้าร่วม", icon: "⭐" },
  ],
};

// UC27/UC28 เป็นของผู้ใช้งานทุกคนในระบบ (อยู่ในหน้า Auth)
export const COMMON_UC = [
  { code: "UC27", title: "ลงทะเบียนเข้าใช้ระบบ" },
  { code: "UC28", title: "เข้าสู่ระบบด้วย E-mail" },
];
