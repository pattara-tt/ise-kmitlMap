"use client";

import BuildingFloorPickerLayout from "./building/BuildingFloorPickerLayout";
import { useBuildingSearch } from "./building/useBuildingSearch";
import { getNodeIcon, getNodeTypeLabel } from "./building/nodePresentation";
import { resolveRoomNodeIcon } from "./building/roomTypeIcon";
import { useBuildingEffect06 } from "./building/hooks/useBuildingEffect06";
import { useBuildingEffect08 } from "./building/hooks/useBuildingEffect08";
import { useBuildingEffect09 } from "./building/hooks/useBuildingEffect09";
import { useBuildingEffect10 } from "./building/hooks/useBuildingEffect10";
import { useBuildingEffect12 } from "./building/hooks/useBuildingEffect12";
import { useBuildingEffect13 } from "./building/hooks/useBuildingEffect13";


import { useEffect, useMemo, useRef, useState } from "react";
import { useMapData } from "../lib/useMapData";
import { apiFetch } from "../lib/api";
import { loadLeaflet } from "./mapGeo";
import { drawGoogleLikeBaseMap } from "./mapBaseLayer";
import { CENTER } from "./mapConfig";
import { useCollection } from "./ui";

/* Registrar data helpers */
// Registrar joins GIS geometry to existing records by ID. These adapters do not
// write data, publish drafts, or change the public map's shared configuration.

const textId = (value) => (
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""
);

const hasIdentifier = (value) => (
  value !== null && value !== undefined &&
  !(typeof value === "string" && !value.trim())
);

function coordinate(value, limit) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

function point(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lat = coordinate(value[0], 90);
  const lon = coordinate(value[1], 180);
  return lat === null || lon === null ? null : [lat, lon];
}

function jsonValue(value) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

function polygon(value) {
  const raw = jsonValue(value);
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const points = raw.map(point);
  if (points.some((entry) => !entry)) return null;
  const unique = Array.from(new Map(points.map((entry) => [entry.join(","), entry])).values());
  if (unique.length < 3) return null;

  // Subtract an origin before the cross product: latitude/longitude magnitudes
  // are much larger than a building footprint. Ignore numerical rounding only.
  const [originLat, originLon] = unique[0];
  const vectors = unique.slice(1).map(([lat, lon]) => [lat - originLat, lon - originLon]);
  const baseline = vectors.reduce((best, entry) => (
    Math.hypot(...entry) > Math.hypot(...best) ? entry : best
  ));
  const extent = Math.max(...vectors.flat().map(Math.abs));
  const magnitude = Math.max(1, ...unique.flat().map(Math.abs));
  const tolerance = Number.EPSILON * 32 * magnitude * extent;
  const hasArea = vectors.some(([lat, lon]) => (
    Math.abs(baseline[0] * lon - baseline[1] * lat) > tolerance
  ));
  return hasArea ? points : null;
}

function boundsOf(points) {
  const lats = points.map(([lat]) => lat);
  const lons = points.map(([, lon]) => lon);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}

function rectangle(value) {
  const raw = jsonValue(value);
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const corners = raw.map(point);
  if (corners.some((entry) => !entry)) return null;
  const [[south, west], [north, east]] = boundsOf(corners);
  if (south === north || west === east) return null;
  return [[south, west], [south, east], [north, east], [north, west]];
}

function modifiedAt(row) {
  const time = Date.parse(row.updatedAt || row.createdAt || "");
  return Number.isFinite(time) ? time : 0;
}

function latestValidBoundary(rows) {
  for (const row of rows.slice().sort((a, b) => modifiedAt(b) - modifiedAt(a))) {
    const outline = polygon(row.geometry);
    if (outline) return { row, outline };
  }
  return null;
}

function buildingFloors(building, rows) {
  const byNumber = new Map();
  for (const floor of rows) {
    if (!floor || floor.status === "deleted" || !textId(floor.id)) continue;
    if (textId(floor.buildingId) && textId(floor.buildingId) !== textId(building.id)) continue;
    const number = textId(floor.floorNo);
    if (!number) continue;
    byNumber.set(number, {
      ...floor,
      id: number,
      apiId: floor.id,
      floorRecordId: floor.id,
      label: floor.name || "ชั้น " + number,
      svg: floor.svg || null,
      detail: floor.note || null,
    });
  }
  return Array.from(byNumber.values()).sort((a, b) => (
    a.id.localeCompare(b.id, undefined, { numeric: true })
  ));
}

