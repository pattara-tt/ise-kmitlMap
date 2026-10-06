"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

let cacheKey = null;
let cache = null;
let pending = null;

async function loadAll(sessionId) {
  if (!sessionId) return { roles: [], useCases: [], modules: [], faculties: [], buildings: [] };
  if (cache && cacheKey === sessionId) return cache;
  if (pending && cacheKey === sessionId) return pending;
  cacheKey = sessionId;
  pending = Promise.all([
    apiFetch("/api/ref/roles"),
    apiFetch("/api/ref/use-cases"),
    apiFetch("/api/ref/modules"),
    apiFetch("/api/ref/faculties"),
    apiFetch("/api/map/buildings"),
  ]).then(([roles,useCases,modules,faculties,buildings]) => {
    cache = {
      roles: roles.items || [], useCases: useCases.items || [], modules: modules.items || [],
      faculties: faculties.items || [], buildings: buildings.items || [],
    };
    pending = null;
    return cache;
  }).catch((e) => { pending = null; throw e; });
  return pending;
}

export function useRefData(enabled = true) {
  const [data,setData] = useState(cache || { roles: [], useCases: [], modules: [], faculties: [], buildings: [] });
  const [loading,setLoading] = useState(enabled && !cache);
  const [error,setError] = useState(null);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const sessionId = localStorage.getItem("kmitlmap:session");
    if (!sessionId) { setLoading(false); return; }
    let live = true;
    setLoading(true);
    loadAll(sessionId).then((v)=>{ if(live){setData(v);setError(null);} }).catch((e)=>{if(live)setError(e);}).finally(()=>{if(live)setLoading(false);});
    return () => { live=false; };
  }, [enabled]);
  const roleLabels = useMemo(() => Object.fromEntries((data.roles || []).map(r => [r.code,r.name])), [data.roles]);
  return { ...data, roleLabels, loading, error };
}

export function resetRefDataCache() { cacheKey=null; cache=null; pending=null; }
