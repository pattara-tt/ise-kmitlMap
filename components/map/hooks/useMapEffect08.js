"use client";

import { useEffect } from "react";

export function useMapEffect08({ 
  buildingBounds,
  ctx,
  effectiveFloors,
  kmitlCalibrate,
  kmitlFloor,
  kmitlOpen,
  mapRef,
  mapZoom,
  placementToBounds
 }) {
  useEffect(() => {
  const c = ctx.current;
  const L = c.L;
  const m = mapRef.current;
  
  if (!L || !m) return;
  
  // ลบ overlay เก่าก่อนทุกครั้ง
  if (c.kmitlOverlay) {
    m.removeLayer(c.kmitlOverlay);
    c.kmitlOverlay = null;
  }
  
  // ถ้ายังไม่ได้เปิดตึก และยังซูมไม่ถึงระดับที่กำหนด
  if (!kmitlOpen && mapZoom < 16) return;
  
  const shownFloor = kmitlOpen ? kmitlFloor : "1";
  
  const f = effectiveFloors.find(
    (x) => String(x.id) === String(shownFloor)
  );
  
  if (!f?.svg) return;
  
  const fallbackBounds =
    f?.bounds?.length === 2
      ? f.bounds
      : buildingBounds;
  
  // ถ้ามี placement จาก UC8 → ใช้ placement
  // ถ้าไม่มี → ใช้ bounds เดิม
  const targetBounds = placementToBounds(
    f.placement,
    fallbackBounds
  );
  
  if (!targetBounds) return;
  
  c.kmitlOverlay = L.imageOverlay(
    f.svg,
    targetBounds,
      {
        opacity: 0.88,
        interactive: false,
        pane: "bdiFloorPane",
        zIndex: 1,
      }
    ).addTo(m);
  
  // เก็บข้อมูลไว้เผื่อใช้ต่อ
  c.kmitlOverlayAssetId = f.assetId || null;
  c.kmitlOverlayPlacement = f.placement || null;
  
  }, [kmitlOpen,kmitlFloor,kmitlCalibrate,mapZoom,effectiveFloors,
  ]);
}
