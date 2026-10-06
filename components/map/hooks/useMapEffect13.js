"use client";

import { useEffect } from "react";

export function useMapEffect13({ 
  ctx,
  getNodeType,
  kmitlFloor,
  kmitlNodes,
  kmitlOpen,
  mapRef,
  setKmitlNodes
 }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m) return;
    (c.kmitlNodeMarkers || []).forEach((mk) => m.removeLayer(mk));
    c.kmitlNodeMarkers = [];
    
    if (!kmitlOpen) return;
    kmitlNodes.filter((n) => n.floor === kmitlFloor).forEach((n) => {
      const t = getNodeType(n.type);
      const mk = L.marker([n.lat, n.lon], {
        draggable: true,
        icon: L.divIcon({ className: "", html: `<div style="width:22px;height:22px;border-radius:50%;background:${t.color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:grid;place-items:center;font-size:11px;color:#fff">${t.icon}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        zIndexOffset: 1800,
        pane: "bdiFloorPane",
      }).addTo(m).bindTooltip(`${t.label} #${n.id}`, { permanent: false });
      mk.on("drag", (e) => { const p = e.target.getLatLng(); setKmitlNodes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lat: p.lat, lon: p.lng } : x))); });
      mk.on("contextmenu", () => setKmitlNodes((prev) => prev.filter((x) => x.id !== n.id))); // คลิกขวา = ลบหมุดนั้น
      c.kmitlNodeMarkers.push(mk);
    });
  }, [kmitlOpen, kmitlFloor, kmitlNodes]);
}
