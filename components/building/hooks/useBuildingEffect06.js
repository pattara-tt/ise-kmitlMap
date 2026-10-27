"use client";

import { useEffect } from "react";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function useBuildingEffect06({
  BUILDINGS, CENTER, ctx, drawGoogleLikeBaseMap, elRef, fitBuilding,
  loadLeaflet, mapBounds, mapData, mapRef, onChangeRef, setCurFloor,
  layersReady, setLayersReady, setOpenKey, setSearchedNodeId,
}) {
  const enabled = Boolean(mapData.data) && !mapData.error;

  // Initialize Leaflet/basemap once. Building data updates only replace
  // the local positioning geometry and labels in the separate effect below.
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    let createdMap = null;
    (async () => {
      const L = await loadLeaflet();
      if (dead || mapRef.current || !elRef.current || elRef.current._leaflet_id) return;

      const initialBounds = Array.isArray(mapBounds) && mapBounds.length === 2
        ? mapBounds : null;
      const map = L.map(elRef.current, {
        zoomControl: true,
        attributionControl: true,
        ...(initialBounds ? { maxBounds: initialBounds } : {}),
        maxBoundsViscosity: 0.8,
        minZoom: 16,
        maxZoom: 21,
      }).setView(CENTER, 17);
      createdMap = map;
      mapRef.current = map;
      ctx.current.L = L;
      ctx.current.map = map;
      ctx.current.buildingLayers = {};
      ctx.current.poiLayer = [];
      ctx.current.graphLayer = [];

      map.getContainer().addEventListener("click", (event) => {
        if (event.target.closest?.(".leaflet-popup-close-button")) {
          ctx.current.userClosedPopup = true;
        }
      }, { capture: true });

      const bounds = initialBounds || [
        [CENTER[0] - 0.01, CENTER[1] - 0.01],
        [CENTER[0] + 0.01, CENTER[1] + 0.01],
      ];
      map.getContainer().style.background = "#FFFFFF";
      drawGoogleLikeBaseMap(L, map, [
        bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1],
      ]).catch(() => {});

      for (const [name, zIndex] of [
        ["regBoundaryPane", "320"], ["regFloorPane", "350"], ["regGraphPane", "600"],
      ]) {
        if (!map.getPane(name)) map.createPane(name);
        map.getPane(name).style.zIndex = zIndex;
      }
      map.getPane("regBoundaryPane").style.pointerEvents = "none";
      map.getPane("regFloorPane").style.pointerEvents = "none";
      setLayersReady(true);
      setTimeout(() => {
        if (!dead && mapRef.current === map) map.invalidateSize();
      }, 0);
    })();

    return () => {
      dead = true;
      if (createdMap) createdMap.remove();
      if (mapRef.current === createdMap) mapRef.current = null;
      if (ctx.current.map === createdMap) {
        ctx.current.map = null;
        ctx.current.L = null;
        ctx.current.buildingLayers = {};
      }
      setLayersReady(false);
    };
  }, [enabled]);

  useEffect(() => {
    const { L, map } = ctx.current;
    if (!L || !map || !layersReady) return;

    const layers = {};
    for (const [key, entry] of Object.entries(BUILDINGS)) {
      const outline = entry.outline?.length >= 3 ? entry.outline
        : entry.bounds?.length === 2 ? [
          [entry.bounds[0][0], entry.bounds[0][1]],
          [entry.bounds[1][0], entry.bounds[0][1]],
          [entry.bounds[1][0], entry.bounds[1][1]],
          [entry.bounds[0][0], entry.bounds[1][1]],
        ] : null;
      if (!outline) continue;

      // Registrar selects a building label, then a GIS room node. Keep the
      // geometry only for label placement/zoom, as in the original picker.
      const poly = L.polygon(outline, {
        stroke: false,
        fill: false,
        opacity: 0,
        fillOpacity: 0,
        interactive: false,
        pane: "regBoundaryPane",
      }).addTo(map);

      const label = L.marker(poly.getBounds().getCenter(), {
        icon: L.divIcon({
          className: "",
          html: '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">' +
            '<img src="/data/icon/building.svg" alt="" style="width:18px;height:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"/>' +
            '<span style="background:rgba(255,255,255,.95);color:#202124;font-weight:800;font-size:11px;padding:3px 9px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap">' +
            escapeHtml(entry.name) +
            "</span></div>",
          iconSize: [160, 42],
          iconAnchor: [80, 21],
        }),
        zIndexOffset: 500,
      }).addTo(map);

      const select = (event) => {
        L.DomEvent.stopPropagation(event.originalEvent || event);
        const firstFloor = (entry.floors || []).find((floor) => String(floor.id) === "1")
          || entry.floors?.[0];
        const floor = firstFloor ? String(firstFloor.id) : "";
        setSearchedNodeId(null);
        setOpenKey(key);
        setCurFloor(floor);
        onChangeRef.current?.({ building: entry.name, buildingId: entry.id, floor });
        fitBuilding(map, poly);
      };
      label.on("click", select);
      label.getElement()?.setAttribute("aria-label", "เปิดข้อมูลอาคาร " + entry.name);
      layers[key] = { poly, label };
    }
    ctx.current.buildingLayers = layers;

    return () => {
      for (const { poly, label } of Object.values(layers)) {
        if (map.hasLayer(poly)) map.removeLayer(poly);
        if (map.hasLayer(label)) map.removeLayer(label);
      }
      if (ctx.current.buildingLayers === layers) ctx.current.buildingLayers = {};
    };
  }, [BUILDINGS, layersReady]);

}