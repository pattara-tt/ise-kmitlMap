"use client";

import { useEffect, useRef, useState } from "react"; // useEffect ใช้ซิงก์ activeTab ตาม uc prop (ดูด้านล่าง)
import dynamic from "next/dynamic";
import { Btn, Card, Field, Input, Pill, SearchBar, Table, Textarea, useCollection } from "../ui";

const BuildingFloorPicker = dynamic(() => import("../Buildingfloorpicker"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", minHeight: 300, display: "grid", placeItems: "center", color: "#5F6368", fontSize: 14 }}>
      กำลังโหลดแผนที่…
    </div>
  ),
});

// รับ uc ("rooms" หรือ "floors") จาก app/page.jsx เพื่อกำหนด sub-flow ของ UC16
// — ถ้าไม่ส่งมา (หรือค่าอื่น) fallback เป็น "rooms" เหมือนเดิม
export default function RegistrarPanel({ uc, user }) {
  const [selected, setSelected] = useState({ building: null, floor: "1" });
  const [activeTab, setActiveTab] = useState(uc === "floors" ? "floors" : "rooms"); // 'rooms' หรือ 'floors'
  const [focusRoom, setFocusRoom] = useState(null); // ห้องที่ถูกกดจาก node บนแผนที่ ให้ RoomsManager โฟกัส/แสดงข้อมูลให้
  const [panelFullscreen, setPanelFullscreen] = useState(false); // แผงจัดการด้านล่างขยายเต็มจอหรือไม่

  // ผู้ใช้อาจสลับ sub-flow ข้อมูลห้อง <-> ข้อมูลชั้น โดยที่ RegistrarPanel component เดิมไม่ remount
  // ต้องซิงก์ activeTab ตาม uc ทุกครั้งที่ prop เปลี่ยน ไม่ใช่แค่ตอน mount ครั้งแรก
  useEffect(() => {
    if (uc === "floors" || uc === "rooms") setActiveTab(uc);
  }, [uc]);

  // ใช้ดูว่าชั้นที่กำลังเปิดอยู่มีรายละเอียดชั้นบันทึกไว้หรือไม่ เพื่อโชว์ต่อท้ายหัวข้อแผงจัดการ
  const { items: floorItems } = useCollection("floors");
  const currentFloorData = floorItems.find((f) => f.building === selected.building && f.floor === selected.floor);

  const panelOpen = !!selected.building;

  return (
    <div className="bdi-fullpanel" style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: 420, overflow: "hidden" }}>
      {/* 1. แผนที่ — อยู่ด้านบนเสมอ ย่อพื้นที่ลงเมื่อแผงจัดการเปิด แทนที่จะให้แผงลอยทับแผนที่ */}
      <div style={{ position: "relative", flex: panelOpen ? "0 0 60%" : "1 1 auto", minHeight: 0 }}>
        <BuildingFloorPicker
          building={selected.building}
          floor={selected.floor}
          height="100%"
          focusedNodeId={focusRoom?.nodeId || null}
          onChange={({ building, floor }) => {
            setSelected({ building, floor });
            setFocusRoom(null);
            setActiveTab("rooms");
          }}
          onSelectRoom={(room) => {
            setActiveTab("rooms");
            setFocusRoom(room);
          }}
          onCloseRoomPopup={() => setFocusRoom(null)} // กด ✕ บน popup ของแผนที่ -> แผงด้านล่างกลับไปแสดงห้องทั้งหมดทันที
        />
      </div>

      {/* 2. แผงจัดการข้อมูล อยู่ด้านล่างแบบ flex ต่อกัน ไม่ทับแผนที่ */}
      {panelOpen && (
        <div
          style={{
            ...(panelFullscreen
              ? { position: "fixed", inset: 0, zIndex: 5000 }
              : { flex: "1 1 40%", minHeight: 0 }),
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
                  ข้อมูลห้อง
                </button>
                <button
                  onClick={() => setActiveTab("floors")}
                  style={{ border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: activeTab === "floors" ? "#fff" : "transparent", color: activeTab === "floors" ? "#1A73E8" : "#5F6368" }}
                >
                  ข้อมูลชั้น
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setPanelFullscreen((v) => !v)}
                title={panelFullscreen ? "ย่อกลับ" : "ขยายเต็มจอ"}
                style={{ background: "none", border: "none", fontSize: 17, cursor: "pointer", color: "#5F6368", lineHeight: 1 }}
              >
                {panelFullscreen ? "⤡" : "⤢"}
              </button>
              <button
                onClick={() => { setSelected({ building: null, floor: "1" }); setFocusRoom(null); setActiveTab("rooms"); setPanelFullscreen(false); }}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#5F6368" }}
              >
                ✕
              </button>
            </div>
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

  // โหมดการแสดงผลของแผงห้อง: 'idle' = รายการทั้งหมด, 'view' = ดูข้อมูลอย่างเดียว, 'edit' = ฟอร์มแก้ไข, 'create' = ห้องที่ยังไม่มีข้อมูล
  const [manualOverride, setManualOverride] = useState(false); // ผู้ใช้กด "แสดงห้องทั้งหมด" เอง
  const [showAddForm, setShowAddForm] = useState(false); // กดปุ่ม "เพิ่มข้อมูลห้องนี้" แล้วหรือยัง (กรณีกดจาก node)
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // false = แสดงข้อมูลอย่างเดียวก่อนเสมอ, true = เข้าฟอร์มแก้ไขแล้ว

  // popup แบบในแอป (แทน confirm()/alert() ของเบราว์เซอร์) — confirmTarget = ห้องที่รอยืนยันลบ, notice = ข้อความแจ้งเตือนหลังบันทึก/ผิดพลาด
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  // ผู้ใช้ตั้งใจกด "แก้ไข" มาเลยหรือเปล่า ใช้บอก effect ด้านล่างตอนเปลี่ยนห้องที่โฟกัส
  // (ทุกห้องที่เพิ่งถูกเลือกใหม่ ค่าเริ่มต้นคือโหมดดูข้อมูลอย่างเดียวเสมอ เว้นแต่ตั้ง flag นี้ไว้)
  const editIntentRef = useRef(false);

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
  // ค่าเริ่มต้นของทุกห้องที่เพิ่งโฟกัสคือโหมดดูข้อมูลอย่างเดียว เว้นแต่กดปุ่ม "แก้ไข" มาโดยตรง (editIntentRef)
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
      setIsEditing(editIntentRef.current);
    } else {
      setEditForm(null);
      setIsEditing(false);
    }
    editIntentRef.current = false;
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

  // เปิดห้องนี้ในโหมดดูข้อมูลอย่างเดียว — ใช้ทั้งตอนกดแถวห้องในตาราง "แสดงห้องทั้งหมด"
  // (แผนที่จะซูมไปที่ห้องนี้ตาม focusedNodeId ที่ส่งต่อไปให้ BuildingFloorPicker)
  const openView = (r) => {
    editIntentRef.current = false;
    setManualOverride(false);
    setFocusRoom(r);
  };

  // เปิดห้องนี้แล้วเข้าโหมดแก้ไขทันที — ใช้กับปุ่ม "แก้ไข" ทั้งในตารางและในการ์ดดูข้อมูล
  const openEdit = (r) => {
    editIntentRef.current = true;
    setManualOverride(false);
    if (matchedRoom && r.id === matchedRoom.id) {
      // เป็นห้องเดิมที่โฟกัสอยู่แล้ว — id ไม่เปลี่ยน effect ด้านบนจะไม่รัน ต้องสั่งเข้าโหมดแก้ไขตรงนี้เลย
      setIsEditing(true);
    }
    setFocusRoom(r);
  };

  // กดปุ่ม/icon ลบ แค่เปิด popup ยืนยันขึ้นมาก่อน — การลบจริงเกิดตอนกดยืนยันใน confirmDeleteNow()
  const doDelete = (r) => setConfirmTarget(r);

  const confirmDeleteNow = async () => {
    const r = confirmTarget;
    if (!r) return;
    setConfirmTarget(null);
    try {
      await destroy(r.id, user);
      backToList();
      setNotice({ title: "สำเร็จ", message: "ลบข้อมูลห้องเรียบร้อยแล้ว" });
    } catch (e) {
      setNotice({ title: "ลบข้อมูลไม่สำเร็จ", message: e?.message || String(e) });
    }
  };

  // เทียบค่าฟอร์มที่กำลังแก้กับค่าที่บันทึกไว้จริงของห้องนี้ ใช้ไฮไลต์ช่องที่ถูกแก้ไข
  const fieldChanged = (k) => {
    if (!editForm || !matchedRoom) return false;
    const saved =
      k === "capacity" ? matchedRoom.capacity ?? 0
      : k === "type" ? matchedRoom.type || "ห้องเรียน"
      : matchedRoom[k] || "";
    return String(editForm[k]) !== String(saved);
  };

  const rows = currentRooms.filter((r) => (r.code + r.name + r.teacher + r.type).toLowerCase().includes(q.toLowerCase()));

  // popup ยืนยันลบ / popup แจ้งผล — ใช้ร่วมกันทุกโหมดของ RoomsManager แทน confirm()/alert() ของเบราว์เซอร์
  const popupEl = (
    <>
      {confirmTarget && (
        <ModalPopup
          icon="🗑️"
          title="ลบข้อมูลห้อง"
          message={`ลบข้อมูลรายละเอียดของ ${confirmTarget.name}?\nตัวห้องบนแผนที่จะยังคงอยู่`}
          confirmText="ลบ"
          cancelText="ยกเลิก"
          danger
          onConfirm={confirmDeleteNow}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
      {notice && (
        <ModalPopup
          icon={notice.icon}
          title={notice.title}
          message={notice.message}
          confirmText="ตกลง"
          onConfirm={() => setNotice(null)}
        />
      )}
    </>
  );

  // ---------- โหมด: ดูข้อมูลห้องที่มีอยู่แล้วอย่างเดียว (ค่าเริ่มต้นเมื่อกดจากแผนที่/ตาราง) ----------
  if (effectiveFocus && matchedRoom && editForm && !isEditing) {
    return (
      <>
        <div style={calloutStyle("#E8F0FE", "#C7DBFC", "#1A73E8")}>
          <span>📍 กำลังดูห้องที่กดจากแผนที่: {matchedRoom.name}</span>
          <button onClick={backToList} style={linkBtnStyle("#1A73E8")}>แสดงห้องทั้งหมด</button>
        </div>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <b style={{ fontSize: 13.5, color: "#202124" }}>ข้อมูลห้อง {matchedRoom.code}</b>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Btn kind="ghost" onClick={() => { editIntentRef.current = true; setIsEditing(true); }}>แก้ไขข้อมูล</Btn>
              <Btn kind="danger" onClick={() => doDelete(matchedRoom)}>ลบข้อมูลห้อง</Btn>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}><InfoField label="รหัสห้อง" value={matchedRoom.code} /></div>
            <div style={{ flex: 2 }}><InfoField label="ชื่อห้อง" value={matchedRoom.name} /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><InfoField label="ประเภท" value={matchedRoom.type} /></div>
            <div style={{ flex: 1 }}><InfoField label="ความจุ" value={matchedRoom.capacity} /></div>
          </div>
          <InfoField label="อาจารย์ประจำห้อง" value={matchedRoom.teacher} />
          <InfoField label="รหัส node บนผังชั้น" value={matchedRoom.nodeId} />
        </Card>
        {popupEl}
      </>
    );
  }

  // ---------- โหมด: ฟอร์มแก้ไขข้อมูลห้อง (กดปุ่ม "แก้ไขข้อมูล" มาแล้ว) ----------
  if (effectiveFocus && matchedRoom && editForm && isEditing) {
    const cancelEdit = () => {
      setEditForm({
        code: matchedRoom.code || "",
        name: matchedRoom.name || "",
        type: matchedRoom.type || "ห้องเรียน",
        capacity: matchedRoom.capacity ?? 0,
        teacher: matchedRoom.teacher || "",
        nodeId: matchedRoom.nodeId || "",
      });
      setIsEditing(false);
    };

    return (
      <>
        <div style={calloutStyle("#E8F0FE", "#C7DBFC", "#1A73E8")}>
          <span>📍 กำลังแก้ไขห้อง: {matchedRoom.name}</span>
          <button onClick={backToList} style={linkBtnStyle("#1A73E8")}>แสดงห้องทั้งหมด</button>
        </div>

        <Card style={{ position: "relative" }}>
          <button
            title="ลบข้อมูลห้องนี้"
            onClick={() => doDelete(matchedRoom)}
            style={{
              position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%",
              border: "1px solid #F5C2C0", background: "#fff", color: "#D93025", cursor: "pointer",
              display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1,
            }}
          >
            🗑️
          </button>

          <b style={{ fontSize: 13.5, color: "#202124", display: "block", marginBottom: 2, paddingRight: 36 }}>แก้ไขข้อมูลห้อง {matchedRoom.code}</b>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <EditField label="รหัสห้อง" changed={fieldChanged("code")}>
                <Input value={editForm.code} onChange={setEdit("code")} style={diffInputStyle(fieldChanged("code"))} />
              </EditField>
            </div>
            <div style={{ flex: 2 }}>
              <EditField label="ชื่อห้อง" changed={fieldChanged("name")}>
                <Input value={editForm.name} onChange={setEdit("name")} style={diffInputStyle(fieldChanged("name"))} />
              </EditField>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <EditField label="ประเภท" changed={fieldChanged("type")}>
                <Input value={editForm.type} onChange={setEdit("type")} style={diffInputStyle(fieldChanged("type"))} />
              </EditField>
            </div>
            <div style={{ flex: 1 }}>
              <EditField label="ความจุ" changed={fieldChanged("capacity")}>
                <Input type="number" value={editForm.capacity} onChange={setEdit("capacity")} style={diffInputStyle(fieldChanged("capacity"))} />
              </EditField>
            </div>
          </div>
          <EditField label="อาจารย์ประจำห้อง" changed={fieldChanged("teacher")}>
            <Input value={editForm.teacher} onChange={setEdit("teacher")} style={diffInputStyle(fieldChanged("teacher"))} />
          </EditField>
          <EditField label="รหัส node บนผังชั้น" changed={fieldChanged("nodeId")}>
            <Input value={editForm.nodeId} readOnly title="รหัส node มาจากข้อมูลแผนที่ของฝ่ายแผนที่" style={{ ...diffInputStyle(false), background: "#F8F9FA", color: "#5F6368" }} />
          </EditField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn kind="ghost" onClick={cancelEdit}>ยกเลิกการแก้ไข</Btn>
            <Btn
              onClick={async () => {
                await patch(matchedRoom.id, { ...editForm, capacity: Number(editForm.capacity) }, user);
                setIsEditing(false);
                setNotice({ icon: "✅", title: "สำเร็จ", message: "บันทึกการแก้ไขเรียบร้อยแล้ว" });
              }}
            >
              บันทึกการแก้ไข
            </Btn>
          </div>
        </Card>
        {popupEl}
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
            <Field label="รหัส node บนผังชั้น (จากฝ่ายแผนที่)"><Input value={form.nodeId} readOnly placeholder="Sc8StudyRoom4F1" style={{ background: "#F8F9FA", color: "#5F6368" }} /></Field>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn
                onClick={async () => {
                  if (!form.code.trim() || !form.name.trim()) {
                    return setNotice({ icon: "⚠️", title: "ข้อมูลไม่ครบ", message: "กรุณาระบุรหัสห้องและชื่อห้อง" });
                  }
                  // ตาราง rooms มี UNIQUE (building, floor, code) — ถ้ารหัสห้องซ้ำในชั้นเดียวกัน
                  // create() จะ throw ต้องดักไว้ ไม่งั้นปุ่มจะเงียบไปเฉยๆ โดยผู้ใช้ไม่รู้สาเหตุ
                  let createdRoom;
                  try {
                    createdRoom = await create({ ...form, building, floor, capacity: Number(form.capacity) }, user);
                  } catch (e) {
                    return setNotice({ icon: "❌", title: "บันทึกไม่สำเร็จ", message: "อาจมีรหัสห้องนี้อยู่แล้วในชั้นนี้ — " + (e?.message || e) });
                  }
                  setForm({ code: "", name: "", type: "ห้องเรียน", capacity: 40, teacher: "", nodeId: "" });
                  setShowAddForm(false);
                  if (createdRoom) setFocusRoom(createdRoom);
                  setNotice({ icon: "✅", title: "สำเร็จ", message: "เพิ่มข้อมูลห้องเรียบร้อยแล้ว" });
                }}
              >
                บันทึกข้อมูลห้อง
              </Btn>
              <Btn kind="ghost" onClick={() => setShowAddForm(false)}>ยกเลิก</Btn>
            </div>
          </Card>
        )}
        {popupEl}
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
            {
              key: "name", label: "ชื่อห้อง",
              // กดชื่อห้องแล้วแผนที่จะซูมไปที่ห้องนั้น พร้อมเปิดการ์ดดูข้อมูล (ยังไม่เข้าโหมดแก้ไข)
              render: (r) => (
                <button
                  onClick={() => openView(r)}
                  style={{ background: "none", border: "none", padding: 0, margin: 0, font: "inherit", color: "#1A73E8", fontWeight: 700, cursor: "pointer", textAlign: "left" }}
                >
                  {r.name}
                </button>
              ),
            },
            { key: "type", label: "ประเภท" },
            { key: "capacity", label: "ความจุ" },
            { key: "teacher", label: "อาจารย์" },
            {
              key: "act", label: "",
              render: (r) => (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn kind="ghost" onClick={() => openEdit(r)}>แก้ไข</Btn>
                  <Btn kind="danger" onClick={() => doDelete(r)}>ลบข้อมูล</Btn>
                </div>
              ),
            },
          ]}
          rows={rows}
          empty="ยังไม่มีข้อมูลห้องในชั้นนี้"
        />
      </div>
      {popupEl}
    </>
  );
}

