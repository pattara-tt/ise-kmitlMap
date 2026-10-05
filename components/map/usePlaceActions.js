"use client";

import { KMITL_ALL_NODES, KMITL_NODE_FLOOR } from "../mapConfig";
import { fetchPlaceInfo } from "./mapViewHelpers";

export function usePlaceActions({ 
  mapRef,
  setEventCard,
  setPlaceCard,
  setSearchOpen,
  ctx,
  setSearchQuery,
  setSTo,
  setRouteFormOpen,
  setKmitlFloor,
  setKmitlOpen,
  placeCard,
  setRouteSheetOpen
 }) {
  // 📚 ดึงข้อมูลสถานที่จาก Wikipedia อัตโนมัติ (ข้อความย่อ + รูปภาพ) — ลองภาษาไทยก่อน ถ้าไม่มีค่อย fallback เป็นอังกฤษ
  // ✏️ ใส่ข้อมูลสถานที่เอง — เช็คตารางนี้ก่อนเสมอ (key = ชื่อที่ขึ้นในช่องค้นหา/BUILDINGS registry) เพิ่ม entry ใหม่ตรงนี้ได้เลย
  
  // 📚 ดึงข้อมูลสถานที่ — เช็ค PLACE_INFO (ใส่เอง) ก่อนเสมอ ถ้าไม่มีค่อย fallback ไป OpenStreetMap/Nominatim (ไม่ใช้ Wikipedia แล้ว)
  
  // 🎪 เปิดการ์ดรายละเอียดกิจกรรม (ข้อมูลตามที่ฝ่ายประชาสัมพันธ์กรอกไว้)
  function openEventCard(ev) {
    setPlaceCard(null);
    setSearchOpen(false);
    setEventCard(ev);
    const map = mapRef.current;
    if (map && Number.isFinite(Number(ev.lat))) {
      map.setView([Number(ev.lat), Number(ev.lon)], Math.max(map.getZoom(), 18), {
        animate: true
      });
      setTimeout(() => map.panBy([0, 110], {
        animate: true
      }), 280);
    }
  }
  
  // 📍 ผู้ใช้เลือกสถานที่ปลายทางจากช่องค้นหา — แสดงการ์ดรายละเอียดกลางจอก่อน ยังไม่ขึ้นเส้นทางทันที (กด "นำทาง" ในการ์ดค่อยขึ้น)
  
  // 📍 ผู้ใช้เลือกสถานที่ปลายทางจากช่องค้นหา — แสดงการ์ดรายละเอียดกลางจอก่อน ยังไม่ขึ้นเส้นทางทันที (กด "นำทาง" ในการ์ดค่อยขึ้น)
  async function openPlaceCard(name, coord, meta = {}) {
    const routeNode = meta.nodeId ? KMITL_ALL_NODES[meta.nodeId] : null;
    const markerNode = meta.markerNodeId ? KMITL_ALL_NODES[meta.markerNodeId] : routeNode;
    const finalCoord = markerNode ? [markerNode.lon, markerNode.lat] : coord;
    if (!finalCoord || !Number.isFinite(finalCoord[0]) || !Number.isFinite(finalCoord[1])) {
      return;
    }
    ctx.current.placeCache[name] = {
      coord: routeNode ? [routeNode.lon, routeNode.lat] : finalCoord,
      markerCoord: finalCoord,
      name,
      nodeId: meta.nodeId || null,
      markerNodeId: meta.markerNodeId || null
    };
    setSearchQuery(name);
    setSTo(name);
    setSearchOpen(false);
    setRouteFormOpen(false);
    if (meta.nodeId) {
      setKmitlFloor(meta.floor || KMITL_NODE_FLOOR[meta.nodeId] || "1");
      setKmitlOpen(true);
    }
    const map = mapRef.current;
    if (map) {
      // เว้นพื้นที่ด้านล่างไว้ให้ bottom sheet แล้วเลื่อน node มาอยู่กลางพื้นที่แผนที่ที่ยังมองเห็น
      map.setView([finalCoord[1], finalCoord[0]], Math.max(map.getZoom(), meta.nodeId ? 20 : 18), {
        animate: true
      });
      setTimeout(() => map.panBy([0, 105], {
        animate: true
      }), 280);
    }
    const c = ctx.current;
    if (c.searchPlaceMarker && map) map.removeLayer(c.searchPlaceMarker);
    if (c.L && map) {
      c.searchPlaceMarker = c.L.marker([finalCoord[1], finalCoord[0]], {
        icon: c.L.divIcon({
          className: "",
          html: '<div style="width:18px;height:18px;background:#D93025;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 18]
        }),
        zIndexOffset: 1800
      }).addTo(map);
    }
    setPlaceCard({
      name,
      coord: finalCoord,
      nodeId: meta.nodeId || null,
      floor: meta.floor || null,
      icon: meta.icon || "📍",
      extract: meta.extract || null,
      image: meta.image || null,
      loading: !meta.extract,
      error: false
    });
    // ดึง PLACE_INFO แม้มี extract แล้ว เพื่อไม่ให้รูปสถานที่ที่แนบไว้ (เช่น SC8) หาย
    if (!meta.extract || !meta.image) {
      const info = await fetchPlaceInfo(name);
      setPlaceCard(prev => prev && prev.name === name ? {
        ...prev,
        // Indoor nodes already have an authoritative room/hover name.
        // Do not let generic place-info overwrite it (this caused "บ้านห่อง").
        name: prev.nodeId ? prev.name : (info?.title || prev.name),
        loading: false,
        extract: prev.extract || info?.extract || null,
        image: prev.image || info?.image || null,
        error: !info
      } : prev);
    }
  }
  
  function navigateFromCard() {
    if (!placeCard) return;
    setSTo(placeCard.name);
    // 🚪 ใช้พิกัดหน้าประตู (route node) สำหรับนำทางจริง — ไม่ใช่พิกัดกลางห้อง (placeCard.coord/marker) ที่ node ไม่มี edge เชื่อมเลย ทำให้หาเส้นทางไม่เจอ
    const routeNode = placeCard.nodeId ? KMITL_ALL_NODES[placeCard.nodeId] : null;
    const routeCoord = routeNode ? [routeNode.lon, routeNode.lat] : placeCard.coord;
    ctx.current.placeCache[placeCard.name] = {
      coord: routeCoord,
      name: placeCard.name,
      nodeId: placeCard.nodeId || null
    };
    setPlaceCard(null);
    setRouteFormOpen(true);
    setSearchOpen(true);
    setRouteSheetOpen(false);
  }
  
  // เปิดฟอร์มแจ้งปัญหาของสถานที่ที่กำลังเปิดการ์ดอยู่

  return { openEventCard, openPlaceCard, navigateFromCard };
}
