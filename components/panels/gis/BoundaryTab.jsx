"use client";

import { useState } from "react";
import { useMapData } from "../../../lib/useMapData";
import { Btn, Card, Field, Input, Pill, Select, Status, Table, UCHead, useCollection, formatDateTime } from "../../ui";
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
  const {
    items = [],
    create,
    patch,
    destroy
  } = useCollection("mapBoundaries");
  const [form, setForm] = useState({
    name: "",
    type: "building"
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState(null);
  const [draftPoints, setDraftPoints] = useState([]);
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));

  // ==========================================
  // เพิ่ม Boundary ใหม่
  // ==========================================
  const openNewBoundaryEditor = () => {
    if (!form.name.trim()) {
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
      name: form.name.trim(),
      type: form.type,
      buildingId: mapData?.building?.id || null,
      // geometry เก็บเป็น [lat, lon] ตามพฤติกรรมเดิมของ editor
      geometry: points,
      updatedAt: new Date().toISOString(),
      status: "draft"
    };
    await create(newBoundary, user);
    setForm({
      name: "",
      type: "building"
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
      <UCHead code="UC7" title="จัดการขอบเขตแผนผัง" desc="กำหนดขอบเขตวิทยาเขต/อาคาร โดยเลือกจุดบนแผนที่เพื่อบันทึกพิกัด Latitude และ Longitude" />

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
          <Field label="ชื่อขอบเขต">
            <Input value={form.name} onChange={set("name")} placeholder="เช่น ขอบเขตอาคารเรียนรวม" />
          </Field>

          <Field label="ประเภท">
            <Select value={form.type} onChange={set("type")}>
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
      {editorOpen ? <BoundaryPointEditor title={editingBoundary ? `แก้ไขขอบเขต: ${editingBoundary.name}` : `เพิ่มขอบเขต: ${form.name}`} initialPoints={draftPoints} onCancel={() => {
      setEditorOpen(false);
      setEditingBoundary(null);
      setDraftPoints([]);
    }} onSave={handleSavePoints} /> : null}
    </>;
}

export default Boundary;