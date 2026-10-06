"use client";

import { useEffect } from "react";

export function useMapEffect12({ 
  buildingBounds,
  ctx,
  effectiveFloors,
  kmitlCalibrate,
  kmitlFloor,
  kmitlOpen,
  mapRef,
  placementToBounds,
  setKmitlCalReadout
 }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m) return;
    const cleanup = () => {
      if (c.calNW) { m.removeLayer(c.calNW); c.calNW = null; }
      if (c.calSE) { m.removeLayer(c.calSE); c.calSE = null; }
      if (c.calImg) { m.removeLayer(c.calImg); c.calImg = null; }
    };
    if (!kmitlOpen || !kmitlCalibrate) { cleanup(); return; }
    const f = effectiveFloors.find((x) => x.id === kmitlFloor);
  
    if (!f || !f.svg) return;
  
    if (!Array.isArray(buildingBounds) || buildingBounds.length !== 2) return;
    let nw = [buildingBounds[1][0], buildingBounds[0][1]]; // [north, west]
    let se = [buildingBounds[0][0], buildingBounds[1][1]]; // [south, east]
  
    const update = () => {
      // const bounds = [[se[0], nw[1]], [nw[0], se[1]]];
      if (c.calImg) m.removeLayer(c.calImg);
      c.calImg = L.imageOverlay(f.svg, placementToBounds(f.placement, buildingBounds), { opacity: 0.85, interactive: false, pane: "bdiFloorPane" }).addTo(m);
      const dms = (d) => { const dir = d >= 0 ? "" : "-"; d = Math.abs(d); const deg = Math.floor(d); const minF = (d - deg) * 60; const min = Math.floor(minF); const sec = ((minF - min) * 60).toFixed(2); return `${dir}${deg}°${min}'${sec}"`; };
      setKmitlCalReadout({
        nw: `${dms(nw[0])}N ${dms(nw[1])}E`,
        se: `${dms(se[0])}N ${dms(se[1])}E`,
        nwDec: [+nw[0].toFixed(7), +nw[1].toFixed(7)],
        seDec: [+se[0].toFixed(7), +se[1].toFixed(7)],
      });
    };
    const mk = (pos, color) => L.marker(pos, { draggable: true, icon: L.divIcon({ className: "", html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.6)"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 2000 }).addTo(m);
    c.calNW = mk(nw, "#16a34a").bindTooltip("มุมบนซ้าย (NW)", { permanent: false });
    c.calSE = mk(se, "#dc2626").bindTooltip("มุมล่างขวา (SE)", { permanent: false });
    c.calNW.on("drag", (e) => { const p = e.target.getLatLng(); nw = [p.lat, p.lng]; update(); });
    c.calSE.on("drag", (e) => { const p = e.target.getLatLng(); se = [p.lat, p.lng]; update(); });
    update();
    return cleanup;
  }, [kmitlOpen, kmitlCalibrate, kmitlFloor, effectiveFloors, buildingBounds]);
}
