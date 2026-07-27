// mapConstants.js — เดินกรุงเทพ (walkwe) สโคปใหม่: เขตลาดกระบัง เริ่มจากตึก สจล. (KMITL)
// โครงนี้ตัดระบบกลางวัน/กลางคืน + ความร่ม/ความสว่างออกแล้ว เหลือแค่นำทางในตึก-นอกตึกล้วนๆ

// ============================================================
// 🗺️ ศูนย์กลางแผนที่ + กรอบพื้นที่หลัก
// ============================================================
export const CENTER = [13.7292, 100.7789]; // ศูนย์กลางแถว สจล. ลาดกระบัง
export const ZOOM = 15;
export const DEMO_BBOX = [13.715, 100.771, 13.742, 100.786]; // [south, west, north, east] ครอบคลุมเขตลาดกระบัง — ขยายได้ตามจริง

// ============================================================
// 🧭 ประเภท node สำหรับปักบนผังตึก (ตัด bulb/light ออกแล้ว — ไม่มีระบบไฟ/ความสว่างอีกต่อไป)
// ============================================================
export const NODE_TYPES = [
  { id: "path", label: "ทางเดิน", icon: "•", color: "#4285F4" },
  { id: "stairs", label: "บันได", icon: "🪜", color: "#5F6368" },
  { id: "escalator", label: "บันไดเลื่อน", icon: "⬆", color: "#8E24AA" },
  { id: "lift", label: "ลิฟต์", icon: "🛗", color: "#8E24AA" },
  { id: "toilet", label: "ห้องน้ำ", icon: "🚻", color: "#1A73E8" },
  { id: "atm", label: "ATM", icon: "🏧", color: "#D93025" },
];

// ============================================================
// 🏢 KMITL — โครงตึกเดียว ตาม pattern เดิม (bounds/viewBox/outline/floors/nodes/edges)
// ⚠️ ทุกค่าด้านล่างเป็น placeholder ว่างเปล่า รอพิกัดจริงจากการสำรวจ/ปรับเทียบในแอป
// ============================================================

// กรอบภาพ SVG ทั้งใบบนแผนที่จริง — ได้จากโหมด "🔧 ปรับตำแหน่ง" (ลากมุม NW/SE) ในแอป
export const KMITL_BOUNDS = [[0, 0], [0, 0]]; // [south,west],[north,east] — รอค่าจริง

// ต้องตรงกับ attribute width/height ของ <svg> ไฟล์ผังตึกจริง
export const KMITL_VIEWBOX = { w: 0, h: 0 };

// พิกัด pixel ดิบของเส้นขอบตึก (คัดลอกตรงจาก path เส้นขอบในไฟล์ SVG)
export const KMITL_OUTLINE_PX = [
  // [x, y], [x, y], ...
];

// แปลง pixel (x,y ใน KMITL_VIEWBOX) → lat/lon จริง โดยอิง KMITL_BOUNDS เดียวกับที่ใช้วาดภาพ SVG เสมอ
export function kmitlPxToLatLng([x, y]) {
  const [[south, west], [north, east]] = KMITL_BOUNDS;
  return [north - (y / KMITL_VIEWBOX.h) * (north - south), west + (x / KMITL_VIEWBOX.w) * (east - west)];
}
export const KMITL_OUTLINE = KMITL_OUTLINE_PX.map(kmitlPxToLatLng);

// รายชั้น เรียงบนลงล่าง (ชั้นบนสุดก่อน) — เพิ่ม entry ตามชั้นจริงของตึก พร้อม path ไฟล์ SVG
export const KMITL_FLOORS = [
  // { id: "1", label: "1", svg: "/data/floorplans/kmitl/floor1.svg" },
];

// node/edge แยกตามชั้น — เพิ่มทีละชั้นตามที่มีข้อมูลสำรวจจริง เช่น
// export const KMITL_FLOOR1_NODES = { KmF1Stair0: { lat: 0, lon: 0, type: "stairs", label: "บันไดหลัก" } };
// export const KMITL_FLOOR1_EDGES = [["KmF1Stair0", "KmF1Path1"]];
export const KMITL_FLOOR1_NODES = {};
export const KMITL_FLOOR1_EDGES = [];

// เชื่อมระหว่างชั้น (ปลายบันได/ลิฟต์ชั้นหนึ่ง ↔ ปลายเดียวกันอีกชั้น)
export const KMITL_INTER_FLOOR_EDGES = [
  // ["KmF1Stair0End", "KmF2Stair0Start", "oneway"],
];

// จุดเชื่อมออกนอกตึก (ทางเข้า-ออกที่ต่อกับทางเท้อภายนอก)
export const KMITL_EXTERIOR_LINKS = [
  // { node: "KmF1Door0", lat: 0, lon: 0, type: "path", label: "ทางเข้าหลัก" },
];

// แปลงจุดเชื่อมนอกตึกให้เป็น node/edge ปกติ (ตั้งชื่ออัตโนมัติ KmExt0, KmExt1, ...)
export const KMITL_EXTERIOR_NODES = Object.fromEntries(
  KMITL_EXTERIOR_LINKS.map((e, i) => [`KmExt${i}`, { lat: e.lat, lon: e.lon, label: e.label || "ทางเข้า-ออก" }])
);
export const KMITL_EXTERIOR_EDGES = KMITL_EXTERIOR_LINKS.map((e, i) => [e.node, `KmExt${i}`]);

