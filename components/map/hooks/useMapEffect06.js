"use client";

import { useEffect } from "react";

export function useMapEffect06({ BUILDINGS, ctx, mapReady, mapRef, mapDataVersion }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m || !mapReady) return;
    const layer = L.layerGroup().addTo(m);
    for (const key in BUILDINGS) {
      const b = BUILDINGS[key];
      if (!b.bounds || !b.bounds.length) continue;
      const [[south, west], [north, east]] = b.bounds;
      const lat = (south + north) / 2, lon = (west + east) / 2;
      const buildingMarker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: "",
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">
            <img src="/data/icon/building.svg" alt="" style="width:18px;height:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))" />
            <span style="background:rgba(255,255,255,.92);color:#202124;font-weight:800;font-size:11px;padding:2px 8px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap">${b.name}</span>
          </div>`,
          iconSize: [140, 40], iconAnchor: [70, 20],
        }),
        interactive: true,
        zIndexOffset: 2100,
      }).addTo(layer);
      buildingMarker.on("click", (event) => {
        L.DomEvent.stopPropagation(event.originalEvent);
        ctx.current.openBuildingInfo?.();
      });
      buildingMarker.bindTooltip("ดูข้อมูลและรูปอาคาร · คลิกเพื่อเปิด", { direction: "top", offset: [0, -16] });
    }
    // Keep the label group attached even after GPS recenter/pan/zoom.
    const ensureVisible = () => {
      if (mapRef.current === m && !m.hasLayer(layer)) layer.addTo(m);
    };
    m.on("moveend zoomend", ensureVisible);
    return () => {
      m.off("moveend zoomend", ensureVisible);
      if (m.hasLayer(layer)) m.removeLayer(layer);
    };
  }, [mapReady, mapDataVersion]);
}