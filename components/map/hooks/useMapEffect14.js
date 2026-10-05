"use client";

import { useEffect } from "react";

export function useMapEffect14({ 
  CHIP_NODE_TYPES,
  NODE_TYPES,
  WALKWAY_NODE_TYPES,
  chips,
  ctx,
  indoorSearchNodes,
  kmitlFloor,
  kmitlFloorNodes,
  kmitlOpen,
  kmitlRouteResult,
  mapRef,
  openPlaceCard,
  rooms,
  nodeIdByKey,
  setKmitlRouteResult
 }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m) return;
    (c.kmitlGraphLayer || []).forEach((ly) => m.removeLayer(ly));
    c.kmitlGraphLayer = [];
    if (!kmitlOpen || !Object.keys(kmitlFloorNodes).length) { setKmitlRouteResult(null); return; }
    // 🔗 เส้น edge ระหว่าง node เป็นโครงกราฟสำหรับคำนวณเส้นทางเท่านั้น ไม่วาดให้ผู้ใช้เห็น
    //    (ผู้ใช้จะเห็นเฉพาะ "เส้นทางที่ระบบนำทางให้" ตอนกดนำทางจริงเท่านั้น)
    // 📍 วาด node ทุกจุดของชั้นที่กำลังดูอยู่ ให้เห็นบน SVG จริง — กรองตามชิปที่เปิดอยู่ (ห้องเรียน/ห้องน้ำ/ลิฟต์/บันได) ส่วน type อื่น (ทางเดิน/ทางเข้า/ทางหนีไฟ) ยังโชว์เสมอไม่เกี่ยวกับชิป
    for (const id of Object.keys(kmitlFloorNodes)) {
      const n = kmitlFloorNodes[id];
      if (!Number.isFinite(n?.lat) || !Number.isFinite(n?.lon)) continue;
      // node ทางเดินมีไว้ให้อัลกอริทึมเดินกราฟตอนนำทางเท่านั้น ไม่แสดงเป็นหมุดบนผัง
      if (WALKWAY_NODE_TYPES.includes(String(n.type || "").toLowerCase())) continue;
      const chipKey = Object.keys(CHIP_NODE_TYPES).find((k) => CHIP_NODE_TYPES[k].includes(n.type));
      if (chipKey && !chips[chipKey]) continue; // ชิปหมวดนี้ปิดอยู่ — ข้าม node ประเภทนี้ไป
      const t = NODE_TYPES.find((x) => x.id === n.type) || NODE_TYPES[0];
      const marker = L.circleMarker([n.lat, n.lon], { radius: 5, color: "#FFFFFF", weight: 1.5, fillColor: t.color, fillOpacity: 0.95, pane: "bdiFloorPane" }).addTo(m);
      const entry = indoorSearchNodes.find((x) => x.id === id || x.markerId === id);
      const routeKey = entry?.id || id;
      const internalNodeId = entry?.internalId || nodeIdByKey?.[routeKey];
      const room = rooms?.find((r) => r.nodeId === internalNodeId);
      // Tooltip และ Bottom Sheet ใช้ชื่อจาก rooms record เดียวกันเมื่อ node นี้เป็นห้อง
      const nodeName = room?.name || entry?.name || n.label || t.label;
      marker.bindTooltip(nodeName, { direction: "top", offset: [0, -8] });
      // กดที่ node แล้วเปิดการ์ดสถานที่แบบเดียวกับการค้นหา (มีปุ่มนำทาง / แจ้งปัญหา)
      marker.on("click", () => {
        openPlaceCard(nodeName, [n.lon, n.lat], {
          nodeId: entry?.id || id,
          markerNodeId: entry?.markerId || id,
          floor: kmitlFloor,
          icon: entry?.icon || t.icon,
          extract: entry?.extract || `${t.label} ชั้น ${kmitlFloor} อาคารพระจอมเกล้าฯ (Sc8)`,
        });
      });
      c.kmitlGraphLayer.push(marker);
    }
    if (kmitlRouteResult?.path?.length > 1) {
      const latlngs = kmitlRouteResult.path.map((id) => kmitlFloorNodes[id]).filter(Boolean).map((n) => [n.lat, n.lon]);
      if (latlngs.length > 1) c.kmitlGraphLayer.push(L.polyline(latlngs, { color: "#F9AB00", weight: 6, opacity: 0.95, pane: "bdiFloorPane" }).addTo(m));
    }
    return () => { (c.kmitlGraphLayer || []).forEach((ly) => { if (m.hasLayer(ly)) m.removeLayer(ly); }); c.kmitlGraphLayer = []; };
  }, [kmitlOpen, kmitlFloor, kmitlFloorNodes, kmitlRouteResult, chips, indoorSearchNodes, rooms, nodeIdByKey]);
}