// กราฟรวมทั้งตึก (ทุกชั้น + เชื่อมระหว่างชั้น + จุดเชื่อมนอกตึก) — ใช้ตอนหาเส้นทางข้ามชั้น
// เพิ่มชั้นใหม่ในอนาคต: ต่อ ...KMITL_FLOORN_NODES / EDGES ตรงนี้
export const KMITL_ALL_NODES = { ...KMITL_FLOOR1_NODES, ...KMITL_EXTERIOR_NODES };
export const KMITL_ALL_EDGES = [...KMITL_FLOOR1_EDGES, ...KMITL_INTER_FLOOR_EDGES, ...KMITL_EXTERIOR_EDGES];

// id node -> ชั้นที่ node นั้นอยู่จริง ("1"/"2"/...) — ใช้ตัดสินว่าเส้นทาง/จุดไหนอยู่ชั้นไหน
export const KMITL_NODE_FLOOR = {};
for (const id in KMITL_FLOOR1_NODES) KMITL_NODE_FLOOR[id] = "1";
KMITL_EXTERIOR_LINKS.forEach((e, i) => { KMITL_NODE_FLOOR[`KmExt${i}`] = KMITL_NODE_FLOOR[e.node] || "1"; });

// ใช้รวมกับกราฟทางเท้ากลางแจ้ง (walkNet) ให้ Dijkstra เดินทะลุจากพื้นธรรมดา เข้าตึก ขึ้น/ลงชั้น ออกอีกฝั่งเป็นเส้นเดียวได้
export const BUILDING_GRAPHS = [
  { name: "kmitl", nodes: KMITL_ALL_NODES, edges: KMITL_ALL_EDGES, exteriorLinks: KMITL_EXTERIOR_LINKS },
];

// 🗂️ รวมทุกตึกไว้จุดเดียว (สำหรับ UI ทั่วไป: แสดงชื่อ/เปิดผัง/ปรับเทียบตำแหน่ง) — เพิ่มตึกใหม่ในอนาคตแค่เพิ่ม entry ตรงนี้
export const BUILDINGS = {
  kmitl: { name: "KMITL", bounds: KMITL_BOUNDS, outline: KMITL_OUTLINE, floors: KMITL_FLOORS },
};

// ตึกที่ล็อกตำแหน่งแล้ว/ไม่มีรูปทรงให้ปรับเทียบ (ซ่อนปุ่ม "ปรับตำแหน่ง") — ว่างไว้ก่อน
export const LOCKED_BUILDINGS = new Set([]);

// 🎯 กลุ่มปลายทางแบบ "ถึงจุดไหนก็ได้ก็ถือว่าถึง" — จับคู่ตาม prefix ของชื่อ node
export const NODE_GROUP_PREFIXES = [
  // { prefix: "KmGate", label: "🚪 ทางเข้า สจล. (ถึงจุดไหนก็ได้)" },
];

// รวมกราฟนำทางในตึกทุกอันไว้จุดเดียว — key เป็น "buildingKey:floorId"
export const ROUTE_GRAPHS = {
  "kmitl:1": { nodes: KMITL_FLOOR1_NODES, edges: KMITL_FLOOR1_EDGES },
};

// ============================================================
// 🛣️ ระบบทั่วไป (routing/POI) — คงไว้ตามเดิม ไม่เกี่ยวกับ scope พื้นที่
// ============================================================
export const OVERPASS_MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

export const CAT = {
  sidewalk: { color: "#e63946", label: "ทางเท้า" },
  road: { color: "#f4a261", label: "ถนน" },
  flood: { color: "#1d6fb8", label: "น้ำท่วม" },
  obstruct: { color: "#9d4edd", label: "กีดขวาง" },
  cctv_broken: { color: "#ff5da2", label: "กล้องเสีย (ร้องเรียน)" },
};
export const catColor = (c) => (CAT[c]?.color || "#888");

// แปลงรหัสการเลี้ยวของ ORS เป็นภาษาไทย
export const MAN = { 0: "เลี้ยวซ้าย", 1: "เลี้ยวขวา", 2: "เลี้ยวซ้ายหักศอก", 3: "เลี้ยวขวาหักศอก", 4: "เบี่ยงซ้าย", 5: "เบี่ยงขวา", 6: "ตรงไป", 7: "เข้าวงเวียน", 8: "ออกวงเวียน", 9: "กลับรถ", 10: "ถึงปลายทาง", 11: "เริ่มเดิน", 12: "ชิดซ้าย", 13: "ชิดขวา" };
export const thaiInstr = (st) => (MAN[st.type] || "ไปต่อ") + (st.name ? ` เข้า ${st.name}` : "");

export const TURN_EN = { "เลี้ยวซ้าย": "turn left", "เลี้ยวขวา": "turn right", "เบี่ยงซ้าย": "keep left", "เบี่ยงขวา": "keep right", "เลี้ยวซ้ายหักศอก": "sharp left turn", "เลี้ยวขวาหักศอก": "sharp right turn", "ตรงไป": "go straight", "กลับตัว": "make a U-turn" };

export const ROAD_EN = {
  // "ฉลองกรุง": "Chalong Krung Road",
};
export function roadEN(th) { if (!th) return ""; if (ROAD_EN[th]) return ROAD_EN[th]; const k = Object.keys(ROAD_EN).find((x) => th.includes(x)); return k ? ROAD_EN[k] : ""; }