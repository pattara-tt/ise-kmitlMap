"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapData, clearMapDataCache } from "../../../lib/useMapData";
import { MAX_SVG_BYTES } from "../../../lib/constants";
import { SC8_CENTER } from "../../mapConfig";
import { Btn, Card, Field, Input, Pill, Select, Status, UCHead, useCollection, notify, askConfirm } from "../../ui";
import { formatDate, formatDateTime } from "../../../lib/datetime";
import FloorplanEditor from "./FloorplanEditor";
import { DEFAULT_PLACEMENT, todayStr } from "./shared";
import BoundaryPointEditor from "./BoundaryPointEditor";
import Boundary from "./BoundaryTab";

// อ่านจุดขอบเขตจาก mapBoundaries.geometry → [[lat, lon], ...]
function getBoundaryPoints(boundary) {
  let raw = boundary?.geometry ?? boundary?.points ?? null;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  // เผื่อ API ส่งมาในรูป GeoJSON { coordinates: [[...]] }
  if (raw && !Array.isArray(raw) && Array.isArray(raw.coordinates)) raw = raw.coordinates;
  if (Array.isArray(raw) && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) raw = raw[0]; // ring แรก
  if (!Array.isArray(raw)) return [];

  const pts = raw
    .map(p => Array.isArray(p)
      ? [Number(p[0]), Number(p[1])]
      : [Number(p?.lat), Number(p?.lon ?? p?.lng)])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    // ถ้าค่าแรกเกิน 90 แปลว่าเป็น [lon, lat] ให้สลับ
    .map(([a, b]) => (Math.abs(a) > 90 ? [b, a] : [a, b]));
  return pts.length >= 3 ? pts : [];
}

// จุดกึ่งกลางของขอบเขต → [lat, lon] ใช้เป็นตำแหน่งเริ่มต้นของแผนที่ตอนวางแผนผัง
function boundaryCenter(points) {
  if (!points || !points.length) return null;
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lon = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [lat, lon];
}

