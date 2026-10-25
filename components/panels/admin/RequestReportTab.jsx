"use client";

import { useState } from "react";
import { Btn, Card, Field, Icon, Input, Select, Status, Table, useCollection } from "../../ui";
import { FIELD_LABEL, formatAdminDateTime } from "./shared";
import { dayKey, todayKey } from "../../../lib/datetime";
import { useRefData } from "../../../lib/useRefData";

// ป้ายขั้นตอนของคำร้อง (ใช้ชุดเดียวกับหน้ารายละเอียดคำร้อง) และสีป้ายสถานะในเอกสาร PDF
const TL_LABEL = {
  pending: "ส่งคำร้อง",
  processing: "ตรวจสอบแล้ว ส่งต่อให้ฝ่ายทะเบียน",
  approved: "อนุมัติคำร้อง",
  rejected: "ไม่อนุมัติคำร้อง",
  cancelled: "ยกเลิกคำร้อง",
};
const TL_COLOR = {
  pending: "#B06000", processing: "#1A73E8", approved: "#188038", rejected: "#D93025", cancelled: "#5F6368",
};
const CHIP_COLOR = {
  pending: ["#FEF3C7", "#92400E"],
  processing: ["#E8F0FE", "#174EA6"],
  approved: ["#DCFCE7", "#166534"],
  rejected: ["#FEE2E2", "#991B1B"],
  cancelled: ["#F1F3F4", "#5F6368"],
};

