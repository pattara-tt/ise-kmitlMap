"use client";

import { useEffect, useMemo, useState } from "react";
import { EDGE_TYPES } from "../../../lib/constants";
import { NODE_TYPES } from "../../mapConfig";
import { Btn, Card, Field, Input, Select, Status, useCollection } from "../../ui";
import { clearMapDataCache} from "../../../lib/useMapData";
import FloorplanEditor from "./FloorplanEditor";
import { DEFAULT_PLACEMENT } from "./shared";

const EMPTY_NODE = { id: null, type: "path", x: "", y: "" };
const EMPTY_EDGE = { id: null, fromNodeId: "", toNodeId: "", edgeType: "walk", accessible: true };

function meters(a, b) {
  if (!a || !b) return null;
  const rad = (v) => (Number(v) * Math.PI) / 180;
  const lat1 = rad(a.y); const lat2 = rad(b.y);
  const dLat = lat2 - lat1; const dLon = rad(b.x) - rad(a.x);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)) * 100) / 100;
}

// ป้ายแสดงของ node (จัดการเฉพาะประเภท + พิกัด จึงใช้ประเภทและพิกัดแทนชื่อ)
function nodeLabel(n) {
  if (!n) return "-";
  const t = NODE_TYPES.find((x) => x.id === n.type);
  const pos = Number.isFinite(Number(n.x)) && Number.isFinite(Number(n.y)) ? ` ${Number(n.y).toFixed(5)}, ${Number(n.x).toFixed(5)}` : "";
  return `${t?.icon || "📍"} ${t?.label || n.type || "node"}${pos}`;
}

