"use client";

import { useEffect, useState } from "react";
import { useMapData } from "../../../lib/useMapData";
import { MAX_SVG_BYTES } from "../../../lib/constants";
import { SC8_CENTER } from "../../mapConfig";
import { Btn, Card, Field, Input, Pill, Select, Status, UCHead, useCollection, formatDateTime } from "../../ui";
import FloorplanEditor from "./FloorplanEditor";
import { DEFAULT_PLACEMENT } from "./shared";

export default function Assets({
  user
}) {
  const {
    data: mapData
  } = useMapData();
  const buildings = mapData?.buildings || [];
  const {
    items,
    create,
    patch,
    destroy
  } = useCollection("mapAssets");
  const [form, setForm] = useState({
    name: "",
    kind: "floorplan",
    buildingId: "",
    floorId: "",
    file: ""
  });
  const selectedBuilding = buildings.find(b => b.id === form.buildingId) || mapData?.building || buildings[0];
  const selectedFloors = selectedBuilding?.floors || [];
  useEffect(() => {
    if (!selectedBuilding) return;
    setForm(current => {
      const buildingId = current.buildingId || selectedBuilding.id;
      const building = buildings.find(b => b.id === buildingId) || selectedBuilding;
      const validFloor = (building.floors || []).some(f => f.id === current.floorId);
      return {
        ...current,
        buildingId,
        floorId: validFloor ? current.floorId : building.floors?.[0]?.id || ""
      };
    });
  }, [buildings, selectedBuilding?.id]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [draftPlacement, setDraftPlacement] = useState(null);
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));

  /* -----------------------------------------
     Upload SVG
  ----------------------------------------- */

  const handleFileChange = async e => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    const isSvgType = file.type === "image/svg+xml" || file.type === "";
    const isSvgExt = /\.svg$/i.test(file.name);
    if (!isSvgType || !isSvgExt) {
      setUploadError("กรุณาเลือกไฟล์นามสกุล .svg เท่านั้น");
      return;
    }
    if (file.size > MAX_SVG_BYTES) {
      setUploadError("ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 3MB)");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("อ่านไฟล์ไม่สำเร็จ"));
        reader.readAsDataURL(file);
      });
      setSelectedFile({
        name: file.name,
        size: file.size
      });
      setForm(f => ({
        ...f,
        file: dataUrl
      }));
    } catch (err) {
      setUploadError("อัปโหลดไฟล์ไม่สำเร็จ: " + err.message);
    } finally {
      setUploading(false);
    }
  };
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setForm(f => ({
      ...f,
      file: ""
    }));
    setUploadError("");
  };

  /* -----------------------------------------
     เปิด Editor สำหรับไฟล์ใหม่
  ----------------------------------------- */

  const openNewEditor = () => {
    if (!form.name.trim()) {
      return alert("กรุณาระบุชื่อรายการ");
    }
    if (!form.file.trim()) {
      return alert("กรุณาอัปโหลดไฟล์ .svg ก่อน");
    }
    if (form.kind !== "floorplan") {
      return alert("ระบบจัดตำแหน่งบนแผนที่รองรับเฉพาะผังชั้น SVG");
    }
    const floorRow = selectedFloors.find(f => f.id === form.floorId);
    setEditingAsset({
      id: null,
      name: form.name,
      kind: form.kind,
      floorId: form.kind === "floorplan" ? form.floorId : null,
      file: form.file,
      buildingName: selectedBuilding?.name || "อาคาร",
      floorNo: floorRow?.floorNo || "",
      __new: true
    });
    setDraftPlacement({
      ...DEFAULT_PLACEMENT,
      center: [...SC8_CENTER]
    });
    setEditorOpen(true);
  };

  /* -----------------------------------------
     เปิด Editor ของรายการเดิม
  ----------------------------------------- */

  const openExistingEditor = asset => {
    if (!asset.file) {
      return alert("ไม่พบไฟล์ SVG ของรายการนี้");
    }
    const floorRow = buildings.flatMap(b => b.floors || []).find(f => f.id === asset.floorId);
    const buildingRow = buildings.find(b => b.id === floorRow?.buildingId);
    setEditingAsset({
      ...asset,
      buildingName: buildingRow?.name || "อาคาร",
      floorNo: floorRow?.floorNo || ""
    });
    setDraftPlacement(asset.placement ? {
      ...DEFAULT_PLACEMENT,
      ...asset.placement,
      center: [...(asset.placement.center || SC8_CENTER)]
    } : {
      ...DEFAULT_PLACEMENT,
      center: [...SC8_CENTER]
    });
    setEditorOpen(true);
  };

  /* -----------------------------------------
     Save placement ของไฟล์ใหม่
  ----------------------------------------- */

  const saveNewAsset = async placement => {
    try {
      const asset = {
        name: editingAsset.name,
        kind: editingAsset.kind,
        file: editingAsset.file,
        floorId: editingAsset.floorId || null,
        placement,
        updatedAt: new Date().toISOString(),
        status: "draft"
      };
      await create(asset, user);
      setForm({
        name: "",
        kind: "floorplan",
        buildingId: selectedBuilding?.id || "",
        floorId: selectedFloors?.[0]?.id || "",
        file: ""
      });
      setSelectedFile(null);
      setUploadError("");
      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    } catch (err) {
      console.error(err);
      alert("บันทึกไฟล์ไม่สำเร็จ");
    }
  };

  /* -----------------------------------------
     Save placement ของไฟล์เดิม
  ----------------------------------------- */

  const saveExistingAsset = async placement => {
    try {
      await patch(editingAsset.id, {
        placement,
        updatedAt: new Date().toISOString()
      }, user);
      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    } catch (err) {
      console.error(err);
      alert("บันทึกตำแหน่งไม่สำเร็จ");
    }
  };
  const handleEditorSave = async placement => {
    if (!editingAsset) return;
    if (editingAsset.__new) {
      await saveNewAsset(placement);
    } else {
      await saveExistingAsset(placement);
    }
  };

  /* -----------------------------------------
     ถ้าเปิด Editor ให้แสดงเต็มหน้าจอ
  ----------------------------------------- */

  if (editorOpen && editingAsset && draftPlacement) {
    return <FloorplanEditor asset={editingAsset} placement={draftPlacement} onChange={setDraftPlacement} onCancel={() => {
      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    }} onSave={handleEditorSave} />;
  }

  /* -----------------------------------------
     UC8 UI เดิม
  ----------------------------------------- */

  return <>
      <UCHead code="UC8" title="จัดการข้อมูลประกอบแผนผัง" desc="อัปโหลดไฟล์ผังชั้น (.svg) ภาพประกอบ และไอคอน ที่ใช้แสดงบนแผนที่ได้โดยตรงจากหน้านี้ — สำหรับผังชั้นสามารถปรับตำแหน่ง ขนาด และการหมุนบนแผนที่จริงได้" />

      <Card>
        <b style={{
        fontSize: 13.5,
        color: "#202124"
      }}>
          เพิ่มไฟล์ประกอบ
        </b>

        <div style={{
        marginTop: 8
      }}>
          <Field label="ชื่อรายการ">
            <Input value={form.name} onChange={set("name")} placeholder="เช่น ผังชั้น 3 อาคาร Sc8" />
          </Field>

          <Field label="ประเภท">
            <Select value={form.kind} onChange={set("kind")}>
              <option value="floorplan">
                ผังชั้น (SVG)
              </option>

              <option value="image">
                ภาพประกอบ
              </option>

              <option value="icon">
                ไอคอน
              </option>
            </Select>
          </Field>

          {form.kind === "floorplan" ? <>
              <Field label="อาคาร">
                <Select value={form.buildingId} onChange={e => {
              const buildingId = e.target.value;
              const building = buildings.find(b => b.id === buildingId);
              setForm(current => ({
                ...current,
                buildingId,
                floorId: building?.floors?.[0]?.id || ""
              }));
            }}>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>

              <Field label="ชั้น">
                <Select value={form.floorId} onChange={set("floorId")}>
                  {selectedFloors.map(f => <option key={f.id} value={f.id}>{f.name || `ชั้น ${f.floorNo}`}</option>)}
                </Select>
              </Field>
            </> : null}

          <Field label="อัปโหลดไฟล์แผนผัง (.svg)">
            <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap"
          }}>
              <label style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 15px",
              borderRadius: 10,
              border: "1px solid #DADCE0",
              background: "#F8F9FA",
              color: "#1A73E8",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer"
            }}>
                📤 เลือกไฟล์ .svg

                <input type="file" accept=".svg,image/svg+xml" onChange={handleFileChange} style={{
                display: "none"
              }} />
              </label>

              {uploading ? <span style={{
              fontSize: 12,
              color: "#5F6368"
            }}>
                  กำลังอ่านไฟล์...
                </span> : null}

              {selectedFile ? <span style={{
              fontSize: 12,
              color: "#3C4043"
            }}>
                  {selectedFile.name} ·{" "}
                  {(selectedFile.size / 1024).toFixed(1)}{" "}
                  KB

                  <button type="button" onClick={clearSelectedFile} style={{
                marginLeft: 8,
                background: "none",
                border: "none",
                color: "#D93025",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12
              }}>
                    ลบ
                  </button>
                </span> : null}
            </div>

            {uploadError ? <div style={{
            marginTop: 6,
            fontSize: 11.5,
            color: "#D93025"
          }}>
                {uploadError}
              </div> : null}

            {form.file ? <div style={{
            marginTop: 10,
            width: 140,
            height: 140,
            borderRadius: 10,
            border: "1px solid #DADCE0",
            background: "#F8F9FA",
            display: "grid",
            placeItems: "center",
            overflow: "hidden"
          }}>
                <img src={form.file} alt="ตัวอย่างผังชั้น" style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain"
            }} />
              </div> : <div style={{
            marginTop: 6,
            fontSize: 11.5,
            color: "#5F6368"
          }}>
                ยังไม่ได้เลือกไฟล์
                — อัปโหลดภาพ
                .svg
                ของผังชั้นเพื่อดูตัวอย่างที่นี่
              </div>}
          </Field>

          {/* ปุ่มเดิม */}
          <div style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        }}>
            <Btn disabled={uploading} onClick={async () => {
            if (!form.name.trim()) {
              return alert("กรุณาระบุชื่อรายการ");
            }
            if (!form.file.trim()) {
              return alert("กรุณาอัปโหลดไฟล์ .svg ก่อน");
            }
            await create({
              ...form,
              updatedAt: new Date().toISOString(),
              status: "draft"
            }, user);
            setForm({
              name: "",
              kind: "floorplan",
              building: "Sc8",
              floor: "1",
              file: ""
            });
            setSelectedFile(null);
            setUploadError("");
          }}>
              เพิ่มไฟล์
            </Btn>

            {/* ปุ่มใหม่ */}
            {form.kind === "floorplan" && form.file ? <Btn disabled={uploading} onClick={openNewEditor}>
                🗺️ เพิ่มไฟล์และจัดตำแหน่งบนแผนที่
              </Btn> : null}
          </div>
        </div>
      </Card>

      {/* รายการเดิม */}

      {items.map(a => <Card key={a.id}>
          <div style={{
        display: "flex",
        gap: 12,
        alignItems: "center"
      }}>
            <div style={{
          width: 62,
          height: 62,
          flex: "none",
          borderRadius: 10,
          border: "1px solid #DADCE0",
          background: "#F8F9FA",
          overflow: "hidden",
          display: "grid",
          placeItems: "center"
        }}>
              <img src={a.file} alt="" style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain"
          }} onError={e => {
            e.currentTarget.style.display = "none";
          }} />
            </div>

            <div style={{
          flex: 1,
          minWidth: 0
        }}>
              <b style={{
            fontSize: 14,
            color: "#202124"
          }}>
                {a.name}
              </b>

              <div style={{
            fontSize: 11.5,
            color: "#5F6368",
            wordBreak: "break-all"
          }}>
                {String(a.file || "").startsWith("data:") ? "📤 ไฟล์อัปโหลด (SVG)" : a.file}
              </div>

              <div style={{
            marginTop: 5,
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap"
          }}>
                <Pill>
                  {a.kind}
                </Pill>

                {a.kind === "floorplan" ? <Pill>
                    {(() => {
                const fr = buildings.flatMap(b => b.floors || []).find(f => f.id === a.floorId);
                const br = buildings.find(b => b.id === fr?.buildingId);
                return `${br?.name || "อาคาร"} · ชั้น ${fr?.floorNo || "?"}`;
              })()}
                  </Pill> : null}

                <Status value={a.status || "draft"} />

                <span style={{
              fontSize: 11,
              color: "#5F6368"
            }}>
                  อัปเดต{" "}
                  {formatDateTime(a.updatedAt)}
                </span>
              </div>

              {/* แสดง placement */}
              {a.placement ? <div style={{
            marginTop: 7,
            fontSize: 11,
            color: "#5F6368"
          }}>
                  📍{" "}
                  {a.placement.center?.[0]?.toFixed(6)}{" "}
                  ,{" "}
                  {a.placement.center?.[1]?.toFixed(6)}
                  {"  "}
                  📐{" "}
                  {Number(a.placement.widthMeters || 0).toFixed(1)}{" "}
                  m
                  {"  "}
                  🔄{" "}
                  {Number(a.placement.rotation || 0).toFixed(1)}
                  °
                </div> : null}
            </div>

            <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}>
              {a.kind === "floorplan" ? <Btn onClick={() => openExistingEditor(a)}>
                  🗺️ ปรับตำแหน่ง
                </Btn> : null}

              <Btn kind="danger" onClick={() => confirm("ลบไฟล์ประกอบนี้?") && destroy(a.id, user)}>
                ลบ
              </Btn>
            </div>
          </div>
        </Card>)}
    </>;
}

/* =========================================================
   Floorplan Editor
   ใช้เฉพาะ UC8
========================================================= */
