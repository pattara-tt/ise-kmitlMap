"use client";

import { useEffect } from "react";

export function useBuildingEffect09({ b, ctx, curFloor, mergedFloors, openKey }) {
  useEffect(() => {const {L,map,} = ctx.current;
    if (!L || !map) {return;}
  
    if (ctx.current.floorOverlay) {
      map.removeLayer(ctx.current.floorOverlay);
      ctx.current.floorOverlay = null;
    }
  
    if (!openKey || !b) {return;}
    const floorData = mergedFloors.find((f) =>
          String(f.id) === String(curFloor)
      );
  
    if (floorData?.svg) {
      ctx.current.floorOverlay =L.imageOverlay(
          floorData.svg,
          b.bounds,
          {
            opacity: 0.96,
            interactive: false,
            pane:"regFloorPane",
          }
        ).addTo(map);
    }
  }, [
    openKey,
    curFloor,
    mergedFloors,
    b,
  ]);
}
