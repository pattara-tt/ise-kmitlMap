"use client";

import BuildingFloorPickerLayout from "./building/BuildingFloorPickerLayout";
import { useBuildingSearch } from "./building/useBuildingSearch";
import { normalize, getNodeIcon, getNodeTypeLabel, isExteriorNode } from "./building/nodePresentation";
import { useBuildingEffect06 } from "./building/hooks/useBuildingEffect06";
import { useBuildingEffect08 } from "./building/hooks/useBuildingEffect08";
import { useBuildingEffect09 } from "./building/hooks/useBuildingEffect09";
import { useBuildingEffect10 } from "./building/hooks/useBuildingEffect10";
import { useBuildingEffect12 } from "./building/hooks/useBuildingEffect12";
import { useBuildingEffect13 } from "./building/hooks/useBuildingEffect13";


import { useEffect, useMemo, useRef, useState } from "react";
import { useMapData } from "../lib/useMapData";
import { loadLeaflet } from "./mapGeo";
import { drawGoogleLikeBaseMap } from "./mapBaseLayer";
import {
  BUILDINGS,
  CENTER,
  getNodeType,
  KMITL_ALL_NODES,
  KMITL_NODE_FLOOR,
  KMITL_FLOOR1_NODES,
  KMITL_FLOOR1_EDGES,
  KMITL_ALL_EDGES,
  KMITL_EXTERIOR_LINKS,
} from "./mapConfig";
import { useCollection } from "./ui";

// Room names and descriptions are editable by users; Leaflet popup HTML must
// escape these values before interpolating them into its HTML template.
const escapePopupText = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");


/* label สำหรับ Popup*/

/* node ที่ถือว่าเป็นจุดทางเข้า/ทางออก */