// ── UC14 จัดทำสรุปคำร้อง ───────────────────────
function RequestReport({ onBack }) {
  const { items: requests } = useCollection("requests");
  const { items: users } = useCollection("users");
  const { items: rooms } = useCollection("rooms");
  const { items: editLogs } = useCollection("editLogs");
  const { roleLabels } = useRefData(true);

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
    const created = dayKey(r.createdAt);
    const matchesStartDate = !startDate || created >= startDate;
    const matchesEndDate = !endDate || created <= endDate;
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
    key: "operator",
    label: "ผู้ดำเนินการ"
  }, {
    key: "operatedAt",
    label: "วันที่ดำเนินการ"
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
    operator: "ผู้ดำเนินการ",
    operatedAt: "วันที่ดำเนินการ",
    reviewer: "ผู้พิจารณา",
    reviewedAt: "วันที่พิจารณา",
    note: "เหตุผลประกอบการพิจารณา",
    before: "ข้อมูลเดิม (Before)",
    after: "ข้อมูลที่ขอแก้ไข (After)"
  };
  const STATUS_LABELS = {
    pending: "รอพิจารณา",
    processing: "กำลังดำเนินการ",
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ",
    cancelled: "ยกเลิกแล้ว"
  };
  const selectedRows = requests.filter(r => !!selectedRequests[r.id]);
  const HIDE_IF_EMPTY = ["operator", "operatedAt", "reviewer", "reviewedAt"];

  const emailOf = id => users.find(u => u.id === id)?.email || id || "";

  const stagesByRequest = {};
  editLogs.filter(l => l.requestId).sort((a, b) => String(a.editedAt).localeCompare(String(b.editedAt))).forEach(l => {
    let status = null;
    try {
      const after = typeof l.after === "string" ? JSON.parse(l.after) : l.after;
      status = after?.status || null;
    } catch {}
    if (!status) return;
    if (!stagesByRequest[l.requestId]) stagesByRequest[l.requestId] = [];
    stagesByRequest[l.requestId].push({
      status,
      userId: l.userId,
      at: l.editedAt
    });
  });

  function getStageInfo(request) {
    const stages = stagesByRequest[request.id] || [];
    const processing = stages.find(s => s.status === "processing");
    const final = [...stages].reverse().find(s => s.status === "approved" || s.status === "rejected");
    const empty = {
      operator: "",
      operatedAt: "",
      reviewer: "",
      reviewedAt: ""
    };

    // 1) ผ่านขั้น processing: Admin = ผู้ดำเนินการ, ฝ่ายทะเบียน = ผู้พิจารณา
    if (processing) {
      return {
        operator: emailOf(processing.userId),
        operatedAt: processing.at,
        reviewer: final ? emailOf(final.userId) : "",
        reviewedAt: final ? final.at : ""
      };
    }

    // 2) ไม่อนุมัติทันที (pending → rejected): มีแต่ผู้ดำเนินการ ไม่มีผู้พิจารณา
    if (final?.status === "rejected") {
      return {
        ...empty,
        operator: emailOf(final.userId),
        operatedAt: final.at
      };
    }

    // 3) อนุมัติตรง ๆ โดยไม่ผ่าน processing (ข้อมูลจากระบบเดิม)
    if (final) {
      return {
        ...empty,
        reviewer: emailOf(final.userId),
        reviewedAt: final.at
      };
    }

    // 4) ไม่มี log (ข้อมูลเก่า/seed) → ใช้ค่าในแถวคำร้องแทน
    if (request.reviewedBy || request.reviewedAt) {
      const by = emailOf(request.reviewedBy);
      const actorIsAdmin = users.find(u => u.id === request.reviewedBy)?.roleCode === "admin";
      if (request.status === "processing" || request.status === "rejected" && actorIsAdmin) {
        return {
          ...empty,
          operator: by,
          operatedAt: request.reviewedAt || ""
        };
      }
      if (request.status === "approved" || request.status === "rejected") {
        return {
          ...empty,
          reviewer: by,
          reviewedAt: request.reviewedAt || ""
        };
      }
    }
    return empty;
  }

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
      case "operator":
        return getStageInfo(request).operator;
      case "operatedAt": {
        const v = getStageInfo(request).operatedAt;
        return v ? formatAdminDateTime(v) : "";
      }
      case "reviewer":
        return getStageInfo(request).reviewer;
      case "reviewedAt": {
        const v = getStageInfo(request).reviewedAt;
        return v ? formatAdminDateTime(v) : "";
      }
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
    link.download = `request-report-${todayKey()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  // ลำดับขั้นการดำเนินการของคำร้อง — สร้างด้วยวิธีเดียวกับหน้ารายละเอียดคำร้อง (RequestDetail)
  function buildTimeline(request) {
    const events = [];
    editLogs
      .filter(l => l.requestId === request.id)
      .sort((a, b) => String(a.editedAt).localeCompare(String(b.editedAt)))
      .forEach(l => {
        let status = null;
        try {
          const after = typeof l.after === "string" ? JSON.parse(l.after) : l.after;
          status = after?.status || null;
        } catch {}
        if (!status) return;
        if (events.length && events[events.length - 1].status === status) return;
        events.push({ status, userId: l.userId, at: l.editedAt });
      });
    if (!events.length || events[0].status !== "pending") {
      events.unshift({ status: "pending", userId: request.userId, at: request.createdAt });
    }
    if (events[events.length - 1].status !== request.status) {
      events.push({ status: request.status, userId: request.reviewedBy, at: request.reviewedAt });
    }
    const waiting =
      request.status === "pending" ? "รอผู้ดูแลระบบตรวจสอบ"
      : request.status === "processing" ? "รอฝ่ายทะเบียนพิจารณา"
      : null;
    return { events, waiting };
  }
  function actorOf(ev) {
    const actor = users.find(u => u.id === ev.userId);
    return {
      who: actor?.name || emailOf(ev.userId),
      role: actor?.roleCode ? (roleLabels[actor.roleCode] || actor.roleCode) : ""
    };
  }

  // PDF แบบ B: 1 คำร้อง = 1 หน้า (หัวเลขที่ + สถานะ, ข้อมูลหลัก, ตารางก่อน/หลังแก้ไข, ลำดับขั้นการดำเนินการ)
  function exportPDF(rows) {
    const SHORT_FIELDS = ["applicant", "createdAt", "location", "operator", "operatedAt", "reviewer", "reviewedAt"];
    const WIDE_FIELDS = ["subject", "detail", "note"];
    const valueOf = (request, field) => {
      const v = getExportValue(request, field);
      return field === "createdAt" && v ? formatAdminDateTime(v) : v;
    };
    const cell = (label, value, wide) => `
            <div class="cell${wide ? " wide" : ""}">
              <div class="k">${escapeHtml(label)}</div>
              <div class="v">${escapeHtml(value || "-").replace(/\n/g, "<br />")}</div>
            </div>`;
    const asObject = v => v && typeof v === "object" ? v : {};
    const rangeText = `ช่วงวันที่: ${startDate || "ทั้งหมด"} ถึง ${endDate || "ทั้งหมด"} | จำนวน ${rows.length} รายการ`;

    const pages = rows.map((request, index) => {
      const visible = field => selectedFields.includes(field) && (!HIDE_IF_EMPTY.includes(field) || getExportValue(request, field));
      const [chipBg, chipFg] = CHIP_COLOR[request.status] || CHIP_COLOR.cancelled;
      const band = `
          <div class="band">
            <span class="rid">${escapeHtml(selectedFields.includes("id") ? request.id : `รายการที่ ${index + 1}`)}</span>
            ${selectedFields.includes("status") ? `<span class="chip" style="background:${chipBg};color:${chipFg}">${escapeHtml(STATUS_LABELS[request.status] || request.status || "")}</span>` : ""}
          </div>`;
      const shortCells = SHORT_FIELDS.filter(visible).map(f => cell(FIELD_LABELS[f], valueOf(request, f))).join("");
      const wideCells = WIDE_FIELDS.filter(f => selectedFields.includes(f) && (f !== "note" || (request.note && !["approved", "rejected"].includes(request.status)))).map(f => cell(FIELD_LABELS[f], valueOf(request, f), true)).join("");

      let changes = "";
      const showBefore = selectedFields.includes("before");
      const showAfter = selectedFields.includes("after");
      if (showBefore || showAfter) {
        const before = asObject(request.before);
        const after = asObject(request.after);
        const keys = [...new Set([...Object.keys(after), ...Object.keys(before)])];
        if (keys.length) {
          changes = `
          <h3 class="sec">ข้อมูลที่ขอแก้ไข</h3>
          <table>
            <tr><th>ข้อมูล</th>${showBefore ? "<th>ข้อมูลเดิม</th>" : ""}${showAfter ? "<th>ข้อมูลที่ขอแก้ไข</th>" : ""}</tr>
            ${keys.map(key => `<tr>
              <td>${escapeHtml(FIELD_LABEL[key] || key)}</td>
              ${showBefore ? `<td>${escapeHtml(before[key] ?? "-")}</td>` : ""}
              ${showAfter ? `<td${before[key] !== after[key] ? ' class="chg"' : ""}>${escapeHtml(after[key] ?? "-")}</td>` : ""}
            </tr>`).join("")}
          </table>`;
        }
      }

      const { events, waiting } = buildTimeline(request);
      const route = events.map(ev => actorOf(ev).role).filter(Boolean).filter((r, i, a) => i === 0 || r !== a[i - 1]);
      const timeline = events.map((ev, i) => {
        const { who, role } = actorOf(ev);
        const color = TL_COLOR[ev.status] || "#1F2937";
        const note = (ev.status === "approved" || ev.status === "rejected") && i === events.length - 1 && request.note
          ? `<div class="tl-at">หมายเหตุ: ${escapeHtml(request.note)}</div>` : "";
        return `
            <div class="tl-item">
              <div class="rail"><span class="dot" style="background:${color}"></span></div>
              <div class="tl-body">
                <div class="tl-title" style="color:${color}">${escapeHtml(TL_LABEL[ev.status] || ev.status)}</div>
                <div class="tl-who">โดย ${escapeHtml(who)}${role ? ` (${escapeHtml(role)})` : ""}</div>
                <div class="tl-at">${escapeHtml(formatAdminDateTime(ev.at))}</div>
                ${note}
              </div>
            </div>`;
      }).join("") + (waiting ? `
            <div class="tl-item">
              <div class="rail"><span class="dot hollow"></span></div>
              <div class="tl-body"><div class="tl-wait">${escapeHtml(waiting)}</div></div>
            </div>` : "");

      return `
        <section class="page">
          <div class="run">สรุปคำร้อง · ${escapeHtml(rangeText)}</div>
          ${band}
          <div class="grid">${shortCells}</div>
          ${wideCells}
          ${changes}
          <h3 class="sec">ลำดับขั้นการดำเนินการ</h3>
          ${route.length ? `<div class="route"><span class="k">เส้นทางคำร้อง</span> ${route.map(escapeHtml).join(' <span class="arr">→</span> ')}</div>` : ""}
          <div class="tl">${timeline}</div>
          <div class="foot"><span>SciMap · สรุปคำร้อง</span><span>รายการที่ ${index + 1} จาก ${rows.length}</span></div>
        </section>`;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>สรุปคำร้อง</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap" />
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: 'Inter', 'Noto Sans Thai', 'Tahoma', sans-serif;
            color: #202124;
            font-size: 13px;
            line-height: 1.6;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page { min-height: 255mm; display: flex; flex-direction: column; page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          .run { font-size: 11px; color: #5F6368; margin-bottom: 8px; }
          .band { display: flex; justify-content: space-between; align-items: center; background: #E8F0FE; border-radius: 8px; padding: 10px 16px; margin-bottom: 14px; }
          .rid { font-size: 18px; font-weight: 700; color: #174EA6; }
          .chip { font-size: 12px; font-weight: 600; padding: 2px 12px; border-radius: 999px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 10px; }
          .cell { break-inside: avoid; }
          .cell.wide { margin-bottom: 10px; }
          .k { font-size: 11px; color: #5F6368; }
          .v { overflow-wrap: anywhere; word-break: break-word; }
          .sec { font-size: 14px; font-weight: 700; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #DADCE0; }
          table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
          th { background: #F1F3F4; text-align: left; font-weight: 600; padding: 6px 10px; border: 1px solid #DADCE0; }
          td { padding: 6px 10px; border: 1px solid #DADCE0; vertical-align: top; overflow-wrap: anywhere; }
          td.chg { font-weight: 600; }
          .route { margin-bottom: 10px; }
          .arr { color: #9AA0A6; margin: 0 4px; }
          .tl-item { display: grid; grid-template-columns: 20px 1fr; column-gap: 12px; break-inside: avoid; }
          .rail { position: relative; display: flex; justify-content: center; }
          .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 7px; z-index: 1; }
          .dot.hollow { border: 2px solid #9AA0A6; background: #fff; }
          .tl-item:not(:last-child) .rail::after { content: ""; position: absolute; top: 17px; bottom: 0; width: 1px; background: #DADCE0; }
          .tl-body { padding-bottom: 14px; }
          .tl-title { font-weight: 700; }
          .tl-who { font-size: 12.5px; color: #3C4043; overflow-wrap: anywhere; }
          .tl-at { font-size: 12px; color: #5F6368; }
          .tl-wait { color: #5F6368; font-style: italic; }
          .foot { margin-top: auto; padding-top: 6px; border-top: 1px solid #DADCE0; display: flex; justify-content: space-between; font-size: 11px; color: #80868B; }
        </style>
      </head>

      <body>
        ${pages}
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
      const go = () => {
        printWindow.focus();
        printWindow.print();
      };
      // รอฟอนต์ไทยโหลดเสร็จก่อนสั่งพิมพ์ (ไม่เกิน 2 วินาที) ไม่งั้นตัวอักษรจะเป็นฟอนต์สำรอง
      const ready = printWindow.document.fonts?.ready;
      if (ready) {
        Promise.race([ready, new Promise(r => setTimeout(r, 2000))]).then(go);
      } else {
        go();
      }
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
            <div style={{ position: "relative" }}>
              <Icon name="search" size={16} color="#5F6368" style={{ position: "absolute", left: 11, top: 12, pointerEvents: "none" }} />
              <Input type="text" placeholder="ค้นหาคำร้อง" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", paddingLeft: 32 }} />
            </div>
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
        key: "operator",
        label: "ผู้ดำเนินการ",
        render: r => {
          const s = getStageInfo(r);
          return s.operator ? <div>{s.operator}<div style={{ fontSize: 11, color: "#5F6368" }}>{formatAdminDateTime(s.operatedAt)}</div></div> : "-";
        }
      }, {
        key: "reviewer",
        label: "ผู้พิจารณา",
        render: r => {
          const s = getStageInfo(r);
          return s.reviewer ? <div>{s.reviewer}<div style={{ fontSize: 11, color: "#5F6368" }}>{formatAdminDateTime(s.reviewedAt)}</div></div> : "-";
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