"use client";

import { useEffect, useMemo, useState } from "react";
import { EDGE_TYPES } from "../../../lib/constants";
import { NODE_TYPES } from "../../mapConfig";
import { Btn, Card, Field, Input, Select, Status, useCollection } from "../../ui";

const EMPTY_NODE = { id: null, nodeKey: "", name: "", type: "path", x: "", y: "" };
const EMPTY_EDGE = { id: null, fromNodeId: "", toNodeId: "", edgeType: "walk", accessible: true };

function meters(a, b) {
  if (!a || !b) return null;
  const rad = (v) => (Number(v) * Math.PI) / 180;
  const lat1 = rad(a.y); const lat2 = rad(b.y);
  const dLat = lat2 - lat1; const dLon = rad(b.x) - rad(a.x);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q)) * 100) / 100;
}

export default function NodeEdgeTab({ user, mapData }) {
  const nodesApi = useCollection("nodes");
  const edgesApi = useCollection("edges");
  const buildings = mapData?.buildings || [];
  const [buildingId, setBuildingId] = useState(mapData?.building?.id || "");
  const [floorId, setFloorId] = useState("");
  const [nodeForm, setNodeForm] = useState(EMPTY_NODE);
  const [edgeForm, setEdgeForm] = useState(EMPTY_EDGE);
  const [busy, setBusy] = useState(false);

  const building = buildings.find((b) => b.id === buildingId) || buildings[0] || null;
  const floors = building?.floors || [];

  useEffect(() => {
    if (!buildingId && mapData?.building?.id) setBuildingId(mapData.building.id);
  }, [buildingId, mapData?.building?.id]);

  useEffect(() => {
    if (!floors.length) { setFloorId(""); return; }
    if (!floors.some((f) => f.id === floorId)) setFloorId(floors[0].id);
  }, [floors, floorId]);

  const floorIds = useMemo(() => new Set(floors.map((f) => f.id)), [floors]);
  const buildingNodes = useMemo(() => nodesApi.items.filter((n) => floorIds.has(n.floorId)), [nodesApi.items, floorIds]);
  const floorNodes = useMemo(() => buildingNodes.filter((n) => n.floorId === floorId), [buildingNodes, floorId]);
  const floorNodeIds = useMemo(() => new Set(floorNodes.map((n) => n.id)), [floorNodes]);
  const visibleEdges = useMemo(
    () => edgesApi.items.filter((e) => floorNodeIds.has(e.fromNodeId) || floorNodeIds.has(e.toNodeId)),
    [edgesApi.items, floorNodeIds]
  );
  const nodeById = useMemo(() => new Map(nodesApi.items.map((n) => [n.id, n])), [nodesApi.items]);

  const resetNode = () => setNodeForm(EMPTY_NODE);
  const resetEdge = () => setEdgeForm(EMPTY_EDGE);

  async function saveNode() {
    if (!floorId) return alert("กรุณาเลือกชั้น");
    if (!nodeForm.nodeKey.trim()) return alert("กรุณาระบุ Node key");
    if (!Number.isFinite(Number(nodeForm.x)) || !Number.isFinite(Number(nodeForm.y))) return alert("กรุณาระบุพิกัด X/Y เป็นตัวเลข");
    const payload = {
      nodeKey: nodeForm.nodeKey.trim(),
      floorId,
      name: nodeForm.name.trim() || null,
      type: nodeForm.type,
      x: Number(nodeForm.x),
      y: Number(nodeForm.y),
    };
    setBusy(true);
    try {
      if (nodeForm.id) await nodesApi.patch(nodeForm.id, payload, user);
      else await nodesApi.create(payload, user);
      resetNode();
    } catch (e) { alert(e.message || "บันทึก node ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function deleteNode(node) {
    if (!confirm(`ลบ node ${node.nodeKey}? Edge ที่เชื่อมกับ node นี้จะถูกลบตามด้วย`)) return;
    setBusy(true);
    try {
      await nodesApi.destroy(node.id, user);
      if (nodeForm.id === node.id) resetNode();
      await edgesApi.reload();
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
      resetEdge();
    } catch (e) { alert(e.message || "บันทึก edge ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function deleteEdge(edge) {
    if (!confirm(`ลบ edge ${edge.id}?`)) return;
    setBusy(true);
    try {
      await edgesApi.destroy(edge.id, user);
      if (edgeForm.id === edge.id) resetEdge();
    } catch (e) { alert(e.message || "ลบ edge ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  if (!buildings.length) return <Card>ยังไม่มีข้อมูลอาคารสำหรับจัดการโครงข่าย</Card>;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <b style={{ fontSize: 14 }}>Node / Edge ของเส้นทาง</b>
          <div style={{ fontSize: 12, color: "#5F6368", marginTop: 3 }}>เพิ่ม แก้ไข หรือลบจุดและเส้นเชื่อมของแต่ละชั้น การบันทึกจะถูกเก็บใน edit log อัตโนมัติ</div>
        </div>
        <Status value="published" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) minmax(150px,1fr)", gap: 10, marginTop: 12 }}>
        <Field label="อาคาร">
          <Select value={building?.id || ""} onChange={(e) => { setBuildingId(e.target.value); resetNode(); resetEdge(); }}>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
          </Select>
        </Field>
        <Field label="ชั้น">
          <Select value={floorId} onChange={(e) => { setFloorId(e.target.value); resetNode(); resetEdge(); }}>
            {floors.map((f) => <option key={f.id} value={f.id}>{f.name || `ชั้น ${f.floorNo}`}</option>)}
          </Select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, marginTop: 8 }}>
        <section style={{ border: "1px solid #E8EAED", borderRadius: 10, padding: 12 }}>
          <b>{nodeForm.id ? "แก้ไข Node" : "เพิ่ม Node"}</b>
          <Field label="Node key"><Input value={nodeForm.nodeKey} onChange={(e) => setNodeForm((f) => ({ ...f, nodeKey: e.target.value }))} placeholder="เช่น Sc8Room101" /></Field>
          <Field label="ชื่อ"><Input value={nodeForm.name} onChange={(e) => setNodeForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="ประเภท">
            <Select value={nodeForm.type} onChange={(e) => setNodeForm((f) => ({ ...f, type: e.target.value }))}>
              {NODE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label} ({t.id})</option>)}
            </Select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="X / Longitude"><Input type="number" step="any" value={nodeForm.x} onChange={(e) => setNodeForm((f) => ({ ...f, x: e.target.value }))} /></Field>
            <Field label="Y / Latitude"><Input type="number" step="any" value={nodeForm.y} onChange={(e) => setNodeForm((f) => ({ ...f, y: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}><Btn disabled={busy} onClick={saveNode}>{nodeForm.id ? "บันทึกการแก้ไข" : "เพิ่ม Node"}</Btn>{nodeForm.id ? <Btn kind="ghost" onClick={resetNode}>ยกเลิก</Btn> : null}</div>
        </section>

        <section style={{ border: "1px solid #E8EAED", borderRadius: 10, padding: 12 }}>
          <b>{edgeForm.id ? "แก้ไข Edge" : "เพิ่ม Edge"}</b>
          <Field label="Node ต้นทาง">
            <Select value={edgeForm.fromNodeId} onChange={(e) => setEdgeForm((f) => ({ ...f, fromNodeId: e.target.value }))}><option value="">— เลือก —</option>{floorNodes.map((n) => <option key={n.id} value={n.id}>{n.nodeKey} · {n.name || n.type}</option>)}</Select>
          </Field>
          <Field label="Node ปลายทาง">
            <Select value={edgeForm.toNodeId} onChange={(e) => setEdgeForm((f) => ({ ...f, toNodeId: e.target.value }))}><option value="">— เลือก —</option>{buildingNodes.map((n) => <option key={n.id} value={n.id}>{n.nodeKey} · {n.name || n.type}</option>)}</Select>
          </Field>
          <Field label="ประเภท Edge"><Select value={edgeForm.edgeType} onChange={(e) => setEdgeForm((f) => ({ ...f, edgeType: e.target.value }))}>{EDGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "8px 0 12px" }}><input type="checkbox" checked={edgeForm.accessible} onChange={(e) => setEdgeForm((f) => ({ ...f, accessible: e.target.checked }))} />รองรับเส้นทาง accessible</label>
          <div style={{ display: "flex", gap: 8 }}><Btn disabled={busy} onClick={saveEdge}>{edgeForm.id ? "บันทึกการแก้ไข" : "เพิ่ม Edge"}</Btn>{edgeForm.id ? <Btn kind="ghost" onClick={resetEdge}>ยกเลิก</Btn> : null}</div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, marginTop: 14 }}>
        <section><b style={{ fontSize: 13 }}>Nodes ในชั้นนี้ ({floorNodes.length})</b><div style={{ maxHeight: 280, overflow: "auto", marginTop: 7 }}>{floorNodes.map((n) => <div key={n.id} style={rowStyle}><span><b>{n.nodeKey}</b><br/><small>{n.name || n.type} · {Number(n.y).toFixed(6)}, {Number(n.x).toFixed(6)}</small></span><span style={{ display: "flex", gap: 5 }}><Btn kind="ghost" onClick={() => setNodeForm({ id: n.id, nodeKey: n.nodeKey || "", name: n.name || "", type: n.type || "path", x: n.x ?? "", y: n.y ?? "" })}>แก้</Btn><Btn kind="danger" onClick={() => deleteNode(n)}>ลบ</Btn></span></div>)}</div></section>
        <section><b style={{ fontSize: 13 }}>Edges ที่เชื่อมชั้นนี้ ({visibleEdges.length})</b><div style={{ maxHeight: 280, overflow: "auto", marginTop: 7 }}>{visibleEdges.map((e) => <div key={e.id} style={rowStyle}><span><b>{nodeById.get(e.fromNodeId)?.nodeKey || e.fromNodeId} → {nodeById.get(e.toNodeId)?.nodeKey || e.toNodeId}</b><br/><small>{e.edgeType} · {e.distance ?? "-"} m · {e.accessible ? "accessible" : "not accessible"}</small></span><span style={{ display: "flex", gap: 5 }}><Btn kind="ghost" onClick={() => setEdgeForm({ id: e.id, fromNodeId: e.fromNodeId, toNodeId: e.toNodeId, edgeType: e.edgeType || "walk", accessible: e.accessible !== false })}>แก้</Btn><Btn kind="danger" onClick={() => deleteEdge(e)}>ลบ</Btn></span></div>)}</div></section>
      </div>
    </Card>
  );
}

const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: "1px solid #F1F3F4", fontSize: 12 };
