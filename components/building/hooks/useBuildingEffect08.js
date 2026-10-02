"use client";

import { useEffect } from "react";

export function useBuildingEffect08({ ctx, layersReady, mapBounds, mapData, openKey, center }) {
  useEffect(() => {
    const map = ctx.current.map;
    if (!map || !layersReady) return;
    const layer = openKey ? ctx.current.buildingLayers[openKey] : null;
  
    try {
      if (openKey && layer?.poly) {
        map.setMaxBounds(layer.poly.getBounds().pad(0.18));
      } else if (map._loaded && mapBounds.length >= 2) {
        const fullCampus = ctx.current.L.latLngBounds([...mapBounds, center]).pad(1.2);
        map.setMaxBounds(fullCampus);
      }
    } catch (e) {
      // Leaflet may reject bounds while the container is being resized.
    }
  }, [openKey, layersReady, mapData.data]);
}