"use client";

import { useEffect } from "react";

export function useMapEffect06({
  BUILDINGS,
  boundaries = [],
  ctx,
  mapReady,
  mapRef,
  mapDataVersion,
}) {
  useEffect(() => {
    const c = ctx.current;
    const L = c.L;
    const m = mapRef.current;
    if (!L || !m || !mapReady) return;

    const layer = L.layerGroup().addTo(m);

    // ป้องกันข้อความจากชื่อสถานที่ถูกตีความเป็น HTML
    const escapeHtml = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      })[ch]);

    const pinIcon = (name) =>
      L.divIcon({
        className: "",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
            <img src="/data/icon/building.svg" alt="" style="width:18px;height:18px" />
            <span style="background:rgba(255,255,255,.92);color:#202124;font-weight:800;
              font-size:11px;padding:2px 8px;border-radius:999px;white-space:nowrap;">
              ${escapeHtml(name)}
            </span>
          </div>`,
        iconSize: [140, 40],
        iconAnchor: [70, 20],
      });

    const addPin = (latlng, name, onClick) =>
      L.marker(latlng, { icon: pinIcon(name), interactive: true, zIndexOffset: 2100 })
        .addTo(layer)
        .on("click", (event) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          onClick();
        });

    // 1) หมุดจากขอบเขตอาคาร (UC7) — ไม่วาดกรอบ ใช้พิกัดเพื่อหากึ่งกลางเท่านั้น
    const buildingBoundaries = (boundaries || []).filter(
      (b) =>
        b.type === "building" &&
        b.status !== "deleted" &&
        Array.isArray(b.geometry) &&
        b.geometry.length >= 3 &&
        b.geometry.every(
          (p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))
        )
    );

    const coveredIds = new Set();
    const coveredNames = new Set();

    for (const boundary of buildingBoundaries) {
      const pts = boundary.geometry.map((p) => [Number(p[0]), Number(p[1])]);
      const center = L.latLngBounds(pts).getCenter();
      if (boundary.buildingId) coveredIds.add(String(boundary.buildingId));
      if (boundary.name) coveredNames.add(boundary.name);

      addPin(center, boundary.name || "ไม่ระบุชื่อ", () =>
        ctx.current.openBuildingInfo?.(boundary.buildingId, boundary)
      );
    }

    // 2) หมุดอาคารเดิมใน BUILDINGS ที่ยังไม่มีขอบเขต
    for (const key in BUILDINGS) {
      const b = BUILDINGS[key];
      if (!b.bounds || !b.bounds.length) continue;
      if ((b.id && coveredIds.has(String(b.id))) || coveredNames.has(b.name)) continue;

      const [[south, west], [north, east]] = b.bounds;
      addPin([(south + north) / 2, (west + east) / 2], b.name, () =>
        ctx.current.openBuildingInfo?.(b.id)
      );
    }

    const ensureVisible = () => {
      if (mapRef.current === m && !m.hasLayer(layer)) layer.addTo(m);
    };
    m.on("moveend zoomend", ensureVisible);

    return () => {
      m.off("moveend zoomend", ensureVisible);
      if (m.hasLayer(layer)) m.removeLayer(layer);
    };
  }, [mapReady, mapDataVersion, boundaries]);
}