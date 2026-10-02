"use client";

import { useEffect } from "react";

export function useBuildingEffect06({ 
  BUILDINGS,
  CENTER,
  ctx,
  drawGoogleLikeBaseMap,
  elRef,
  fitBuilding,
  loadLeaflet,
  mapBounds,
  mapData,
  mapRef,
  onChangeRef,
  setCurFloor,
  setLayersReady,
  setOpenKey
 }) {
  useEffect(() => {
    if (!mapData.data || mapData.loading || mapData.error || mapBounds.length < 2 || !Object.keys(BUILDINGS).length) return;
    let dead = false;
    (async () => {const L = await loadLeaflet();
      if (dead || mapRef.current || !elRef.current) {
        return;
      }
  
      if (elRef.current._leaflet_id) {
        return;
      }
  
      const map = L.map(
        elRef.current,
        {
          zoomControl: true,
          attributionControl: true,
          maxBounds: mapBounds,
          maxBoundsViscosity:0.8,
          minZoom: 18,
          maxZoom: 21,
        }
      ).setView(CENTER,17);
  
      mapRef.current = map;
      ctx.current.L = L;
      ctx.current.map = map;
  
      // ดักคลิกปุ่ม ✕ ของ popup ทุกอัน ด้วย delegated listener ตัวเดียวที่ระดับ map container (capture phase)
      // แทนที่จะผูก listener ทีละ marker/ทีละครั้งที่ popup เปิด (ของเดิม) ซึ่งเปราะบาง — ถ้า popup ถูกอัปเดทเนื้อหา
      // (setPopupContent) หรือ marker ถูก setIcon ระหว่างที่ผู้ใช้กำลังดูอยู่ ปุ่ม/ลิสเทนเนอร์เดิมอาจไม่ทำงานตามคาด
      // delegated listener ตัวนี้อยู่ที่ container ซึ่งไม่มีวันถูกลบ/สร้างใหม่ จึงชัวร์กว่าและทำงานถูก "ก่อน"
      // ตัว popupclose event เสมอ เพราะ capture phase รันก่อน bubble phase ของปุ่มปิดเองที่ Leaflet ผูกไว้
      map.getContainer().addEventListener(
        "click",
        (e) => {
          if (e.target.closest?.(".leaflet-popup-close-button")) {
            ctx.current.userClosedPopup = true;
          }
        },
        { capture: true }
      );
  
      // Full raster basemap behind registrar floor plans and room markers 
      map.getContainer().style.background = "#FFFFFF";
      drawGoogleLikeBaseMap(L, map, [
        mapBounds[0][0], mapBounds[0][1],
        mapBounds[1][0], mapBounds[1][1],
      ]).catch(() => {});
  
      // Pane สำหรับ floor plan 
      if (!map.getPane("regFloorPane")) {
        map.createPane("regFloorPane");
        map.getPane("regFloorPane").style.zIndex = "350";
        map.getPane("regFloorPane").style.pointerEvents = "none";
      }
  
      // Pane สำหรับ graph / icons 
      if (!map.getPane("regGraphPane")) {
        map.createPane("regGraphPane");
        map.getPane("regGraphPane").style.zIndex = "600";
      }
  
      // Building labels 
      for (const [key, buildingData,] of Object.entries(BUILDINGS)) {
        const outline = buildingData.outline && buildingData.outline.length >= 3? buildingData.outline : buildingData.bounds ? [
                [
                  buildingData.bounds[0][0],
                  buildingData.bounds[0][1],
                ],
                [
                  buildingData.bounds[1][0],
                  buildingData.bounds[0][1],
                ],
                [
                  buildingData.bounds[1][0],
                  buildingData.bounds[1][1],
                ],
                [
                  buildingData.bounds[0][0],
                  buildingData.bounds[1][1],
                ],
              ] : null;
  
        if (!outline) {
          continue;
        }
  
        const poly = L.polygon(
            outline,
            {
              stroke: false,
              fill: false,
              opacity: 0,
              interactive: false,
            }
          ).addTo(map);
  
        const center = poly.getBounds().getCenter();
        const label = L.marker(center, {
              icon: L.divIcon({
                  className: "",
                  html: `
                    <div
                      style="display:flex; flex-direction:column; align-items:center; gap:2px;cursor:pointer;"
                    >
                      <img
                        src="/data/icon/building.svg"
                        alt=""
                        style=" width:18px; height:18px; filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));"
                      />
  
                      <span
                        style="background: rgba(255,255,255,.94); color:#202124;
                          font-weight:800; font-size:11px;padding:3px 9px;
                          border-radius:999px;
                          box-shadow: 0 1px 4pxrgba(0,0,0,.25);
                          white-space:nowrap;"
                      >
                        ${buildingData.name}
                      </span>
                    </div>`,
  
                  iconSize: [140, 42,],
                  iconAnchor: [70, 21,],
                }),
              zIndexOffset: 500,
            }
          ).addTo(map);
  
        label.on("click", () => {
            setOpenKey(key);
            setCurFloor("1");
            onChangeRef.current?.({
              building: buildingData.name,
              floor: "1",
            });
  
            fitBuilding(map,poly
            );
          }
        );
  
        ctx.current.buildingLayers[key] = {poly,label,
        };
      }
  
      setLayersReady(true);
      setTimeout(() => map.invalidateSize(), 200);
    })();
  
    return () => {
      dead = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      ctx.current.map = null;
      ctx.current.L = null;
      setLayersReady(false);
    };
  }, [mapData.data, mapData.loading, mapData.error]);
}