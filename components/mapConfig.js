// mapConfig.js — เดินกรุงเทพ (walkwe)
// พื้นที่หลัก: อาคาร Sc8 เขตลาดกระบัง
// ตัดระบบกลางวัน/กลางคืน ความร่ม และความสว่างออก
// เหลือระบบแผนที่ การนำทางนอกอาคาร และการนำทางภายในอาคาร

// ============================================================
// 🗺️ ศูนย์กลางแผนที่ + กรอบพื้นที่หลัก
// ============================================================

export const WALKWAY_NODE_TYPES = ["walkway", "path", "corridor", "junction", "node", "hallway", "way"];
export const CENTER = [13.7292, 100.7789];
export const ZOOM = 15;

// [south, west, north, east]
export const DEMO_BBOX = [
  13.715,
  100.771,
  13.742,
  100.786,
];

// ============================================================
// 🧭 ประเภท Node สำหรับปักบนผังอาคาร
// ============================================================

// ⚠️ NODE_TYPES คือ "แหล่งความจริงเดียว" (single source of truth) ของการแม็ป
// type -> ไอคอน/สี/ป้ายกำกับ ของทุก node บนแผนที่/ผังอาคาร
//
// id ของแต่ละรายการต้อง "สะกดตรงตัว" กับค่า type ที่ใช้จริงใน
// node data ที่โหลดจาก backend (case-sensitive) — ก่อนหน้านี้ตารางนี้เคยเขียน
// id ผิด (เช่น "toilet"/"stairs" ตัวเล็กล้วน) ทำให้จุดห้องน้ำ/บันได/ห้อง
// ต่าง ๆ หาไม่เจอใน NODE_TYPES แล้ว fallback ไปใช้ไอคอนของ "path" หมด
// จึงมีการไปสร้างตาราง CHIP_NODE_TYPES/NODE_ICON แยกไว้อีกหลายชุดในหลายไฟล์
// เพื่อชดเชยปัญหานี้ — ตอนนี้แก้ที่ต้นตอแล้ว ให้ทุกไฟล์ import NODE_TYPES
// (หรือ getNodeType()) จากที่นี่ที่เดียว ไม่ต้องมีตาราง type->ไอคอนซ้ำอีก
//
// field "chip" (ไม่บังคับ) ใช้จัดกลุ่มสำหรับปุ่ม filter แบบ chip บน MapView/
// Buildingfloorpicker (room/toilet/lift/stairs) — CHIP_NODE_TYPES ด้านล่าง
// ถูกสร้างจาก field นี้อัตโนมัติ ไม่ต้องคัดลอกรายชื่อ id เองอีกต่อไป
export const NODE_TYPES = [
  {
    id: "path",
    label: "ทางเดิน",
    icon: "•",
    color: "#B3AFB8",
  },
  {
    id: "Stair",
    label: "บันได",
    icon: "🪜",
    color: "#5F6368",
    chip: "stairs",
  },
  {
    id: "escalator",
    label: "บันไดเลื่อน",
    icon: "⬆",
    color: "#8E24AA",
  },
  {
    id: "lift",
    label: "ลิฟต์",
    icon: "🛗",
    color: "#8E24AA",
    chip: "lift",
  },
  {
    id: "Toilet",
    label: "ห้องน้ำ",
    icon: "🚻",
    color: "#1A73E8",
    chip: "toilet",
  },
  {
    id: "atm",
    label: "ATM",
    icon: "🏧",
    color: "#D93025",
  },
  {
    id: "Entrance",
    label: "ทางเข้า-ออก",
    icon: "🚪",
    color: "#188038",
  },
  {
    id: "Fire_Exit",
    label: "ทางหนีไฟ",
    icon: "🚪",
    color: "#D93025",
  },
  {
    id: "Co_Work",
    label: "Co-working Space",
    icon: "💻",
    color: "#8E24AA",
    chip: "room",
  },
  {
    id: "Study_Room",
    label: "ห้องเรียน/ห้องศึกษา",
    icon: "📚",
    color: "#1A73E8",
    chip: "room",
  },
];

// หา entry ของ NODE_TYPES จาก type string — fallback ไปที่ NODE_TYPES[0] ("path")
// ถ้าไม่พบ (เช่น type สะกดผิด หรือเป็นชนิดใหม่ที่ยังไม่ได้เพิ่มไว้ในตารางนี้)
export function getNodeType(type) {
  return NODE_TYPES.find((t) => t.id === type) || NODE_TYPES[0];
}

