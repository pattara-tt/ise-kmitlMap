"use client";

import { useEffect } from "react";
import { getNodeIcon } from "../../building/nodePresentation";
import { resolveRoomNodeIcon } from "../../building/roomTypeIcon";
import { registrarMarkerHtml } from "../../building/registrarMarker";

export function useMapEffect07({ 
  KMITL_ALL_NODES,
  KMITL_NODE_FLOOR,
  ctx,
  indoorSearchNodes,
  kmitlOpen,
  mapReady,
  mapRef,
  nodeIdByKey,
  openPlaceCard,
  rooms,
  roomTypes,
  chips,
  CHIP_NODE_TYPES
 }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m || !mapReady || kmitlOpen) return;
    const layer = L.layerGroup().addTo(m);
    for (const entry of indoorSearchNodes) {
      const room = rooms.find((r) => r.nodeId === (entry.internalId || nodeIdByKey[entry.id]));
      const displayName = room?.name || entry.name;
      const routeNode = KMITL_ALL_NODES[entry.id];
      const chipKey = Object.keys(CHIP_NODE_TYPES || {}).find((k) => CHIP_NODE_TYPES[k].includes(routeNode?.type));
      if (chipKey && !chips?.[chipKey]) continue;
  
      // Display at the actual Registrar/GIS node, not the legacy route-center node.
      const center = routeNode;
      if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lon)) continue;
      const icon = resolveRoomNodeIcon(room, roomTypes, getNodeIcon(routeNode));
      const size = icon.type === "room" || icon.type === "toilet" ? 24 : 26;
      L.marker([center.lat, center.lon], {
        icon: L.divIcon({
          className: "",
          html: registrarMarkerHtml({ iconHtml: icon.html, iconType: icon.type, size }),
          iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        }),
        zIndexOffset: 700,
      })
        .bindTooltip(displayName, { direction: "top", offset: [0, -10] })
        // กดหมุดแล้วเปิดการ์ดสถานที่ชุดเดียวกับผลการค้นหา — มีข้อมูลห้อง ปุ่มนำทาง และปุ่มแจ้งปัญหา
        .on("click", () => openPlaceCard(displayName, [center.lon, center.lat], {
          nodeId: entry.id,
          markerNodeId: entry.id,
          floor: KMITL_NODE_FLOOR[entry.id] || "1",
          icon: entry.icon,
          extract: entry.extract,
        }))
        .addTo(layer);
    }
    return () => m.removeLayer(layer);
  }, [mapReady, kmitlOpen, rooms, roomTypes, indoorSearchNodes, nodeIdByKey, chips, CHIP_NODE_TYPES]);
}