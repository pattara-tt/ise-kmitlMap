"use client";

import { useEffect, useState } from "react";
import { useMapData, clearMapDataCache } from "../../../lib/useMapData";
import { Btn, Card, Field, Input, Pill, Select, Status, Table, UCHead, useCollection } from "../../ui";
import { formatDateTime } from "../../../lib/datetime";
import BoundaryPointEditor from "./BoundaryPointEditor";

/* =========================================================
   UC7 : ขอบเขตแผนผัง
========================================================= */

function Boundary({
  user
}) {
  const {
    data: mapData
  } = useMapData();

  const buildings = mapData?.buildings || [];

  const buildingsApi = useCollection("buildings");
  const floorsApi = useCollection("floors");
  const facultiesApi = useCollection("faculties");
  const faculties = facultiesApi.items || [];
  const [facultyForm, setFacultyForm] = useState({ id: "", name: "" });
  const [savingFaculty, setSavingFaculty] = useState(false);

  const {
    items = [],
    create,
    patch,
    destroy
  } = useCollection("mapBoundaries");

  const [form, setForm] = useState({
    name: "custom",
    customName: "",
    type: "building",
    buildingId: "",
    buildingCode: "",
    facultyId: "",
    floorCount: ""
  });
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState(null);
  const [draftPoints, setDraftPoints] = useState([]);
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));

  // ประเภท = อาคาร : ให้ buildingId ชี้ไปที่อาคารจริงจาก mapData.buildings โดยอัตโนมัติ
  // (ถ้าผู้ใช้เลือก "พิมพ์ระบุเอง" ไว้แล้วจะไม่ไปแทนที่ค่า เว้นแต่ยังไม่มีอาคารในระบบเลยจริง ๆ)
  useEffect(() => {
    if (form.type !== "building") return;

    if(form.buildingId === "custom") return;
    const hasRealSelection = buildings.some(b => b.id === form.buildingId);

    if (hasRealSelection) return;

    if (buildings.length > 0) {
      setForm(current => ({ ...current, buildingId: buildings[0].id }));
    } else {
      setForm(current => ({
        ...current,
        buildingId: "custom"
      }));
    }
  },  [form.type, form.buildingId, buildings]);

  // รายชื่อขอบเขตที่เคยถูกสร้างไว้แล้ว เฉพาะประเภทที่เลือกอยู่ (ใช้กับ ประเภท = วิทยาเขต / โซน ที่ไม่มีลิสต์กลางให้เชื่อม)
  const existingNames = [...new Set(items.filter(it => it.type === form.type).map(it => it.name).filter(Boolean))];

  // ชื่อขอบเขตที่จะใช้จริง
  // - ถ้าประเภท = อาคาร ให้เชื่อมกับรายชื่ออาคารจริงจาก mapData.buildings (เหมือนหน้า "แผนผังภายในอาคาร")
  // - ถ้าประเภทอื่น ใช้ลิสต์ชื่อขอบเขตเดิมที่เคยสร้างไว้
  const nameValue = form.type === "building" ? (form.buildingId === "custom" ? (form.customName || "").trim() : buildings.find(b => b.id === form.buildingId)?.name || "") : form.name === "custom" ? (form.customName || "").trim() : form.name;

  // ==========================================
  // เพิ่ม Boundary ใหม่
  // ==========================================
  // จำนวนชั้น: เว้นว่างได้ (= ไม่สร้างชั้นให้) ถ้ากรอกต้องเป็นจำนวนเต็ม 1-99
  const floorCountText = String(form.floorCount ?? "").trim();
  const floorCountNum = Number(floorCountText);
  const floorCountValid =
    floorCountText === "" ||
    (Number.isInteger(floorCountNum) && floorCountNum >= 1 && floorCountNum <= 99);

  // สร้างอาคาร (ถ้ายังไม่มี) และชั้น 1..count ที่ยังไม่มี ให้เป็นข้อมูลจริงในระบบ
  // เพื่อให้ UC8 เลือกอาคาร/ชั้นได้เหมือนข้อมูลที่มีอยู่เดิม
  const ensureBuildingWithFloors = async ({ buildingId, code, name, facultyId, count }) => {
    const cleanCode = String(code || "").trim().toUpperCase();
    if (!cleanCode) throw new Error("กรุณาระบุรหัสอาคาร");
    if (!name?.trim()) throw new Error("กรุณาระบุชื่ออาคาร");
    if (!facultyId) throw new Error("กรุณาเลือกคณะ");

    let building = buildings.find(b => b.id === buildingId) ||
      buildings.find(b => String(b.code || "").toUpperCase() === cleanCode);
    const id = building?.id || `BLD-${cleanCode}`;

    if (!building) {
      await buildingsApi.create({ id, code: cleanCode, name: name.trim(), facultyId }, user);
    } else {
      // คง ID เดิมไว้เพื่อรักษาความสัมพันธ์กับข้อมูลส่วนอื่น
      await buildingsApi.patch(id, { code: cleanCode, name: name.trim(), facultyId }, user);
    }

    const existingNos = new Set((building?.floors || []).map(f => String(f.floorNo)));
    const stamp = Date.now();
    for (let n = 1; n <= count; n++) {
      if (existingNos.has(String(n))) continue;
      await floorsApi.create({
        id: `FL-${stamp}-${n}`,
        buildingId: id,
        floorNo: String(n),
        name: `ชั้น ${n}`
      }, user);
    }
    clearMapDataCache();
    return id;
  };

  const saveFaculty = async () => {
    const id = facultyForm.id.trim();
    const name = facultyForm.name.trim();
    if (!id || !name) return alert("กรุณาระบุ ID และชื่อคณะ");
    // ตรวจสอบข้อมูลซ้ำก่อนส่งบันทึก
    if (faculties.some(f => String(f.id).trim().toLowerCase() === id.toLowerCase())) {
      return alert("ID คณะนี้มีอยู่แล้ว กรุณาใช้ ID อื่น");
    }
    if (faculties.some(f => String(f.name).trim().toLowerCase() === name.toLowerCase())) {
      return alert("ชื่อคณะนี้มีอยู่แล้ว");
    }

    // ให้ผู้ใช้ยืนยันอีกครั้งก่อนบันทึกลงฐานข้อมูล
    const confirmed = window.confirm(
      `ยืนยันการเพิ่มคณะนี้หรือไม่?\n\nID: ${id}\nชื่อคณะ: ${name}\n\nโปรดตรวจสอบ ID ให้ถูกต้อง เพราะไม่ควรเปลี่ยนภายหลัง`
    );
    if (!confirmed) return;

    setSavingFaculty(true);
    try {
      await facultiesApi.create({ id, name }, user);
      setFacultyForm({ id: "", name: "" });
      clearMapDataCache();
    } catch (err) {
      alert(err?.message || "บันทึกข้อมูลคณะไม่สำเร็จ");
    } finally {
      setSavingFaculty(false);
    }
  };

  const openNewBoundaryEditor = () => {
    if (!nameValue) {
      return alert("กรุณาระบุชื่อขอบเขต");
    }
    if (!form.facultyId) return alert("กรุณาเลือกคณะ");
    if (form.type === "building") {
      if (!String(form.buildingCode || "").trim()) return alert("กรุณาระบุรหัสอาคาร");
      if (!nameValue) return alert("กรุณาระบุชื่ออาคาร");
      if (!floorCountText || !floorCountValid || floorCountNum < 1) {
        return alert("จำนวนชั้นต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 99");
      }
    }
    setEditingBoundary(null);
    setDraftPoints([]);
    setEditorOpen(true);
  };

  // ==========================================
  // แก้ไข Boundary เดิม
  // ==========================================
  const openEditBoundaryEditor = boundary => {
    setEditingBoundary(boundary);

    // ถ้าเป็นข้อมูลใหม่ที่มีพิกัดจริง
    if (Array.isArray(boundary.geometry) && boundary.geometry.length > 0 && Array.isArray(boundary.geometry[0])) {
      setDraftPoints(boundary.geometry.map(p => [Number(p[0]), Number(p[1])]));
    } else {
      setDraftPoints([]);
    }
    setEditorOpen(true);
  };

  // ==========================================
  // บันทึก Boundary ใหม่
  // ==========================================
  const saveNewBoundary = async points => {
    if (points.length < 3) {
      return alert("กรุณาเลือกอย่างน้อย 3 จุด");
    }

    // เชื่อมกับอาคารจริงเมื่อเลือกจากลิสต์ ส่วนอาคารที่พิมพ์เองจะได้ buildingId
    // ก็ต่อเมื่อระบุจำนวนชั้น (ระบบสร้างอาคารและชั้นให้)
    let buildingId = form.type === "building" && form.buildingId !== "custom" ? form.buildingId : null;

    if (form.type === "building") {
      try {
        buildingId = await ensureBuildingWithFloors({
          buildingId,
          code: form.buildingCode || buildings.find(b => b.id === buildingId)?.code,
          name: nameValue,
          facultyId: form.facultyId,
          count: floorCountNum
        });
      } catch (err) {
        console.error(err);
        return alert(err?.message || "สร้างอาคาร/ชั้นไม่สำเร็จ");
      }
    }

    const newBoundary = {
      id: `MB-${Date.now()}`,
      name: nameValue,
      type: form.type,
      // map_boundaries เชื่อมกับอาคารผ่าน building_id เท่านั้น
      // คณะจะอ่านผ่าน buildings.faculty_id ไม่ต้องบันทึก facultyId ซ้ำ
      buildingId,
      // geometry เก็บเป็น [lat, lon] ตามพฤติกรรมเดิมของ editor
      geometry: points,
      updatedAt: new Date().toISOString(),
      status: "draft",
      selectableForAssets: form.type=="building"
    };
    await create(newBoundary, user);
    setForm({
      name: "custom",
      customName: "",
      type: "building",
      buildingId: "",
      buildingCode: "",
      facultyId: "",
      floorCount: ""
    });
    setDraftPoints([]);
    setEditorOpen(false);
  };

  // ==========================================
  // บันทึกการแก้ไข Boundary เดิม
  // ==========================================
  const saveExistingBoundary = async points => {
    if (!editingBoundary) return;
    if (points.length < 3) {
      return alert("กรุณาเลือกอย่างน้อย 3 จุด");
    }
    await patch(editingBoundary.id, {
      geometry: points,
      updatedAt: new Date().toISOString(),
      // แก้ไขแล้วกลับไปเป็น draft
      status: "draft",
      selectableForAssets:
      editingBoundary.selectableForAssets !== false &&
      editingBoundary.type == "building"
    }, user);
    setEditingBoundary(null);
    setDraftPoints([]);
    setEditorOpen(false);
  };

  // ==========================================
  // รับผลจาก Map Editor
  // ==========================================
  const handleSavePoints = async points => {
    if (editingBoundary) {
      await saveExistingBoundary(points);
    } else {
      await saveNewBoundary(points);
    }
  };
  return <>
      <UCHead title="จัดการขอบเขตสถานที่" desc="กำหนดขอบเขตวิทยาเขต/อาคาร โดยเลือกจุดบนแผนที่เพื่อบันทึกพิกัด Latitude และ Longitude" />

      <Card>
        <b style={{ fontSize: 13.5, color: "#202124" }}>จัดการข้อมูลคณะ</b>
        <div style={{ marginTop: 6, fontSize: 11.5, color: "#B45309" }}>
          ID ต้องคงเดิม ห้ามเปลี่ยน เพราะกระทบข้อมูลที่เชื่อมโยง
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(180px, 2fr)", gap: 8, marginTop: 10 }}>
          <Field label="ID คณะ">
            <Input value={facultyForm.id} onChange={e => setFacultyForm(f => ({ ...f, id: e.target.value }))} placeholder="เช่น FAC-11" />
          </Field>
          <Field label="ชื่อคณะ">
            <Input value={facultyForm.name} onChange={e => setFacultyForm(f => ({ ...f, name: e.target.value }))} placeholder="ระบุชื่อคณะ" />
          </Field>
        </div>
        <Btn onClick={saveFaculty} disabled={savingFaculty}>{savingFaculty ? "กำลังบันทึก..." : "เพิ่มคณะ"}</Btn>
        <div style={{ marginTop: 10, fontSize: 12, color: "#5F6368" }}>
          คณะที่มีในระบบ: {faculties.map(f => `${f.name} (${f.id})`).join(" · ") || "ยังไม่มีข้อมูล"}
        </div>
      </Card>

      {/* ======================================
          เพิ่มขอบเขตใหม่
          ====================================== */}
      <Card>
        <b style={{
        fontSize: 13.5,
        color: "#202124"
      }}>
          เพิ่มขอบเขตใหม่
        </b>

        <div style={{
        marginTop: 8
      }}>
          <Field label="ประเภท">
            <Select value={form.type} onChange={e => {
            const type = e.target.value;
            // เปลี่ยนประเภทแล้ว ให้รีเซ็ตชื่อขอบเขต/อาคารที่เลือกไว้ เพราะลิสต์จะเปลี่ยนตามประเภทใหม่
            setForm(current => ({
              ...current,
              type,
              name: "custom",
              customName: "",
              buildingId: "",
              buildingCode: "",
              facultyId: "",
              floorCount: ""
            }));
          }}>
              <option value="campus">
                วิทยาเขต
              </option>

              <option value="building">
                อาคาร
              </option>

              <option value="zone">
                โซน/พื้นที่ย่อย
              </option>
            </Select>
          </Field>

          <Field label="คณะที่เป็นเจ้าของขอบเขต">
            <Select value={form.facultyId} onChange={e => setForm(f => ({ ...f, facultyId: e.target.value }))}>
              <option value="">-- เลือกคณะ --</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>

          {form.type === "building" ? <>
              {/* ประเภท = อาคาร : เชื่อมกับรายชื่ออาคารจริงจาก mapData.buildings เหมือนหน้า "แผนผังภายในอาคาร" */}
              <Field label="อาคาร">
                <Select value={form.buildingId} onChange={e => {
                const buildingId = e.target.value;
                if (buildingId === "custom") {
                  setForm(current => ({ ...current, buildingId: "custom", buildingCode: "", customName: "" }));
                } else {
                  const selected = buildings.find(b => b.id === buildingId);
                  setForm(current => ({ ...current, buildingId, buildingCode: selected?.code || "", customName: selected?.name || "" }));
                }
              }}>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value="custom">-- พิมพ์ระบุเอง (กรณีไม่มีในรายการ) --</option>
                </Select>
              </Field>

              {/* ถ้าเลือก อาคาร แบบกำหนดเอง ให้แสดงช่อง Input ให้พิมพ์ */}
              <Field label="รหัสอาคาร">
                <Input value={form.buildingCode || ""} onChange={set("buildingCode")} placeholder="เช่น SC8"
                  disabled={form.buildingId !== "custom" && Boolean(form.buildingId)} />
              </Field>

              {/* แสดงช่องชื่ออาคารเฉพาะเมื่อเลือกพิมพ์ระบุเอง */}
              {form.buildingId === "custom" && (
                <Field label="ชื่ออาคาร">
                  <Input
                    value={form.customName || ""}
                    onChange={set("customName")}
                    placeholder="เช่น อาคารวิทยาศาสตร์"
                  />
                </Field>
              )}

              {/* จำนวนชั้น: ระบบจะสร้างชั้น 1..N ให้เลือกใน UC8 (ยังพิมพ์เพิ่มชั้นเองใน UC8 ได้) */}
              <Field label="จำนวนชั้น (เพื่อให้ไปแสดงให้เลือกเมื่อเพิ่มแผนผัง)">
                <Input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  value={form.floorCount}
                  onChange={set("floorCount")}
                  placeholder="เช่น 8"
                />
              </Field>
            </> : <>
              {/* ประเภท = วิทยาเขต / โซน : ใช้ชื่อขอบเขตที่เคยสร้างไว้ หรือพิมพ์เอง */}
              <Field label="ชื่อขอบเขต">
                <Select value={form.name} onChange={e => {
                const name = e.target.value;
                if (name === "custom") {
                  setForm(current => ({ ...current, name: "custom", customName: "" }));
                } else {
                  setForm(current => ({ ...current, name }));
                }
              }}>
                  {existingNames.map(n => <option key={n} value={n}>{n}</option>)}
                  <option value="custom">-- พิมพ์ระบุเอง (กรณีไม่มีในรายการ) --</option>
                </Select>
              </Field>

              {/* ถ้าเลือก ชื่อขอบเขต แบบกำหนดเอง ให้แสดงช่อง Input ให้พิมพ์ */}
              {(form.name === "custom" || existingNames.length === 0) && (
                <Field label="ระบุชื่อขอบเขตเอง">
                  <Input
                    value={form.customName || ""}
                    onChange={set("customName")}
                    placeholder="เช่น ขอบเขตวิทยาเขต / โซน..."
                  />
                </Field>
              )}
            </>}

          <Btn onClick={openNewBoundaryEditor}>
            🗺️ เลือกจุดบนแผนที่
          </Btn>

          <div style={{
          marginTop: 7,
          fontSize: 11.5,
          color: "#5F6368",
          lineHeight: 1.5
        }}>
            กดปุ่มเพื่อเปิดแผนที่ จากนั้นคลิกตำแหน่งที่ต้องการ
            ระบบจะแปลงตำแหน่งที่คลิกเป็น Latitude / Longitude
            อัตโนมัติ
          </div>
        </div>
      </Card>

      {/* ======================================
          Boundary ที่มีอยู่แล้ว
          ====================================== */}
      <Table columns={[{
      key: "name",
      label: "ชื่อขอบเขต"
    }, {
      key: "type",
      label: "ประเภท",
      render: r => <Pill>{r.type}</Pill>
    }, {
      key: "points",
      label: "จุดพิกัด",
      render: r => {
        // ข้อมูลใหม่ที่มี Lat/Lon
        if (Array.isArray(r.geometry) && Array.isArray(r.geometry[0])) {
          return `${r.geometry.length} จุด`;
        }
        return "-";
      }
    }, {
      key: "updatedAt",
      label: "แก้ไขล่าสุด",
      render: r => formatDateTime(r.updatedAt)
    }, {
      key: "status",
      label: "สถานะ",
      render: r => <Status value={r.status} />
    }, {
      key: "act",
      label: "",
      render: r => <div style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap"
      }}>
                {/* แก้ไขพิกัด */}
                <Btn kind="ghost" onClick={() => openEditBoundaryEditor(r)}>
                  🗺️ แก้ไขจุด
                </Btn>

                {/* Publish / Draft */}
                {r.status === "draft" ? <Btn kind="ok" onClick={() => patch(r.id, {
                  status: "published",
                  selectableForAssets: r.type == "building",
                  updatedAt: new Date().toISOString()
                }, user)}>
                    เผยแพร่
                  </Btn> : <Btn kind="ghost" onClick={() => patch(r.id, {
                    status: "draft",
                    selectableForAssets: false,
                    updatedAt: new Date().toISOString()
                  }, user)}>
                    ถอนกลับร่าง
                  </Btn>}

                {/* Delete */}
                <Btn kind="danger" onClick={() => confirm("ลบขอบเขตนี้?") && destroy(r.id, user)}>
                  ลบ
                </Btn>
              </div>
    }]} rows={items} />

        


      {/* ======================================
          เปิด Map Editor
          ====================================== */}
      {editorOpen ? <BoundaryPointEditor title={editingBoundary ? `แก้ไขขอบเขต: ${editingBoundary.name}` : `เพิ่มขอบเขต: ${nameValue}`} initialPoints={draftPoints} onCancel={() => {
      setEditorOpen(false);
      setEditingBoundary(null);
      setDraftPoints([]);
    }} onSave={handleSavePoints} /> : null}
    </>;
}

export default Boundary;