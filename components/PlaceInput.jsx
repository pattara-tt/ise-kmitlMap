"use client";

// 🔎 ช่องค้นหาสถานที่พร้อม autocomplete (แลนด์มาร์กยอดนิยมในเครื่อง + ผลจาก OSM)
import { useState, useRef } from "react";
import { LANDMARKS, suggestPlaces } from "./mapGeo";

export default function PlaceInput({ value, onChange, onPick, onEnter, placeholder, searchNodes = [] }) {
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);
  const tRef = useRef(null);
  const requestRef = useRef(0);
  function handle(v) {
    onChange(v);
    const ss = String(v || "").trim().toLowerCase().replace(/\s+/g, "");
    const request = ++requestRef.current;
    if (tRef.current) clearTimeout(tRef.current);
    if (!ss) { setSugs([]); setOpen(false); return; }
    // GIS/Registrar nodes use their latest coordinates from PostgreSQL.
    const indoor = searchNodes.filter((entry) => {
      const words = [entry.name, entry.id, ...(entry.aliases || [])];
      return words.some((word) => String(word || "").toLowerCase().replace(/\s+/g, "").includes(ss));
    }).filter((entry) => Array.isArray(entry.coord) && entry.coord.every(Number.isFinite))
      .map((entry) => ({
        name: entry.name,
        coord: entry.markerCoord || entry.coord,
        nodeId: entry.id,
        floor: entry.floor,
        src: "indoor-node",
      }));
    const landmarks = LANDMARKS.filter((lm) => lm.aliases.some((a) => a.toLowerCase().replace(/\s+/g, "").includes(ss)))
      .map((lm) => ({ name: lm.name, coord: lm.coord, src: "landmark", lm }));
    const local = [...indoor, ...landmarks].slice(0, 8);
    setSugs(local);
    setOpen(local.length > 0);
    if (ss.length < 2) return;
    tRef.current = setTimeout(async () => {
      try {
        const remote = await suggestPlaces(v);
        if (request !== requestRef.current) return;
        const merged = [...local];
        for (const item of remote || []) {
          if (!merged.some((existing) => existing.name === item.name)) merged.push(item);
        }
        setSugs(merged.slice(0, 8));
        setOpen(merged.length > 0);
      } catch (error) {
        // Keep database results available when the external search fails.
      }
    }, 250);
  }
  const istyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--bdi-line)", background: "#FFFFFF", color: "#202124", fontSize: 16, outline: "none" };
  return (
    <div style={{ position: "relative" }}>
      <input value={value} onChange={(e) => handle(e.target.value)} onFocus={() => { if (sugs.length) setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 160)}
        onKeyDown={(e) => { if (e.key === "Enter") { setOpen(false); onEnter && onEnter(); } }} placeholder={placeholder} style={istyle} />
      {open ? (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bdi-surface-2)", border: "1px solid var(--bdi-line)", borderRadius: 12, boxShadow: "0 2px 10px rgba(60,64,67,.28)", zIndex: 1400, maxHeight: 240, overflowY: "auto", marginTop: 2 }}>
          {sugs.map((sg, i) => (
            <div key={i} className="sm-suggest-item" onMouseDown={() => { onPick(sg); setOpen(false); }}
              style={{ padding: "9px 11px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid var(--bdi-line)", display: "flex", justifyContent: "space-between", gap: 8, color: "#202124" }}>
              <span>{sg.name}</span><span style={{ fontSize: 11, color: "var(--bdi-text-dim)" }}>{sg.src === "indoor-node" ? `ชั้น ${sg.floor || "1"}` : sg.src === "landmark" ? "⭐ ที่นิยม" : "OSM"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}