export default function Assets({ user }) {
  const {
    data: mapData
  } = useMapData();
  
  const allBuildings = mapData?.buildings || [];

  const {
    items,
    create,
    patch,
    destroy
  } = useCollection("mapAssets");

  const {
    items: boundaries = [],
    patch: patchBoundary
  } = useCollection("mapBoundaries");

  const buildingsApi = useCollection("buildings");
  const floorsApi = useCollection("floors");

  const [form, setForm] = useState({
    name: "",
    kind: "floorplan",
    buildingId: "",
    floorId: "",
    file: ""
  });
  
  const buildings = useMemo(() => {
    const eligibleBoundaries = boundaries.filter(
      boundary =>
        boundary.type === "building" &&
        boundary.selectableForAssets !== false
    );

    const existingBuildings = allBuildings.filter(building =>
      eligibleBoundaries.some(boundary =>
        boundary.buildingId
          ? boundary.buildingId === building.id
          : boundary.name === building.name
      )
    );

    const customBuildings = eligibleBoundaries
      .filter(boundary =>
        !allBuildings.some(building =>
          boundary.buildingId
            ? building.id === boundary.buildingId
            : building.name === boundary.name
        )
      )
      .map(boundary => ({
        id: boundary.buildingId || `boundary:${boundary.id}`,
        name: boundary.name,
        floors: [],
        boundaryId: boundary.id,
        boundaryOnly: true
      }));

    const combined = [...existingBuildings, ...customBuildings];

    return combined.filter(
      (building, index, list) =>
        list.findIndex(item => item.id === building.id) === index
    );
  }, [allBuildings, boundaries]);


  const selectedBuilding = buildings.find(b => b.id === form.buildingId) ||  buildings[0];
  const selectedFloors = selectedBuilding?.floors || [];

  /* -----------------------------------------
     ทำให้ข้อมูลที่ "พิมพ์เอง" เป็นข้อมูลจริงเหมือนตอนเลือกจากลิสต์
     - สร้างแถวใน buildings / floors (ถ้ายังไม่มี)
     - ผูก boundary.buildingId และ asset.floorId ให้ชี้ไปที่แถวจริง
     ทำให้ UC9 (NodeEdgeTab) และส่วนอื่นเห็นข้อมูลชุดเดียวกัน
  ----------------------------------------- */

  const stripFloor = s => String(s || "").trim().replace(/^ชั้น\s*/, "");

  async function ensureBuilding(sel) {
    if (!sel) throw new Error("ไม่พบอาคาร");
    if (!sel.boundaryOnly) return sel.id; // เป็นอาคารจริงอยู่แล้ว

    let id = allBuildings.find(b => b.name === sel.name)?.id;
    if (!id) {
      id = `BU-${Date.now()}`;
      await buildingsApi.create({
        id,
        code: `B${Date.now().toString(36).toUpperCase()}`, // ปรับให้ตรงกับ schema ของ buildings
        name: sel.name
      }, user);
    }
    if (sel.boundaryId) {
      await patchBoundary(sel.boundaryId, { buildingId: id }, user);
    }
    return id;
  }

  async function ensureFloor(buildingId, label) {
    const no = stripFloor(label);
    if (!no) throw new Error("กรุณาระบุชั้น");

    const existing = allBuildings
      .find(b => b.id === buildingId)?.floors
      ?.find(f => String(f.floorNo) === no || f.name === String(label).trim());
    if (existing) return existing.id;

    const id = `FL-${Date.now()}`;
    await floorsApi.create({
      id,
      buildingId,
      floorNo: no, // ถ้า floors.floor_no เป็น integer ต้องปรับ schema หรือแปลงค่า
      name: /^\d+$/.test(no) ? `ชั้น ${no}` : String(label).trim()
    }, user);
    return id;
  }

  async function resolveTarget(floorIdValue, customFloor) {
    const buildingId = await ensureBuilding(selectedBuilding);
    const floorId = floorIdValue === "custom"
      ? await ensureFloor(buildingId, customFloor)
      : floorIdValue;
    return { buildingId, floorId };
  }

  useEffect(() => {
    if (buildings.length === 0) return;
    setForm(current => {
      const building = buildings.find(b => b.id === current.buildingId) || buildings[0];
      const floors = building.floors || [];
      const floorId = 
        floors.length === 0 ? "custom"
        : floors.some(f => f.id === current.floorId) ? current.floorId
        : floors[0].id;
      if(current.buildingId === building.id && current.floorId ===floorId) return current;
      return {...current, buildingId: building.id, floorId};

      // if(floors.length === 0) {
      //   return {
      //     ...current,
      //     buildingId,
      //     floorId: "custom"
      //   };
      // }
      
      // const validFloor = floors.some(f => f.id === current.floorId);

      // return {
      //   ...current,
      //   buildingId,
      //   floorId: validFloor ? current.floorId : floors[0]?.id || ""
      // };
    });
  }, [buildings]);

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
    if (!form.file.trim()) {
      return alert("กรุณาอัปโหลดไฟล์ .svg ก่อน");
    }
    if (form.kind !== "floorplan") {
      return alert("ระบบจัดตำแหน่งบนแผนที่รองรับเฉพาะผังชั้น SVG");
    }

    const boundaryId =
      selectedBuilding?.boundaryId ||
      boundaries.find(boundary =>
        boundary.type === "building" &&
        boundary.selectableForAssets !== false &&
        (boundary.buildingId === selectedBuilding?.id ||
          (!boundary.buildingId && boundary.name === selectedBuilding?.name))
      )?.id || null;

    const floorRow = selectedFloors.find(f => f.id === form.floorId);
    setEditingAsset({
      id: null,
      name: form.name,
      kind: form.kind,
      floorId: form.kind === "floorplan" ? form.floorId : null,
      file: form.file,
      buildingName: selectedBuilding?.name || "อาคาร",
      floorNo: floorRow?.floorNo || "",
      __new: true,
      boundaryId,
      customFloor: form.customFloor || "",
    });

    const bCenter = boundaryCenter(getBoundaryPoints(boundaries.find(b => b.id === boundaryId)));

    setDraftPlacement({
      ...DEFAULT_PLACEMENT,
      center: bCenter || [...SC8_CENTER]
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
    const boundaryId = boundaries.find(boundary =>
      boundary.type === "building" &&
      (boundary.buildingId === buildingRow?.id ||
        (!boundary.buildingId && boundary.name === buildingRow?.name))
    )?.id || null;

    setEditingAsset({
      ...asset,
      buildingName: buildingRow?.name || "อาคาร",
      floorNo: floorRow?.floorNo || "",
      boundaryId
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
      const { floorId } = await resolveTarget(editingAsset.floorId, editingAsset.customFloor);
      const asset = {
        name: editingAsset.name,
        kind: editingAsset.kind,
        file: editingAsset.file,
        floorId: floorId || null,
        customFloor: null, // มีชั้นจริงแล้ว ไม่ต้องเก็บชื่อชั้นแบบพิมพ์เอง
        boundaryId: editingAsset.boundaryId || null,
        buildingName: editingAsset.buildingName || "อาคาร",
        placement,
        updatedAt: new Date().toISOString(),
        status: "draft"
      };
      await create(asset, user);
      clearMapDataCache();
      setForm({
        name: "",
        kind: "floorplan",
        buildingId: selectedBuilding?.id || "",
        floorId: selectedFloors?.[0]?.id || "custom",
        file: ""
      });
      setSelectedFile(null);
      setUploadError("");
      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    } catch (err) {
      console.error(err);
      alert(err?.message || "บันทึกไฟล์ไม่สำเร็จ");
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
    return <FloorplanEditor 
      asset={editingAsset} 
      placement={draftPlacement} 
      outline={getBoundaryPoints(boundaries.find(b=>b.id === editingAsset.boundaryId))} // <--- เพิ่มบรรทัดนี้
      onChange={setDraftPlacement} 
      onCancel={() => {
      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    }} onSave={handleEditorSave} />;
  }

  /* -----------------------------------------
     UC8 UI เดิม
  ----------------------------------------- */
  const handleDeleteAsset = async (asset) => {
    const confirmed = await askConfirm("ลบไฟล์ประกอบนี้?", {
      title: "ลบไฟล์ประกอบ",
      confirmLabel: "ลบ",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      await destroy(asset.id, user);
      clearMapDataCache();
    } catch (err) {
      console.error("ลบไฟล์แผนผังไม่สำเร็จ:", err);
      alert(err?.message || "ลบไฟล์แผนผังไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  return <>
      <UCHead title="จัดการแผนผังภายในอาคาร" desc="อัปโหลดไฟล์แผนผังชั้น (.svg) ที่ใช้แสดงบนแผนที่ได้โดยตรงจากหน้านี้ — สำหรับผังชั้นสามารถปรับตำแหน่ง ขนาด และการหมุนบนแผนที่จริงได้" />

      <Card>
        <b style={{
        fontSize: 13.5,
        color: "#202124"
      }}>
          เพิ่มภาพแผนผัง พร้อมข้อมูลประกอบ
        </b>

        <div style={{
        marginTop: 8
      }}>
          <Field label="ประเภท">
            <div>
              ผังชั้น (SVG)
            </div>
          </Field>

          {form.kind === "floorplan" ? <>
              {/* ส่วนของอาคาร : เลือกได้เฉพาะที่มีในลิสต์เท่านั้น ไม่มีการพิมพ์เพิ่มเติม */}
              <Field label="อาคาร">
                <Select 
                value={form.buildingId} 
                onChange={e => {
                const buildingId = e.target.value;
                const building = buildings.find(b => b.id === buildingId);
                setForm(current => ({
                  ...current,
                  buildingId,
                  floorId: building?.floors?.[0]?.id || "custom"
                }));
              }}>              
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>

              {/* ส่วนของชั้น */}
              <Field label="ชั้น">
                <Select value={form.floorId} onChange={e => {
                  const floorId = e.target.value;
                  if (floorId === "custom") {
                    setForm(current => ({ ...current, floorId: "custom", customFloor: "" }));
                  } else {
                    setForm(current => ({ ...current, floorId }));
                  }
                }}>
                  {selectedFloors.map(f => <option key={f.id} value={f.id}>{f.name || `ชั้น ${f.floorNo}`}</option>)}
                  <option value="custom">-- พิมพ์ระบุเอง (กรณีไม่มีในรายการ) --</option>
                </Select>
              </Field>

              {/* ถ้าเลือก ชั้น แบบกำหนดเอง ให้แสดงช่อง Input ให้พิมพ์ */}
              {(form.floorId === "custom" || selectedFloors.length === 0) && (
                <Field label="ระบุชั้นเอง">
                  <Input 
                    value={form.customFloor || ""} 
                    onChange={set("customFloor")} 
                    placeholder="เช่น 1 หรือ 2 หรือ ชั้นลอย" 
                  />
                </Field>
              )}
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

          {/* ปุ่ม*/}
          <div style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        }}>
            <Btn disabled={uploading} onClick={async () => {
              
            if (!form.file.trim()) {
              return alert("กรุณาอัปโหลดไฟล์ .svg ก่อน");
            }
            try {
              const { floorId } = await resolveTarget(form.floorId, form.customFloor);
              await create({
                name: form.name,
                kind: form.kind,
                file: form.file,
                floorId: floorId || null,
                customFloor: null,
                boundaryId: selectedBuilding?.boundaryId || null,
                buildingName: selectedBuilding?.name || "อาคาร",
                updatedAt: new Date().toISOString(),
                status: "draft"
              }, user);
              clearMapDataCache();
            } catch (err) {
              console.error(err);
              return alert(err?.message || "บันทึกไฟล์ไม่สำเร็จ");
            }
            setForm(f => ({
              ...f,
              name: "",
              file:""
              // name: "",
              // kind: "floorplan",
              // building: "Sc8",
              // floor: "1",
              // file: ""
            }));
            setSelectedFile(null);
            setUploadError("");
          }}>
              เพิ่มไฟล์
            </Btn>

            {/* ปุ่ม */}
            {form.kind === "floorplan" && form.file ? <Btn disabled={uploading} onClick={openNewEditor}>
                🗺️ เพิ่มไฟล์และจัดตำแหน่งบนแผนที่
              </Btn> : null}
          </div>
        </div>
      </Card>


      {items.filter(a => a.kind !== "image").map(a => <Card key={a.id}>          <div style={{
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
                const br = buildings.find(b => b.floors?.some(f => f.id === a.floorId));
                const floorLabel = a.customFloor? a.customFloor: fr?.floorNo ?? fr?.name ?? "?";

                return `${br?.name || a.buildingName || "อาคาร"} · ${
                  String(floorLabel).startsWith("ชั้น")
                  ? floorLabel
                  :  `ชั้น ${floorLabel}`
                }`;
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

              <Btn kind="danger" 
                    onClick={async () => handleDeleteAsset(a)}>
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