// สร้างจาก field "chip" ของ NODE_TYPES โดยอัตโนมัติ:
// { room: ["Study_Room","Co_Work"], toilet: ["Toilet"], lift: ["lift"], stairs: ["Stair"] }
// ไม่ต้องพิมพ์รายชื่อ id ซ้ำมือในแต่ละไฟล์ที่ใช้ปุ่ม filter อีกต่อไป
export const CHIP_NODE_TYPES = NODE_TYPES.reduce((acc, t) => {
  if (!t.chip) return acc;
  if (!acc[t.chip]) acc[t.chip] = [];
  acc[t.chip].push(t.id);
  return acc;
}, {});


// ============================================================
// 🏢 Runtime map data — hydrated from backend /api/map/*
// ============================================================
// These exports intentionally keep the legacy names used by map rendering code,
// but they start empty and are populated from normalized DB rows. This avoids
// duplicating building/floor/node/edge data in the frontend bundle.
export const KMITL_BOUNDS = [];
export const KMITL_OUTLINE = [];
// legacy names kept as runtime aliases for the GIS editor; values come from DB.
export const SC8_BOUNDS = KMITL_BOUNDS;
export const SC8_OUTLINE = KMITL_OUTLINE;
export const SC8_CENTER = [];
export const KMITL_FLOORS = [];
export const KMITL_FLOOR1_NODES = {};
export const KMITL_FLOOR1_EDGES = [];
export const KMITL_ALL_NODES = {};
export const KMITL_ALL_EDGES = [];
export const KMITL_NODE_FLOOR = {};
export const KMITL_EXTERIOR_LINKS = [];
export const BUILDINGS = {};
export const BUILDING_GRAPHS = [];
export const ROUTE_GRAPHS = {};
export const LOCKED_BUILDINGS = new Set();
export const NODE_GROUP_PREFIXES = [];

function replaceArray(target, value) {
  target.splice(0, target.length, ...(Array.isArray(value) ? value : []));
}
function replaceObject(target, value) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, value || {});
}
function asLatLon(node) {
  return {
    id: node.id,
    nodeId: node.id,
    floorId: node.floorId,
    lat: Number(node.y),
    lon: Number(node.x),
    type: node.type,
    label: node.name || node.nodeKey,
    name: node.name || node.nodeKey,
  };
}

export function hydrateMapConfig({ buildings = [], buildingId = null, nodes = [], edges = [] } = {}) {
  const building = buildings.find((b) => b.id === buildingId)
    || buildings.find((b) => String(b.code || '').toUpperCase() === 'SC8')
    || buildings[0];
  if (!building) return null;

  replaceArray(KMITL_BOUNDS, building.bounds || []);
  replaceArray(KMITL_OUTLINE, building.outline || []);
  const bounds = building.bounds || [];
  if (Array.isArray(bounds) && bounds.length >= 2) {
    replaceArray(SC8_CENTER, [
      (Number(bounds[0]?.[0]) + Number(bounds[1]?.[0])) / 2,
      (Number(bounds[0]?.[1]) + Number(bounds[1]?.[1])) / 2,
    ]);
  }
  replaceArray(KMITL_FLOORS, (building.floors || []).map((f) => ({
    id: String(f.floorNo),
    apiId: f.id,
    label: f.name || String(f.floorNo),
    name: f.name || String(f.floorNo),
    svg: f.svg || null,
    detail: f.note || null,
    note: f.note || null,
    status: f.status,
    bounds: building.bounds || [],
  })));

  const floorById = Object.fromEntries((building.floors || []).map((f) => [f.id, String(f.floorNo)]));
  const keyById = Object.fromEntries(nodes.map((n) => [n.id, n.nodeKey]));
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.nodeKey, asLatLon(n)]));
  replaceObject(KMITL_ALL_NODES, nodeMap);
  replaceObject(KMITL_NODE_FLOOR, Object.fromEntries(nodes.map((n) => [n.nodeKey, floorById[n.floorId] || n.floorId])));

  const normalizedEdges = edges
    .map((e) => {
      const a = keyById[e.fromNodeId];
      const b = keyById[e.toNodeId];
      return a && b ? [a, b, { id: e.id, edgeType: e.edgeType, accessible: e.accessible, distance: e.distance }] : null;
    })
    .filter(Boolean);
  replaceArray(KMITL_ALL_EDGES, normalizedEdges);

  const floorOneIds = new Set((building.floors || []).filter((f) => String(f.floorNo) === '1').map((f) => f.id));
  replaceObject(KMITL_FLOOR1_NODES, Object.fromEntries(nodes.filter((n) => floorOneIds.has(n.floorId)).map((n) => [n.nodeKey, asLatLon(n)])));
  replaceArray(KMITL_FLOOR1_EDGES, normalizedEdges.filter(([a, b]) => KMITL_FLOOR1_NODES[a] && KMITL_FLOOR1_NODES[b]));

  const exterior = [];
  for (const e of edges.filter((row) => row.edgeType === 'exterior')) {
    const from = nodes.find((n) => n.id === e.fromNodeId);
    const to = nodes.find((n) => n.id === e.toNodeId);
    if (!from || !to) continue;
    const outside = String(from.type).toLowerCase() === 'exterior' ? from : to;
    const inside = outside === from ? to : from;
    exterior.push({ node: inside.nodeKey, lat: Number(outside.y), lon: Number(outside.x), type: 'Entrance', label: outside.name || 'ทางเข้า-ออก' });
  }
  replaceArray(KMITL_EXTERIOR_LINKS, exterior);

  replaceObject(BUILDINGS, {
    kmitl: {
      id: building.id,
      code: building.code,
      name: building.name,
      bounds: KMITL_BOUNDS,
      outline: KMITL_OUTLINE,
      floors: KMITL_FLOORS,
      nodes: KMITL_ALL_NODES,
      edges: KMITL_ALL_EDGES,
    },
  });
  replaceArray(BUILDING_GRAPHS, [{ name: 'kmitl', buildingId: building.id, nodes: KMITL_ALL_NODES, edges: KMITL_ALL_EDGES, exteriorLinks: KMITL_EXTERIOR_LINKS }]);
  replaceObject(ROUTE_GRAPHS, Object.fromEntries(KMITL_FLOORS.map((f) => [`kmitl:${f.id}`, { nodes: KMITL_ALL_NODES, edges: KMITL_ALL_EDGES }])));
  return building;
}

