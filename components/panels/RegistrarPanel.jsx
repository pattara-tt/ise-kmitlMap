"use client";

import { useEffect, useState } from "react"; // useEffect ใช้ซิงก์ activeTab ตาม uc prop (ดูด้านล่าง)
import dynamic from "next/dynamic";
import { Btn, Card, Field, Input, Pill, SearchBar, Status, Table, useCollection } from "../ui";

const BuildingFloorPicker = dynamic(() => import("../Buildingfloorpicker"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "calc(100vh - 80px)", display: "grid", placeItems: "center", color: "#5F6368", fontSize: 14 }}>
      กำลังโหลดแผนที่…
    </div>
  ),
});

// รับ uc ("rooms" หรือ "floors") จาก app/page.jsx เพื่อกำหนดว่าเข้ามาจากเมนู UC21 หรือ UC22
// — ถ้าไม่ส่งมา (หรือค่าอื่น) fallback เป็น "rooms" เหมือนเดิม
export default function RegistrarPanel({ uc, user }) {
  const [selected, setSelected] = useState({ building: null, floor: "1" });
  const [activeTab, setActiveTab] = useState(uc === "floors" ? "floors" : "rooms"); // 'rooms' หรือ 'floors'
  const [focusRoom, setFocusRoom] = useState(null); // ห้องที่ถูกกดจาก node บนแผนที่ ให้ RoomsManager โฟกัส/แสดงข้อมูลให้

  // ผู้ใช้อาจสลับเมนู UC21 <-> UC22 โดยที่ RegistrarPanel component เดิมไม่ remount (React reuse เดิม)
  // ต้องซิงก์ activeTab ตาม uc ทุกครั้งที่ prop เปลี่ยน ไม่ใช่แค่ตอน mount ครั้งแรก
  useEffect(() => {
    if (uc === "floors" || uc === "rooms") setActiveTab(uc);
  }, [uc]);

  // ใช้ดูว่าชั้นที่กำลังเปิดอยู่มีรายละเอียดชั้นบันทึกไว้หรือไม่ เพื่อโชว์ต่อท้ายหัวข้อแผงจัดการ
  const { items: floorItems } = useCollection("floors");
  const currentFloorData = floorItems.find((f) => f.building === selected.building && f.floor === selected.floor);

  const panelOpen = !!selected.building;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "calc(100vh - 70px)", overflow: "hidden" }}>
      {/* 1. แผนที่ — อยู่ด้านบนเสมอ ย่อพื้นที่ลงเมื่อแผงจัดการเปิด แทนที่จะให้แผงลอยทับแผนที่ */}
      <div style={{ position: "relative", flex: panelOpen ? "0 0 60%" : "1 1 auto", minHeight: 0 }}>
        <BuildingFloorPicker
          building={selected.building}
          floor={selected.floor}
          height="100%"
          onChange={({ building, floor }) => {
            setSelected({ building, floor });
            setFocusRoom(null);
            setActiveTab("rooms");
          }}
          onSelectRoom={(room) => {
            setActiveTab("rooms");
            setFocusRoom(room);
          }}
        />
      </div>

      {/* 2. แผงจัดการข้อมูล อยู่ด้านล่างแบบ flex ต่อกัน ไม่ทับแผนที่ */}
      {panelOpen && (
        <div
          style={{
            flex: "1 1 40%",
            minHeight: 0,
            background: "#ffffff",
            borderTop: "1px solid #DADCE0",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header แถบควบคุม Panel */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #DADCE0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8F9FA", flex: "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#202124" }}>
                {selected.building} · ชั้น {selected.floor}
              </span>
              {currentFloorData?.note && (
                <span style={{ fontSize: 12.5, color: "#5F6368", fontWeight: 500, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  · {currentFloorData.note}
                </span>
              )}
              <div style={{ display: "flex", gap: 4, background: "#E8EAED", padding: 3, borderRadius: 8 }}>
                <button
                  onClick={() => setActiveTab("rooms")}
                  style={{ border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: activeTab === "rooms" ? "#fff" : "transparent", color: activeTab === "rooms" ? "#1A73E8" : "#5F6368" }}
                >
                  จัดการห้อง (UC21)
                </button>
                <button
                  onClick={() => setActiveTab("floors")}
                  style={{ border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: activeTab === "floors" ? "#fff" : "transparent", color: activeTab === "floors" ? "#1A73E8" : "#5F6368" }}
                >
                  จัดการผังชั้น (UC22)
                </button>
              </div>
            </div>

            <button
              onClick={() => { setSelected({ building: null, floor: "1" }); setFocusRoom(null); setActiveTab("rooms"); }}
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#5F6368" }}
            >
              ✕
            </button>
          </div>

          {/* เนื้อหาฟอร์มจัดการ */}
          <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
            {activeTab === "rooms" ? (
              <RoomsManager building={selected.building} floor={selected.floor} user={user} focusRoom={focusRoom} setFocusRoom={setFocusRoom} />
            ) : (
              <FloorsManager building={selected.building} floor={selected.floor} user={user} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Component: จัดการห้องพักในชั้นที่เลือก
function RoomsManager({ building, floor, user, focusRoom, setFocusRoom }) {
  const { items, create, patch, destroy } = useCollection("rooms");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ code: "", name: "", type: "ห้องเรียน", capacity: 40, teacher: "", nodeId: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // โหมดการแสดงผลของแผงห้อง: 'idle' = รายการทั้งหมด, 'view' = ดู/แก้ไขห้องที่มีข้อมูลแล้ว, 'create' = ห้องที่ยังไม่มีข้อมูล
  const [manualOverride, setManualOverride] = useState(false); // ผู้ใช้กด "แสดงห้องทั้งหมด" เอง
  const [showAddForm, setShowAddForm] = useState(false); // กดปุ่ม "เพิ่มข้อมูลห้องนี้" แล้วหรือยัง (กรณีกดจาก node)
  const [editForm, setEditForm] = useState(null);

  const currentRooms = items.filter((r) => r.building === building && r.floor === floor);

  // เคลียร์สถานะ override/ฟอร์มเพิ่มห้อง ทุกครั้งที่มีการกด node ใหม่บนแผนที่
  useEffect(() => {
    setManualOverride(false);
    setShowAddForm(false);
  }, [focusRoom]);

  const effectiveFocus = manualOverride ? null : focusRoom;

  // BuildingFloorPicker ส่งข้อมูลมา 2 แบบ:
  // - ถ้า node นั้นมีห้องอยู่แล้ว: ส่ง record ห้องจริงมาเลย (มี .id)
  // - ถ้ายังไม่มีข้อมูลห้อง: ส่ง placeholder ที่มี __isNewNode: true (มี .nodeId แต่ .id เป็น null)
  // ใช้ .id เทียบกับรายการห้องปัจจุบันเพื่อความชัวร์ (เผื่อข้อมูลถูกแก้ไข/อัปเดตไปแล้ว)
  const matchedRoom =
    effectiveFocus && !effectiveFocus.__isNewNode
      ? currentRooms.find((r) => r.id === effectiveFocus.id) || effectiveFocus
      : null;

  // เมื่อพบห้องที่ตรงกับ node ให้เติมข้อมูลลงฟอร์มแก้ไขทันที (เอาข้อมูลจาก pop-up มาเติมในแถบด้านล่าง)
  useEffect(() => {
    if (matchedRoom) {
      setEditForm({
        code: matchedRoom.code || "",
        name: matchedRoom.name || "",
        type: matchedRoom.type || "ห้องเรียน",
        capacity: matchedRoom.capacity ?? 0,
        teacher: matchedRoom.teacher || "",
        nodeId: matchedRoom.nodeId || "",
      });
    } else {
      setEditForm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRoom?.id]);

  // เมื่อกด node ที่ยังไม่มีข้อมูลห้อง ให้เตรียม prefill รหัส/ชื่อห้อง/รหัส node ให้อัตโนมัติ
  useEffect(() => {
    if (effectiveFocus && !matchedRoom) {
      setForm((f) => ({
        ...f,
        code: effectiveFocus.code || f.code,
        name: effectiveFocus.name || f.name,
        nodeId: effectiveFocus.nodeId || f.nodeId,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFocus, matchedRoom]);

  const setEdit = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }));
  const backToList = () => setManualOverride(true);

  const rows = currentRooms.filter((r) => (r.code + r.name + r.teacher + r.type).toLowerCase().includes(q.toLowerCase()));

  // ---------- โหมด: ดู/แก้ไขห้องที่มีข้อมูลอยู่แล้ว (กดจาก node บนแผนที่) ----------
  if (effectiveFocus && matchedRoom && editForm) {
    return (
      <>
        <div style={calloutStyle("#E8F0FE", "#C7DBFC", "#1A73E8")}>
          <span>📍 กำลังดูห้องที่กดจากแผนที่: {matchedRoom.name}</span>
          <button onClick={backToList} style={linkBtnStyle("#1A73E8")}>แสดงห้องทั้งหมด</button>
        </div>

        <Card>
          <b style={{ fontSize: 13.5, color: "#202124" }}>ข้อมูลห้อง {matchedRoom.code}</b>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}><Field label="รหัสห้อง"><Input value={editForm.code} onChange={setEdit("code")} /></Field></div>
            <div style={{ flex: 2 }}><Field label="ชื่อห้อง"><Input value={editForm.name} onChange={setEdit("name")} /></Field></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="ประเภท"><Input value={editForm.type} onChange={setEdit("type")} /></Field></div>
            <div style={{ flex: 1 }}><Field label="ความจุ"><Input type="number" value={editForm.capacity} onChange={setEdit("capacity")} /></Field></div>
          </div>
          <Field label="อาจารย์ประจำห้อง"><Input value={editForm.teacher} onChange={setEdit("teacher")} /></Field>
          <Field label="รหัส node บนผังชั้น"><Input value={editForm.nodeId} onChange={setEdit("nodeId")} /></Field>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn
              onClick={async () => {
                await patch(matchedRoom.id, { ...editForm, capacity: Number(editForm.capacity) }, user);
                alert("บันทึกการแก้ไขเรียบร้อยแล้ว");
              }}
            >
              บันทึกการแก้ไข
            </Btn>
            <Btn
              kind="danger"
              onClick={async () => {
                if (confirm(`ลบ ${matchedRoom.name}?`)) {
                  await destroy(matchedRoom.id, user);
                  backToList();
                }
              }}
            >
              ลบห้องนี้
            </Btn>
          </div>
        </Card>
      </>
    );
  }

  // ---------- โหมด: กด node ที่ยังไม่มีข้อมูลห้อง ----------
  if (effectiveFocus && !matchedRoom) {
    return (
      <>
        <div style={calloutStyle("#FEF7E0", "#FDE293", "#B06000")}>
          <span>📍 ยังไม่มีข้อมูลห้องนี้ในระบบ: {effectiveFocus.name || effectiveFocus.code || effectiveFocus.id}</span>
          <button onClick={backToList} style={linkBtnStyle("#B06000")}>แสดงห้องทั้งหมด</button>
        </div>

        {!showAddForm ? (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ color: "#5F6368", fontSize: 13, marginBottom: 14 }}>
                ยังไม่มีข้อมูลห้องนี้ในระบบ ต้องการเพิ่มข้อมูลหรือไม่?
              </p>
              <Btn onClick={() => setShowAddForm(true)}>+ เพิ่มข้อมูลห้องนี้</Btn>
            </div>
          </Card>
        ) : (
          <Card>
            <b style={{ fontSize: 13.5, color: "#202124" }}>เพิ่มข้อมูลห้อง {effectiveFocus.name || form.name}</b>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1 }}><Field label="รหัสห้อง"><Input value={form.code} onChange={set("code")} placeholder="108" /></Field></div>
              <div style={{ flex: 2 }}><Field label="ชื่อห้อง"><Input value={form.name} onChange={set("name")} placeholder="ห้อง 108" /></Field></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="ประเภท"><Input value={form.type} onChange={set("type")} /></Field></div>
              <div style={{ flex: 1 }}><Field label="ความจุ"><Input type="number" value={form.capacity} onChange={set("capacity")} /></Field></div>
            </div>
            <Field label="อาจารย์ประจำห้อง"><Input value={form.teacher} onChange={set("teacher")} placeholder="อ.ดร. ..." /></Field>
            <Field label="รหัส node บนผังชั้น"><Input value={form.nodeId} onChange={set("nodeId")} placeholder="Sc8StudyRoom4F1" /></Field>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn
                onClick={async () => {
                  if (!form.code.trim() || !form.name.trim()) return alert("กรุณาระบุรหัสห้องและชื่อห้อง");
                  await create({ ...form, building, floor, capacity: Number(form.capacity) }, user);
                  setForm({ code: "", name: "", type: "ห้องเรียน", capacity: 40, teacher: "", nodeId: "" });
                  setShowAddForm(false);
                }}
              >
                บันทึกห้องใหม่
              </Btn>
              <Btn kind="ghost" onClick={() => setShowAddForm(false)}>ยกเลิก</Btn>
            </div>
          </Card>
        )}
      </>
    );
  }

  // ---------- โหมดปกติ: ยังไม่ได้กด node ใด ๆ บนแผนที่ / กด "แสดงห้องทั้งหมด" ----------
  return (
    <>
      <div style={{ marginTop: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="ค้นหารหัสห้อง / ชื่อห้อง / อาจารย์" />
        <Table
          columns={[
            { key: "code", label: "รหัส" },
            { key: "name", label: "ชื่อห้อง" },
            { key: "type", label: "ประเภท" },
            { key: "capacity", label: "ความจุ" },
            { key: "teacher", label: "อาจารย์" },
            {
              key: "act", label: "",
              render: (r) => (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn kind="ghost" onClick={() => { 
                    setManualOverride(false); // ยกเลิก override เพื่อเปิดโหมดโฟกัส
                    setFocusRoom(r);
                    }}>แก้ไข</Btn>
                  <Btn kind="danger" onClick={() => confirm(`ลบ ${r.name}?`) && destroy(r.id, user)}>ลบ</Btn>
                </div>
              ),
            },
          ]}
          rows={rows}
          empty="ยังไม่มีข้อมูลห้องในชั้นนี้"
        />
      </div>
    </>
  );
}

// Sub-Component: จัดการรายละเอียดชั้น
function FloorsManager({ building, floor, user }) {
  const { items, create, patch } = useCollection("floors");
  const floorData = items.find((f) => f.building === building && f.floor === floor);
  const [note, setNote] = useState(floorData?.note || "");

  // ให้ค่าฟอร์มอัปเดตตามข้อมูลผังชั้นจริงทุกครั้งที่สลับอาคาร/ชั้น (เอาข้อมูลเดิมมาเติมให้อัตโนมัติ)
  useEffect(() => {
    setNote(floorData?.note || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, floor, floorData?.id]);

  return (
    <Card>
      <b style={{ fontSize: 13.5, color: "#202124" }}>ผังชั้นของ {building} — ชั้น {floor}</b>

      <div style={{ marginTop: 8 }}>
        {/* กล่องรายละเอียดชั้น: ฝ่ายทะเบียนใส่ข้อมูลเพิ่มเติมเกี่ยวกับชั้นนี้ได้ */}
        <Field label="รายละเอียดชั้น">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ชั้นนี้เป็นโซนห้องเรียนวิชาเอก มีลิฟต์ 2 ตัว..."
            rows={3}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid #DADCE0",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </Field>

        <Btn
          onClick={async () => {
            if (floorData) {
              await patch(floorData.id, { note }, user);
            } else {
              await create({ building, floor, name: `ชั้น ${floor}`, note, status: "active" }, user);
            }
            alert("บันทึกรายละเอียดชั้นเรียบร้อยแล้ว");
          }}
        >
          บันทึกรายละเอียดชั้น
        </Btn>
      </div>
    </Card>
  );
}

// ---------- Helper styles ----------
function calloutStyle(bg, border, color) {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: "8px 12px",
    marginBottom: 10,
    fontSize: 12.5,
    color,
    fontWeight: 700,
  };
}

function linkBtnStyle(color) {
  return {
    background: "none",
    border: "none",
    color,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline",
  };
}