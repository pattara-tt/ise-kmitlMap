"use client";

import { useEffect, useMemo, useState } from "react";

const FACULTIES = [
  "คณะวิศวกรรมศาสตร์",
  "คณะสถาปัตยกรรม ศิลปะและการออกแบบ",
  "คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี",
  "คณะเทคโนโลยีการเกษตร",
  "คณะวิทยาศาสตร์",
  "คณะเทคโนโลยีสารสนเทศ",
  "คณะอุตสาหกรรมอาหาร",
  "คณะบริหารธุรกิจ",
  "วิทยาลัยนวัตกรรมการผลิตขั้นสูง",
  "อื่น ๆ",
];

const BUILDINGS_BY_FACULTY = {
  "คณะวิทยาศาสตร์": ["SC8", "SC9", "อาคารจุฬาภรณวลัยลักษณ์ 1", "อาคารจุฬาภรณวลัยลักษณ์ 2"],
  "คณะวิศวกรรมศาสตร์": ["อาคาร 12 ชั้น", "อาคารเรียนรวม", "อาคารปฏิบัติการวิศวกรรม"],
  "คณะเทคโนโลยีสารสนเทศ": ["อาคารคณะเทคโนโลยีสารสนเทศ"],
  "อื่น ๆ": ["อาคารส่วนกลาง", "พื้นที่ภายนอกอาคาร"],
};

const DEFAULT_BUILDINGS = ["อาคารเรียนรวม", "อาคารสำนักงาน", "อาคารกิจกรรมนักศึกษา", "อื่น ๆ"];
const FLOORS = Array.from({ length: 20 }, (_, index) => String(index + 1));

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAutoUserName() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("username") ||
    localStorage.getItem("userName") ||
    localStorage.getItem("displayName") ||
    "ผู้ใช้งาน"
  );
}

const initialForm = {
  name: "",
  subject: "",
  type: "ทั่วไป",
  date: getToday(),
  detail: "",
  faculty: "",
  building: "",
  floor: "",
  room: "",
};