// ============================================================
// 🌐 Overpass API
// ============================================================

export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// ============================================================
// 🗂️ ประเภทข้อมูลบนแผนที่
// ============================================================

export const CAT = {
  sidewalk: {
    color: "#e63946",
    label: "ทางเท้า",
  },

  road: {
    color: "#f4a261",
    label: "ถนน",
  },

  flood: {
    color: "#1d6fb8",
    label: "น้ำท่วม",
  },

  obstruct: {
    color: "#9d4edd",
    label: "กีดขวาง",
  },

  cctv_broken: {
    color: "#ff5da2",
    label: "กล้องเสีย (ร้องเรียน)",
  },
};

export const catColor = (category) => {
  return CAT[category]?.color || "#888";
};

// ============================================================
// 🧭 แปลงคำสั่งนำทาง ORS เป็นภาษาไทย
// ============================================================

export const MAN = {
  0: "เลี้ยวซ้าย",
  1: "เลี้ยวขวา",
  2: "เลี้ยวซ้ายหักศอก",
  3: "เลี้ยวขวาหักศอก",
  4: "เบี่ยงซ้าย",
  5: "เบี่ยงขวา",
  6: "ตรงไป",
  7: "เข้าวงเวียน",
  8: "ออกวงเวียน",
  9: "กลับรถ",
  10: "ถึงปลายทาง",
  11: "เริ่มเดิน",
  12: "ชิดซ้าย",
  13: "ชิดขวา",
};

export const thaiInstr = (step) => {
  const instruction =
    MAN[step.type] || "ไปต่อ";

  const roadName =
    step.name
      ? ` เข้า ${step.name}`
      : "";

  return instruction + roadName;
};

// ============================================================
// 🇬🇧 คำสั่งนำทางภาษาอังกฤษ
// ============================================================

export const TURN_EN = {
  เลี้ยวซ้าย: "turn left",
  เลี้ยวขวา: "turn right",
  เบี่ยงซ้าย: "keep left",
  เบี่ยงขวา: "keep right",
  เลี้ยวซ้ายหักศอก: "sharp left turn",
  เลี้ยวขวาหักศอก: "sharp right turn",
  ตรงไป: "go straight",
  กลับตัว: "make a U-turn",
};

// ============================================================
// 🛣️ ชื่อถนนภาษาอังกฤษ
// ============================================================

export const ROAD_EN = {
  // ตัวอย่าง:
  // "ฉลองกรุง": "Chalong Krung Road",
};

export function roadEN(thaiRoadName) {
  if (!thaiRoadName) {
    return "";
  }

  if (ROAD_EN[thaiRoadName]) {
    return ROAD_EN[thaiRoadName];
  }

  const matchedKey =
    Object.keys(ROAD_EN).find((key) =>
      thaiRoadName.includes(key)
    );

  return matchedKey
    ? ROAD_EN[matchedKey]
    : "";
}