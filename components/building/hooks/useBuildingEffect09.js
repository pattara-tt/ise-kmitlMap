"use client";

import { useEffect } from "react";
import { placementToBounds } from "../../map/mapViewHelpers";

export function useBuildingEffect09({ b, ctx, curFloor, mergedFloors, openKey }) {
  useEffect(() => {
    const { L, map } = ctx.current;
    if (!L || !map) return;

    if (ctx.current.floorOverlay) {
      map.removeLayer(ctx.current.floorOverlay);
      ctx.current.floorOverlay = null;
    }

    if (!openKey || !b) return;

    const floorData = mergedFloors.find((f) => String(f.id) === String(curFloor));
    if (!floorData?.svg) return;

    // เหมือน MapView: มี placement ใช้ placement ไม่มีใช้ bounds เดิมของอาคาร
    const targetBounds = placementToBounds(floorData.placement, b.bounds);
    if (!targetBounds) return;

    ctx.current.floorOverlay = L.imageOverlay(floorData.svg, targetBounds, {
      opacity: 0.96,
      interactive: false,
      pane: "regFloorPane",
    }).addTo(map);
  }, [openKey, curFloor, mergedFloors, b]);
}