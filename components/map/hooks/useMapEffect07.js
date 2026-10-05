"use client";

import { useEffect } from "react";

export function useMapEffect07({ 
  KMITL_ALL_NODES,
  KMITL_NODE_FLOOR,
  ctx,
  indoorSearchNodes,
  mapReady,
  mapRef,
  nodeIdByKey,
  openPlaceCard,
  rooms,
  chips,
  CHIP_NODE_TYPES
 }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m || !mapReady) return;
    const layer = L.layerGroup().addTo(m);
    const iconFor = (type) => (type === "Toilet" ? "/data/icon/toilet.svg" : "/data/icon/room.svg");
    for (const entry of indoorSearchNodes) {
      const room = rooms.find((r) => r.nodeId === (entry.internalId || nodeIdByKey[entry.id]));
      const displayName = room?.name || entry.name;
      const routeNode = KMITL_ALL_NODES[entry.id];
      const chipKey = Object.keys(CHIP_NODE_TYPES || {}).find((k) => CHIP_NODE_TYPES[k].includes(routeNode?.type));
      if (chipKey && !chips?.[chipKey]) continue;
  
      if (!entry.markerId) continue; // ยังไม่มีจุดกลางจริง (เช่นห้องน้ำตอนนี้) — ข้ามไปก่อน จนกว่าจะมีพิกัด
      const center = KMITL_ALL_NODES[entry.markerId];
      if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lon)) continue;
      const src = iconFor(routeNode?.type);
      L.marker([center.lat, center.lon], {
        icon: L.divIcon({
          className: "",
          html: `<img src="${src}" alt="" style="width:20px;height:20px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))" />`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        }),
        zIndexOffset: 700,
      })
        .bindTooltip(displayName, { direction: "top", offset: [0, -10] })
        // กดหมุดแล้วเปิดการ์ดสถานที่ชุดเดียวกับผลการค้นหา — มีข้อมูลห้อง ปุ่มนำทาง และปุ่มแจ้งปัญหา
        .on("click", () => openPlaceCard(displayName, [center.lon, center.lat], {
          nodeId: entry.id,
          markerNodeId: entry.markerId,
          floor: KMITL_NODE_FLOOR[entry.id] || "1",
          icon: entry.icon,
          extract: entry.extract,
        }))
        .addTo(layer);
    }
    return () => m.removeLayer(layer);
  }, [mapReady, rooms, indoorSearchNodes, nodeIdByKey, chips, CHIP_NODE_TYPES]);
}