// Sub-Component: จัดการรายละเอียดชั้น
// โครงสร้างชั้นและไฟล์ผัง (SVG) เป็นข้อมูลจาก "ฝ่ายแผนที่" ผ่าน mapAssets
// ฝ่ายทะเบียนแก้ไขได้เฉพาะ "รายละเอียดชั้น" เท่านั้น ไม่สร้าง/ลบชั้น และไม่แก้ไฟล์ผัง
function FloorsManager({ building, floor, user }) {
  const { items, patch } = useCollection("floors");
  const { items: rooms } = useCollection("rooms");
  const { items: mapAssets } = useCollection("mapAssets");

  const floorData = items.find(
    (f) => f.building === building && String(f.floor) === String(floor)
  );

  // source of truth ของ "ชั้นที่มีอยู่จริงบนแผนที่" มาจากฝ่ายแผนที่ (UC8/UC9)
  const mapFloorAsset = mapAssets.find(
    (a) =>
      a.kind === "floorplan" &&
      a.status === "published" &&
      a.building === building &&
      String(a.floor) === String(floor)
  );

  const [form, setForm] = useState({ note: "" });
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState(null);

  const savedNote = floorData?.note || "";

  useEffect(() => {
    setForm({ note: savedNote });
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, floor, floorData?.id]);

  const roomCount = rooms.filter(
    (r) => r.building === building && String(r.floor) === String(floor)
  ).length;

  const fieldChanged = () => String(form.note) !== String(savedNote);

  const cancelEdit = () => {
    setForm({ note: savedNote });
    setIsEditing(false);
  };

  const save = async () => {
    // ฝ่ายทะเบียนต้องแก้ได้เฉพาะชั้นที่ฝ่ายแผนที่เผยแพร่มาแล้ว
    if (!mapFloorAsset) {
      setNotice({
        icon: "⚠️",
        title: "ไม่พบข้อมูลชั้นจากฝ่ายแผนที่",
        message: "ชั้นนี้ยังไม่มีผังที่เผยแพร่จากฝ่ายแผนที่ จึงยังไม่สามารถแก้ไขรายละเอียดได้",
      });
      return false;
    }

    if (!floorData) {
      setNotice({
        icon: "⚠️",
        title: "ข้อมูลชั้นยังไม่พร้อม",
        message: "ระบบยังไม่ได้รับข้อมูลชั้นจากฝ่ายแผนที่ กรุณาให้ฝ่ายแผนที่เผยแพร่ผังชั้นอีกครั้ง",
      });
      return false;
    }

    setSaving(true);
    try {
      await patch(floorData.id, { note: form.note }, user);
    } catch (e) {
      setNotice({ title: "บันทึกไม่สำเร็จ", message: e?.message || String(e) });
      return false;
    } finally {
      setSaving(false);
    }
    return true;
  };

  const popupEl = notice && (
    <ModalPopup
      icon={notice.icon}
      title={notice.title}
      message={notice.message}
      confirmText="ตกลง"
      onConfirm={() => setNotice(null)}
    />
  );

  if (!mapFloorAsset) {
    return (
      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>ผังชั้นของ {building} — ชั้น {floor}</b>
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "#FEF7E0", border: "1px solid #FDE293", color: "#7A4F00", fontSize: 12.5, lineHeight: 1.5 }}>
          ยังไม่พบผังชั้นที่เผยแพร่จากฝ่ายแผนที่ ฝ่ายทะเบียนไม่สามารถสร้างชั้นเองได้
        </div>
        {popupEl}
      </Card>
    );
  }

  // ดูข้อมูลชั้น: ข้อมูลโครงสร้าง/ไฟล์ผังมาจากฝ่ายแผนที่ และเป็น read-only สำหรับฝ่ายทะเบียน
  if (!isEditing) {
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 13.5, color: "#202124" }}>ผังชั้นของ {building} — ชั้น {floor}</b>
          <Pill color="#1A73E8" bg="#E8F0FE">{roomCount} ห้องที่มีรายละเอียด</Pill>
        </div>

        <div style={{ marginTop: 8 }}>
          <InfoField label="รายละเอียดชั้น" value={savedNote} />
          <InfoField label="ผังชั้นจากฝ่ายแผนที่" value={mapFloorAsset.name || `ชั้น ${floor}`} />
          <InfoField
            label="ไฟล์ผัง (อ่านอย่างเดียว)"
            value={String(mapFloorAsset.file || "").startsWith("data:") ? "ไฟล์ SVG ที่ฝ่ายแผนที่อัปโหลด" : mapFloorAsset.file}
          />

          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: -4, marginBottom: 8 }}>
            อาคาร ชั้น และไฟล์ผังถูกส่งมาจากฝ่ายแผนที่ ฝ่ายทะเบียนแก้ไขเฉพาะรายละเอียดชั้น
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={() => setIsEditing(true)} disabled={!floorData}>แก้ไขข้อมูลชั้น</Btn>
          </div>
        </div>
        {popupEl}
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <b style={{ fontSize: 13.5, color: "#202124" }}>แก้ไขรายละเอียด {building} — ชั้น {floor}</b>
        <Pill color="#1A73E8" bg="#E8F0FE">ข้อมูลผังจากฝ่ายแผนที่</Pill>
      </div>

      <div style={{ marginTop: 8 }}>
        <EditField label="รายละเอียดชั้น" changed={fieldChanged()}>
          <Textarea
            value={form.note}
            onChange={(e) => setForm({ note: e.target.value })}
            placeholder="เช่น ชั้นนี้เป็นโซนห้องเรียนวิชาเอก มีลิฟต์ 2 ตัว..."
            rows={3}
            style={diffInputStyle(fieldChanged())}
          />
        </EditField>

        <InfoField label="ผังชั้นจากฝ่ายแผนที่" value={mapFloorAsset.name || `ชั้น ${floor}`} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Btn kind="ghost" disabled={saving} onClick={cancelEdit}>ยกเลิก</Btn>
          <Btn
            disabled={saving}
            onClick={async () => {
              const ok = await save();
              if (ok) {
                setIsEditing(false);
                setNotice({ icon: "✅", title: "สำเร็จ", message: "บันทึกข้อมูลชั้นเรียบร้อยแล้ว" });
              }
            }}
          >
            {saving ? "กำลังบันทึก…" : "บันทึกข้อมูลชั้น"}
          </Btn>
        </div>
      </div>
      {popupEl}
    </Card>
  );
}

