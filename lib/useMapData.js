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

    const mainGraph = await apiFetch(`/api/map/graph?building=${encodeURIComponent(building.id)}`);
    hydrateMapConfig({ buildings, buildingId: building.id, nodes: mainGraph.nodes || [], edges: mainGraph.edges || [] });

    const others = buildings.filter((b) => b.id !== building.id);
    const settled = await Promise.allSettled(
      others.map((b) => apiFetch(`/api/map/graph?building=${encodeURIComponent(b.id)}`))
    );

    const nodeMap = new Map();
    const edgeMap = new Map();
    const collect = (graph) => {
      for(const n of graph?.nodes || []) nodeMap.set(n.id ?? n.nodeKey, n);
      for(const e of graph?.edges || []) edgeMap.set(e.id ?? `${e.fromNodeId}>${e.toNodeId}`, e);
    };
    collect(mainGraph);
    settled.forEach((r,i) => {
      if(r.status === "fulfilled") collect(r.value);
      else console.warn("load แผนผังอาคารไม่สำเร็จ:", others[i]?.name, r.reason);
    });
    
    return { buildings, building, nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
  })().finally(() => { pending = null; });
  cache = await pending;

  return cache;
}

export function clearMapDataCache() {
  cache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("scimap-map-data-changed"));
}

export function resetMapDataCache() {
  cache = null;
  pending = null;
}

export function useMapData(enabled = true) {
  // state มีข้อมูล 3 ส่วน -> data, loading, error
  const [state, setState] = useState(() => (
    { data: cache, 
      loading: enabled && !cache, 
      error: null }));

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
