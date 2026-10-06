"use client";

import { useEffect } from "react";

export function useBuildingEffect10({ ctx, curFloor, floorEdges, floorNodes, openKey }) {
  useEffect(() => {const {L, map,} = ctx.current;
    if (!L || !map) {return;}
  
    for (const layer of ctx.current.graphLayer) {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }
  
    ctx.current.graphLayer = [];
  
    if (!openKey) return;
  
    // วาด edge ทางเดิน 
    for (const [from,to,] of floorEdges) {
      const a = floorNodes[from];
      const z = floorNodes[to];
  
      if (!a || !z || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) ||
        !Number.isFinite(z.lat) || !Number.isFinite(z.lon)) {
        continue;
      }
  
      const line = L.polyline([
            [a.lat,a.lon,],
            [z.lat,z.lon,],],
          {
            color:"#9AA0A6",
            weight: 2,
            opacity: 0.60,
            dashArray: "4 4",
            pane: "regGraphPane",
          }
        ).addTo(map);
  
      line.bindTooltip(
        "ทางเดินภายในอาคาร",{sticky: true,}
      );
      ctx.current.graphLayer.push(line);
    }
  
    return () => {
      for (const layer of ctx.current.graphLayer) {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      }
      ctx.current.graphLayer = [];
    };
  }, [
    openKey,
    curFloor,
    floorNodes,
    floorEdges,
  ]);
}
