"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Btn, Card, Field, Input, Pill, SearchBar, Table, Textarea, useCollection } from "../ui";
import { clearMapDataCache } from "../../lib/useMapData";

const BuildingFloorPicker = dynamic(() => import("../Buildingfloorpicker"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", minHeight: 300, display: "grid", placeItems: "center", color: "#5F6368", fontSize: 14 }}>
      กำลังโหลดแผนที่…
    </div>
  ),
});

import RegistrarRequestsTab from "./registrar/RequestsTab";
import RoomTypesManager from "./registrar/RoomTypesManager";

// รับ uc ("rooms" หรือ "floors") จาก app/page.jsx เพื่อกำหนด sub-flow ของ UC16
// — ถ้าไม่ส่งมา (หรือค่าอื่น) fallback เป็น "rooms" เหมือนเดิม
export default function RegistrarPanel({ uc, user, onNavigate }) {
  const [selected, setSelected] = useState({ building: null, buildingId: null, floor: "1" });
  const [activeTab, setActiveTab] = useState(uc === "floors" ? "floors" : "rooms"); // 'rooms', 'floors' or 'building'
  const [focusRoom, setFocusRoom] = useState(null); // ห้องที่ถูกกดจาก node บนแผนที่ ให้ RoomsManager โฟกัส/แสดงข้อมูลให้
  const [tableSearchNodeId, setTableSearchNodeId] = useState(null);
  const [panelFullscreen, setPanelFullscreen] = useState(false); // แผงจัดการด้านล่างขยายเต็มจอหรือไม่
  const [panelCollapsed, setPanelCollapsed] = useState(false); // ย่อแผงจัดการลงเหลือแค่แถบเล็ก ๆ (เห็นแต่ผังชั้น) กดแถบเพื่อขยายกลับ

  const containerRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState(null); // px ของแผงด้านล่าง; null = ค่าเริ่มต้น (สัดส่วน 40%)
  const MIN_PANEL = 140; // แผงเตี้ยสุด
  const MIN_MAP = 120; // แผนที่ต้องเหลืออย่างน้อยเท่านี้

  const startResize = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const onMove = (ev) => {
      const next = box.bottom - ev.clientY; // ความสูงแผง = ขอบล่างของคอนเทนเนอร์ - ตำแหน่งเมาส์/นิ้ว
      const max = Math.max(MIN_PANEL, box.height - MIN_MAP);
      setPanelHeight(Math.min(max, Math.max(MIN_PANEL, next)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // ผู้ใช้อาจสลับ sub-flow ข้อมูลห้อง <-> ข้อมูลชั้น โดยที่ RegistrarPanel component เดิมไม่ remount
  // ต้องซิงก์ activeTab ตาม uc ทุกครั้งที่ prop เปลี่ยน ไม่ใช่แค่ตอน mount ครั้งแรก
  useEffect(() => {
    if (uc === "floors" || uc === "rooms") setActiveTab(uc);
  }, [uc]);

  // ใช้ดูว่าชั้นที่กำลังเปิดอยู่มีรายละเอียดชั้นบันทึกไว้หรือไม่ เพื่อโชว์ต่อท้ายหัวข้อแผงจัดการ
  const { items: floorItems } = useCollection("floors");
  const { items: buildings, loading: buildingsLoading } = useCollection("buildings");

  if (uc === "requests") { return <RegistrarRequestsTab user={user} onNavigate={onNavigate} />; }
  if (uc === "room_types") { return <RoomTypesManager user={user} />; }

  // Keep the database identity when a building is renamed or shares another building's name.
  const legacyMatches = selected.buildingId ? [] : buildings.filter((b) =>
    b.name === selected.building || b.code === selected.building || b.id === selected.building
  );
  const selectedBuilding = selected.buildingId
    ? buildings.find((b) => b.id === selected.buildingId)
    : legacyMatches.length === 1 ? legacyMatches[0] : null;
  const selectedBuildingName = selectedBuilding?.name || selected.building || "";
  const currentFloorData = floorItems.find((f) => f.buildingId === selectedBuilding?.id && String(f.floorNo) === String(selected.floor));

  const panelOpen = !!(selected.buildingId || selected.building);

  return (
    <div ref={containerRef} className="bdi-fullpanel" style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: 420, overflow: "hidden" }}>
      {/* 1. แผนที่ — อยู่ด้านบนเสมอ ย่อพื้นที่ลงเมื่อแผงจัดการเปิด แทนที่จะให้แผงลอยทับแผนที่ */}
      <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0 }}>
        <BuildingFloorPicker
          building={selectedBuildingName}
          buildingId={selected.buildingId || selectedBuilding?.id || null}
          floor={selected.floor}
          height="100%"
          focusedNodeId={focusRoom?.nodeId || null}
          tableSearchNodeId={tableSearchNodeId}
          onChange={({ building, buildingId, floor }) => {
            // เปลี่ยนอาคารใหม่ → เปิดแผงกลับมา / แค่เปลี่ยนชั้นในอาคารเดิม → คงสถานะย่อไว้
            if (buildingId !== selected.buildingId) setPanelCollapsed(false);
            setSelected({ building, buildingId: buildingId || null, floor });
            setFocusRoom(null);
            setTableSearchNodeId(null);
            setActiveTab(floor ? "rooms" : "building");
          }}
          onSelectRoom={(room) => {
            setActiveTab("rooms");
            setFocusRoom(room);
            setPanelCollapsed(false);
          }}
          onCloseRoomPopup={() => {
            // กด ✕ บน popup ของห้อง → อยู่ที่ผังชั้นเดิม (ไม่กลับไปหน้ารวมทั้งมหาวิทยาลัย)
            // แล้วให้แผงด้านล่างแสดง "ห้องทั้งหมด" ของชั้นนั้น
            setFocusRoom(null);
            setTableSearchNodeId(null);
            setActiveTab("rooms");
            setPanelCollapsed(false);
          }}
        />
      </div>

      {/* 2. แผงจัดการข้อมูล อยู่ด้านล่างแบบ flex ต่อกัน ไม่ทับแผนที่ */}
      {panelOpen && panelCollapsed && (
        <button
          onClick={() => setPanelCollapsed(false)}
          title="แสดงแผงจัดการข้อมูล"
          style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 16px", background: "#F8F9FA", border: "none", borderTop: "1px solid #DADCE0", boxShadow: "0 -2px 10px rgba(0,0,0,0.06)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#1A73E8" }}
        >
          <span style={{ fontSize: 14 }}>▲</span>
          <span>{selectedBuildingName}{selected.floor ? ` · ชั้น ${selected.floor}` : ""}</span>
          <span style={{ color: "#5F6368", fontWeight: 600 }}>· แสดงแผงจัดการข้อมูล</span>
        </button>
      )}

      {panelOpen && !panelCollapsed && (
        <div
          style={{
            ...(panelFullscreen
              ? { position: "fixed", inset: 0, zIndex: 5000 }
              : panelHeight != null
                ? { flex: `0 0 ${panelHeight}px`, minHeight: 0 }
                : { flex: "0 0 40%", minHeight: 0 }),
            background: "#ffffff",
            borderTop: "1px solid #DADCE0",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {!panelFullscreen && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="ลากเพื่อปรับความสูงแผง (ดับเบิลคลิกเพื่อรีเซ็ต)"
              title="ลากเพื่อปรับความสูง · ดับเบิลคลิกเพื่อรีเซ็ต"
              onPointerDown={startResize}
              onDoubleClick={() => setPanelHeight(null)}
              style={{
                flex: "0 0 auto", height: 14, marginTop: -7, marginBottom: -7,
                position: "relative", zIndex: 2, cursor: "row-resize", touchAction: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ width: 44, height: 4, borderRadius: 999, background: "#C4C7CC" }} />
            </div>
          )}

          {/* Header แถบควบคุม Panel */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #DADCE0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8F9FA", flex: "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#202124" }}>
                {selectedBuildingName}{selected.floor ? ` · ชั้น ${selected.floor}` : ""}
              </span>
              {currentFloorData?.note && (
                <span style={{ fontSize: 12.5, color: "#5F6368", fontWeight: 500, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  · {currentFloorData.note}
                </span>
              )}
              <div style={{ display: "flex", gap: 4, background: "#E8EAED", padding: 3, borderRadius: 8 }}>
                <button
                  onClick={() => setActiveTab("rooms")}
                  disabled={!currentFloorData}
                  style={{ border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: currentFloorData ? "pointer" : "default", opacity: currentFloorData ? 1 : 0.5, background: activeTab === "rooms" ? "#fff" : "transparent", color: activeTab === "rooms" ? "#1A73E8" : "#5F6368" }}
                >
                  ข้อมูลห้อง
                </button>
                <button
                  onClick={() => setActiveTab("floors")}
                  disabled={!currentFloorData}
                  style={{ border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: currentFloorData ? "pointer" : "default", opacity: currentFloorData ? 1 : 0.5, background: activeTab === "floors" ? "#fff" : "transparent", color: activeTab === "floors" ? "#1A73E8" : "#5F6368" }}
                >
                  ข้อมูลชั้น
                </button>
                <button
                  onClick={() => setActiveTab("building")}
                  style={{ border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: activeTab === "building" ? "#fff" : "transparent", color: activeTab === "building" ? "#1A73E8" : "#5F6368" }}
                >
                  ข้อมูลตึก
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
                onClick={() => { setPanelFullscreen(false); setPanelCollapsed(true); }}
                title="ย่อแผง (เหลือแต่ผังชั้น)"
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#5F6368" }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* เนื้อหาฟอร์มจัดการ */}
          <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
            {!selectedBuilding ? (
              <Card>{buildingsLoading ? "กำลังโหลดข้อมูลอาคาร…" : "ไม่พบข้อมูลอาคารที่เลือก กรุณาเลือกป้ายอาคารอีกครั้ง"}</Card>
            ) : activeTab === "rooms" && currentFloorData ? (
              <RoomsManager key={currentFloorData.id} floorRecord={currentFloorData} user={user} focusRoom={focusRoom} setFocusRoom={setFocusRoom} onSearchMatch={setTableSearchNodeId} />
            ) : activeTab === "floors" && currentFloorData ? (
              <FloorsManager key={currentFloorData.id} buildingRecord={selectedBuilding} floorRecord={currentFloorData} user={user} />
            ) : (
              <BuildingDetailsManager key={selectedBuilding.id} buildingRecord={selectedBuilding} user={user}
                onRenamed={(name) => setSelected((current) => ({ ...current, building: name }))} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BuildingDetailsManager({ buildingRecord, user, onRenamed }) {
  const { items: buildings, patch: patchBuilding } = useCollection("buildings");
  const { items: assets, create: createAsset, patch: patchAsset } = useCollection("mapAssets");
  const buildingRow = buildings.find((item) => item.id === buildingRecord?.id) || buildingRecord;
  const photoKey = buildingRow ? `building-photo:${buildingRow.id}` : null;
  const photoRecord = assets.find((asset) => asset.kind === "buildingPhoto" && asset.name === photoKey);
  const savedPhoto = photoRecord?.file || (buildingRow?.code?.toUpperCase() === "SC8" ? "/data/places/sc8.png" : "");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setName(buildingRow?.name || "");
    setPhoto(savedPhoto);
    setNotice("");
  }, [buildingRow?.id, buildingRow?.name, savedPhoto]);

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      setNotice("เลือกภาพ PNG, JPG หรือ WebP ขนาดไม่เกิน 1.5 MB");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.onerror = () => setNotice("อ่านไฟล์รูปภาพไม่สำเร็จ");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!buildingRow || saving || !name.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      const nextName = name.trim();
      if (nextName !== buildingRow.name) {
        await patchBuilding(buildingRow.id, { name: nextName }, user);
      }
      if (photo !== savedPhoto) {
        if (photoRecord) {
          await patchAsset(photoRecord.id, { file: photo, status: "published" }, user);
        } else if (photo) {
          await createAsset({ name: photoKey, kind: "buildingPhoto", file: photo, floorId: null, status: "published" }, user);
        }
      }
      clearMapDataCache();
      if (nextName !== buildingRow.name) onRenamed?.(nextName);
      setNotice("บันทึกชื่อและรูปอาคารเรียบร้อยแล้ว");
    } catch (error) {
      setNotice(`บันทึกไม่สำเร็จ: ${error?.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return <Card>
    <b style={{ fontSize: 14, color: "#202124" }}>ข้อมูลตึก</b>
    <p style={{ color: "#5F6368", fontSize: 12.5, lineHeight: 1.6 }}>
      ชื่อและรูปอาคารจะใช้ในการ์ดข้อมูลตึกของหน้า User โดยผังและพิกัดยังจัดการใน GIS
    </p>
    <Field label="รหัสอาคาร"><Input value={buildingRow?.code || ""} disabled /></Field>
    <Field label="ชื่ออาคาร">
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่ออาคาร" />
    </Field>
    <Field label="รูปอาคาร (PNG, JPG, WebP สูงสุด 1.5 MB)">
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} />
    </Field>
    {photo && <img src={photo} alt="ตัวอย่างรูปอาคาร" style={{ display: "block", width: "100%", maxWidth: 420, height: 190, objectFit: "cover", borderRadius: 12, marginTop: 12 }} />}
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
      <Btn onClick={save} disabled={!buildingRow || saving || !name.trim() || (name.trim() === buildingRow.name && photo === savedPhoto)}>
        {saving ? "กำลังบันทึก…" : "บันทึกข้อมูลตึก"}
      </Btn>
      {notice && <span role="status" style={{ fontSize: 12.5, color: notice.startsWith("บันทึกไม่สำเร็จ") ? "#B3261E" : "#188038" }}>{notice}</span>}
    </div>
  </Card>;
}

const splitTeacherNames = (value) => {
  const text = String(value || "").trim();
  if (!text || text === "-") return [];
  return text.split(/\s*(?:\n|,|;|\||\/)\s*/).map((name) => name.trim()).filter(Boolean);
};

const teacherNamesToText = (names) =>
  (Array.isArray(names) ? names : []).map((name) => String(name || "").trim()).filter(Boolean).join(" / ");

const roomFocusKey = (room) => {
  if (room?.id) return "room:" + room.id;
  return room?.nodeId ? "node:" + room.nodeId : null;
};

function RoomTypeSelect({ value, onChange, style }) {
  const { items: roomTypes } = useCollection("roomTypes");
  const ROOM_TYPE_OPTIONS = roomTypes.map((row) => row.name);

  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        minHeight: 38,
        padding: "8px 10px",
        border: "1px solid #DADCE0",
        borderRadius: 8,
        background: "#fff",
        color: "#202124",
        fontSize: 13.5,
        outline: "none",
        ...style,
      }}
    >
      {value && !ROOM_TYPE_OPTIONS.includes(value) ? (
        <option value={value}>{value}</option>
      ) : null}
      {ROOM_TYPE_OPTIONS.map((type) => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>
  );
}

function TeacherInputs({ count, names, onCountChange, onNameChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 8 }}>
        <div style={{ width: 180 }}>
          <Field label="จำนวนอาจารย์">
            <Input
              type="number"
              min="0"
              max="20"
              value={count}
              onFocus={(e) => {
                if (String(e.target.value) === "0") onCountChange("");
                else e.target.select();
              }}
              onChange={(e) => onCountChange(e.target.value)}
              placeholder="กรอกจำนวน"
            />
          </Field>
        </div>
        <div style={{ color: "#5F6368", fontSize: 12.5, paddingBottom: 12 }}>
          กรอกจำนวน แล้วระบบจะสร้างช่องชื่ออาจารย์ให้ตามจำนวนนั้น
        </div>
      </div>

      {Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) => (
        <Field key={index} label={`อาจารย์คนที่ ${index + 1}`}>
          <Input
            value={names[index] || ""}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder="อ.ดร. ..."
          />
        </Field>
      ))}
    </div>
  );
}

// Sub-Component: จัดการห้องพักในชั้นที่เลือก
function RoomsManager({ floorRecord, user, focusRoom, setFocusRoom, onSearchMatch }) {
  const { items, create, patch, destroy } = useCollection("rooms");
  const floorRow = floorRecord;
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    code: "", name: "", type: "ห้องเรียน", capacity: 40,
    teacherCount: 1, teachers: [""], nodeId: "",
  });
  const { items: nodes } = useCollection("nodes");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // โหมดการแสดงผลของแผงห้อง: 'idle' = รายการทั้งหมด, 'view' = ดูข้อมูลอย่างเดียว, 'edit' = ฟอร์มแก้ไข, 'create' = ห้องที่ยังไม่มีข้อมูล
  const [manualOverride, setManualOverride] = useState(false); // ผู้ใช้กด "แสดงห้องทั้งหมด" เอง
  const [showAddForm, setShowAddForm] = useState(false); // กดปุ่ม "เพิ่มข้อมูลห้องนี้" แล้วหรือยัง (กรณีกดจาก node)
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // false = แสดงข้อมูลอย่างเดียวก่อนเสมอ, true = เข้าฟอร์มแก้ไขแล้ว
  const [savingRoom, setSavingRoom] = useState(false);
  const mountedRef = useRef(true);
  const mutationPendingRef = useRef(false);
  const selectionRef = useRef({ floorId: null, focusKey: null, version: 0 });

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // popup แบบในแอป (แทน confirm()/alert() ของเบราว์เซอร์) — confirmTarget = ห้องที่รอยืนยันลบ, notice = ข้อความแจ้งเตือนหลังบันทึก/ผิดพลาด
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  // ผู้ใช้ตั้งใจกด "แก้ไข" มาเลยหรือเปล่า ใช้บอก effect ด้านล่างตอนเปลี่ยนห้องที่โฟกัส
  // (ทุกห้องที่เพิ่งถูกเลือกใหม่ ค่าเริ่มต้นคือโหมดดูข้อมูลอย่างเดียวเสมอ เว้นแต่ตั้ง flag นี้ไว้)
  const editIntentRef = useRef(false);

  const currentRooms = floorRow?.id ? items.filter((r) => r.floorId === floorRow.id) : [];

  // เคลียร์สถานะ override/ฟอร์มเพิ่มห้อง ทุกครั้งที่มีการกด node ใหม่บนแผนที่
  useEffect(() => {
    setManualOverride(false);
    setShowAddForm(false);
  }, [focusRoom]);

  const effectiveFocus = manualOverride ? null : focusRoom;
  const focusKey = roomFocusKey(effectiveFocus);
  useLayoutEffect(() => {
    if (selectionRef.current.floorId !== floorRow?.id || selectionRef.current.focusKey !== focusKey) {
      selectionRef.current = {
        floorId: floorRow?.id,
        focusKey,
        version: selectionRef.current.version + 1,
      };
    }
  }, [floorRow?.id, focusKey]);

  // A request may finish after the user picks another room or changes floors.
  // Keep its database result, but only update the form that started the request.
  const selectionIsCurrent = (selection) => mountedRef.current &&
    selectionRef.current.version === selection.version &&
    selectionRef.current.floorId === selection.floorId &&
    selectionRef.current.focusKey === selection.focusKey;
  const beginMutation = () => {
    if (mutationPendingRef.current) return false;
    mutationPendingRef.current = true;
    setSavingRoom(true);
    return true;
  };
  const finishMutation = () => {
    mutationPendingRef.current = false;
    if (mountedRef.current) setSavingRoom(false);
  };
  const updateFocusAfterMutation = (selection, room) => {
    if (!selectionIsCurrent(selection)) return;
    setFocusRoom((current) => roomFocusKey(current) === selection.focusKey ? room : current);
  };

  // BuildingFloorPicker ส่งข้อมูลมา 2 แบบ:
  // - ถ้า node นั้นมีห้องอยู่แล้ว: ส่ง record ห้องจริงมาเลย (มี .id)
  // - ถ้ายังไม่มีข้อมูลห้อง: ส่ง placeholder ที่มี __isNewNode: true (มี .nodeId แต่ .id เป็น null)
  // ใช้ .id เทียบกับรายการห้องปัจจุบันเพื่อความชัวร์ (เผื่อข้อมูลถูกแก้ไข/อัปเดตไปแล้ว)
  const matchedRoom =
    effectiveFocus && !effectiveFocus.__isNewNode
      ? currentRooms.find((r) => r.id === effectiveFocus.id) || (effectiveFocus.floorId === floorRow?.id ? effectiveFocus : null)
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
        teacherCount: Math.max(1, splitTeacherNames(matchedRoom.teacher).length),
        teachers: (() => {
          const names = splitTeacherNames(matchedRoom.teacher);
          return names.length ? names : [""];
        })(),
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
  const setTeacherCount = (target) => (rawValue) => {
    // อนุญาตให้ช่องว่างได้ชั่วคราว เพื่อให้กดแล้วพิมพ์เลขใหม่โดยไม่ติด 0 เดิม
    if (rawValue === "") {
      target((f) => ({ ...f, teacherCount: "", teachers: [] }));
      return;
    }
    const count = Math.max(0, Math.min(20, Number.parseInt(rawValue, 10) || 0));
    target((f) => ({
      ...f,
      teacherCount: count,
      teachers: Array.from({ length: count }, (_, i) => f.teachers?.[i] || ""),
    }));
  };
  const setTeacherName = (target) => (index, value) => {
    target((f) => {
      const teachers = Array.from({ length: f.teacherCount || 0 }, (_, i) => f.teachers?.[i] || "");
      teachers[index] = value;
      return { ...f, teachers };
    });
  };
  // "แสดงห้องทั้งหมด" → ล้างห้องที่โฟกัสด้วย เพื่อให้แผนที่กลับมาเป็นผังชั้นปกติ (ไม่ค้างกรอบฟ้า/ซูมที่ห้องเดิม)
  const backToList = () => { setManualOverride(true); setFocusRoom(null); };

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
    if (!r || !beginMutation()) return;
    const selection = { ...selectionRef.current };
    setConfirmTarget(null);
    try {
      await destroy(r.id, user);
      if (!selectionIsCurrent(selection)) return;
      setManualOverride(true);
      updateFocusAfterMutation(selection, null);
      setNotice({ title: "สำเร็จ", message: "ลบข้อมูลห้องเรียบร้อยแล้ว" });
    } catch (e) {
      if (selectionIsCurrent(selection)) {
        setNotice({ title: "ลบข้อมูลไม่สำเร็จ", message: e?.message || String(e) });
      }
    } finally {
      finishMutation();
    }
  };

  // เทียบค่าฟอร์มที่กำลังแก้กับค่าที่บันทึกไว้จริงของห้องนี้ ใช้ไฮไลต์ช่องที่ถูกแก้ไข
  const fieldChanged = (k) => {
    if (!editForm || !matchedRoom) return false;
    if (k === "teacher") {
      return teacherNamesToText(editForm.teachers) !== teacherNamesToText(splitTeacherNames(matchedRoom.teacher));
    }
    const saved =
      k === "capacity" ? matchedRoom.capacity ?? 0
      : k === "type" ? matchedRoom.type || "ห้องเรียน"
      : matchedRoom[k] || "";
    return String(editForm[k]) !== String(saved);
  };

  const rows = currentRooms.filter((r) => (r.code + r.name + r.teacher + r.type).toLowerCase().includes(q.toLowerCase()));

  const singleSearchNodeId = q.trim() && rows.length === 1 ? rows[0].nodeId || null : null;
  useEffect(() => {
    onSearchMatch(singleSearchNodeId);
    return () => onSearchMatch(null);
  }, [singleSearchNodeId, onSearchMatch]);

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
        teacherCount: Math.max(1, splitTeacherNames(matchedRoom.teacher).length),
        teachers: (() => {
          const names = splitTeacherNames(matchedRoom.teacher);
          return names.length ? names : [""];
        })(),
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
                <RoomTypeSelect value={editForm.type} onChange={setEdit("type")} style={diffInputStyle(fieldChanged("type"))} />
              </EditField>
            </div>
            <div style={{ flex: 1 }}>
              <EditField label="ความจุ" changed={fieldChanged("capacity")}>
                <Input type="number" value={editForm.capacity} onChange={setEdit("capacity")} style={diffInputStyle(fieldChanged("capacity"))} />
              </EditField>
            </div>
          </div>
          <EditField label="อาจารย์ประจำห้อง" changed={fieldChanged("teacher")}>
            <div style={fieldChanged("teacher") ? diffInputStyle(true) : undefined}>
              <TeacherInputs
                count={editForm.teacherCount}
                names={editForm.teachers}
                onCountChange={setTeacherCount(setEditForm)}
                onNameChange={setTeacherName(setEditForm)}
              />
            </div>
          </EditField>
          <EditField label="รหัส node บนผังชั้น" changed={fieldChanged("nodeId")}>
            <Input value={editForm.nodeId} readOnly title="รหัส node มาจากข้อมูลแผนที่ของฝ่ายแผนที่" style={{ ...diffInputStyle(false), background: "#F8F9FA", color: "#5F6368" }} />
          </EditField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn kind="ghost" disabled={savingRoom} onClick={cancelEdit}>ยกเลิกการแก้ไข</Btn>
            <Btn
              disabled={savingRoom}
              onClick={async () => {
                const code = String(editForm.code || "").trim();
                const name = String(editForm.name || "").trim();
                const capacity = Number(editForm.capacity);
                if (!code || !name || !Number.isInteger(capacity) || capacity < 0) {
                  setNotice({ icon: "⚠️", title: "ข้อมูลไม่ถูกต้อง", message: "กรุณากรอกรหัสห้อง ชื่อห้อง และความจุที่เป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" });
                  return;
                }
                // Only fields owned by Registrar: nodeId is a foreign key assigned
                // by the map team and should never be sent back from this form.
                const changes = {
                  code, name, type: String(editForm.type || "").trim(), capacity,
                  teacher: teacherNamesToText(editForm.teachers),
                };
                if (!beginMutation()) return;
                const selection = { ...selectionRef.current };
                try {
                  const updated = await patch(matchedRoom.id, changes, user);
                  if (!updated) throw new Error("ไม่พบห้องที่ต้องการแก้ไข");
                  if (!selectionIsCurrent(selection)) return;

                  // patch() บาง backend อาจคืนเฉพาะ field ที่แก้ ทำให้ nodeId/floorId หายไป
                  // ถ้าเอา updated ไปแทน focusRoom ตรง ๆ BuildingFloorPicker จะเสีย focusedNodeId
                  // และผังที่กำลังเปิดอาจหาย/หลุดหลังบันทึก จึง merge กับข้อมูลเดิมไว้เสมอ
                  const mergedRoom = {
                    ...matchedRoom,
                    ...updated,
                    ...changes,
                    id: updated?.id ?? matchedRoom.id,
                    nodeId: updated?.nodeId ?? matchedRoom.nodeId ?? editForm.nodeId ?? "",
                    floorId: updated?.floorId ?? matchedRoom.floorId,
                  };

                  setEditForm((f) => ({
                    ...f,
                    code: mergedRoom.code || "",
                    name: mergedRoom.name || "",
                    type: mergedRoom.type || "ห้องเรียน",
                    capacity: mergedRoom.capacity ?? 0,
                    nodeId: mergedRoom.nodeId || "",
                    teachers: splitTeacherNames(mergedRoom.teacher),
                    teacherCount: splitTeacherNames(mergedRoom.teacher).length,
                  }));
                  setIsEditing(false);
                  setNotice({ icon: null, title: "สำเร็จ", message: "บันทึกการแก้ไขเรียบร้อยแล้ว" });
                } catch (error) {
                  if (selectionIsCurrent(selection)) {
                    setNotice({ icon: null, title: "บันทึกไม่สำเร็จ", message: error?.message || String(error) });
                  }
                } finally {
                  finishMutation();
                }
              }}
            >
              {savingRoom ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
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
              <div style={{ flex: 1 }}><Field label="ประเภท"><RoomTypeSelect value={form.type} onChange={set("type")} /></Field></div>
              <div style={{ flex: 1 }}><Field label="ความจุ"><Input type="number" value={form.capacity} onChange={set("capacity")} /></Field></div>
            </div>
            <TeacherInputs
              count={form.teacherCount}
              names={form.teachers}
              onCountChange={setTeacherCount(setForm)}
              onNameChange={setTeacherName(setForm)}
            />
            <Field label="รหัส node บนผังชั้น (จากฝ่ายแผนที่)"><Input value={form.nodeId} readOnly placeholder="Sc8StudyRoom4F1" style={{ background: "#F8F9FA", color: "#5F6368" }} /></Field>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn
                disabled={savingRoom}
                onClick={async () => {
                  if (!form.code.trim() || !form.name.trim()) {
                    return setNotice({ icon: "⚠️", title: "ข้อมูลไม่ครบ", message: "กรุณาระบุรหัสห้องและชื่อห้อง" });
                  }
                  if (!beginMutation()) return;
                  const selection = { ...selectionRef.current };
                  // ตาราง rooms มี UNIQUE (building, floor, code) — ถ้ารหัสห้องซ้ำในชั้นเดียวกัน
                  // create() จะ throw ต้องดักไว้ ไม่งั้นปุ่มจะเงียบไปเฉยๆ โดยผู้ใช้ไม่รู้สาเหตุ
                  try {
                    const nodeRow = nodes.find((n) => n.floorId === floorRow?.id && (n.id === form.nodeId || n.nodeKey === form.nodeId));
                    if (!nodeRow || !floorRow?.id) throw new Error("ไม่พบจุดห้องในชั้นที่เลือก กรุณาเลือกจุดบนผังใหม่");

                    const createdRoom = await create({
                      code: form.code,
                      name: form.name,
                      type: form.type,
                      capacity: Number(form.capacity),
                      teacher: teacherNamesToText(form.teachers),
                      nodeId: nodeRow.id,
                      floorId: floorRow.id,
                    }, user);
                    if (!selectionIsCurrent(selection)) return;
                    setForm({ code: "", name: "", type: "ห้องเรียน", capacity: 40, teacherCount: 1, teachers: [""], nodeId: "" });
                    setShowAddForm(false);
                    if (createdRoom) {
                      // Keep actual database node/floor IDs even with a partial response.
                      updateFocusAfterMutation(selection, {
                        ...createdRoom,
                        nodeId: createdRoom.nodeId ?? nodeRow.id,
                        floorId: createdRoom.floorId ?? floorRow.id,
                      });
                    }
                    setNotice({ icon: null, title: "สำเร็จ", message: "เพิ่มข้อมูลห้องเรียบร้อยแล้ว" });
                  } catch (e) {
                    if (selectionIsCurrent(selection)) {
                      setNotice({ icon: null, title: "บันทึกไม่สำเร็จ", message: e?.message || "ไม่สามารถบันทึกข้อมูลห้องได้" });
                    }
                  } finally {
                    finishMutation();
                  }
                }}
              >
                {savingRoom ? "กำลังบันทึก…" : "บันทึกข้อมูลห้อง"}
              </Btn>
              <Btn kind="ghost" disabled={savingRoom} onClick={() => setShowAddForm(false)}>ยกเลิก</Btn>
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
          empty={nodes.some((node) => node.floorId === floorRow?.id)
            ? "ยังไม่มีรายละเอียดห้อง เลือกจุดห้องบนผังเพื่อเพิ่มข้อมูล"
            : "ชั้นนี้ยังไม่มีจุดห้องจากฝ่าย GIS สามารถเติมข้อมูลตึกและรายละเอียดชั้นก่อนได้"}
        />
      </div>
      {popupEl}
    </>
  );
}

// Sub-Component: จัดการรายละเอียดชั้น
// โครงสร้างชั้นและไฟล์ผัง (SVG) เป็นข้อมูลจาก "ฝ่ายแผนที่" ผ่าน mapAssets
// ฝ่ายทะเบียนแก้ไขได้เฉพาะ "รายละเอียดชั้น" เท่านั้น ไม่สร้าง/ลบชั้น และไม่แก้ไฟล์ผัง
function FloorsManager({ buildingRecord, floorRecord, user }) {
  const { items, patch } = useCollection("floors");
  const { items: rooms } = useCollection("rooms");
  const { items: mapAssets } = useCollection("mapAssets");

  const building = buildingRecord?.name || "";
  const floor = floorRecord?.floorNo || "";
  const floorData = items.find((f) => f.id === floorRecord?.id && f.buildingId === buildingRecord?.id) || floorRecord;

  // GIS owns the floor record and plan. Registrar can add its note before a plan is uploaded/published.
  const mapFloorAsset = mapAssets.find(
    (a) =>
      a.kind === "floorplan" &&
      a.status !== "deleted" && a.file &&
      a.floorId === floorData?.id
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
  }, [floorData?.id]);

  const roomCount = rooms.filter(
    (r) => r.floorId === floorData?.id
  ).length;

  const fieldChanged = () => String(form.note) !== String(savedNote);

  const cancelEdit = () => {
    setForm({ note: savedNote });
    setIsEditing(false);
  };

  const save = async () => {
    if (!floorData || floorData.buildingId !== buildingRecord?.id) {
      setNotice({
        icon: "⚠️",
        title: "ข้อมูลชั้นยังไม่พร้อม",
        message: "ยังไม่พบชั้นของอาคารนี้ กรุณาให้ฝ่าย GIS เพิ่มชั้นก่อน",
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

  if (!floorData) {
    return (
      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>ผังชั้นของ {building} — ชั้น {floor}</b>
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "#FEF7E0", border: "1px solid #FDE293", color: "#7A4F00", fontSize: 12.5, lineHeight: 1.5 }}>
          ยังไม่มีข้อมูลชั้นจากฝ่าย GIS กรุณาให้ฝ่าย GIS เพิ่มชั้นของอาคารนี้ก่อน
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
          <InfoField label="ผังชั้นจากฝ่ายแผนที่" value={mapFloorAsset?.name || (mapFloorAsset ? `ชั้น ${floor}` : "ยังไม่ได้อัปโหลดผังชั้น")} />
          <InfoField
            label="ไฟล์ผัง (อ่านอย่างเดียว)"
            value={String(mapFloorAsset?.file || "").startsWith("data:") ? "ไฟล์ SVG ที่ฝ่ายแผนที่อัปโหลด" : mapFloorAsset?.file || "—"}
          />

          <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: -4, marginBottom: 8 }}>
            ฝ่ายทะเบียนเติมรายละเอียดชั้นได้หลัง GIS สร้างชั้นแล้ว ส่วนไฟล์ผังและตำแหน่งให้ฝ่าย GIS จัดการ
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={() => { setForm({ note: savedNote }); setIsEditing(true); }} disabled={!floorData}>แก้ไขข้อมูลชั้น</Btn>
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

        <InfoField label="ผังชั้นจากฝ่ายแผนที่" value={mapFloorAsset?.name || (mapFloorAsset ? `ชั้น ${floor}` : "ยังไม่ได้อัปโหลดผังชั้น")} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Btn kind="ghost" disabled={saving} onClick={cancelEdit}>ยกเลิก</Btn>
          <Btn
            disabled={saving}
            onClick={async () => {
              const ok = await save();
              if (ok) {
                setIsEditing(false);
                setNotice({ icon: null, title: "สำเร็จ", message: "บันทึกข้อมูลชั้นเรียบร้อยแล้ว" });
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
function ModalPopup({ icon = null, title, message, confirmText = "ตกลง", cancelText, danger, onConfirm, onCancel }) {
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
          {icon ? <span style={{ fontSize: 20 }}>{icon}</span> : null}
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