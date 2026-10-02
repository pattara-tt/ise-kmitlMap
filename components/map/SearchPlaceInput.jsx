"use client";

import { useRef, useState } from "react";
import { KMITL_ALL_NODES, KMITL_NODE_FLOOR } from "../mapConfig";
import { suggestPlaces } from "../mapGeo";

const normalizeSearch = text => String(text || "").trim().toLowerCase().replace(/\s+/g, "");

// กิจกรรมที่ยังไม่สิ้นสุด ถึงจะขึ้นบนแผนที่

export default function SearchPlaceInput({
  value,
  onChange,
  onPick,
  placeholder,
  rooms = [],
  searchNodes = []
}) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const buildNodeItems = text => {
    const q = normalizeSearch(text);
    if (q.length < 1) return [];
    const roomByNodeId = new Map(rooms.map(room => [room.nodeId, room]));
    return searchNodes.flatMap(entry => {
      const room = roomByNodeId.get(entry.internalId || entry.id);
      const displayName = room?.name || entry.name;
      // node ที่ใช้คำนวณเส้นทาง เช่น จุดหน้าประตู
      const routeNode = KMITL_ALL_NODES[entry.id];

      // node ที่ใช้แสดงหมุด เช่น จุดกลางห้อง
      const markerNode = KMITL_ALL_NODES[entry.markerId || entry.id];
      if (!routeNode || !markerNode || !Number.isFinite(routeNode.lat) || !Number.isFinite(routeNode.lon) || !Number.isFinite(markerNode.lat) || !Number.isFinite(markerNode.lon)) {
        return [];
      }
      const words = [displayName, entry.name, entry.id, routeNode.label, markerNode.label, ...(entry.aliases || [])].filter(Boolean);
      const matched = words.some(word => {
        const normalizedWord = normalizeSearch(word);
        return normalizedWord.includes(q) || q.includes(normalizedWord);
      });
      if (!matched) return [];
      return [{
        name: displayName,
        // ใช้พิกัดกลางห้องสำหรับแสดงหมุด
        coord: [markerNode.lon, markerNode.lat],
        src: "indoor-node",
        // node ประตูสำหรับนำทาง
        nodeId: entry.id,
        routeNodeId: entry.id,
        // node กลางห้องสำหรับแสดงผล
        markerNodeId: entry.markerId || entry.id,
        floor: KMITL_NODE_FLOOR[entry.id] || "1",
        extract: entry.extract,
        icon: entry.icon
      }];
    });
  };
  const handleChange = next => {
    onChange(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    const local = buildNodeItems(next);
    setItems(local);
    setOpen(Boolean(next.trim()) && local.length > 0);
    if (next.trim().length < 2) return;
    timerRef.current = setTimeout(async () => {
      try {
        const remote = await suggestPlaces(next);
        const merged = [...local];
        for (const item of remote || []) {
          if (!merged.some(x => x.name === item.name)) merged.push(item);
        }
        setItems(merged.slice(0, 8));
        setOpen(merged.length > 0);
      } catch (e) {}
    }, 250);
  };
  const choose = item => {
    onChange(item.name);
    setOpen(false);
    onPick(item);
  };
  return <div style={{
    position: "relative"
  }}>
      <input value={value} onChange={e => handleChange(e.target.value)} onFocus={() => items.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)} onKeyDown={e => {
      if (e.key === "Enter" && items[0]) {
        e.preventDefault();
        choose(items[0]);
      }
    }} placeholder={placeholder} style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #DADCE0",
      background: "#fff",
      color: "#202124",
      fontSize: 16,
      outline: "none"
    }} />
      {open ? <div style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      right: 0,
      zIndex: 2600,
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 4px 18px rgba(60,64,67,.28)",
      overflow: "hidden"
    }}>
          {items.map((item, index) => <button type="button" key={`${item.src || "place"}-${item.nodeId || item.name}-${index}`} onMouseDown={e => e.preventDefault()} onClick={() => choose(item)} style={{
        width: "100%",
        border: 0,
        borderBottom: index === items.length - 1 ? 0 : "1px solid #ECEFF1",
        background: "#fff",
        padding: "11px 13px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
              <span style={{
          fontSize: 18
        }}>{item.icon || "📍"}</span>
              <span style={{
          flex: 1,
          minWidth: 0
        }}>
                <span style={{
            display: "block",
            color: "#202124",
            fontWeight: 700,
            fontSize: 14
          }}>{item.name}</span>
                <span style={{
            display: "block",
            color: "#5F6368",
            fontSize: 11.5,
            marginTop: 2
          }}>{item.src === "event" ? `กิจกรรม · ${item.subtitle || ""}` : item.nodeId ? `ชั้น ${item.floor} · ${item.nodeId}` : item.src === "osm" ? "OSM" : "สถานที่"}</span>
              </span>
            </button>)}
        </div> : null}
    </div>;
}
