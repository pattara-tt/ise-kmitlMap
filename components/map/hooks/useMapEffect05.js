"use client";

import { useEffect } from "react";

export function useMapEffect05({ 
  CENTER,
  DEMO_BBOX,
  KMITL_ALL_NODES,
  KMITL_BOUNDS,
  KMITL_FLOOR1_EDGES,
  KMITL_FLOORS,
  KMITL_NODE_FLOOR,
  KMITL_OUTLINE,
  ZOOM,
  buildGraph,
  ctx,
  drawGoogleLikeBaseMap,
  fetchOSM,
  fetchWalkNet,
  getNodeType,
  hasThaiVoice,
  haversine,
  kmitlFloorRef,
  kmitlOpenRef,
  loadLeaflet,
  loadVoices,
  mapData,
  mapEl,
  mapRef,
  mergeIndoorGraph,
  queuedReverse,
  setCams,
  setKmitlOpen,
  setMapReady,
  setMapZoom,
  setRouteFormOpen,
  setSFrom,
  setSTo,
  setSearchOpen,
  setToilets,
  setVoiceLang
 }) {
  useEffect(() => {
    if (!mapData.data || mapData.loading || mapData.error || KMITL_BOUNDS.length < 2 || KMITL_OUTLINE.length < 3) return;
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || mapRef.current) return;
      ctx.current.L = L;
      loadVoices();
      try { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => { loadVoices(); if (!hasThaiVoice()) { ctx.current.voiceLang = "en"; setVoiceLang("en"); } }; } catch (e) {}
      setTimeout(() => { if (!hasThaiVoice()) { ctx.current.voiceLang = "en"; setVoiceLang("en"); } }, 800);
      const map = L.map(mapEl.current, { zoomControl: false }).setView(CENTER, ZOOM);
      mapRef.current = map;
      setMapZoom(map.getZoom());
      setMapReady(true);
      // 🏢 เลนแยกสำหรับผัง SVG ตึก — z-index ต่ำกว่า overlayPane เริ่มต้น (400) ที่เส้นทางเดินใช้อยู่
      map.createPane("bdiFloorPane");
      map.getPane("bdiFloorPane").style.zIndex = 350;
      // Full basemap tiles (CARTO when configured; OSM fallback) under SciMap overlays
      drawGoogleLikeBaseMap(L, map, DEMO_BBOX).then((layers) => {
        if (layers) ctx.current.googleLikeBase = layers;
      }).catch(() => {});
      // 📍 ระบุตำแหน่งผู้ใช้ทันทีตอนเปิดแอป
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || !mapRef.current) return;
            const lon = pos.coords.longitude, lat = pos.coords.latitude;
            ctx.current.myLocation = [lon, lat];
            if (!ctx.current.myLocMarker) {
              ctx.current.myLocMarker = L.marker([lat, lon], {
                icon: L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#1A73E8;border:3px solid #fff;box-shadow:0 1px 8px rgba(26,115,232,.65)"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
                zIndexOffset: 900,
              }).bindPopup("ตำแหน่งของฉัน").addTo(mapRef.current);
            } else {
              ctx.current.myLocMarker.setLatLng([lat, lon]);
            }
            if (!ctx.current.routeKey) mapRef.current.setView([lat, lon], Math.max(mapRef.current.getZoom(), 16), { animate: true });
          },
          () => { /* ผู้ใช้ไม่อนุญาต/หา GPS ไม่เจอ — เงียบไว้ ใช้ศูนย์กลางย่าน demo ต่อไปตามเดิม */ },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
      // เลเยอร์คุมผ่าน "chips" (ทางเชื่อม/skywalk, ห้องน้ำ) — ตัด Street light chip/lamp system ออกแล้ว
      const toiletsLayer = L.layerGroup();
      const crossLayer = L.layerGroup();
      const routeLayer = L.layerGroup().addTo(map);
  
      // 🏢 เปิดผังตึกได้ทีละอันเดียว (ตอนนี้มีแค่ KMITL — ฟังก์ชันนี้เตรียมไว้รองรับเพิ่มตึกใหม่ในอนาคต)
      ctx.current.openOnly = (which) => {
        setKmitlOpen(which === "kmitl");
      };
      // 🏢 แสดงปุ่มเลือกชั้นอัตโนมัติ เมื่อ SVG/อาคารอยู่บริเวณกึ่งกลางหน้าจอ
      ctx.current.updateCenteredBuilding = () => {
        if (!map || ctx.current.navActive || ctx.current.kmitlCalibrateActive) return;
        if (map.getZoom() < 16) { ctx.current.openOnly(null); return; }
        const center = map.getCenter();
        const lat = center.lat, lng = center.lng;
  
        const currentFloorObj = KMITL_FLOORS.find(f => f.id === (kmitlFloorRef.current || "1")) || KMITL_FLOORS[0];
        const activeBounds = currentFloorObj.bounds || KMITL_BOUNDS;
        const kmitlBoundsL = L.latLngBounds(activeBounds).pad(0.12);
  
        if (pipTH(lat, lng, KMITL_OUTLINE) || kmitlBoundsL.contains(center)) return ctx.current.openOnly("kmitl");
        ctx.current.openOnly(null);
      };
      // point-in-polygon แบบเดียวกับที่ mapGeo ใช้ (pip อยู่ใน mapGeo แต่ export เป็น (x,y,ring) ไม่ใช่ (lat,lng,ring) — ห่อไว้ให้ตรงลำดับ)
      function pipTH(lat, lng, ring) {
        let c = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
          if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) c = !c;
        }
        return c;
      }
      map.on("moveend zoomend", ctx.current.updateCenteredBuilding);
      setTimeout(() => ctx.current.updateCenteredBuilding?.(), 0);
  
      // 📍 แตะที่แผนที่เพื่อปักหมุด แล้วเลือกว่าจะตั้งเป็นต้นทาง/ปลายทาง (แบบแอปแผนที่ทั่วไป)
      map.on("click", (e) => {
        if (ctx.current.navActive || ctx.current.kmitlCalibrateActive) return;
        const { lat, lng } = e.latlng;
        // 📍 โหมดปักหมุด node บนผังตึก — แตะแล้วปักหมุดพร้อมประเภทที่เลือกไว้
        if (ctx.current.kmitlNodeModeActive) { ctx.current.kmitlAddNode?.(lat, lng); return; }
  
        if (ctx.current.pinMarker) map.removeLayer(ctx.current.pinMarker);
        //  แตะขณะเปิดผังตึกอยู่ + แตะโดนตัวตึกจริง → สแนปไปที่ node ในชั้นที่กำลังเปิดดูอยู่
        let snapLat = lat, snapLng = lng;
        //  เฉพาะ node ที่มี edge เชื่อมอยู่จริง (กันสแนปไปโดน node กลางห้อง/จุดลอยที่ไม่ได้ต่อกราฟ เดินนำทางไปไม่ได้)
        const connectedNodeIds = new Set(KMITL_FLOOR1_EDGES.flatMap(([a, b]) => [a, b]));
        const nearestInFloor = (nodesObj, maxM = 80) => {
          let bestId = null, bestD = maxM;
          for (const id in nodesObj) {
            if (!connectedNodeIds.has(id)) continue; // ข้าม node ที่ไม่มี edge เชื่อมเลย
            const n = nodesObj[id];
            const d = haversine([lng, lat], [n.lon, n.lat]);
            if (d < bestD) { bestD = d; bestId = id; }
          }
          return bestId ? { id: bestId, ...nodesObj[bestId] } : null;
        };
        let snapNode = null; // 🏢 node จริงที่สแนปติด (ถ้ามี) — ใช้ตั้งชื่อป้ายจาก label ของ node เองแทนการ reverse-geocode
        if (kmitlOpenRef.current && pipTH(lat, lng, KMITL_OUTLINE)) {
          const floorNodes = Object.fromEntries(Object.keys(KMITL_ALL_NODES).filter((id) => KMITL_NODE_FLOOR[id] === kmitlFloorRef.current).map((id) => [id, KMITL_ALL_NODES[id]]));
          const near = nearestInFloor(floorNodes);
          if (near) { snapLat = near.lat; snapLng = near.lon; snapNode = near; }
        }
        ctx.current.pinMarker = L.marker([snapLat, snapLng], {
          icon: L.divIcon({ className: "", html: '<div style="width:14px;height:14px;background:#D93025;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>', iconSize: [14, 14], iconAnchor: [7, 14] }),
        }).addTo(map);
        const box = document.createElement("div");
        box.style.cssText = "display:flex;flex-direction:column;gap:6px;min-width:160px";
        const mk = (txt, bg) => { const b = document.createElement("button"); b.textContent = txt; b.style.cssText = `padding:8px 10px;border:none;border-radius:8px;background:${bg};color:#fff;font-weight:700;cursor:pointer;font-size:13px`; return b; };
        const btnFrom = mk("⦿ ตั้งเป็นต้นทาง", "#1A73E8");
        const btnTo = mk("📍 ตั้งเป็นปลายทาง", "#188038");
        box.appendChild(btnFrom); box.appendChild(btnTo);
        const setPin = (setter) => async () => {
          map.closePopup();
          let label;
          if (snapNode) {
            // 🏢 สแนปติด node ในตึก — ใช้ label ของ node เอง (ไม่ reverse-geocode กันได้ชื่อซ้ำกันทั้งต้นทาง/ปลายทาง)
            const t = getNodeType(snapNode.type);
            label = snapNode.label || `${t ? t.label : snapNode.type} · ${snapNode.id}`;
          } else {
            label = `หมุด ${snapLat.toFixed(5)},${snapLng.toFixed(5)}`;
            try { const g = await queuedReverse([snapLng, snapLat]); if (g && (g.place || g.road)) label = g.place || g.road; } catch (err) {}
          }
          ctx.current.placeCache[label] = { coord: [snapLng, snapLat], name: label };
          setter(label);
          // 📍 ปักหมุดเลือกต้นทาง/ปลายทางแล้ว → ข้ามหน้าค้นหาสถานที่ ไปแถบสองช่อง (ต้นทาง/ปลายทาง) ตรงๆ เลย
          setSearchOpen(true);
          setRouteFormOpen(true);
        };
        btnFrom.onclick = setPin(setSFrom);
        btnTo.onclick = setPin(setSTo);
        L.popup({ closeButton: true, offset: [0, -8] }).setLatLng([snapLat, snapLng]).setContent(box).openOn(map);
      });
  
      // 🏢 พื้นที่ตึก Sc8 — กดบริเวณ SVG ของอาคารเพื่อเปิดผังและปุ่มเลือกชั้น
      ctx.current.kmitlFlash = () => {
        const hit = ctx.current.kmitlRect;
        if (hit) {
          hit.setStyle({ fill: true, fillColor: "#ffffff", fillOpacity: 0.72 });
          setTimeout(() => hit.setStyle({ fill: false, fillOpacity: 0 }), 220);
        }
        setTimeout(() => { ctx.current.openOnly("kmitl"); }, 230);
      };
      const kmitlRect = L.polygon(KMITL_OUTLINE, { stroke: false, fill: false, interactive: true })
        .on("click", (e) => { L.DomEvent.stopPropagation(e); ctx.current.kmitlFlash(); })
        .addTo(map);
      kmitlRect.getElement()?.style && (kmitlRect.getElement().style.cursor = "pointer");
      ctx.current.kmitlRect = kmitlRect;
  
      map.on("zoomend moveend", () => {
        const z = map.getZoom();
        setMapZoom(z);
        if (z < 15) ctx.current.openOnly(null);
      });
      ctx.current.routeLayer = routeLayer;
      ctx.current.layers = { toilets: toiletsLayer, cross: crossLayer };
      const crossIcon = L.divIcon({ className: "", html: '<div class="bdi-cross-ic"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
      ctx.current.crossSeen = new Set();
      ctx.current.addCrossMarkers = (pts) => {
        for (const p of (pts || [])) {
          const k = p[0].toFixed(5) + "," + p[1].toFixed(5);
          if (ctx.current.crossSeen.has(k)) continue;
          ctx.current.crossSeen.add(k);
          L.marker([p[1], p[0]], { icon: crossIcon }).bindPopup("ทางข้าม/ทางม้าลาย (OSM)").addTo(crossLayer);
        }
      };
      // Skywalk / ทางเชื่อมมีหลังคา (จาก OSM coveredWays) → เส้นเขียวบน chip ทางเชื่อม
      ctx.current.skySeen = new Set();
      ctx.current.addSkywalks = (ways) => {
        for (const line of (ways || [])) {
          if (!line || line.length < 2) continue;
          const k = line[0][0].toFixed(5) + "," + line[0][1].toFixed(5) + "|" + line.length;
          if (ctx.current.skySeen.has(k)) continue;
          ctx.current.skySeen.add(k);
          L.polyline(line.map(([lon, lat]) => [lat, lon]), { color: "#4285F4", weight: 4, opacity: 0.75, dashArray: "8 7", lineCap: "round" }).bindPopup("Skywalk / ทางเดินมีหลังคา (OSM)").addTo(crossLayer);
        }
      };
  
      // Base tile layer already includes parks/green areas; do not duplicate the old Overpass geometry.
  
      // แผนผังตึกโชว์เฉพาะตอนซูมใกล้พอ (≥16)
      ctx.current.updateIndoor = () => {
        const m = mapRef.current; if (!m || !ctx.current.indoorLayer) return;
        if (ctx.current.indoorOn && m.getZoom() >= 16) ctx.current.indoorLayer.addTo(m);
        else m.removeLayer(ctx.current.indoorLayer);
      };
      map.on("zoomend", () => ctx.current.updateIndoor?.());
  
      const toiletIcon = L.divIcon({ className: "", html: '<div style="font-size:12px;line-height:18px;background:#2a9d8f;color:white;border-radius:50%;width:18px;height:18px;text-align:center;font-weight:700">W</div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      ctx.current.toiletSeen = new Set(); ctx.current.camSeen = new Set();
      ctx.current.problems = [];
      // 🏢🌳 สร้างกราฟทางเท้ากลางแจ้งแล้ว merge กราฟในตึก (ทางเดิน/บันได/ลิฟต์/จุดเชื่อมออกนอกตึก) เข้าไปด้วยเสมอ
      ctx.current.setWalkNet = (ways) => { ctx.current.walkNet = mergeIndoorGraph(buildGraph(ways, ctx.current.bldgs, ctx.current.skywalkWays)); };
      ctx.current.osmToilets = []; ctx.current.osmCameras = [];
      ctx.current.addOsmMarkers = (osm) => {
        if (!osm) return;
        for (const t of (osm.toilets || [])) { const [lon, lat] = t.pt; const k = lon.toFixed(5) + "," + lat.toFixed(5); if (ctx.current.toiletSeen.has(k)) continue; ctx.current.toiletSeen.add(k); ctx.current.osmToilets.push(t); const name = t.tags?.name || t.tags?.["name:th"] || "ห้องน้ำสาธารณะ"; L.marker([lat, lon], { icon: toiletIcon }).bindPopup(`<b>ห้องน้ำ: ${name}</b>`).addTo(toiletsLayer); }
        setToilets(ctx.current.toiletSeen.size); setCams(ctx.current.camSeen.size);
      };
  
      // ความสูงตึกจริง (ใช้กันเส้นทางลัดทะลุตึก — ไม่เกี่ยวกับร่ม/เงาอีกต่อไป)
      (async () => {
        try {
          const r = await fetch("/data/walkbkk_heights_2023.geojson");
          if (!r.ok) return;
          const gj = await r.json();
          const bl = [];
          for (const f of gj.features || []) {
            const g = f.geometry; if (!g) continue;
            const h = (f.properties && (f.properties.height || f.properties.height_mean)) || 12;
            const rings = g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((cc) => cc[0]) : [];
            for (const ring of rings) if (ring && ring.length >= 4) bl.push({ ring, h });
          }
          ctx.current.bldgs = bl;
          if (ctx.current.walkNetWays) { ctx.current.setWalkNet(ctx.current.walkNetWays); ctx.current.refresh?.(ctx.current.lastOsm || null, false); }
        } catch (e) {}
      })();
  
      // โหลดโครงข่ายทางเท้า OSM มาสร้างกราฟสำหรับ routing (cache ใน localStorage)
      fetchWalkNet(DEMO_BBOX).then((d) => {
        if (cancelled || !d) return;
        ctx.current.walkNetWays = d.ways;
        ctx.current.setWalkNet(d.ways);
        ctx.current.refresh?.(ctx.current.lastOsm || null, false);
      }).catch(() => {});
      ctx.current.osmPromise = fetchOSM(DEMO_BBOX).then((osm) => {
        if (cancelled) return osm;
        ctx.current.addOsmMarkers(osm); ctx.current.crossings = osm.crossings || [];
        ctx.current.addCrossMarkers?.(osm.crossings);
        ctx.current.addSkywalks?.(osm.coveredWays);
        if (osm.coveredWays && osm.coveredWays.length) {
          const merged = (ctx.current.walkNetWays || []).concat(osm.coveredWays);
          ctx.current.walkNetWays = merged;
          ctx.current.skywalkWays = osm.coveredWays;
          ctx.current.setWalkNet(merged);
          ctx.current.refresh?.(osm, false);
        }
        return osm;
      });
  
    })();
    return () => { cancelled = true; setMapReady(false); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [mapData.data, mapData.loading, mapData.error]);
}