// ---------- Popup ยืนยัน / แจ้งผล ในสไตล์แอป (แทน confirm()/alert() ของเบราว์เซอร์) ----------
// ใช้แทนกล่อง native ของเบราว์เซอร์ (เช่น "ลบ ห้อง 107?" หรือ "บันทึกการแก้ไขเรียบร้อยแล้ว")
// ด้วยการ์ดลอยกึ่งกลางจอ ดีไซน์เดียวกับป้ายข้อมูลห้องบนแผนที่
function ModalPopup({ icon = "ℹ️", title, message, confirmText = "ตกลง", cancelText, danger, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 6000,
        background: "rgba(32,33,36,.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={() => (cancelEnabledFor(cancelText) ? onCancel?.() : undefined)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, padding: "18px 20px",
          minWidth: 260, maxWidth: 340, width: "100%",
          boxShadow: "0 8px 30px rgba(0,0,0,.28)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <b style={{ fontSize: 14.5, color: "#202124" }}>{title}</b>
        </div>
        <div style={{ fontSize: 13, color: "#3C4043", marginBottom: 18, lineHeight: 1.5, whiteSpace: "pre-line" }}>
          {message}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {cancelText && (
            <Btn kind="ghost" onClick={onCancel}>{cancelText}</Btn>
          )}
          <Btn kind={danger ? "danger" : undefined} onClick={onConfirm}>{confirmText}</Btn>
        </div>
      </div>
    </div>
  );
}
function cancelEnabledFor(cancelText) {
  return !!cancelText; // คลิกฉากหลังปิด popup ได้เฉพาะตอนมีปุ่ม "ยกเลิก" (popup แจ้งผลเฉยๆ ต้องกด "ตกลง" เท่านั้น)
}

