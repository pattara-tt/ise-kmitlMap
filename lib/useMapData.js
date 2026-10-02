"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { hydrateMapConfig } from "../components/mapConfig";

let cache = null;
let pending = null;

async function loadMapData({ force = false } = {}) {
  if (force) cache = null;
  if (cache) return cache;
  if (!pending) pending = (async () => {
    const buildingResponse = await apiFetch("/api/map/buildings");
    const buildings = buildingResponse.items || [];
    const building = buildings.find((b) => String(b.code || "").toUpperCase() === "SC8") || buildings[0];
    if (!building) throw new Error("ไม่พบข้อมูลอาคาร");
    const graph = await apiFetch(`/api/map/graph?building=${encodeURIComponent(building.id)}`);
    hydrateMapConfig({ buildings, buildingId: building.id, nodes: graph.nodes || [], edges: graph.edges || [] });
    return { buildings, building, nodes: graph.nodes || [], edges: graph.edges || [] };
  })().finally(() => { pending = null; });
  cache = await pending;
  return cache;
}

export function clearMapDataCache() {
  cache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("scimap-map-data-changed"));
}

export function useMapData(enabled = true) {
  const [state, setState] = useState(() => ({ data: cache, loading: enabled && !cache, error: null }));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const refresh = (force = false) => {
      setState((s) => ({ ...s, loading: !cache, error: null }));
      loadMapData({ force }).then((data) => active && setState({ data, loading: false, error: null }))
        .catch((error) => active && setState({ data: null, loading: false, error }));
    };
    const onChanged = () => refresh(true);
    refresh(false);
    if (typeof window !== "undefined") window.addEventListener("scimap-map-data-changed", onChanged);
    return () => {
      active = false;
      if (typeof window !== "undefined") window.removeEventListener("scimap-map-data-changed", onChanged);
    };
  }, [enabled]);
  return state;
}
