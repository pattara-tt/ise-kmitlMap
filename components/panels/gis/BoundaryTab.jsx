"use client";

import { useEffect, useState } from "react";
import { useMapData } from "../../../lib/useMapData";
import { Btn, Card, Field, Input, Pill, Select, Status, Table, UCHead, useCollection } from "../../ui";
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
    buildingId: ""
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
    const hasRealSelection = buildings.some(b => b.id === form.buildingId);
    if (hasRealSelection) return;
    if (buildings.length > 0) {
      setForm(current => ({ ...current, buildingId: buildings[0].id }));
    } else if (form.buildingId !== "custom") {
      setForm(current => ({ ...current, buildingId: "custom" }));
    }
  }, [form.type, buildings]);

  // รายชื่อขอบเขตที่เคยถูกสร้างไว้แล้ว เฉพาะประเภทที่เลือกอยู่ (ใช้กับ ประเภท = วิทยาเขต / โซน ที่ไม่มีลิสต์กลางให้เชื่อม)
  const existingNames = [...new Set(items.filter(it => it.type === form.type).map(it => it.name).filter(Boolean))];

  // ชื่อขอบเขตที่จะใช้จริง
  // - ถ้าประเภท = อาคาร ให้เชื่อมกับรายชื่ออาคารจริงจาก mapData.buildings (เหมือนหน้า "แผนผังภายในอาคาร")
  // - ถ้าประเภทอื่น ใช้ลิสต์ชื่อขอบเขตเดิมที่เคยสร้างไว้
  const nameValue = form.type === "building" ? (form.buildingId === "custom" ? (form.customName || "").trim() : buildings.find(b => b.id === form.buildingId)?.name || "") : form.name === "custom" ? (form.customName || "").trim() : form.name;

  // ==========================================
  // เพิ่ม Boundary ใหม่
  // ==========================================
  const openNewBoundaryEditor = () => {
    if (!nameValue) {
      return alert("กรุณาระบุชื่อขอบเขต");
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
    const newBoundary = {
      id: `MB-${Date.now()}`,
      name: nameValue,
      type: form.type,
      // เชื่อมกับอาคารจริงเฉพาะตอนประเภท = อาคาร และเลือกจากลิสต์ (ไม่ใช่พิมพ์เอง)
      buildingId: form.type === "building" && form.buildingId !== "custom" ? form.buildingId : null,
      // geometry เก็บเป็น [lat, lon] ตามพฤติกรรมเดิมของ editor
      geometry: points,
      updatedAt: new Date().toISOString(),
      status: "draft"
    };
    await create(newBoundary, user);
    setForm({
      name: "custom",
      customName: "",
      type: "building",
      buildingId: ""
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
      status: "draft"
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
              buildingId: ""
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

          {form.type === "building" ? <>
              {/* ประเภท = อาคาร : เชื่อมกับรายชื่ออาคารจริงจาก mapData.buildings เหมือนหน้า "แผนผังภายในอาคาร" */}
              <Field label="อาคาร">
                <Select value={form.buildingId} onChange={e => {
                const buildingId = e.target.value;
                if (buildingId === "custom") {
                  setForm(current => ({ ...current, buildingId: "custom", customName: "" }));
                } else {
                  setForm(current => ({ ...current, buildingId }));
                }
              }}>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value="custom">-- พิมพ์ระบุเอง (กรณีไม่มีในรายการ) --</option>
                </Select>
              </Field>

              {/* ถ้าเลือก อาคาร แบบกำหนดเอง ให้แสดงช่อง Input ให้พิมพ์ */}
              {(form.buildingId === "custom" || buildings.length === 0) && (
                <Field label="ระบุชื่ออาคารเอง">
                  <Input
                    value={form.customName || ""}
                    onChange={set("customName")}
                    placeholder="พิมพ์ชื่ออาคาร..."
                  />
                </Field>
              )}
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
      label: "แก้ไขล่าสุด"
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
          updatedAt: new Date().toISOString()
        }, user)}>
                    เผยแพร่
                  </Btn> : <Btn kind="ghost" onClick={() => patch(r.id, {
          status: "draft",
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