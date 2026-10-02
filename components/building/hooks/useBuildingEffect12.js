"use client";

import { useEffect } from "react";
import { registrarMarkerHtml, registrarMarkerZIndex } from "../registrarMarker";

export function useBuildingEffect12({ 
  b,
  buildPopupContent,
  building,
  ctx,
  curFloor,
  floorNodes,
  focusedNodeId,
  searchedNodeId,
  setSearchedNodeId,
  getNodeIcon,
  getNodeTypeLabel,
  isExteriorNode,
  onCloseRoomPopupRef,
  onSelectRoomRef,
  openKey,
  roomByNodeRef
 }) {
  useEffect(() => {
    const {L,map,} = ctx.current;
    if (!L || !map) {return;}
  
    // clear
    for (const marker of ctx.current.poiLayer) {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  
    ctx.current.poiLayer = [];
    ctx.current.markersByNodeId = {};
    if (!openKey || !Object.keys(floorNodes).length) {return;}
    for (const [id,node,] of Object.entries(floorNodes)) {
      if (!Number.isFinite(node?.lat) || !Number.isFinite(node?.lon)) {
        continue;
      }
  
      const room = roomByNodeRef.current[id];
  
      const exterior = isExteriorNode(id);
      const effectiveNode = exterior ? {
              ...node,
              type: node.type === "path" || !node.type ? "exit": node.type,
            }
          : node;
  
      const icon = getNodeIcon(effectiveNode);
      const typeLabel = exterior ? "ทางเข้า / ทางออก" : getNodeTypeLabel(node);
  
      // ขนาด icon 
      const size = icon.type === "room" ||
        icon.type === "toilet" ? 24 : 26;
  
      // node ที่กำลังถูกเลือก/ดูอยู่ในแผงจัดการด้านล่าง — เน้นด้วยกรอบสีน้ำเงิน 
      const isFocusedNode = focusedNodeId && id === focusedNodeId;
      const isSearchHit = searchedNodeId && id === searchedNodeId;
  
      const marker = L.marker([node.lat, node.lon,], {
            icon: L.divIcon({
                className: "",
                html: registrarMarkerHtml({ iconHtml: icon.html, iconType: icon.type, size,
                  selected: !!isFocusedNode, searchHit: !!isSearchHit }),
  
                iconSize: [size,size],
                iconAnchor: [size / 2,size / 2,],
              }),
  
            zIndexOffset: registrarMarkerZIndex(icon.type, !!isFocusedNode, !!isSearchHit),
  
            pane: "regGraphPane",
          }
        ).addTo(map);
  
      marker.__nodeId = id;
  
      /* Tooltip + Popup — เนื้อหามาจาก buildPopupContent ที่ใช้ร่วมกับ effect อัปเดตด้านล่าง */
      const { tooltipText, popupHtml } = buildPopupContent(id, node, room, icon, typeLabel);
  
      marker.bindTooltip(
        tooltipText,
        {
          direction: "top",
          offset: [0, -8,],
        }
      );
  
      marker.bindPopup(popupHtml, {
          closeButton: true,
          offset: [0, -8,],
          maxWidth: 260,
          autoPan: true,
          keepInView: true,
          autoPanPaddingTopLeft: [120,30,],
          autoPanPaddingBottomRight: [50,40],
        }
      );
  
      /* ===================================================
         Click
         ถ้าเป็นห้อง:
         - zoom
         - popup
         - ส่งไป RoomsManager
         =================================================== */
  
        // หมายเหตุ: การดัก "ผู้ใช้กด ✕ เอง" ย้ายไปใช้ delegated listener ระดับ map container แล้ว
        // (ดูตอน initialize map ด้านบน) เพื่อความทนทานกว่าเดิม ไม่ต้องผูก/ถอด listener ทุกครั้งที่ popup เปิด
  
        marker.on("popupclose", () => {
        const wasUserClose = ctx.current.userClosedPopup;
        ctx.current.userClosedPopup = false;
  
        // กด ✕ บน popup เอง สั่งแผงด้านล่างกลับไปหน้าห้องทั้งหมดทันที
        if (wasUserClose) {
          setSearchedNodeId(null);
          onCloseRoomPopupRef.current?.();
        }
        });
  
        marker.on("click", () => {
            setSearchedNodeId(null); // Manual selection replaces search highlighting.
            map.setView([node.lat, node.lon,], 20, { animate: true,});
            const room = roomByNodeRef.current[id];
  
            if (icon.type === "room") {
                onSelectRoomRef.current?.(
                room || {
                    id: null,
                    nodeId: id,
                    code: null,
                    name: node.label || id,
                    building: b?.name || building,
                    floor: curFloor,
                    __isNewNode: true,
                }
                );
            }
        }
      );
      ctx.current.poiLayer.push(marker);
      ctx.current.markersByNodeId[id] = marker;
    }
  
    return () => {
      for (const marker of ctx.current.poiLayer) {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      }
      ctx.current.poiLayer = [];
      ctx.current.markersByNodeId = {};
    };
  }, [
    openKey,
    curFloor,
    floorNodes,
    b,
  ]);
}