export default function ReportPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm((current) => ({ ...current, name: getAutoUserName() }));
  }, []);

  const buildingOptions = useMemo(() => {
    if (!form.faculty) return [];
    return BUILDINGS_BY_FACULTY[form.faculty] || DEFAULT_BUILDINGS;
  }, [form.faculty]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => {
      if (name === "faculty") {
        return { ...current, faculty: value, building: "", floor: "", room: "" };
      }

      if (name === "building") {
        return { ...current, building: value, floor: "", room: "" };
      }

      if (name === "floor") {
        return { ...current, floor: value, room: "" };
      }

      return { ...current, [name]: value };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!form.subject.trim() || !form.detail.trim()) {
      setStatus({ type: "error", message: "กรุณากรอกหัวเรื่องและรายละเอียด" });
      return;
    }

    if (!form.faculty || !form.building || !form.floor || !form.room.trim()) {
      setStatus({ type: "error", message: "กรุณาระบุสถานที่ให้ครบ: คณะ อาคาร ชั้น และห้อง" });
      return;
    }

    try {
      setSubmitting(true);

      // 🔧 แก้ endpoint จาก "/api" เป็น "/api/report" — ต้องตรงกับตำแหน่งไฟล์จริง app/api/report/route.js
      // (ของเดิมยิงไป "/api" ซึ่งไม่มี route รับ จะได้ 404 เสมอ ฟอร์มไม่เคยส่งสำเร็จจริง)
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถส่งคำร้องได้");
      }

      setStatus({
        type: "success",
        message: `ส่งคำร้องสำเร็จ เลขที่คำร้อง ${data.report.id}`,
      });

      setForm((current) => ({
        ...initialForm,
        name: current.name,
        date: getToday(),
      }));
    } catch (error) {
      setStatus({ type: "error", message: error.message || "เกิดข้อผิดพลาด" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bdi-page" style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.headingWrap}>
          <h2 style={styles.heading}>ยื่นคำร้องรายงานปัญหา</h2>
          <p style={styles.subheading}>กรอกข้อมูลปัญหาและสถานที่ให้ครบถ้วน</p>
        </div>

        <label style={styles.label}>
          ชื่อผู้ยื่นคำร้อง
          <input
            name="name"
            value={form.name}
            readOnly
            style={{ ...styles.input, ...styles.readOnly }}
          />
        </label>

        <label style={styles.label}>
          หัวเรื่อง <span style={styles.required}>*</span>
          <input
            name="subject"
            value={form.subject}
            onChange={updateField}
            placeholder="เช่น หลอดไฟชำรุดหน้าห้องเรียน"
            maxLength={120}
            style={styles.input}
          />
        </label>

        <div style={styles.twoColumns}>
          <label style={styles.label}>
            ประเภทปัญหา
            <select name="type" value={form.type} onChange={updateField} style={styles.input}>
              <option value="ทั่วไป">ทั่วไป</option>
              <option value="อาคาร">อาคาร</option>
              <option value="แจ้งซ่อม">แจ้งซ่อม</option>
            </select>
          </label>

          <label style={styles.label}>
            วันที่
            <input name="date" type="date" value={form.date} onChange={updateField} style={styles.input} />
          </label>
        </div>

        <label style={styles.label}>
          รายละเอียด <span style={styles.required}>*</span>
          <textarea
            name="detail"
            value={form.detail}
            onChange={updateField}
            placeholder="อธิบายปัญหา อาการ หรือสิ่งที่ต้องการให้ดำเนินการ"
            rows={5}
            maxLength={1500}
            style={{ ...styles.input, ...styles.textarea }}
          />
        </label>

        <div style={styles.locationBox}>
          <h3 style={styles.locationTitle}>สถานที่เกิดปัญหา</h3>

          <label style={styles.label}>
            คณะ
            <select name="faculty" value={form.faculty} onChange={updateField} style={styles.input}>
              <option value="">เลือกคณะ</option>
              {FACULTIES.map((faculty) => (
                <option key={faculty} value={faculty}>{faculty}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            อาคาร
            <select
              name="building"
              value={form.building}
              onChange={updateField}
              disabled={!form.faculty}
              style={styles.input}
            >
              <option value="">เลือกอาคาร</option>
              {buildingOptions.map((building) => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </label>

          <div style={styles.twoColumns}>
            <label style={styles.label}>
              ชั้น
              <select
                name="floor"
                value={form.floor}
                onChange={updateField}
                disabled={!form.building}
                style={styles.input}
              >
                <option value="">เลือกชั้น</option>
                {FLOORS.map((floor) => (
                  <option key={floor} value={floor}>ชั้น {floor}</option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              ห้อง
              <input
                name="room"
                value={form.room}
                onChange={updateField}
                disabled={!form.floor}
                placeholder="เช่น SC8-101"
                style={styles.input}
              />
            </label>
          </div>
        </div>

        {status.message ? (
          <div style={status.type === "success" ? styles.success : styles.error}>
            {status.message}
          </div>
        ) : null}

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? "กำลังส่งคำร้อง..." : "ยืนยันการยื่นคำร้อง"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    overflowY: "auto",
    padding: "20px 16px 110px",
    background: "#f5f7fb",
  },
  card: {
    width: "min(680px, 100%)",
    margin: "0 auto",
    padding: 20,
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 8px 30px rgba(31, 41, 55, 0.08)",
  },
  headingWrap: { marginBottom: 20 },
  heading: { margin: 0, color: "#17203a", fontSize: 24 },
  subheading: { margin: "6px 0 0", color: "#6b7280", fontSize: 14 },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginBottom: 15,
    color: "#27314d",
    fontSize: 14,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    minHeight: 46,
    boxSizing: "border-box",
    border: "1px solid #d9deea",
    borderRadius: 12,
    padding: "11px 13px",
    background: "#ffffff",
    color: "#17203a",
    fontSize: 15,
    outline: "none",
  },
  readOnly: { background: "#f1f3f7", color: "#667085" },
  textarea: { resize: "vertical", minHeight: 120, fontFamily: "inherit" },
  required: { color: "#d92d20" },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
  },
  locationBox: {
    marginTop: 4,
    padding: 16,
    border: "1px solid #e1e5ef",
    borderRadius: 16,
    background: "#fafbff",
  },
  locationTitle: { margin: "0 0 15px", color: "#293deb", fontSize: 17 },
  button: {
    width: "100%",
    minHeight: 50,
    marginTop: 18,
    border: 0,
    borderRadius: 14,
    background: "#293deb",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  success: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "#ecfdf3",
    color: "#067647",
    fontSize: 14,
  },
  error: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "#fef3f2",
    color: "#b42318",
    fontSize: 14,
  },
};