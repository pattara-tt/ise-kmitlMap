"use client";

import { useState } from "react";
import { Btn, Card, Field, Input, Select, Status, Table, useCollection } from "../../ui";
import { FIELD_LABEL, formatAdminDateTime } from "./shared";

// ── UC14 จัดทำสรุปคำร้อง ───────────────────────
function RequestReport({
  onBack
}) {
  const {
    items: requests
  } = useCollection("requests");
  const {
    items: users
  } = useCollection("users");
  const {
    items: rooms
  } = useCollection("rooms");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState("pdf");
  const [selectedFields, setSelectedFields] = useState(["id", "applicant", "subject", "detail", "location", "createdAt", "status"]);
  const [selectedRequests, setSelectedRequests] = useState({});
  const filteredRequests = requests.filter(r => {
    if (r.status === "cancelled" && statusFilter !== "cancelled") {
      return false;
    }
    const keyword = search.trim().toLowerCase();
    const requestUser = users.find(u => u.id === r.userId);
    const matchesSearch = !keyword || ((r.id || "") + (r.subject || "") + (r.detail || "") + (r.userId || "") + (requestUser?.email || "")).toLowerCase().includes(keyword);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesStartDate = !startDate || String(r.createdAt || "") >= startDate;
    const matchesEndDate = !endDate || String(r.createdAt || "") <= endDate;
    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  });
  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setSearch("");
    setStatusFilter("");
  }
  const allFilteredSelected = filteredRequests.length > 0 && filteredRequests.every(r => !!selectedRequests[r.id]);
  const someFilteredSelected = filteredRequests.some(r => !!selectedRequests[r.id]);
  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedRequests(prev => {
        const next = {
          ...prev
        };
        filteredRequests.forEach(r => {
          delete next[r.id];
        });
        return next;
      });
    } else {
      setSelectedRequests(prev => {
        const next = {
          ...prev
        };
        filteredRequests.forEach(r => {
          next[r.id] = true;
        });
        return next;
      });
    }
  }
  const FIELD_OPTIONS = [{
    key: "id",
    label: "เลขที่คำร้อง"
  }, {
    key: "applicant",
    label: "ผู้ยื่น"
  }, {
    key: "subject",
    label: "หัวข้อ"
  }, {
    key: "detail",
    label: "รายละเอียด"
  }, {
    key: "location",
    label: "สถานที่"
  }, {
    key: "createdAt",
    label: "วันที่ส่งคำร้อง",
    render: r => formatAdminDateTime(r.createdAt)
  }, {
    key: "status",
    label: "สถานะ"
  }, {
    key: "reviewer",
    label: "ผู้พิจารณา"
  }, {
    key: "reviewedAt",
    label: "วันที่พิจารณา"
  }, {
    key: "note",
    label: "เหตุผลประกอบการพิจารณา"
  }, {
    key: "before",
    label: "ข้อมูลเดิม (Before)"
  }, {
    key: "after",
    label: "ข้อมูลที่ขอแก้ไข (After)"
  }];
  const FIELD_LABELS = {
    id: "เลขที่คำร้อง",
    applicant: "ผู้ยื่น",
    subject: "หัวข้อ",
    detail: "รายละเอียด",
    location: "สถานที่",
    createdAt: "วันที่ส่งคำร้อง",
    status: "สถานะ",
    reviewer: "ผู้พิจารณา",
    reviewedAt: "วันที่พิจารณา",
    note: "เหตุผลประกอบการพิจารณา",
    before: "ข้อมูลเดิม (Before)",
    after: "ข้อมูลที่ขอแก้ไข (After)"
  };
  const STATUS_LABELS = {
    pending: "รอพิจารณา",
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ",
    cancelled: "ยกเลิกแล้ว"
  };
  const selectedRows = requests.filter(r => !!selectedRequests[r.id]);
  function formatChangedDataHTML(data) {
    if (!data) return "";
    if (typeof data !== "object") {
      return String(data);
    }
    return Object.entries(data).map(([key, value]) => {
      const label = FIELD_LABEL[key] || key;
      if (value === null || value === undefined || value === "") {
        return `${label}: -`;
      }
      return `${label}: ${value}`;
    }).join("\n");
  }
  function formatChangedDataCsv(data) {
    if (!data) return "";
    if (typeof data !== "object") {
      return String(data);
    }
    return Object.entries(data).map(([key, value]) => {
      const label = FIELD_LABEL[key] || key;
      if (value === null || value === undefined || value === "") {
        return `${label}: -`;
      }
      if (typeof value === "object") {
        return `${label}: ${JSON.stringify(value, null, 0)}`;
      }
      return `${label}: ${value}`;
    }).join(" | ");
  }
  function getExportValue(request, field) {
    const requestUser = users.find(u => u.id === request.userId);
    const room = rooms.find(room => room.id === request.roomId);
    const reviewer = users.find(u => u.id === request.reviewedBy);
    switch (field) {
      case "id":
        return request.id || "";
      case "applicant":
        return requestUser?.email || request.userId || "";
      case "subject":
        return request.subject || "";
      case "detail":
        return request.detail || "";
      case "location":
        return room?.name || request.roomId || "";
      case "createdAt":
        return request.createdAt || "";
      case "status":
        return STATUS_LABELS[request.status] || request.status || "";
      case "reviewer":
        return reviewer?.email || request.reviewedBy || "";
      case "reviewedAt":
        return request.reviewedAt || "";
      case "note":
        return request.note || "";
      case "before":
        return request.before || "";
      case "after":
        return request.after || "";
      default:
        return "";
    }
  }
  function escapeCsv(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }
  function exportCSV(rows) {
    const headers = selectedFields.map(field => FIELD_LABELS[field]);
    const csvRows = [headers, ...rows.map(request => selectedFields.map(field => {
      const value = getExportValue(request, field);
      if (field === "before" || field === "after") {
        return formatChangedDataCsv(value).replace(/\n/g, " | ");
      }
      return value;
    }))];
    const csv = "\uFEFF" + csvRows.map(row => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `request-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function exportPDF(rows) {
    const body = rows.map((request, index) => `
          <section class="request">
            <h2>รายการที่ ${index + 1}</h2>

            ${selectedFields.map(field => `
                  <div class="field">
                    <div class="label">
                      ${escapeHtml(FIELD_LABELS[field])}
                    </div>
                    <div class="value">
                      ${escapeHtml(field === "before" || field === "after" ? formatChangedDataHTML(getExportValue(request, field)) : getExportValue(request, field)).replace(/\n/g, "<br />")}
                    </div>
                  </div>
                `).join("")}
          </section>
        `).join("");
    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>สรุปคำร้อง</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 25px;
            color: #202124;
            font-size: 13px;
            line-height: 1.6;
          }

          h1 {
            font-size: 22px;
            margin-bottom: 8px;
          }

          .meta {
            font-size: 12px;
            color: #5F6368;
            margin-bottom: 24px;
          }

          .request {
            border: 1px solid #DADCE0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }

          .request h2 {
            font-size: 16px;
            margin: 0 0 14px;
          }

          .field {
            margin-bottom: 10px;
          }

          .label {
            font-weight: 700;
            margin-bottom: 2px;
          }

          .value {
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          @media print {
            body {
              padding: 0;
            }

            .request {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <h1>สรุปคำร้อง</h1>

        <div class="meta">
          ช่วงวันที่:
          ${startDate || "ทั้งหมด"}
          ถึง
          ${endDate || "ทั้งหมด"}
          |
          จำนวน ${rows.length} รายการ
        </div>

        ${body}
      </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      alert("ไม่สามารถเปิดหน้าสำหรับส่งออก PDF ได้");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function handleExport() {
    if (!selectedFields.length) {
      alert("กรุณาเลือกข้อมูลที่ต้องการส่งออก");
      return;
    }
    if (!selectedRows.length) {
      alert("กรุณาเลือกคำร้องที่ต้องการส่งออก");
      return;
    }
    if (format === "csv") {
      exportCSV(selectedRows);
    } else {
      exportPDF(selectedRows);
    }
  }
  return <>
      <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20
    }}>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
          <Btn kind="ghost" onClick={onBack}>กลับ</Btn>

          <h3>
            จัดทำสรุปคำร้อง
          </h3>
        </div>
      </div>

      <Card>
        <div style={{
        fontWeight: 800,
        fontSize: 14,
        marginBottom: 12
      }}>
          ประเภทไฟล์ที่ส่งออก
        </div>

        <div style={{
        display: "flex",
        gap: 24,
        alignItems: "center"
      }}>
          <label>
            <input type="radio" name="exportFormat" value="pdf" checked={format === "pdf"} onChange={e => setFormat(e.target.value)} />
            {" "}PDF
          </label>

          <label>
            <input type="radio" name="exportFormat" value="csv" checked={format === "csv"} onChange={e => setFormat(e.target.value)} />
            {" "}CSV
          </label>
        </div>
      </Card>
      {/* เลือกคำร้อง start here */}
      <Card>
        <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18
      }}>
          <h4 style={{
          margin: 0
        }}>กำหนดข้อมูลคำร้อง</h4>

          <Btn kind="ghost" onClick={clearFilters}>
            ล้างตัวกรอง
          </Btn>
        </div>
        {/* ช่วงเวลา */}
        <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 12
      }}>
          <Field label="วันที่เริ่มต้น">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{
            width: "100%"
          }} />
          </Field>

          <Field label="วันที่สิ้นสุด">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{
            width: "100%"
          }} />
          </Field>
        </div>

        {/* ค้นหา + กรองสถานะ */}
        <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 20
      }}>
          <Field label="ค้นหาคำร้อง">
            <Input type="text" placeholder="🔎 ค้นหาคำร้อง" value={search} onChange={e => setSearch(e.target.value)} style={{
            width: "100%"
          }} />
          </Field>

          <Field label="กรองตามสถานะ">
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="pending">รอพิจารณา</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </Select>
          </Field>
        </div>

        {/* ตารางคำร้อง */}
        <Table columns={[{
        key: "select",
        label: <Input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} ref={el => {
          if (el) {
            el.indeterminate = someFilteredSelected && !allFilteredSelected;
          }
        }} />,
        render: r => <Input type="checkbox" checked={!!selectedRequests[r.id]} onChange={e => {
          setSelectedRequests(prev => ({
            ...prev,
            [r.id]: e.target.checked
          }));
        }} />
      }, {
        key: "id",
        label: "เลขที่"
      }, {
        key: "userId",
        label: "ผู้ยื่น",
        render: r => {
          const requestUser = users.find(u => u.id === r.userId);
          return requestUser?.email || "-";
        }
      }, {
        key: "subject",
        label: "หัวข้อ"
      }, {
        key: "roomId",
        label: "สถานที่",
        render: r => {
          const room = rooms.find(room => room.id === r.roomId);
          return room?.name || r.roomId || "-";
        }
      }, {
        key: "reviewedAt",
        label: "วันที่อนุมัติ",
        render: r => r.reviewedAt || "-"
      }, {
        key: "reviewedBy",
        label: "อนุมัติโดย",
        render: r => {
          const reviewer = users.find(u => u.id === r.reviewedBy);
          return reviewer?.email || r.reviewedBy || "-";
        }
      }, {
        key: "status",
        label: "สถานะ",
        render: r => <Status value={r.status} />
      }]} rows={filteredRequests} empty="ไม่พบรายการคำร้อง" />

        <div style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid #E8EAED"
      }}>
          <div style={{
          fontWeight: 800,
          fontSize: 14,
          marginBottom: 10
        }}>
            ฟิลด์ที่ต้องการส่งออก
          </div>

          <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10
        }}>
            {FIELD_OPTIONS.map(field => <label key={field.key} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            cursor: "pointer"
          }}>
                <Input type="checkbox" checked={selectedFields.includes(field.key)} onChange={e => {
              setSelectedFields(prev => e.target.checked ? [...prev, field.key] : prev.filter(key => key !== field.key));
            }} style={{
              width: "auto"
            }} />

                {field.label}
              </label>)}
          </div>
        </div>

        <div style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 10,
        marginTop: 20
      }}>
          <div style={{
          fontSize: 12,
          color: "#5F6368",
          marginRight: "auto"
        }}>
            เลือกแล้ว {selectedRows.length} รายการ
          </div>

          <Btn onClick={handleExport}>
            ส่งออก {format === "pdf" ? "PDF" : "CSV"}
          </Btn>
        </div>
      </Card>
      {/* เลือกคำร้อง end here */}
    </>;
}

// ── UC15 กำหนดจำนวนการส่งคำร้อง ──────────────────────────

export default RequestReport;