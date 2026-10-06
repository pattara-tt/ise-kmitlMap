"use client";

import { useEffect } from "react";

export function useMapEffect16({ 
  DEMO_BBOX,
  KMITL_ALL_NODES,
  KMITL_EXTERIOR_LINKS,
  KMITL_NODE_FLOOR,
  apiRef,
  buildingIndex,
  ctx,
  fetchOSM,
  geocodeNominatim,
  graphRoute,
  haversine,
  kmitlFloorRef,
  mapRef,
  pickRoutes,
  queuedReverse,
  resolvePlace,
  routeSegments,
  scoreRoutes,
  setActive,
  setKmitlFloor,
  setKmitlOpen,
  setRouteData
 }) {
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      showRoutes: async (from, to) => {
        const c = ctx.current, L = c.L; if (!L) return null;
        const key = `${from || ""}|${to || ""}`;
        if (c.routeKey === key && c.scored) { c.select(c.best); return c.scored; }
        c.routeLayer.clearLayers(); setRouteData({ loading: true });
        c.indoorOn = false; c.updateIndoor?.();
        let sName = "Sc8", eName = "สถานีแอร์พอร์ตลิงก์ลาดกระบัง", sCoord = null, eCoord = null, note = null;
        if (!from && c.myLocation) { sCoord = c.myLocation; sName = "ตำแหน่งของฉัน"; }
        const resolve = async (x) => { if (!x) return null; const pc = c.placeCache && c.placeCache[x]; if (pc) return pc; return (await resolvePlace(x)) || (await geocodeNominatim(x)); };
        const [gFrom, gTo] = await Promise.all([resolve(from), resolve(to)]);
        if (from) { if (gFrom) { sCoord = gFrom.coord; sName = gFrom.name; } else note = `หา "${from}" ไม่เจอ (ใช้ สจล. แทน) — ลองพิมพ์ชื่อให้ชัดขึ้น`; }
        if (to) { if (gTo) { eCoord = gTo.coord; eName = gTo.name; } else note = (note ? note + " · " : "") + `หา "${to}" ไม่เจอ (ใช้สถานีแอร์พอร์ตลิงก์ลาดกระบังแทน)`; }
        // ใช้ graphRoute (Dijkstra บนกราฟ OSM + กราฟในตึกทั้งหมด) เป็นแหล่งเดียว — ไม่มี ORS/`/api/route` แล้ว
        const DEF_START = [100.780099, 13.729721]; // Sc8
        const DEF_END = [100.7469, 13.7229]; // สถานีแอร์พอร์ตเรลลิงก์ลาดกระบัง
        const start = sCoord || DEF_START;
        const end = eCoord || DEF_END;
        const routes = []; // ไม่มีเส้นทางสำเร็จรูป — c.refresh ด้านล่างจะคำนวณจาก graphRoute
        c.baseRoutes = routes; c.lastStart = start; c.lastEnd = end; c.sName = sName; c.eName = eName; c.note = note; c.lastOsm = null;
        c.routeKey = key;
        const pinIcon = (letter, bg, tag, glow) => L.divIcon({
          className: "",
          html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 5px rgba(0,0,0,.6))">
            <div style="background:${bg};color:#fff;font-weight:800;font-size:10.5px;letter-spacing:.5px;padding:2px 9px;border-radius:999px;white-space:nowrap;border:1.5px solid #fff;margin-bottom:2px">${tag}</div>
            <div style="background:${bg};color:#fff;border:3px solid #fff;border-radius:50%;width:32px;height:32px;display:grid;place-items:center;font-weight:800;font-size:16px;line-height:1;box-shadow:0 0 0 4px ${glow}">${letter}</div>
            <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #fff;margin-top:-1px"></div>
          </div>`,
          iconSize: [80, 68], iconAnchor: [40, 64],
        });
        c.redrawRoutes = (cands) => {
          c.routeLayer.clearLayers();
          const bc = (cands[c.best] && cands[c.best].coordinates) || [[start[0], start[1]], [end[0], end[1]]];
          const anchor = (searched, pt) => (!searched || haversine(searched, pt) <= 60) ? pt : searched;
          const sPt = anchor(c.lastStart, bc[0]), ePt = anchor(c.lastEnd, bc[bc.length - 1]);
          const connectPin = (pin, pt) => { if (haversine(pin, pt) > 25) L.polyline([[pin[1], pin[0]], [pt[1], pt[0]]], { color: "#AECBFA", weight: 3, opacity: 0.7, dashArray: "3 7" }).addTo(c.routeLayer); };
          connectPin(sPt, bc[0]); connectPin(ePt, bc[bc.length - 1]);
          L.marker([sPt[1], sPt[0]], { icon: pinIcon("S", "#16a34a", "จุดเริ่ม", "rgba(22,163,74,.35)"), zIndexOffset: 1000 }).bindPopup("จุดเริ่ม: " + sName).addTo(c.routeLayer);
          L.marker([ePt[1], ePt[0]], { icon: pinIcon("E", "#dc2626", "ปลายทาง", "rgba(220,38,38,.35)"), zIndexOffset: 1000 }).bindPopup("ปลายทาง: " + eName).addTo(c.routeLayer);
          c.polylines = cands.map((r) => L.polyline(r.coordinates.map(([lon, lat]) => [lat, lon]), { color: "#9AA0A6", weight: 5, opacity: 0.72, dashArray: "8 8", lineCap: "round" }).addTo(c.routeLayer));
          c.select = (i) => {
            c.polylines.forEach((pl, j) => {
              if (j === i) pl.setStyle({ color: "#1A73E8", weight: 7, opacity: 0, lineCap: "round", lineJoin: "round", dashArray: null }).bringToFront();
              else pl.setStyle({ color: "#8AB4F8", weight: 5, opacity: 0.62, dashArray: "7 8", lineCap: "round", lineJoin: "round" });
            });
            // 🎨 เส้นทางที่เลือก = สีตามหมวด "ในตึก/นอกตึก" ล้วนๆ (ตัดร่ม/แดด/ไฟออกแล้ว)
            if (c.segLayer) c.routeLayer.removeLayer(c.segLayer);
            c.segLayer = L.layerGroup();
            const bIdx = buildingIndex(c.bldgs);
            const segs = routeSegments(cands[i].coordinates, cands[i].nodeKeys, bIdx);
            const SEGMENT_LABELS = { indoor: "🔵 ทางเดินในอาคาร", outdoor: "🟢 ทางเดินนอกอาคาร" };
            for (const seg of segs) {
              if (seg.coordinates.length < 2) continue;
              const latlngs = seg.coordinates.map(([lon, lat]) => [lat, lon]);
              // 🔵⚪ เส้นนำทางแบบจุด: วาดซ้อน 2 ชั้น — ชั้นขาวหนากว่าเป็นขอบ + ชั้นฟ้าบางกว่าทับด้านบน ให้ดูเป็นจุดกลมสีฟ้าขอบขาว
              L.polyline(latlngs, { color: "#FFFFFF", weight: 11, opacity: 1, dashArray: "1 14", lineCap: "round", lineJoin: "round" }).addTo(c.segLayer);
              L.polyline(latlngs, { color: "#1A73E8", weight: 7, opacity: 1, dashArray: "1 14", lineCap: "round", lineJoin: "round" })
                .bindPopup(SEGMENT_LABELS[seg.cat] || seg.cat)
                .addTo(c.segLayer);
            }
            c.segLayer.addTo(c.routeLayer);
  
            // 🏢🟣 จุดเปลี่ยนชั้น (escalator/lift) + จางเส้นทางชั้นที่ไม่ตรงกับชั้นที่กำลังดูอยู่
            const BLDG_CFG = {
              kmitl: { nodes: KMITL_ALL_NODES, floorOf: KMITL_NODE_FLOOR, doorIds: new Set(KMITL_EXTERIOR_LINKS.map((e) => e.node)), floorRef: kmitlFloorRef, setFloor: setKmitlFloor, setOpen: setKmitlOpen },
            };
            const nk = cands[i].nodeKeys || [];
            const info = nk.map((k) => {
              if (!k) return null;
              const m = /^IN:([^:]+):(.+)$/.exec(k);
              if (!m) return null;
              const [, bldg, id] = m;
              const cfg = BLDG_CFG[bldg];
              const n = cfg && cfg.nodes[id];
              if (!cfg || !n) return null;
              return { bldg, id, floor: cfg.floorOf[id] || null, type: n.type, label: n.label, isDoor: cfg.doorIds.has(id) };
            });
            const searchKey = c.lastStart + "|" + c.lastEnd;
            if (c.lastEntranceKey !== searchKey) {
              const seenBldg = new Set();
              for (const it of info) {
                if (!it || !it.floor || seenBldg.has(it.bldg)) continue;
                seenBldg.add(it.bldg);
                const cfg = BLDG_CFG[it.bldg];
                cfg.setFloor(it.floor); cfg.setOpen(true); cfg.floorRef.current = it.floor;
              }
              c.lastEntranceKey = searchKey;
            }
            c.drawFloorOverlay = () => {
              if (c.floorLayer) c.routeLayer.removeLayer(c.floorLayer);
              c.floorLayer = L.layerGroup();
              const curOf = (bldg) => BLDG_CFG[bldg]?.floorRef.current;
              const coordsArr = cands[i].coordinates;
              let runStart = null;
              for (let idx = 0; idx <= coordsArr.length; idx++) {
                const it = idx < coordsArr.length ? info[idx] : null;
                const dim = it && it.floor && it.floor !== curOf(it.bldg);
                if (dim && runStart == null) runStart = idx;
                if (!dim && runStart != null) {
                  const pts = coordsArr.slice(runStart, idx + 1);
                  if (pts.length >= 2) L.polyline(pts.map(([lon, lat]) => [lat, lon]), { color: "#fff", weight: 7, opacity: 0.55, lineCap: "round", lineJoin: "round" }).addTo(c.floorLayer);
                  runStart = null;
                }
              }
              for (let idx = 0; idx < coordsArr.length; idx++) {
                const it = info[idx];
                if (!it || !(it.type === "escalator" || it.type === "lift" || it.isDoor)) continue;
                const [lon, lat] = coordsArr[idx];
                L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 2, fillColor: "#8E24AA", fillOpacity: 0.95, pane: "bdiFloorPane" })
                  .bindPopup(`${it.label || it.id}${it.floor ? " · ชั้น " + it.floor : ""}`)
                  .addTo(c.floorLayer);
              }
              c.floorLayer.addTo(c.routeLayer);
            };
            c.drawFloorOverlay();
            c.indoorOn = !!cands[i]?.skywalk; c.updateIndoor?.();
            setActive(i);
          };
        };
        // คำนวณ candidates + คะแนน + วาด (นำทางปกติ — ไม่มีเวลา/ร่ม/สว่างอีกต่อไป)
        c.refresh = (osm, fit) => {
          const cands = c.baseRoutes.map((r, i) => ({ ...r, index: i }));
          const g = c.walkNet ? graphRoute(c.walkNet, c.lastStart, c.lastEnd) : null;
          if (g) { g.index = cands.length; cands.push(g); }
          if (!cands.length) {
            setRouteData({ error: "กำลังเตรียมข้อมูลแผนที่ ลองใหม่อีกครั้งในสักครู่" });
            return [];
          }
          const scored = scoreRoutes(cands, osm || { ok: false, trees: [], green: [], toilets: [], cameras: [] });
          const picks = pickRoutes(scored);
          c.picks = picks;
          const best = picks.fastIdx;
          c.best = best; c.scored = scored.map((r, i) => ({ ...r, recommended: i === best }));
          c.redrawRoutes(cands);
          c.select(best);
          if (fit && mapRef.current && c.polylines[best]) mapRef.current.fitBounds(c.polylines[best].getBounds().pad(0.15));
          setRouteData({ routes: scored, best, picks, graphOk: !!g, osmOk: !!(osm && osm.ok), startName: c.sName, endName: c.eName, note: c.note, scoring: !osm });
          return scored;
        };
        c.refresh(null, true);
        let lons = [], lats = []; routes.forEach((r) => r.coordinates.forEach(([lo, la]) => { lons.push(lo); lats.push(la); }));
        const within = lats.length && Math.min(...lats) >= DEMO_BBOX[0] && Math.min(...lons) >= DEMO_BBOX[1] && Math.max(...lats) <= DEMO_BBOX[2] && Math.max(...lons) <= DEMO_BBOX[3];
        const mg = 0.004;
        const lo0 = Math.min(start[0], end[0]), la0 = Math.min(start[1], end[1]), lo1 = Math.max(start[0], end[0]), la1 = Math.max(start[1], end[1]);
        (async () => {
          const osm = within ? await c.osmPromise : await fetchOSM([la0 - mg, lo0 - mg, la1 + mg, lo1 + mg]);
          if (c.routeKey !== key) return;
          if (osm.crossings && osm.crossings.length) { c.crossings = osm.crossings; c.addCrossMarkers?.(osm.crossings); }
          c.addSkywalks?.(osm.coveredWays);
          if (c.addOsmMarkers) c.addOsmMarkers(osm);
          c.lastOsm = osm;
          const full = c.refresh(osm, false);
          (async () => {
            const seen = {};
            for (const r of full) {
              for (const t of (r.toiletsNearby || [])) {
                if (!t.pt) continue;
                const kk = t.pt.map((x) => x.toFixed(5)).join(",");
                if (!(kk in seen)) seen[kk] = await queuedReverse(t.pt);
                if (c.routeKey !== key) return;
                const g = seen[kk];
                if (g) { if (g.place) t.place = g.place; if (!t.road && g.road) t.road = g.road; }
              }
            }
            c.scored = full.map((r, i) => ({ ...r, recommended: i === c.best }));
          })();
        })();
        return c.scored;
      },
      getRoutes: () => ctx.current.scored,
    };
  }, [apiRef]);
}
