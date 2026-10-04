"use client";

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
  return reportOpen && reportForm ? <div style={{
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
              <button onClick={() => {
        setReportOpen(false);
        setReportForm(null);
      }} style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: 0,
        background: "#F1F3F4",
        cursor: "pointer"
      }}>✕</button>
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

            {reportForm.roomId ? <>
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

                  <div style={{
          marginBottom: 8
        }}>
                    <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
                      ชื่อสถานที่
                    </div>
                    <div style={{
            fontSize: 14,
            color: "#202124"
          }}>
                      {reportForm.before?.name || "-"}
                    </div>
                  </div>

                  <div style={{
          marginBottom: 8
        }}>
                    <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
                      ประเภท
                    </div>
                    <div style={{
            fontSize: 14,
            color: "#202124"
          }}>
                      {reportForm.before?.type || "-"}
                    </div>
                  </div>

                  <div style={{
          marginBottom: 8
        }}>
                    <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
                      ความจุ (คน)
                    </div>
                    <div style={{
            fontSize: 14,
            color: "#202124"
          }}>
                      {reportForm.before?.capacity ?? "-"}
                    </div>
                  </div>

                  <div>
                    <div style={{
            fontSize: 12,
            color: "#5F6368"
          }}>
                      อาจารย์ประจำห้อง
                    </div>
                    <div style={{
            fontSize: 14,
            color: "#202124"
          }}>
                      {reportForm.before?.teacher || "-"}
                    </div>
                  </div>
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
          marginBottom: 12
        }}>
                    ข้อมูลที่ต้องการแก้ไข
                  </div>

                  <Field label="หัวข้อ">
                    <Input placeholder="เช่น ขอแก้ไขข้อมูลห้อง 211" onChange={e => setReportForm(f => ({
            ...f,
            subject: e.target.value
          }))} />
                  </Field>

                  <Field label="ชื่อสถานที่">
                    <Input placeholder="เช่น ห้อง 211" onChange={e => setReportForm(f => ({
            ...f,
            name: e.target.value
          }))} />
                  </Field>

                  <Field label="ประเภท">
                    <Input placeholder="เช่น ห้องปฏิบัติการ"
          // value={reportForm.type}
          onChange={e => setReportForm(f => ({
            ...f,
            type: e.target.value
          }))} />
                  </Field>

                  <Field label="ความจุ (คน)">
                    <Input type="number" placeholder="เช่น 40 (กรุณากรอกเป็นตัวเลข)" onChange={e => setReportForm(f => ({
            ...f,
            capacity: e.target.value
          }))} />
                  </Field>

                  <Field label="อาจารย์ประจำห้อง">
                    <Input placeholder="เช่น ผศ.ดร.นพดล ชัยโย" onChange={e => setReportForm(f => ({
            ...f,
            teacher: e.target.value
          }))} />
                  </Field>
                </div>
              </> : null}

            {/* แก้ถึงนี่ */}
            <Field label="รายละเอียดเพิ่มเติม">
              <Textarea value={reportForm.note} onChange={e => setReportForm(f => ({
        ...f,
        note: e.target.value
      }))} placeholder="อธิบายสิ่งที่ผิดหรือสิ่งที่ต้องการให้แก้ไข" />
            </Field>

            <Btn onClick={submitReport} disabled={reportSending || !reportQuota.canSubmit} style={{
                width: "100%",
                marginTop: 6
              }}>
              {reportSending ? "กำลังส่ง…" : "ส่งคำร้อง"}
            </Btn>
          </div>
          </div>
        </div> : null;
}