function createRegistrarBuildingRegistry(options = {}) {
  const { buildings = [], boundaries = [], floors = [] } = options;
  const rows = (Array.isArray(buildings) ? buildings : []).filter((row) => row && textId(row.id));
  const boundaryRows = (Array.isArray(boundaries) ? boundaries : []).filter((row) => (
    row && row.type === "building" && row.status !== "deleted"
  ));
  const explicitFloors = Object.prototype.hasOwnProperty.call(options, "floors");
  const floorRows = Array.isArray(floors) ? floors : [];
  const names = new Map();
  for (const row of rows) {
    if (row.name) names.set(row.name, (names.get(row.name) || 0) + 1);
  }

  const registry = {};
  for (const building of rows) {
    const id = textId(building.id);
    const linked = boundaryRows.filter((row) => textId(row.buildingId) === id);
    const legacy = names.get(building.name) === 1
      ? boundaryRows.filter((row) => !hasIdentifier(row.buildingId) && row.name === building.name)
      : [];
    const selected = latestValidBoundary(linked) || latestValidBoundary(legacy);
    const outline = selected?.outline || polygon(building.outline) || rectangle(building.bounds);
    if (!outline) continue;

    const key = "db:" + id;
    const sourceFloors = explicitFloors
      ? floorRows.filter((floor) => floor && textId(floor.buildingId) === id)
      : (Array.isArray(building.floors) ? building.floors : []);
    registry[key] = {
      ...building,
      key,
      bounds: boundsOf(outline),
      outline,
      floors: buildingFloors(building, sourceFloors),
      boundaryId: selected?.row.id || null,
      boundaryStatus: selected?.row.status || null,
      __db: true,
    };
  }
  return registry;
}

function createRegistrarGraph({ buildingId, floors = [], nodes = [], edges = [] } = {}) {
  const id = textId(buildingId);
  const floorById = new Map((Array.isArray(floors) ? floors : [])
    .filter((floor) => id && floor && textId(floor.id) && floor.status !== "deleted" && textId(floor.buildingId) === id)
    .map((floor) => [textId(floor.id), floor]));
  const selectedNodes = [];
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (!node || !textId(node.id)) continue;
    const floor = floorById.get(textId(node.floorId));
    if (!floor) continue;
    const position = point([node.y, node.x]);
    if (!position) continue;
    const key = textId(node.nodeKey) || textId(node.id);
    selectedNodes.push([key, {
      ...node,
      nodeKey: key,
      nodeId: node.id,
      lat: position[0],
      lon: position[1],
      label: node.name || node.label || key,
    }]);
  }
  const nodesByKey = Object.fromEntries(selectedNodes);
  const nodeKeyById = Object.fromEntries(selectedNodes.map(([key, node]) => [node.id, key]));
  const nodeFloorByKey = Object.fromEntries(selectedNodes.map(([key, node]) => [
    key, textId(floorById.get(textId(node.floorId)).floorNo) || textId(node.floorId),
  ]));
  const scopedIds = new Map(selectedNodes.map(([key, node]) => [textId(node.id), key]));
  const scopedEdges = [];
  for (const edge of Array.isArray(edges) ? edges : []) {
    if (!edge) continue;
    const from = scopedIds.get(textId(edge.fromNodeId));
    const to = scopedIds.get(textId(edge.toNodeId));
    if (from && to) scopedEdges.push([from, to, { ...edge }]);
  }
  return { nodesByKey, nodeKeyById, nodeFloorByKey, edges: scopedEdges };
}

function resolveRegistrarBuilding(registry, { buildingId, building } = {}) {
  const entries = Object.values(registry || {});
  const id = textId(buildingId);
  if (hasIdentifier(buildingId)) {
    return id ? entries.find((entry) => textId(entry.id) === id) || null : null;
  }
  const value = textId(building);
  if (!value) return null;
  const exact = entries.find((entry) => textId(entry.id) === value || entry.key === value);
  if (exact) return exact;
  const matches = entries.filter((entry) => entry.name === value || entry.code === value);
  return matches.length === 1 ? matches[0] : null;
}
/* End Registrar data helpers */

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

