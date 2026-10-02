"use client";

import { useEffect } from "react";
import { registrarMarkerHtml, registrarMarkerZIndex } from "../registrarMarker";

export function useBuildingEffect13({ 
  b,
  buildPopupContent,
  ctx,
  curFloor,
  floorNodes,
  focusedNodeId,
  searchedNodeId,
  getNodeIcon,
  getNodeTypeLabel,
  isExteriorNode,
  openKey,
  roomByNode
 }) {
  useEffect(() => {
    const { L, map } = ctx.current;
    if (!L || !map || !openKey) return;
  
    for (const [id, node] of Object.entries(floorNodes)) {
      const marker = ctx.current.markersByNodeId?.[id];
      if (!marker || !Number.isFinite(node?.lat) || !Number.isFinite(node?.lon)) continue;
  
      const room = roomByNode[id];
      const exterior = isExteriorNode(id);
      const effectiveNode = exterior ? {
              ...node,
              type: node.type === "path" || !node.type ? "exit": node.type,
            }
          : node;
      const icon = getNodeIcon(effectiveNode);
      const typeLabel = exterior ? "ทางเข้า / ทางออก" : getNodeTypeLabel(node);
  
      const { tooltipText, popupHtml } = buildPopupContent(id, node, room, icon, typeLabel);
  
      // อัปเดตเนื้อหา — ถ้า popup เปิดค้างอยู่ Leaflet จะ re-render เนื้อหาให้เองทันทีโดยไม่ปิด popup
      marker.setTooltipContent(tooltipText);
      marker.setPopupContent(popupHtml);
  
      // กรอบสีน้ำเงินไฮไลต์ node ที่กำลังโฟกัส — อัปเดต icon ในตัวโดยไม่ลบ/สร้าง marker ใหม่
      const isFocusedNode = focusedNodeId && id === focusedNodeId;
      const isSearchHit = searchedNodeId && id === searchedNodeId;
      const size = icon.type === "room" || icon.type === "toilet" ? 24 : 26;
  
      marker.setIcon(
        L.divIcon({
          className: "",
          html: registrarMarkerHtml({ iconHtml: icon.html, iconType: icon.type, size,
            selected: !!isFocusedNode, searchHit: !!isSearchHit }),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      );
  
      marker.setZIndexOffset(
        registrarMarkerZIndex(icon.type, !!isFocusedNode, !!isSearchHit)
      );
  
      // ห้องนี้กำลังถูกโฟกัส/แสดงอยู่ในแผงด้านล่าง — เปิด popup ค้างไว้เสมอถ้ายังไม่เปิด
      if ((isSearchHit || (isFocusedNode && !searchedNodeId)) && !marker.isPopupOpen()) {
        marker.openPopup();
      }
    }
  }, [
    openKey,
    curFloor,
    floorNodes,
    roomByNode,
    b,
    focusedNodeId,
    searchedNodeId,
  ]);
}