// ---------- Helper components สำหรับโหมดดู/แก้ไขห้อง ----------

// แสดงค่าข้อมูลห้องแบบอ่านอย่างเดียว (โหมดดูข้อมูลก่อนกดแก้ไข)
function InfoField({ label, value }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5F6368", marginBottom: 3 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#202124" }}>{value === "" || value === null || value === undefined ? "—" : value}</span>
    </div>
  );
}

// ป้ายชื่อช่องกรอกในโหมดแก้ไข — ขึ้นเครื่องหมาย "* แก้ไข" เหนือช่องที่ค่าเปลี่ยนไปจากเดิม
function EditField({ label, changed, children }) {
  return (
    <label style={{ display: "block", marginBottom: 9 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: changed ? "#1A73E8" : "#5F6368", marginBottom: 4 }}>
        {label}
        {changed ? <span style={{ fontSize: 10.5, fontWeight: 800, color: "#1A73E8" }}>* แก้ไข</span> : null}
      </span>
      {children}
    </label>
  );
}

// ขอบสีน้ำเงินเน้นช่องที่ถูกแก้ไข
function diffInputStyle(changed) {
  return changed ? { borderColor: "#1A73E8", borderWidth: 2, boxShadow: "0 0 0 1px rgba(26,115,232,.2)" } : {};
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