const EMPTY_ROWS = { nodes: [], edges: [] };

// A Registrar selection must never reuse another building's graph. Keep these
// rows local instead of replacing the public map's legacy mapConfig objects.
function useRegistrarGraph({ buildingId, floors, primaryData }) {
  const selectedId = buildingId == null ? null : String(buildingId);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    buildingId: null, ...EMPTY_ROWS, loading: false, error: null,
  });

  useEffect(() => {
    const onChanged = (event) => {
      if (["nodes", "edges", "floors"].includes(event.detail?.name)) {
        setRevision((value) => value + 1);
      }
    };
    window.addEventListener("scimap:collection-changed", onChanged);
    return () => window.removeEventListener("scimap:collection-changed", onChanged);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!selectedId) {
      setState({ buildingId: null, ...EMPTY_ROWS, loading: false, error: null });
      return () => { active = false; controller.abort(); };
    }

    const matchingPrimary = primaryData?.building?.id != null &&
      String(primaryData.building.id) === selectedId;
    if (matchingPrimary && revision === 0) {
      setState({
        buildingId: selectedId,
        nodes: primaryData.nodes || [], edges: primaryData.edges || [],
        loading: false, error: null,
      });
      return () => { active = false; controller.abort(); };
    }

    setState({ buildingId: selectedId, ...EMPTY_ROWS, loading: true, error: null });
    apiFetch(`/api/map/graph?building=${encodeURIComponent(selectedId)}`, {
      signal: controller.signal,
    }).then((response) => {
      if (!active) return;
      setState({
        buildingId: selectedId,
        nodes: response.nodes || [], edges: response.edges || [],
        loading: false, error: null,
      });
    }).catch((error) => {
      if (!active || error.name === "AbortError") return;
      setState({ buildingId: selectedId, ...EMPTY_ROWS, loading: false, error });
    });

    return () => { active = false; controller.abort(); };
  }, [selectedId, primaryData, revision]);

  // Effects run after rendering. Scope even this first render after a selection
  // change so no old markers can appear briefly under the new building's name.
  const current = state.buildingId === selectedId ? state : EMPTY_ROWS;
  const graph = useMemo(() => createRegistrarGraph({
    buildingId: selectedId, floors, nodes: current.nodes, edges: current.edges,
  }), [selectedId, floors, current.nodes, current.edges]);

  return {
    ...graph,
    loading: Boolean(selectedId) && (state.buildingId !== selectedId || state.loading),
    error: state.buildingId === selectedId ? state.error : null,
  };
}