export default function NodeEdgeTab({ user, mapData, onPageChange}) {
  const nodesApi = useCollection("nodes");
  const edgesApi = useCollection("edges");
  const { items: assets = [] } = useCollection("mapAssets");
  const buildings = mapData?.buildings || [];
  const [buildingId, setBuildingId] = useState(mapData?.building?.id || "");
  const [floorId, setFloorId] = useState("");
  const [nodeForm, setNodeForm] = useState(EMPTY_NODE);
  const [edgeForm, setEdgeForm] = useState(EMPTY_EDGE);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState("select");
  const [mode, setMode] = useState("node"); // "node" = ปักหมุด, "edge" = กำหนดเส้นทาง

  const building = buildings.find((b) => b.id === buildingId) || buildings[0] || null;
  const floors = building?.floors || [];
  const floor = floors.find((f) => f.id === floorId) || null;

  useEffect(() => {
    if (!buildingId && mapData?.building?.id) setBuildingId(mapData.building.id);
  }, [buildingId, mapData?.building?.id]);

  useEffect(() => {
    if (!floors.length) { setFloorId(""); return; }
    if (!floors.some((f) => f.id === floorId)) setFloorId(floors[0].id);
  }, [floors, floorId]);

  useEffect(() => { onPageChange?.(page); }, [page, onPageChange]);

  const floorIds = useMemo(() => new Set(floors.map((f) => f.id)), [floors]);
  const buildingNodes = useMemo(() => nodesApi.items.filter((n) => floorIds.has(n.floorId)), [nodesApi.items, floorIds]);
  const floorNodes = useMemo(() => buildingNodes.filter((n) => n.floorId === floorId), [buildingNodes, floorId]);
  const floorNodeIds = useMemo(() => new Set(floorNodes.map((n) => n.id)), [floorNodes]);
  const visibleEdges = useMemo(
    () => edgesApi.items.filter((e) => floorNodeIds.has(e.fromNodeId) || floorNodeIds.has(e.toNodeId)),
    [edgesApi.items, floorNodeIds]
  );
  const nodeById = useMemo(() => new Map(nodesApi.items.map((n) => [n.id, n])), [nodesApi.items]);

  // แปลนของชั้นที่เลือก (UC8) — ปรับเงื่อนไขจับคู่ให้ตรงกับโครงสร้าง mapAssets ของคุณ ถ้าจำเป็น
  const asset = useMemo(() => {
    if (!floor) return null;
    const matches = assets.filter((a) => a.file && (a.kind || "floorplan") === "floorplan" && (
      a.floorId === floor.id ||
      (a.buildingId === building?.id && String(a.floorNo) === String(floor.floorNo))
    ));
    return matches[matches.length - 1] || null;
  }, [assets, floor, building?.id]);

  const placement = useMemo(() => {
    const p = { ...DEFAULT_PLACEMENT, ...(asset?.placement || {}) };
    if (!asset?.placement?.center && floorNodes.length) {
      const ok = floorNodes.filter((n) => Number.isFinite(Number(n.x)) && Number.isFinite(Number(n.y)));
      if (ok.length) {
        p.center = [
          ok.reduce((s, n) => s + Number(n.y), 0) / ok.length,
          ok.reduce((s, n) => s + Number(n.x), 0) / ok.length
        ];
      }
    }
    return p;
  }, [asset, floorNodes]);

  const mapNodes = useMemo(() => floorNodes.map((n) => ({ ...n, label: NODE_TYPES.find((t) => t.id === n.type)?.icon || "📍" })), [floorNodes]);

  const resetNode = () => setNodeForm(EMPTY_NODE);
  const resetEdge = () => setEdgeForm(EMPTY_EDGE);

  /* ---------- การโต้ตอบบนแผนที่ ---------- */

  // คลิกพื้นที่ว่าง -> ใส่พิกัดลงฟอร์ม "เพิ่ม Node" อัตโนมัติ
  function handlePickPoint({ x, y }) {
    setNodeForm((f) => ({ ...f, x, y }));
  }

  // คลิก node: โหมด node = โหลดมาแก้ไข, โหมด edge = เลือกต้นทาง/ปลายทาง
  function handlePickNode(node) {
    if (mode === "node") {
      setNodeForm({ id: node.id, type: node.type || "path", x: node.x ?? "", y: node.y ?? "" });
      return;
    }
    setEdgeForm((f) => {
      if (!f.fromNodeId || (f.fromNodeId && f.toNodeId)) return { ...f, fromNodeId: node.id, toNodeId: "" };
      if (node.id === f.fromNodeId) return f;
      return { ...f, toNodeId: node.id };
    });
  }

  function startEdgeMode() { setMode("edge"); resetNode(); resetEdge(); }
  function stopEdgeMode() { setMode("node"); resetEdge(); }

  /* ---------- บันทึก / ลบ ---------- */

  async function saveNode() {
    if (!floorId) return alert("กรุณาเลือกชั้น");
    if (nodeForm.x === "" || nodeForm.y === "" || !Number.isFinite(Number(nodeForm.x)) || !Number.isFinite(Number(nodeForm.y))) return alert("กรุณาคลิกบนแผนที่หรือระบุพิกัด X/Y เป็นตัวเลข");
    // แก้ไข: ส่งเฉพาะประเภทและพิกัด (ไม่แตะ nodeKey / name เดิม)
    const payload = {
      floorId,
      type: nodeForm.type,
      x: Number(nodeForm.x),
      y: Number(nodeForm.y),
    };
    // สร้างใหม่: สร้าง nodeKey อัตโนมัติ เพราะเป็นคีย์อ้างอิงของ node
    if (!nodeForm.id) payload.nodeKey = `${building?.code || "N"}-F${floor?.floorNo ?? ""}-${Date.now().toString(36)}`;
    setBusy(true);
    try {
      if (nodeForm.id) await nodesApi.patch(nodeForm.id, payload, user);
      else await nodesApi.create(payload, user);
      clearMapDataCache();
      resetNode();
    } catch (e) { alert(e.message || "บันทึก node ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function deleteNode(node) {
    if (!confirm(`ลบ node ${nodeLabel(node)}? Edge ที่เชื่อมกับ node นี้จะถูกลบตามด้วย`)) return;
    setBusy(true);
    try {
      await nodesApi.destroy(node.id, user);
      if (nodeForm.id === node.id) resetNode();
      await edgesApi.reload();
      clearMapDataCache();
    } catch (e) { alert(e.message || "ลบ node ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function saveEdge() {
    const from = nodeById.get(edgeForm.fromNodeId); const to = nodeById.get(edgeForm.toNodeId);
    if (!from || !to) return alert("กรุณาเลือก node ต้นทางและปลายทาง");
    if (from.id === to.id) return alert("node ต้นทางและปลายทางต้องไม่ใช่จุดเดียวกัน");
    const payload = {
      fromNodeId: from.id,
      toNodeId: to.id,
      distance: meters(from, to),
      edgeType: edgeForm.edgeType,
      accessible: Boolean(edgeForm.accessible),
    };
    setBusy(true);
    try {
      if (edgeForm.id) await edgesApi.patch(edgeForm.id, payload, user);
      else await edgesApi.create(payload, user);
      clearMapDataCache();
      resetEdge();
    } catch (e) { alert(e.message || "บันทึก edge ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function deleteEdge(edge) {
    if (!confirm(`ลบ edge ${edge.id}?`)) return;
    setBusy(true);
    try {
      await edgesApi.destroy(edge.id, user);
      clearMapDataCache();
      if (edgeForm.id === edge.id) resetEdge();
    } catch (e) { alert(e.message || "ลบ edge ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  if (!buildings.length) return <Card>ยังไม่มีข้อมูลอาคารสำหรับจัดการโครงข่าย</Card>;

  /* ---------- หน้า 1: เลือกอาคาร / ชั้น ---------- */

  if (page === "select") return (
    <Card>
      <div style={{ marginBottom: 14 }}>
        <b style={{ fontSize: 16 }}>เลือกอาคารและชั้นสำหรับปักหมุด</b>
        <div style={{ fontSize: 12, color: "#5F6368", marginTop: 4 }}>เลือกพื้นที่ที่ต้องการจัดการ Node / Edge ก่อนเข้าสู่หน้าแผนที่</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        <Field label="อาคาร">
          <Select value={building?.id || ""} onChange={(e) => { setBuildingId(e.target.value); setFloorId(""); resetNode(); resetEdge(); }}>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
          </Select>
        </Field>
        <Field label="ชั้น">
          <Select value={floorId} onChange={(e) => { setFloorId(e.target.value); resetNode(); resetEdge(); }}>
            {floors.map((f) => <option key={f.id} value={f.id}>{f.name || `ชั้น ${f.floorNo}`}</option>)}
          </Select>
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Btn disabled={!building || !floorId} onClick={() => { setMode("node"); setPage("editor"); }}>ไปยังหน้าแผนที่ →</Btn>
      </div>
    </Card>
  );

  /* ---------- หน้า 2: แผนที่ปักหมุด ---------- */

  const floorLabel = floor?.name || `ชั้น ${floor?.floorNo ?? "-"}`;
  const hasDraftPin = nodeForm.x !== "" && nodeForm.y !== "";
  const modeBtn = (active) => ({
    border: "1px solid " + (active ? "#1A73E8" : "#DADCE0"),
    background: active ? "#E8F0FE" : "#fff",
    color: active ? "#1A73E8" : "#3C4043",
    borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 400
  });

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <b style={{ fontSize: 15 }}>{building?.code} · {building?.name} / {floorLabel}</b>
          <div style={{ fontSize: 12, color: "#5F6368", marginTop: 3 }}>
            {mode === "node"
              ? "โหมดปักหมุด: คลิกบนแผนที่เพื่อวางตำแหน่ง Node ใหม่ หรือคลิกหมุดเดิมเพื่อแก้ไข"
              : "โหมดกำหนด Edge: คลิก Node ต้นทาง แล้วคลิก Node ปลายทาง จากนั้นกดเพิ่ม Edge"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => { setPage("select"); setMode("node"); resetNode(); resetEdge(); }} 
            style={{ border: "1px solid #DADCE0", borderRadius: 7, padding: "6px 10px", background: "#fff", color: "#4774e8", cursor: "pointer" }}>
              ← เปลี่ยนอาคาร / ชั้น
          </button>
          <button type="button" style={modeBtn(mode === "node")} onClick={stopEdgeMode}>ปักหมุด Node</button>
          <button type="button" style={modeBtn(mode === "edge")} onClick={startEdgeMode}>กำหนด Edge</button>
          {asset ? <Status value={asset.status || "draft"}/> :<span style={{ fontSize: 12, color: "#5F6368" }}>ยังไม่มีแผนผังของชั้นนี้</span>}
        </div>
      </div>

      {!asset?.file && (
        <div style={{ marginTop: 10, padding: "7px 10px", background: "#FFF8E1", border: "1px solid #F9AB00", borderRadius: 8, fontSize: 12 }}>
          ยังไม่พบไฟล์แปลนของชั้นนี้ (UC8) — ยังปักหมุดบนแผนที่ได้ แต่จะไม่เห็นแผนผังรองพื้น
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <FloorplanEditor
          embedded
          mode="pin-node"
          pickMode={mode}
          asset={asset || { name: floorLabel, file: null }}
          placement={placement}
          nodes={mapNodes}
          edges={visibleEdges}
          nodeById={nodeById}
          draft={!nodeForm.id && hasDraftPin ? { x: nodeForm.x, y: nodeForm.y } : null}
          editingNodeId={nodeForm.id}
          fromNodeId={edgeForm.fromNodeId}
          toNodeId={edgeForm.toNodeId}
          onSelectPosition={handlePickPoint}
          onPickNode={handlePickNode}
          onChange={() => {}}
          onCancel={() => {}}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, marginTop: 10 }}>
        <section style={{ border: "1px solid " + (mode === "node" ? "#1A73E8" : "#E8EAED"), borderRadius: 10, padding: 12, opacity: mode === "node" ? 1 : 0.6 }}>
          <b>{nodeForm.id ? "แก้ไข Node" : "เพิ่ม Node"}</b>
          <div style={{ fontSize: 12, color: "#5F6368", margin: "3px 0 6px" }}>
            {hasDraftPin ? "ได้พิกัดจากแผนที่แล้ว เลือกประเภทแล้วกดบันทึก" : "เลือกประเภท แล้วคลิกตำแหน่งบนแผนที่"}
          </div>
          <Field label="ประเภท">
            <Select value={nodeForm.type} onChange={(e) => setNodeForm((f) => ({ ...f, type: e.target.value }))}>
              {NODE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label} ({t.id})</option>)}
            </Select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="X / Longitude"><Input type="number" step="any" value={nodeForm.x} onChange={(e) => setNodeForm((f) => ({ ...f, x: e.target.value }))} /></Field>
            <Field label="Y / Latitude"><Input type="number" step="any" value={nodeForm.y} onChange={(e) => setNodeForm((f) => ({ ...f, y: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}><Btn disabled={busy} onClick={saveNode}>{nodeForm.id ? "บันทึกการแก้ไข" : "เพิ่ม Node"}</Btn>{(nodeForm.id || hasDraftPin) ? <Btn kind="ghost" onClick={resetNode}>{nodeForm.id ? "ยกเลิก" : "ล้างหมุด"}</Btn> : null}</div>
        </section>

        <section style={{ border: "1px solid " + (mode === "edge" ? "#1A73E8" : "#E8EAED"), borderRadius: 10, padding: 12 }}>
          <b>{edgeForm.id ? "แก้ไข Edge" : "เพิ่ม Edge"}</b>
          <div style={{ fontSize: 12, color: "#5F6368", margin: "3px 0 6px" }}>
            {mode === "edge"
              ? "กำลังกำหนด Edge: คลิก Node บนแผนที่ หรือเลือกจากรายการ (ปลายทางเลือกข้ามชั้นได้)"
              : "กด “กำหนด Edge” เพื่อเริ่มเชื่อมเส้นทางจากแผนที่"}
          </div>
          {mode !== "edge" ? (
            <Btn onClick={startEdgeMode}>เริ่มกำหนด Edge</Btn>
          ) : (<>
            <Field label="Node ต้นทาง">
              <Select value={edgeForm.fromNodeId} onChange={(e) => setEdgeForm((f) => ({ ...f, fromNodeId: e.target.value }))}><option value="">— เลือก —</option>{floorNodes.map((n) => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}</Select>
            </Field>
            <Field label="Node ปลายทาง">
              <Select value={edgeForm.toNodeId} onChange={(e) => setEdgeForm((f) => ({ ...f, toNodeId: e.target.value }))}><option value="">— เลือก —</option>{buildingNodes.map((n) => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}</Select>
            </Field>
            <Field label="ประเภท Edge"><Select value={edgeForm.edgeType} onChange={(e) => setEdgeForm((f) => ({ ...f, edgeType: e.target.value }))}>{EDGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "8px 0 12px" }}><input type="checkbox" checked={edgeForm.accessible} onChange={(e) => setEdgeForm((f) => ({ ...f, accessible: e.target.checked }))} />รองรับเส้นทาง accessible</label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn disabled={busy} onClick={saveEdge}>{edgeForm.id ? "บันทึกการแก้ไข" : "เพิ่ม Edge"}</Btn>
              <Btn kind="ghost" onClick={resetEdge}>ล้างการเลือก</Btn>
              <Btn kind="ghost" onClick={stopEdgeMode}>เสร็จสิ้น</Btn>
            </div>
          </>)}
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, marginTop: 14 }}>
        <section><b style={{ fontSize: 13 }}>Nodes ในชั้นนี้ ({floorNodes.length})</b><div style={{ maxHeight: 280, overflow: "auto", marginTop: 7 }}>{floorNodes.map((n) => <div key={n.id} style={rowStyle}><span><b>{nodeLabel(n)}</b></span><span style={{ display: "flex", gap: 5 }}><Btn kind="ghost" onClick={() => { setMode("node"); setNodeForm({ id: n.id, type: n.type || "path", x: n.x ?? "", y: n.y ?? "" }); }}>แก้</Btn><Btn kind="danger" onClick={() => deleteNode(n)}>ลบ</Btn></span></div>)}</div></section>
        <section><b style={{ fontSize: 13 }}>Edges ที่เชื่อมชั้นนี้ ({visibleEdges.length})</b><div style={{ maxHeight: 280, overflow: "auto", marginTop: 7 }}>{visibleEdges.map((e) => <div key={e.id} style={rowStyle}><span><b>{nodeLabel(nodeById.get(e.fromNodeId))} → {nodeLabel(nodeById.get(e.toNodeId))}</b><br/><small>{e.edgeType} · {e.distance ?? "-"} m · {e.accessible ? "accessible" : "not accessible"}</small></span><span style={{ display: "flex", gap: 5 }}><Btn kind="ghost" onClick={() => { setMode("edge"); setEdgeForm({ id: e.id, fromNodeId: e.fromNodeId, toNodeId: e.toNodeId, edgeType: e.edgeType || "walk", accessible: e.accessible !== false }); }}>แก้</Btn><Btn kind="danger" onClick={() => deleteEdge(e)}>ลบ</Btn></span></div>)}</div></section>
      </div>
    </Card>
  );
}

const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: "1px solid #F1F3F4", fontSize: 12 };