"use client";

import { useMemo, useRef, useState } from "react";
import { Input, useCollection } from "../../ui";
import { normalizeKeyword } from "../../InstitutionPicker";

// แถวข้อมูลปัจจุบัน (ชื่อแถว, key ใน reportForm.before)
const CURRENT_ROWS = [
  ["ชื่อสถานที่", "name"],
  ["ประเภท", "type"],
  ["ความจุ (คน)", "capacity"],
  ["อาจารย์ประจำห้อง", "teacher"]
];
const EDIT_KEYS = ["name", "type", "capacity", "teacher"];
const isBlank = v => String(v ?? "").trim() === "";

// ช่องพิมพ์ประเภท: พิมพ์เองได้อิสระ และมี suggestion จากประเภทที่มีอยู่ในระบบ
// ถ้าพิมพ์สิ่งที่ไม่ตรงกับประเภทใดเลย (หรือพิมพ์ตรงกับประเภทหนึ่งครบแล้ว) จะไม่แสดงรายการ
function TypeCombobox({ value, onChange, placeholder }) {
  const { items: roomTypes } = useCollection("roomTypes");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null);

  const matches = useMemo(() => {
    const q = normalizeKeyword(value);
    const names = [...new Set((roomTypes || []).map(t => String(t.name || "").trim()).filter(Boolean))];
    if (!q) return names;
    const found = names.filter(n => normalizeKeyword(n).includes(q));
    return found.length === 1 && normalizeKeyword(found[0]) === q ? [] : found;
  }, [roomTypes, value]);

  const open = focused && matches.length > 0;
  const pick = name => { onChange(name); setFocused(false); setActive(-1); };
  const move = next => {
    setActive(next);
    requestAnimationFrame(() => listRef.current?.children[next]?.scrollIntoView({ block: "nearest" }));
  };
  const onKeyDown = e => {
    if (e.key === "ArrowDown" && matches.length) { e.preventDefault(); setFocused(true); move(active < 0 ? 0 : (active + 1) % matches.length); }
    else if (e.key === "ArrowUp" && matches.length) { e.preventDefault(); move(active < 0 ? matches.length - 1 : (active - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter" && open && active >= 0) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === "Escape" && open) { e.stopPropagation(); setFocused(false); }
  };

  return <div style={{ marginBottom: 9 }}>
    <div className="sm-combo">
      <Input
        id="sm-report-type"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        onChange={e => { onChange(e.target.value); setFocused(true); setActive(-1); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
      />
      {open ? <ul ref={listRef} className="sm-combo-list" role="listbox" style={{ maxHeight: 200 }} onMouseLeave={() => setActive(-1)}>
        {matches.map((name, i) => <li
          key={name}
          className={`sm-combo-item${i === active ? " active" : ""}`}
          role="option"
          aria-selected={normalizeKeyword(name) === normalizeKeyword(value)}
          onMouseDown={e => e.preventDefault()}
          onMouseEnter={() => setActive(i)}
          onClick={() => pick(name)}
        ><span>{name}</span></li>)}
      </ul> : null}
    </div>
  </div>;
}

export default function ReportPanel({ view }) {
  const {
    Btn,
    Field,
    Input,
    Textarea,
    placeCard,
    reportForm,
    reportOpen,
    reportQuota,
    reportSending,
    setReportForm,
    setReportOpen,
    submitReport
  } = view;
  if (!(reportOpen && reportForm)) return null;

  const isRoomForm = reportForm.roomId != null;
  const set = key => e => setReportForm(f => ({ ...f, [key]: e.target.value }));
  const closeForm = () => {
    setReportOpen(false);
    setReportForm(null);
  };

  // เงื่อนไขก่อนให้กดส่ง: ฟอร์มห้องต้องกรอกข้อมูลแก้ไขอย่างน้อย 1 ช่อง และทุกฟอร์มต้องมีเหตุผล/รายละเอียด
  const hasEdit = isRoomForm && EDIT_KEYS.some(k => !isBlank(reportForm[k]));
  const hasNote = !isBlank(reportForm.note);
  const hasSubject = !isBlank(reportForm.subject);
  const missing = !hasSubject
    ? "ระบุหัวข้อคำร้อง"
    : isRoomForm && !hasEdit
      ? "กรอกข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 รายการ"
      : !hasNote
        ? (isRoomForm ? "ระบุเหตุผลประกอบการขอแก้ไข" : "กรอกรายละเอียดปัญหา")
        : "";
  const required = <span style={{ color: "#D93025" }} aria-hidden="true"> *</span>;

  return <div style={{
  position: "absolute",
  inset: 0,
  zIndex: 2400,
  background: "rgba(32,33,36,.45)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center"
}}>
            <div style={{
      width: "min(480px, 100%)",
      maxHeight: "82vh",
      background: "#fff",
      borderRadius: "18px 18px 0 0",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>
            <div style={{
      overflowY: "auto",
      scrollbarWidth: "thin",
      minHeight: 0,
      padding: "16px 18px calc(16px + env(safe-area-inset-bottom))"
    }}>
            <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }}>
              <b style={{
        fontSize: 16,
        color: "#202124"
      }}>แจ้งปัญหา</b>
              <button type="button" className="round-btn" onClick={closeForm} aria-label="ปิด" title="ปิด">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{
      fontSize: 12.5,
      color: "#5F6368",
      marginBottom: 10
    }}>{placeCard?.name}</div>

        <div style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            marginBottom: 12,
            background: reportQuota.canSubmit ? "#E8F0FE" : "#FDE8E7",
            color: reportQuota.canSubmit ? "#1A73E8" : "#D93025"
          }}>
          {reportQuota.canSubmit
        ? `โควต้าคงเหลือ: วันนี้ ${reportQuota.dailyLeft}/${reportQuota.dailyLimit} ครั้ง · เดือนนี้ ${reportQuota.monthlyLeft}/${reportQuota.monthlyLimit} ครั้ง`
        : reportQuota.dailyLeft === 0
          ? `ส่งคำร้องครบ ${reportQuota.dailyLimit} ครั้งต่อวันแล้ว`
          : `ส่งคำร้องครบ ${reportQuota.monthlyLimit} ครั้งต่อเดือนแล้ว`}
            </div>

            {!isRoomForm ? <Field label={<>หัวข้อคำร้อง{required}</>}>
              <Input value={reportForm.subject ?? ""} placeholder="เช่น ห้องน้ำชั้น 2 ชำรุด" onChange={set("subject")} />
            </Field> : null}

            {isRoomForm ? <>
                {/* ข้อมูลปัจจุบันในระบบ (Original) */}
                <div style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 12,
        background: "#F8F9FA",
        border: "1px solid #E0E0E0"
      }}>
                  <div style={{
          fontWeight: 800,
          fontSize: 14,
          color: "#202124",
          marginBottom: 10
        }}>
                    ข้อมูลปัจจุบันในระบบ
                  </div>
                  {CURRENT_ROWS.map(([label, key], i) => {
          const v = reportForm.before?.[key];
          return <div key={key} style={{
            marginBottom: i === CURRENT_ROWS.length - 1 ? 0 : 8
          }}>
                      <div style={{
              fontSize: 12,
              color: "#5F6368"
            }}>{label}</div>
                      <div style={{
              fontSize: 14,
              color: "#202124"
            }}>{v === null || v === undefined || v === "" ? "-" : v}</div>
                    </div>;
        })}
                </div>

                {/* ข้อมูลที่ต้องการแก้ไข (Proposed) */}
                <div style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 12,
        background: "#FFFFFF",
        border: "1px solid #DADCE0"
      }}>
                  <div style={{
          fontWeight: 800,
          fontSize: 14,
          color: "#202124",
          marginBottom: 8
        }}>
                    ข้อมูลที่ต้องการแก้ไข
                  </div>
                  <div style={{
          marginBottom: 12,
          padding: "9px 11px",
          borderRadius: 10,
          background: "#F1F6FE",
          borderLeft: "3px solid #1A73E8",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "#3C4043"
        }}>
                    โปรดกรอกเฉพาะรายการที่ต้องการแก้ไข ช่องที่ไม่ได้กรอกระบบจะใช้ข้อมูลปัจจุบันในระบบตามเดิม
                    ทั้งนี้ ต้องระบุหัวข้อคำร้อง กรอกข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 รายการ และระบุเหตุผลประกอบการขอแก้ไขทุกครั้ง
                  </div>

                  <Field label={<>หัวข้อ{required}</>}>
                    <Input value={reportForm.subject ?? ""} placeholder="เช่น ขอแก้ไขข้อมูลห้อง 211" onChange={set("subject")} />
                  </Field>

                  <Field label="ชื่อสถานที่">
                    <Input value={reportForm.name ?? ""} placeholder="เช่น ห้อง 211" onChange={set("name")} />
                  </Field>

                  <Field label="ประเภท">
                    <TypeCombobox value={reportForm.type ?? ""} placeholder="เช่น ห้องปฏิบัติการ" onChange={v => setReportForm(f => ({ ...f, type: v }))} />
                  </Field>

                  <Field label="ความจุ (คน)">
                    <Input type="number" inputMode="numeric" min="0" step="1" value={reportForm.capacity ?? ""} placeholder="เช่น 40 (กรุณากรอกเป็นตัวเลข)" onChange={set("capacity")} />
                  </Field>

                  <Field label="อาจารย์ประจำห้อง">
                    <Input value={reportForm.teacher ?? ""} placeholder="เช่น ผศ.ดร.นพดล ชัยโย" onChange={set("teacher")} />
                  </Field>
                </div>
              </> : null}

            <Field label={<>{isRoomForm ? "เหตุผลในการขอแก้ไข" : "รายละเอียดปัญหา"}{required}</>}>
              <Textarea value={reportForm.note ?? ""} onChange={set("note")} placeholder={isRoomForm ? "ระบุเหตุผลที่ต้องการแก้ไข เช่น ข้อมูลปัจจุบันไม่ตรงกับความเป็นจริง" : "อธิบายสิ่งที่ผิดหรือสิ่งที่ต้องการให้แก้ไข"} />
            </Field>

            <Btn onClick={submitReport} disabled={reportSending || !reportQuota.canSubmit || Boolean(missing)} style={{
                width: "100%",
                marginTop: 6
              }}>
              {reportSending ? "กำลังส่ง…" : "ส่งคำร้อง"}
            </Btn>
            {missing && reportQuota.canSubmit ? <div style={{
              marginTop: 8,
              textAlign: "center",
              fontSize: 12,
              color: "#80868B"
            }}>{missing}ก่อนส่งคำร้อง</div> : null}
          </div>
          </div>
        </div>;
}