/* Main component */
export default function BuildingFloorPicker({
  building,
  buildingId = null,
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

  // Geometry is owned by GIS; metadata and graph remain linked by stable IDs.
  // Only buildings returned by the guarded map API can enter this registry.
  const { items: boundaries, loading: boundariesLoading } = useCollection("mapBoundaries");
  const { items: floorRecords, loading: floorsLoading } = useCollection("floors");
  const { items: allRooms } = useCollection("rooms");
  const { items: roomTypes } = useCollection("roomTypes");
  const { items: mapAssets } = useCollection("mapAssets");
  const [floorsLoaded, setFloorsLoaded] = useState(false);
  useEffect(() => {
    if (!floorsLoading) setFloorsLoaded(true);
  }, [floorsLoading]);

  const registryFloors = useMemo(() => !floorsLoaded && floorsLoading
    ? (mapData.data?.buildings || []).flatMap((entry) =>
      (entry.floors || []).map((row) => ({ ...row, buildingId: entry.id })))
    : floorRecords, [mapData.data, floorRecords, floorsLoading, floorsLoaded]);

  const buildingRegistry = useMemo(() => createRegistrarBuildingRegistry({
    buildings: mapData.data?.buildings || [], boundaries, floors: registryFloors,
  }), [mapData.data, boundaries, registryFloors]);

  /* State*/

  const [openKey, setOpenKey] = useState(
    () => resolveRegistrarBuilding(buildingRegistry, { buildingId, building })?.key || null
  );

  const [curFloor, setCurFloor] = useState(floor || "1");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchedNodeId, setSearchedNodeId] = useState(null);

  // true เมื่อ building polygon layers (ctx.current.buildingLayers) สร้างเสร็จแล้ว
  // ใช้บอก effect fit/lock ให้รู้ว่าตอนนี้อ่าน buildingLayers[openKey] ได้แล้วจริง ๆ
  const [layersReady, setLayersReady] = useState(false);

  const b = openKey ? buildingRegistry[openKey] || null : null;
  const graph = useRegistrarGraph({
    buildingId: b?.id, floors: registryFloors, primaryData: mapData.data,
  });

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
        record.status === "deleted" ||
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
        asset.status === "deleted" ||
        asset.kind !== "floorplan" ||
        !asset.floorId ||
        !asset.file
      ) continue;

      const assetFloor = (floorRecords || []).find((f) => f.status !== "deleted" && f.id === asset.floorId && f.buildingId === b.id);
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
        placement: asset.placement || null,
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
    onChangeRef.current?.({ building: b.name, buildingId: b.id, floor: nextFloor });
  }, [b, curFloor, mergedFloors]);

  /* Current rooms */
  const currentRooms = useMemo(() => {
    if (!b) return [];

    const floorRecord = (floorRecords || []).find((f) => f.buildingId === b.id && String(f.floorNo) === String(curFloor));
    return (allRooms || []).filter((r) => r.floorId === floorRecord?.id);
  }, [allRooms, b, curFloor, floorRecords]);

  const floorNodes = useMemo(() => {
    if (!b) return {};
    return Object.fromEntries(Object.entries(graph.nodesByKey)
      .filter(([key]) => String(graph.nodeFloorByKey[key]) === String(curFloor))
      .map(([key, node]) => [key, String(node.type || "").toLowerCase() === "exterior"
        ? { ...node, type: "path", __routeConnector: true } : node]));
  }, [b?.id, curFloor, graph.nodesByKey, graph.nodeFloorByKey]);

  const floorEdges = useMemo(() => {
    const floorNodeIds = new Set(Object.keys(floorNodes));
    return graph.edges.filter(([from, to]) => floorNodeIds.has(from) && floorNodeIds.has(to));
  }, [floorNodes, graph.edges]);

  const nodeKeyById = graph.nodeKeyById;
  const exteriorNodeKeys = useMemo(() => {
    const keys = new Set();
    for (const [from, to, edge] of graph.edges) {
      if (String(edge?.edgeType || "").toLowerCase() !== "exterior") continue;
      const outsideIsFrom = String(graph.nodesByKey[from]?.type || "").toLowerCase() === "exterior";
      keys.add(outsideIsFrom ? to : from);
    }
    return keys;
  }, [graph.edges, graph.nodesByKey]);
  const isExteriorNode = (key) => exteriorNodeKeys.has(key);

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
    const selectedBuilding = resolveRegistrarBuilding(buildingRegistry, { buildingId, building });
    setOpenKey(selectedBuilding?.key || null);
    if (floor != null) setCurFloor(String(floor));
  }, [buildingId, building, floor, buildingRegistry]);

  useEffect(() => {
    if (!buildingId && !building) {
      setSearch("");
      setSearchedNodeId(null);
    }
  }, [buildingId, building]);


  // Fit the campus view around every selectable GIS building.
  const mapBounds = useMemo(() => {
    const bounds = Object.values(buildingRegistry).map((entry) => entry.bounds)
      .filter((value) => Array.isArray(value) && value.length === 2);
    if (!bounds.length) return mapData.data?.building?.bounds || [];
    return [
      [Math.min(...bounds.map((value) => value[0][0])), Math.min(...bounds.map((value) => value[0][1]))],
      [Math.max(...bounds.map((value) => value[1][0])), Math.max(...bounds.map((value) => value[1][1]))],
    ];
  }, [buildingRegistry, mapData.data]);

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
    BUILDINGS: buildingRegistry,
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
    layersReady,
    setLayersReady,
    setOpenKey,
    setSearchedNodeId,
  });


  /* Zoom เมื่อเลือกตึก  */
  useEffect(() => {
    const map = ctx.current.map;
    const layer = openKey ? ctx.current.buildingLayers[openKey] : null;

    if ( map && layer) {
      fitBuilding(map,layer.poly);
    }
  }, [openKey, layersReady, buildingRegistry]);

  /* =======================================================
     ล็อคแผนที่ให้อยู่แค่บริเวณตึกที่กำลังแก้ไข (เฉพาะฝ่ายทะเบียน)
     - เลือกตึกแล้ว (openKey มีค่า): ล็อคขอบเขตแค่ตัวตึกนั้น ลากแผนที่ออกนอกตึกไม่ได้
       ต้องกด x ปิดตึกก่อน ถึงจะขยับแผนที่ไปที่อื่นได้
     - ยังไม่เลือกตึก / กด x ปิดแล้ว (openKey === null): คืนขอบเขตกลับเป็นทั้งแคมปัสตามเดิม
     ======================================================= */

  useBuildingEffect08({ ctx, layersReady, mapBounds, mapData, openKey, center: CENTER });

  useEffect(() => {
    if (!openKey && layersReady) fitCampus();
  }, [openKey, layersReady, mapBounds]);


  /* Floor SVG */
  useBuildingEffect09({ b, ctx, curFloor, layersReady, mergedFloors, openKey });

  // Draw graph edges 
  useBuildingEffect10({ ctx, curFloor, floorEdges, floorNodes, layersReady, openKey });

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
  const searchedNodeKey = nodeKeyById[searchedNodeId] || searchedNodeId;
  const activeSearchNodeId = tableSearchNodeKey || searchedNodeKey;

  /* สร้าง html ของ popup + tooltip จาก node/room ปัจจุบัน — ใช้ทั้งตอนสร้าง marker ครั้งแรก
     และตอนอัปเดตเนื้อหา popup ที่เปิดค้างอยู่ทันทีที่ข้อมูลห้องถูกแก้ไข */
  const iconForRoom = (node, room) => resolveRoomNodeIcon(room, roomTypes, getNodeIcon(node));

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
                  ${icon.html} ${
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
    layersReady,
    focusedNodeId: focusedNodeKey,
    searchedNodeId: activeSearchNodeId,
    setSearchedNodeId,
    getNodeIcon: iconForRoom,
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
    getNodeIcon: iconForRoom,
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
    search, allRooms, floorRecords: registryFloors, b, buildingRegistry,
    nodesByKey: graph.nodesByKey, nodeKeyById, floorNodes, roomByNode,
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
  }, [layersReady]);

  // RETURN
  if (mapData.loading && !mapData.data) return <div style={{ padding: 16, color: "#5F6368" }}>กำลังโหลดข้อมูลแผนที่…</div>;
  if (mapData.error) return <div style={{ padding: 16, color: "#D93025" }}>โหลดข้อมูลแผนที่ไม่สำเร็จ: {mapData.error.message}</div>;

  let notice = null;
  if (b && !mergedFloors.length && !floorsLoading) {
    notice = "อาคารนี้ยังไม่มีข้อมูลชั้น สามารถเพิ่มรายละเอียดอาคารได้ที่แผงด้านล่าง";
  } else if (b && graph.loading) {
    notice = "กำลังโหลดจุดห้องของอาคารนี้…";
  } else if (b && graph.error) {
    notice = "โหลดจุดห้องไม่สำเร็จ: " + graph.error.message;
  } else if (b && !graph.loading && !Object.keys(floorNodes).length) {
    notice = "ชั้นนี้ยังไม่มีจุดห้องจากฝ่ายแผนที่ สามารถแก้ไขข้อมูลอาคารและชั้นได้ที่แผงด้านล่าง";
  } else if (!b && !boundariesLoading && !floorsLoading && !Object.keys(buildingRegistry).length) {
    notice = "ยังไม่มีข้อมูลอาคารบนแผนที่ กรุณาตรวจสอบอาคารที่ฝ่าย GIS เพิ่มไว้";
  }

  const view = {
    b,
    curFloor,
    elRef,
    floorRecords: registryFloors,
    notice,
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
      onChangeRef.current?.({ building: null, buildingId: null, floor: "1" });
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