/* Main component */
export default function BuildingFloorPicker({
  building,
  floor,
  onChange,
  onSelectRoom,
  onCloseRoomPopup, // ผู้ใช้กด ✕ บน popup ของ node บนแผนที่โดยตรง ให้แผงด้านล่างสลับไปแสดง "ห้องทั้งหมด" ทันที
  height = "100%",
  focusedNodeId = null, // node ที่กำลังถูกเลือก/ดูอยู่ในแผงจัดการด้านล่าง กรอบฟ้าและซูมแผนที่ไปหา
  tableSearchNodeId = null,
}) {
  const mapData = useMapData();
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const ctx = useRef({
    L: null,
    map: null,
    buildingLayers: {},
    floorOverlay: null,
    graphLayer: [],
    poiLayer: [],
    roomLayer: [],
    searchLayer: null,
  });

  /* State*/

  const [openKey, setOpenKey] = useState(
    () => Object.keys(BUILDINGS).find( (k) => BUILDINGS[k].name === building ) || null
  );

  const [curFloor, setCurFloor] = useState(floor || "1");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchedNodeId, setSearchedNodeId] = useState(null);

  // true เมื่อ building polygon layers (ctx.current.buildingLayers) สร้างเสร็จแล้ว
  // ใช้บอก effect fit/lock ให้รู้ว่าตอนนี้อ่าน buildingLayers[openKey] ได้แล้วจริง ๆ
  const [layersReady, setLayersReady] = useState(false);

  // ข้อมูลผังจากฝ่ายแผนที่ + รายละเอียดห้องจากฝ่ายทะเบียน 
  const { items: floorRecords } = useCollection("floors");
  const { items: allRooms } = useCollection("rooms");
  const { items: mapAssets } = useCollection("mapAssets");
  const b = openKey ? BUILDINGS[openKey] : null;

  const mergedFloors = useMemo(() => {
    if (!b) return [];

    const byFloor = new Map();

    // ผังที่ประกาศไว้ใน mapConfig / BUILDINGS
    // แสดงชั้นตามที่ประกาศไว้เสมอ แม้ยังไม่มีไฟล์ svg (จะได้เห็นปุ่มชั้นครบ
    // ส่วน overlay ของ svg จะถูกวาดก็ต่อเมื่อ floorData.svg มีค่าจริงเท่านั้น — ดู effect "Floor SVG")
    for (const base of b.floors || []) {
      if (!base?.id) continue;
      const floorId = String(base.id);
      byFloor.set(floorId, {
        ...base,
        id: floorId,
        label: base.label || `ชั้น ${floorId}`,
        svg: base.svg || null,
      });
    }

    // ผังที่มีอยู่ในข้อมูล floors จากฝ่ายแผนที่ (ถ้ามี ให้ใช้ทับของตั้งต้น)
    // ยังต้องขึ้นชั้นนี้ในลิสต์แม้ record จะยังไม่มี svg เพราะฝ่ายแผนที่อาจประกาศชั้นไว้ก่อน
    // ค่อยอัปโหลดผังตามทีหลัง
    for (const record of floorRecords || []) {
      if (
        record.buildingId !== b.id ||
        record.floorNo == null
      ) continue;

      const floorId = String(record.floorNo);
      const base = (b.floors || []).find((f) => String(f.id) === floorId);
      const current = byFloor.get(floorId);
      byFloor.set(floorId, {
        ...(base || {}),
        ...(current || {}),
        id: floorId,
        label: base?.label || record.name || current?.label || `ชั้น ${floorId}`,
        svg: record.svg || current?.svg || null,
        floorRecordId: record.id,
      });
    }

    // ไฟล์ผังที่อัปโหลดเข้ามา ใช้ได้ทันทีแม้ยังเป็น draft
    //   ตรงนี้ดูแค่ว่าเป็น floorplan และมีไฟล์จริง ไม่สน status/published
    for (const asset of mapAssets || []) {
      if (
        asset.kind !== "floorplan" ||
        !asset.floorId ||
        !asset.file
      ) continue;

      const assetFloor = (floorRecords || []).find((f) => f.id === asset.floorId && f.buildingId === b.id);
      if (!assetFloor) continue;
      const floorId = String(assetFloor.floorNo);
      const base = (b.floors || []).find((f) => String(f.id) === floorId);
      const current = byFloor.get(floorId);
      byFloor.set(floorId, {
        ...(base || {}),
        ...(current || {}),
        id: floorId,
        label: base?.label || current?.label || `ชั้น ${floorId}`,
        svg: asset.file,
        mapAssetId: asset.id,
      });
    }

    const floors = Array.from(byFloor.values());
    floors.sort((a, z) => {
      const na = Number(a.id);
      const nz = Number(z.id);
      if (Number.isFinite(na) && Number.isFinite(nz)) return nz - na;
      return String(z.id).localeCompare(String(a.id));
    });

    return floors;
  }, [b, floorRecords, mapAssets]);

  // ถ้าชั้นที่เลือกอยู่ยังไม่มีภาพผัง ให้ย้ายไปชั้นแรกที่มีภาพจริง
  useEffect(() => {
    if (!b || !mergedFloors.length) return;
    const exists = mergedFloors.some((f) => String(f.id) === String(curFloor));
    if (exists) return;

    const nextFloor = String(mergedFloors[mergedFloors.length - 1].id);
    setCurFloor(nextFloor);
    onChangeRef.current?.({ building: b.name, floor: nextFloor });
  }, [b, curFloor, mergedFloors]);

  /* Current rooms */
  const currentRooms = useMemo(() => {
    if (!b) return [];

    const floorRecord = (floorRecords || []).find((f) => f.buildingId === b.id && String(f.floorNo) === String(curFloor));
    return (allRooms || []).filter((r) => r.floorId === floorRecord?.id);
  }, [allRooms, b, curFloor, floorRecords]);

  const floorNodes = useMemo(() => {
    if (!b) return {};

    if (String(curFloor) === "1") {
      return KMITL_FLOOR1_NODES || {};
    }

    const result = {};

    for (const [id, node] of Object.entries(
      KMITL_ALL_NODES || {}
    )) {
      const nodeFloor = KMITL_NODE_FLOOR?.[id];
      if (String(nodeFloor) === String(curFloor)) {
        result[id] = node;
      }
    }
    return result;
  }, [b, curFloor]);

  const floorEdges = useMemo(() => {
    const floorNodeIds = new Set(Object.keys(floorNodes));
    return (KMITL_ALL_EDGES || KMITL_FLOOR1_EDGES || []).filter(([from, to]) => floorNodeIds.has(from) && floorNodeIds.has(to));
  }, [curFloor, floorNodes, mapData.data]);


  const nodeKeyById = useMemo(() => Object.fromEntries(
    Object.entries(KMITL_ALL_NODES || {}).map(([key, node]) => [node.nodeId || node.id, key])
  ), [mapData.data]);

  /* Match room กับ node */
  const roomByNode = useMemo(() => {
    const result = {};

    for (const room of currentRooms) {
      if (room.nodeId) {
        result[nodeKeyById[room.nodeId] || room.nodeId] = room;
      }
    }
    return result;
  }, [currentRooms, nodeKeyById]);

  /* Callback refs  */
  const onChangeRef = useRef(onChange);
  useEffect(() => {onChangeRef.current = onChange; }, [onChange]);
  
  const onSelectRoomRef = useRef(onSelectRoom);
  useEffect(() => { onSelectRoomRef.current = onSelectRoom;}, [onSelectRoom]);

  const onCloseRoomPopupRef = useRef(onCloseRoomPopup);
  useEffect(() => { onCloseRoomPopupRef.current = onCloseRoomPopup; }, [onCloseRoomPopup]);

  /* Sync props */
  useEffect(() => {
    const key = Object.keys(BUILDINGS).find((k) => BUILDINGS[k].name === building);
    setOpenKey(key || null);
    if (floor) setCurFloor(floor);
  }, [building, floor]);

  useEffect(() => {
    if (!building) {
      setSearch("");
      setSearchedNodeId(null);
    }
  }, [building]);


  /* Map bounds — loaded from normalized buildings.bounds via /api/map/buildings */
  const mapBounds = mapData.data?.building?.bounds || [];

  /* Fit building */
  const fitBuilding = (map,poly) => {
    if (!map || !poly) return;
    const center = poly.getBounds().getCenter();
    const targetZoom = 20.2;
    
    const ZOOM_LOCK_MARGIN = 0.4;

    // ให้แน่ใจว่าขนาด container ถูกต้องก่อน ค่อยคำนวณ view/bounds
    map.invalidateSize();
    map.setMaxBounds(poly.getBounds().pad(0.18));
    map.setMinZoom(16);
    map.setMaxZoom(21);
    map.setView(center, targetZoom, { animate: true });
    // Avoid a delayed zoom lock that would re-lock the map after pressing X.
    map.setMinZoom(targetZoom - ZOOM_LOCK_MARGIN);
    map.setMaxZoom(targetZoom + ZOOM_LOCK_MARGIN);
  };

  const campusBounds = (L) => {
    if (!L || !Array.isArray(mapBounds) || mapBounds.length < 2) return null;
    // The DB SC8 bounds are building-sized. Include the initial campus center
    // and add breathing room so closing a building shows its surroundings.
    return L.latLngBounds([...mapBounds, CENTER]).pad(1.2);
  };

  const fitCampus = () => {
    const { L, map } = ctx.current;
    if (!L || !map) return;
    const bounds = campusBounds(L);
    map.invalidateSize();
    map.setMinZoom(16);
    map.setMaxZoom(21);
    map.setMaxBounds(bounds || null);
    if (bounds) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 18, animate: true });
    else map.setView(CENTER, 17, { animate: true });
  };

  /* Initialize map */
  useBuildingEffect06({
    BUILDINGS,
    CENTER,
    ctx,
    drawGoogleLikeBaseMap,
    elRef,
    fitBuilding,
    loadLeaflet,
    mapBounds,
    mapData,
    mapRef,
    onChangeRef,
    setCurFloor,
    setLayersReady,
    setOpenKey,
  });


  /* Zoom เมื่อเลือกตึก  */
  useEffect(() => {
    const map = ctx.current.map;
    const layer = openKey ? ctx.current.buildingLayers[openKey] : null;

    if ( map && layer) {
      fitBuilding(map,layer.poly);
    }
  }, [openKey, layersReady]);

  /* =======================================================
     ล็อคแผนที่ให้อยู่แค่บริเวณตึกที่กำลังแก้ไข (เฉพาะฝ่ายทะเบียน)
     - เลือกตึกแล้ว (openKey มีค่า): ล็อคขอบเขตแค่ตัวตึกนั้น ลากแผนที่ออกนอกตึกไม่ได้
       ต้องกด x ปิดตึกก่อน ถึงจะขยับแผนที่ไปที่อื่นได้
     - ยังไม่เลือกตึก / กด x ปิดแล้ว (openKey === null): คืนขอบเขตกลับเป็นทั้งแคมปัสตามเดิม
     ======================================================= */

  useBuildingEffect08({ ctx, layersReady, mapBounds, mapData, openKey, center: CENTER });

  useEffect(() => {
    if (!openKey && layersReady) fitCampus();
  }, [openKey, layersReady, mapData.data]);


  /* Floor SVG */
  useBuildingEffect09({ b, ctx, curFloor, mergedFloors, openKey });

  // Draw graph edges 
  useBuildingEffect10({ ctx, curFloor, floorEdges, floorNodes, openKey });

  // เก็บ ref ของ roomByNode ล่าสุดไว้ให้ click handler อ่านได้เสมอ
  // (ไม่งั้น handler ที่ผูกไว้ตอนสร้าง marker ครั้งแรกจะเห็นแต่ข้อมูลห้อง ณ ตอนนั้น ไม่ใช่ข้อมูลล่าสุด)
  const roomByNodeRef = useRef(roomByNode);
  useEffect(() => { roomByNodeRef.current = roomByNode; }, [roomByNode]);

  // API rooms.nodeId is the nodes.id FK; map markers are keyed by nodeKey.
  const focusedNodeKey = nodeKeyById[focusedNodeId] || focusedNodeId;

  // เมื่อแผงจัดการเลิกโฟกัสห้อง (เช่น กด "แสดงห้องทั้งหมด") ให้ปิด popup ของห้องบนแผนที่ด้วย
  // ปิดเฉพาะตอนเปลี่ยนจาก "มีโฟกัส" -> "ไม่มีโฟกัส" เพื่อไม่ไปปิด popup ที่เปิดด้วยวิธีอื่น
  const prevFocusedRef = useRef(null);
  useEffect(() => {
    if (prevFocusedRef.current && !focusedNodeKey) {
      ctx.current.map?.closePopup();
    }
    prevFocusedRef.current = focusedNodeKey || null;
  }, [focusedNodeKey]);
  const tableSearchNodeKey = nodeKeyById[tableSearchNodeId] || tableSearchNodeId;
  const activeSearchNodeId = tableSearchNodeKey || searchedNodeId;

  /* สร้าง html ของ popup + tooltip จาก node/room ปัจจุบัน — ใช้ทั้งตอนสร้าง marker ครั้งแรก
     และตอนอัปเดตเนื้อหา popup ที่เปิดค้างอยู่ทันทีที่ข้อมูลห้องถูกแก้ไข */
  const buildPopupContent = (id, node, room, icon, typeLabel) => {
    const tooltipText = room
        ? `${room.name || `ห้อง ${room.code || ""}`}`
        : node.label
        ? `${typeLabel} · ${node.label}`
        : `${typeLabel} · ${id}`;

    const popupHtml = room
          ? `<div
                style="min-width:190px;
                font-family:Arial,sans-serif;
                "
              >
                <div
                  style="
                    font-weight:800;
                    font-size:15px;
                    margin-bottom:6px;
                    color:#202124;
                  "
                >
                  🚪 ${
                    escapePopupText(room.name || `ห้อง ${room.code || ""}`)
                  }
                </div>

                ${room.code ? `<div>รหัสห้อง: <b>${escapePopupText(room.code)}</b></div>` : ""}
                ${room.type ? `<div>ประเภท: ${escapePopupText(room.type)}</div>`: ""}
                ${room.capacity ? `<div>ความจุ: ${escapePopupText(room.capacity)}</div>`: ""}
                ${room.teacher ? `<div>อาจารย์: ${escapePopupText(room.teacher)}</div>` : ""}

                <div style="margin-top:8px; color:#5F6368; font-size:11px;">
                  ${escapePopupText(b?.name || "")}· ชั้น ${escapePopupText(curFloor)}
                </div>
              </div>`
          : `<div
                style=" min-width:170px; font-family:Arial,sans-serif;"
              >
                <div
                  style=" font-weight:800; font-size:14px; margin-bottom:5px; color:#202124;"
                >
                  ${icon.html}
                  ${escapePopupText(typeLabel)}
                </div>

                <div
                  style="color:#5F6368; font-size:12px;"
                >
                  ${escapePopupText(node.label || id)}
                </div>

                <div
                  style="color:#80868B; font-size:10px;margin-top:5px;"
                >
                  ${escapePopupText(b?.name || "")}· ชั้น ${escapePopupText(curFloor)}
                </div>
              </div>`;

    return { tooltipText: escapePopupText(tooltipText), popupHtml };
  };

  // Draw ALL indoor nodes once per floor. A user-initiated popup X returns
  // to the campus view via the parent; programmatic popup closes do not pan.
  useBuildingEffect12({
    b,
    buildPopupContent,
    building,
    ctx,
    curFloor,
    floorNodes,
    focusedNodeId: focusedNodeKey,
    searchedNodeId: activeSearchNodeId,
    setSearchedNodeId,
    getNodeIcon,
    getNodeTypeLabel,
    isExteriorNode,
    onCloseRoomPopupRef,
    onSelectRoomRef,
    openKey,
    roomByNodeRef,
  });

  // อัปเดตเนื้อหา popup/tooltip ของ marker ที่มีอยู่แล้วทันทีที่ข้อมูลห้องเปลี่ยน (เช่น กด "บันทึกการแก้ไข" ในแผงทะเบียน)
  // ไม่แตะ marker เดิมเลย แค่เปลี่ยนเนื้อหา popup/tooltip — ถ้า popup ห้องนั้นเปิดอยู่ ผู้ใช้จะเห็นข้อมูลใหม่ทันทีโดยไม่ต้องปิดแล้วเปิดใหม่
  // ส่วนกรอบสีน้ำเงิน (โฟกัส) และการเปิด popup ค้างไว้ ก็จัดการอยู่ในนี้เช่นกัน
  useBuildingEffect13({
    b,
    buildPopupContent,
    ctx,
    curFloor,
    floorNodes,
    focusedNodeId: focusedNodeKey,
    searchedNodeId: activeSearchNodeId,
    getNodeIcon,
    getNodeTypeLabel,
    isExteriorNode,
    openKey,
    roomByNode,
  });

  /* ===================================================
     ซูมแผนที่ไปหา node ที่ถูกเลือกจากแผงจัดการด้านล่าง
     (เช่น กดแถวห้องหรือปุ่มแก้ไขในตาราง "แสดงห้องทั้งหมด")
     ไม่ใช่แค่ตอนคลิก icon บนแผนที่โดยตรงเท่านั้น
     =================================================== */

  useEffect(() => {
    const { map } = ctx.current;
    if (!map || !openKey || !focusedNodeKey) return;
    const node = floorNodes[focusedNodeKey];
    if (!node || !Number.isFinite(node.lat) || !Number.isFinite(node.lon)) return;
    map.setView([node.lat, node.lon], 20, { animate: true });
  }, [openKey, curFloor, focusedNodeKey, floorNodes]);

  useEffect(() => {
    const { map } = ctx.current;
    if (!map || !openKey || !activeSearchNodeId) return;
    const node = floorNodes[activeSearchNodeId];
    if (node && Number.isFinite(node.lat) && Number.isFinite(node.lon)) {
      map.setView([node.lat, node.lon], 20, { animate: true });
    }
  }, [openKey, curFloor, activeSearchNodeId, floorNodes]);

  // Search 
  const { searchResults, selectSearch } = useBuildingSearch({
    search, allRooms, floorRecords, b, nodeKeyById, floorNodes, roomByNode,
    setSearchOpen, ctx, setOpenKey, setCurFloor, onChangeRef, fitBuilding,
    openKey, curFloor, building, onSelectRoomRef, setSearchedNodeId,
  });

  // Resize observer 
  useEffect(() => {
    if (!elRef.current || typeof ResizeObserver === "undefined") {return;}

    const ro = new ResizeObserver(() => {ctx.current.map?.invalidateSize();});
    ro.observe(
      elRef.current
    );
    return () => ro.disconnect();
  }, []);

  // RETURN
  if (mapData.loading) return <div style={{ padding: 16, color: "#5F6368" }}>กำลังโหลดข้อมูลแผนที่…</div>;
  if (mapData.error) return <div style={{ padding: 16, color: "#D93025" }}>โหลดข้อมูลแผนที่ไม่สำเร็จ: {mapData.error.message}</div>;

  const view = {
    b,
    curFloor,
    elRef,
    floorRecords,
    height,
    mergedFloors,
    onChangeRef,
    search,
    searchOpen,
    searchResults,
    selectSearch,
    resetToCampus: () => {
      setOpenKey(null);
      setSearchedNodeId(null);
      setSearch("");
      setSearchOpen(false);
      onChangeRef.current?.({ building: null, floor: "1" });
      fitCampus();
    },
    setCurFloor,
    setSearchedNodeId,
    setOpenKey,
    setSearch,
    setSearchOpen,
  };
  return <BuildingFloorPickerLayout view={view} />;
}