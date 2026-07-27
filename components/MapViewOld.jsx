// 📦 ค่าคงที่ทั้งหมดของแผนที่: ศูนย์กลาง/ซูมเริ่มต้น, ผังตึก Siam Discovery, ผัง Skywalk Platum,
// หมวดปัญหา (CAT), ป้ายบอกทางเลี้ยว (MAN/ROAD_EN), และ mirror ของ Overpass API
export const CENTER = [13.7375, 100.5348];
export const ZOOM = 15;
export const DEMO_BBOX = [13.724, 100.527, 13.751, 100.542];
// 🏢 ผังตึก Siam Discovery — overlay ภาพ SVG ทับแผนที่ตามพิกัดจริงที่วัดมา (มุมภาพทั้งใบ NW/SE)
// ✅ ปรับเทียบแล้วจากโหมดลากในแอปจริง — NW 13°44'49.92"N 100°31'51.37"E · SE 13°44'46.19"N 100°31'55.15"E
export const SD_BOUNDS = [[13.746158, 100.532017], [13.747186, 100.530939]]; // [south,west],[north,east] — กรอบภาพ SVG ทั้งใบ
export const SD_VIEWBOX = { w: 572, h: 499 }; // ต้องตรงกับ viewBox ในไฟล์ SVG จริง (attribute width/height ของ <svg>)
// พิกัด pixel ดิบของเส้นขอบตึก (คัดลอกตรงจาก path เส้นขอบในไฟล์ SVG) — แหล่งข้อมูลเดียว ไม่มีชุดพิกัดแยกให้เพี้ยนกันอีก
export const SD_OUTLINE_PX = [
  [445.172, 78.2458], [520.2, 189.97], [524.952, 187.394], [537.599, 207.515], [533.559, 210.194],
  [545.365, 226.6], [541.216, 246.994], [522.622, 259.737], [532.491, 274.656], [486.988, 498.308],
  [225.771, 445.162], [45.798, 174.128],
];
// แปลง pixel (x,y ในกรอบ SD_VIEWBOX) → lat/lon จริงบนแผนที่ โดยอิง SD_BOUNDS เดียวกับที่ใช้วาดภาพ SVG เสมอ
// ⚠️ ห้ามสร้างชุดพิกัด lat/lon แยกไว้ล่วงหน้าอีก — ให้คำนวณจากฟังก์ชันนี้ทุกครั้งเพื่อกันขอบเพี้ยนจากภาพ
export function sdPxToLatLng([x, y]) {
  const [[south, west], [north, east]] = SD_BOUNDS;
  return [north - (y / SD_VIEWBOX.h) * (north - south), west + (x / SD_VIEWBOX.w) * (east - west)];
}
export const SD_OUTLINE = SD_OUTLINE_PX.map(sdPxToLatLng);
// เรียงบนลงล่างตามชั้นจริง (G ล่างสุด → 2 บนสุด) — เริ่มโชว์จากชั้นบนสุดตามที่ขอ
export const SD_FLOORS = [
  { id: "2", label: "2", svg: "/data/floorplans/siam_discovery/floor2.svg" },
  { id: "1", label: "1", svg: "/data/floorplans/siam_discovery/floor1.svg" },
  { id: "M", label: "M", svg: "/data/floorplans/siam_discovery/floorM.svg" },
  { id: "G", label: "G", svg: "/data/floorplans/siam_discovery/floorG.svg" },
];

// 🧭 ประเภท node สำหรับปักบนผังตึก — ใช้สร้างกราฟนำทางในตึกภายหลัง (ทางเดิน/บันได/บันไดเลื่อน/ลิฟต์/ห้องน้ำ/ATM)
export const SD_NODE_TYPES = [
  { id: "path", label: "ทางเดิน", icon: "•", color: "#4285F4" },
  { id: "stairs", label: "บันได", icon: "🪜", color: "#5F6368" },
  { id: "escalator", label: "บันไดเลื่อน", icon: "⬆", color: "#8E24AA" },
  { id: "lift", label: "ลิฟต์", icon: "🛗", color: "#8E24AA" },
  { id: "bts_gate", label: "ประตู BTS", icon: "🚉", color: "#1967D2" },
  { id: "toilet", label: "ห้องน้ำ", icon: "🚻", color: "#1A73E8" },
  { id: "atm", label: "ATM", icon: "🏧", color: "#D93025" },
  { id: "bulb", label: "หลอดไฟ", icon: "💡", color: "#F9AB00" },
  { id: "light", label: "ไฟ Skywalk", icon: "💡", color: "#F9AB00" }, // เหมือน bulb — ใช้กับชุดพิกัดไฟที่สำรวจ/ปักไว้ล่วงหน้า
];
// ⏰ ช่วงเวลาเปิด/ปิดเริ่มต้นของไฟ Skywalk เมื่อไม่ได้ระบุ onHour/offHour มาเอง (เช่น จุดที่สำรวจไว้ล่วงหน้า)
export const SKYWALK_LIGHT_DEFAULT_HOURS = { on: 18, off: 6 };
// 🧭 กราฟเดินจริงชั้น 2 Siam Discovery — จากพิกัดที่สำรวจ/ปักหมุดมาเอง (lat, lon)
// ⚠️ SdEsc1F2/SdEsc2F2 ยังไม่ได้ยืนยันจุดเชื่อม — สมมติเชื่อมกับ SdF2PC2 ไปก่อน (จุดใกล้สุด) แก้ได้ง่ายๆ ตรงนี้ทีหลัง
export const SD_FLOOR2_NODES = {
  SdEsc0F2: { lat: 13.7468870, lon: 100.5312079, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdEsc1F2: { lat: 13.7468154, lon: 100.5313085, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdEsc2F2: { lat: 13.7468349, lon: 100.5313125, type: "escalator", label: "บันไดเลื่อนลงไปชั้น 1" },
  SdF2PC1: { lat: 13.7468584, lon: 100.5311824, type: "path", label: "" },
  SdF2PC2: { lat: 13.7467933, lon: 100.5312307, type: "path", label: "" },
  SdF2PC2_1: { lat: 13.7467462, lon: 100.5312565, type: "path", label: "" },
  SdF2PCStarB: { lat: 13.7467060, lon: 100.5312495, type: "path", label: "Starbucks" },
  SdF2PC4: { lat: 13.7466344, lon: 100.5312951, type: "path", label: "" },
  SdF2PC5: { lat: 13.7466109, lon: 100.5313984, type: "path", label: "" },
  SdF2PC9: { lat: 13.7465367, lon: 100.5313608, type: "path", label: "" },
  SdF2PCMuji: { lat: 13.7464650, lon: 100.5315378, type: "path", label: "MUJI" },
  SdF2PC10_1: { lat: 13.7464792, lon: 100.5314711, type: "path", label: "" },
  SdF2PC10: { lat: 13.7464494, lon: 100.5314238, type: "path", label: "" },
  SdF2PC12: { lat: 13.7464585, lon: 100.5316143, type: "path", label: "" },
  SdF2PC6: { lat: 13.7465886, lon: 100.5315194, type: "path", label: "" },
  SdF2PC7: { lat: 13.7466694, lon: 100.5314644, type: "path", label: "" },
  SdF2PC8: { lat: 13.7467853, lon: 100.5313852, type: "path", label: "" },
  SdF2PC13: { lat: 13.7468348, lon: 100.5313504, type: "path", label: "" },
  SdF2PC14: { lat: 13.7469077, lon: 100.5313048, type: "path", label: "" },
  SdF2PC15: { lat: 13.7469208, lon: 100.5311921, type: "path", label: "" },
  SdF2PC8_5: { lat: 13.7468101, lon: 100.5313638, type: "path", label: "" },
  SdEsc4F2: { lat: 13.7464765, lon: 100.5316535, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdEsc5F2: { lat: 13.7464948, lon: 100.5316561, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdEsc3F2: { lat: 13.7465729, lon: 100.5314818, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdF2PC5_5: { lat: 13.7465977, lon: 100.5314671, type: "path", label: "" },

  SdF2PC16: { lat: 13.7464557, lon: 100.5316843, type: "path", label: "" },
  SdF2PC17: { lat: 13.7464831, lon: 100.5317366, type: "path", label: "" },
  SdF2PC18: { lat: 13.7465182, lon: 100.5318010, type: "path", label: "" },
  SdF2PC19: { lat: 13.7465573, lon: 100.5318506, type: "path", label: "" },
  SdF2PC20: { lat: 13.7466003, lon: 100.5318144, type: "path", label: "" },
  SdF2PC21: { lat: 13.7465664, lon: 100.5317675, type: "path", label: "" },
  SdF2PC22: { lat: 13.7465495, lon: 100.5317152, type: "path", label: "" },
  SdF2PC23: { lat: 13.7465690, lon: 100.5316132, type: "path", label: "" },
  
  SdF2PC24: { lat: 13.7468778, lon: 100.5314684, type: "path", label: "" },
  SdF2PC25: { lat: 13.7467905, lon: 100.5315368, type: "path", label: "" },
  SdF2PC26: { lat: 13.7468257, lon: 100.5315985, type: "path", label: "" },
  SdF2PC27: { lat: 13.7468257, lon: 100.5317594, type: "path", label: "" },
  SdF2PC28: { lat: 13.7468374, lon: 100.5317849, type: "path", label: "" },
  SdF2Lift: { lat: 13.7468608, lon: 100.5316588, type: "lift", label: "" },
  SdF2WC: { lat: 13.7468921, lon: 100.5317098, type: "WC", label: "" },
  SdF2ATM: { lat: 13.7468556, lon: 100.5317380, type: "atm", label: "" },
  SdF2PC29: { lat: 13.7467814, lon: 100.5318171, type: "path", label: "" },
  SdF2PC30: { lat: 13.7467410, lon: 100.5318506, type: "path", label: "" },
  SdF2PC31: { lat: 13.7467710, lon: 100.5318989, type: "path", label: "siam discovery to park" },

};
export const SD_FLOOR2_EDGES = [
  ["SdEsc0F2", "SdF2PC15"],
  ["SdEsc1F2", "SdF2PC8_5"],
  ["SdEsc2F2", "SdF2PC13"],
  ["SdF2PC1", "SdF2PC2"],
  ["SdF2PC2", "SdF2PC2_1"],
  ["SdF2PC2_1", "SdF2PCStarB"],
  ["SdF2PCStarB", "SdF2PC4"],
  ["SdF2PC4", "SdF2PC5"],
  ["SdF2PC5", "SdF2PC5_5"],
  ["SdF2PC4", "SdF2PC9"],
  ["SdF2PC9", "SdF2PC10"],
  ["SdF2PC10", "SdF2PC10_1"],
  ["SdF2PC10_1", "SdF2PCMuji"],
  ["SdF2PCMuji", "SdF2PC12"],
  ["SdF2PC6", "SdF2PC7"],
  ["SdF2PC7", "SdF2PC8"],
  ["SdF2PC8", "SdF2PC8_5"],
  ["SdF2PC14", "SdF2PC15"],
  ["SdF2PC13", "SdF2PC14"],
  ["SdF2PC15", "SdF2PC1"],
  ["SdF2PC8_5", "SdF2PC13"],
  ["SdF2PC6", "SdF2PC12"],
  ["SdF2PC5_5", "SdF2PC6"],
  ["SdEsc3F2", "SdF2PC5_5"],
  ["SdF2PC12", "SdF2PC16"],
  ["SdF2PC16", "SdF2PC17"],
  ["SdF2PC17", "SdF2PC18"],
  ["SdF2PC19", "SdF2PC20"],
  ["SdF2PC20", "SdF2PC21"],
  ["SdF2PC21", "SdF2PC22"],
  ["SdF2PC22", "SdF2PC17"],
  ["SdF2PC22", "SdF2PC23"],
  ["SdF2PC22", "SdF2PC18"],
  ["SdF2PC20", "SdF2PC18"],
  ["SdF2PC18", "SdF2PC19"],
  ["SdF2PC6", "SdF2PC23"],
  ["SdF2PC17", "SdEsc4F2"],
  ["SdF2PC17", "SdEsc5F2"],

  ["SdF2PC24", "SdF2PC25"],
  ["SdF2PC25", "SdF2PC26"],
  ["SdF2PC26", "SdF2Lift"],
  ["SdF2PC24", "SdF2PC14"],
  ["SdF2Lift", "SdF2WC"],
  ["SdF2WC", "SdF2ATM"],
  ["SdF2ATM", "SdF2PC27"],
  ["SdF2PC27", "SdF2PC28"],
  ["SdF2PC28", "SdF2PC29"],
  ["SdF2PC29", "SdF2PC30"],
  ["SdF2PC30", "SdF2PC31"],

];
export const SD_FLOOR1_NODES = {
  SdEsc1F1Start: { lat: 13.7468217, lon: 100.5312558, type: "escalator", label: "บันไดเลื่อนขึ้น ชั้น 1 → 2" },
  SdEsc2F1Start: { lat: 13.7466038, lon: 100.5310653, type: "escalator", label: "บันไดเลื่อนขึ้นจาก Skywalk" },
  SdEsc2F1End: { lat: 13.7467084, lon: 100.5311020, type: "escalator", label: "บันไดเลื่อนขึ้นจาก Skywalk" },
  SdEsc3F1Start: { lat: 13.7464088, lon: 100.5313072, type: "escalator", label: "บันไดเลื่อนลงไป Skywalk" },
  SdEsc3F1End: { lat: 13.7464006, lon: 100.5312128, type: "escalator", label: "บันไดเลื่อนลงไป Skywalk" },
  SdEsc4F1End: { lat: 13.7465035, lon: 100.5315253, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdEsc4F1Start: { lat: 13.7465686, lon: 100.5314823, type: "escalator", label: "บันไดเลื่อนขึ้นจากชั้น 1" },
  SdF1WC1: { lat: 13.7468800, lon: 100.5317103, type: "wc", label: "ห้องน้ำ" },
  SdF1Lift1: { lat: 13.7468539, lon: 100.5316661, type: "lift", label: "ลิฟต์" },
  SdF1PC1: { lat: 13.7467367, lon: 100.5311417, type: "path" },
  SdF1PC2: { lat: 13.7467718, lon: 100.5311886, type: "path" },
  SdF1PC3: { lat: 13.7468005, lon: 100.5312289, type: "path" },
  SdF1PC3_5: { lat: 13.7468122, lon: 100.5312570, type: "path" },
  SdF1PC4: { lat: 13.7468526, lon: 100.5311913, type: "path" },
  SdF1PC5: { lat: 13.7468995, lon: 100.5311967, type: "path" },
  SdF1PC6: { lat: 13.7468995, lon: 100.5312557, type: "path" },
  SdF1PC7: { lat: 13.7468734, lon: 100.5313791, type: "path" },
  SdF1PC8: { lat: 13.7469568, lon: 100.5313952, type: "path" },
  SdF1PC9: { lat: 13.7469855, lon: 100.5312798, type: "path" },
  SdF1PC10: { lat: 13.7469972, lon: 100.5312061, type: "path" },
  SdF1PC11: { lat: 13.7469334, lon: 100.5311873, type: "path" },

  SdF1PC12: { lat: 13.7468357, lon: 100.5313737, type: "path" },
  SdF1PC13: { lat: 13.7467275, lon: 100.5314448, type: "path" },
  SdF1PC14: { lat: 13.7467614, lon: 100.5315253, type: "path" },
  SdF1PC15: { lat: 13.7468057, lon: 100.5315869, type: "path" },

  SdF1PC16: { lat: 13.7468148, lon: 100.5317573, type: "path" },
  SdF1PC17: { lat: 13.7468252, lon: 100.5317827, type: "path" },
  SdF1PC18: { lat: 13.7467341, lon: 100.5318431, type: "path" },
  SdF1PC19: { lat: 13.7467653, lon: 100.5318967, type: "path", label: "to park" },
  SdF1PC20: { lat: 13.7467236, lon: 100.5312812, type: "path" },
  SdF1PC21: { lat: 13.7465999, lon: 100.5313630, type: "path" },
  SdF1PC22: { lat: 13.7464826, lon: 100.5314394, type: "path" },
  SdF1PC23: { lat: 13.7464201, lon: 100.5313657, type: "path" },

  SdF1PC24: { lat: 13.7466429, lon: 100.5315025, type: "path" },
  SdF1PC25: { lat: 13.7465165, lon: 100.5315749, type: "path" },
  SdF1PC26: { lat: 13.7464501, lon: 100.5315574, type: "path" },
  SdF1PC27: { lat: 13.7464201, lon: 100.5316620, type: "path" },
  SdF1PC28: { lat: 13.7464058, lon: 100.5317425, type: "path" },
  SdF1PC29: { lat: 13.7463237, lon: 100.5317988, type: "path" },
  SdF1PC30: { lat: 13.7464735, lon: 100.5317573, type: "path" },

};

export const SD_FLOOR1_EDGES = [
  ["SdF1PC1", "SdF1PC2"],
  ["SdF1PC3", "SdF1PC3_5"],
  ["SdF1PC2", "SdF1PC3"],
  ["SdF1PC3", "SdF1PC4"],
  ["SdF1PC5", "SdF1PC6"],
  ["SdF1PC4", "SdF1PC5"],
  ["SdF1PC6", "SdF1PC7"],
  ["SdF1PC7", "SdF1PC8"],
  ["SdF1PC8", "SdF1PC9"],
  ["SdF1PC9", "SdF1PC10"],
  ["SdF1PC9", "SdF1PC10"],
  ["SdF1PC9", "SdF1PC10"],
  ["SdF1PC10", "SdF1PC11"],
  ["SdF1PC5", "SdF1PC11"],
  ["SdEsc2F1End", "SdF1PC1"],
  ["SdEsc2F1End", "SdF1PC1"],
  ["SdEsc2F1Start", "SdEsc2F1End", "oneway"], // ⚠️ บันไดเลื่อนทางเดียว: ขึ้นจาก Skywalk เข้าตึกเท่านั้น ห้ามเดินย้อนออกจากตึกไป Skywalk ทางนี้
  ["SdEsc1F1Start", "SdF1PC3_5"],

  ["SdF1Lift1", "SdF1WC1"],
  ["SdEsc3F1Start", "SdEsc3F1End","oneway"],
  ["SdF1PC7", "SdF1PC12"],
  ["SdF1PC12", "SdF1PC13"],
  ["SdF1PC13", "SdF1PC14"],
  ["SdF1PC14", "SdF1PC15"],
  ["SdF1PC15", "SdF1Lift1"],
  ["SdF1WC1", "SdF1PC16"],
  ["SdF1PC16", "SdF1PC17"],
  ["SdF1PC17", "SdF1PC18"],
  ["SdF1PC18", "SdF1PC19"],
  ["SdF1PC23", "SdEsc3F1Start"],
  ["SdF1PC24", "SdEsc4F1Start"],
  //["SdEsc4F1Start", "SdEsc4F1End"],
  ["SdF1PC25", "SdEsc4F1End"],
  ["SdF1PC26", "SdEsc4F1End"],

  ["SdF1PC3", "SdF1PC20"],
  ["SdF1PC20", "SdF1PC21"],
  ["SdF1PC21", "SdF1PC22"],
  ["SdF1PC22", "SdF1PC23"],
  ["SdF1PC13", "SdF1PC24"],
  ["SdF1PC22", "SdF1PC26"],
  ["SdF1PC24", "SdF1PC25"],
  ["SdF1PC25", "SdF1PC30"],
  ["SdF1PC25", "SdF1PC26"],
  ["SdF1PC26", "SdF1PC27"],
  ["SdF1PC27", "SdF1PC28"],
  ["SdF1PC28", "SdF1PC29"],
  ["SdF1PC28", "SdF1PC30"],

  //["SdF1PC30", "SdF1PC"],
];
// 🏢 กราฟเดินจริงชั้น M (mezzanine) Siam Discovery — จากพิกัดที่สำรวจ/ปักหมุดมาเอง
// ⚠️ SdFmEsc1End/SdFmEsc2Start ยังไม่มี edge เชื่อมเข้าเครือข่ายทางเดินชั้นนี้เลย (รอสำรวจต่อ) — ตอนนี้เดินขึ้นบันไดเลื่อนมาแล้วจะเป็นจุดตัน ยังไปต่อทางอื่นในชั้น M ไม่ได้
export const SD_FLOORM_NODES = {
  SdFmEsc1End: { lat: 13.7465116, lon: 100.5315207, type: "escalator" },
  SdFmEsc2Start: { lat: 13.7468269, lon: 100.5312525, type: "escalator" },
  SdFmPC1: { lat: 13.7465808, lon: 100.5311935, type: "path" },
  SdFmPC2: { lat: 13.7466537, lon: 100.5313195, type: "path" },
  SdFmPC2_5: { lat: 13.7467876, lon: 100.5312337, type: "path" },

  SdFmPC3: { lat: 13.7468087, lon: 100.5312632, type: "path" },
  SdFmPC5: { lat: 13.7468699, lon: 100.5311720, type: "path" },
  SdFmPC6: { lat: 13.7469298, lon: 100.5311291, type: "path" },
  SdFmPC7: { lat: 13.7469116, lon: 100.5312471, type: "path" },
  SdFmPC8: { lat: 13.7469037, lon: 100.5313034, type: "path" }, //ต่อบันไดคู่แรก
  SdFmPC9: { lat: 13.7467214, lon: 100.5314228, type: "path" },
  SdFmPC10: { lat: 13.7467787, lon: 100.5315287, type: "path" },
  SdFmPC11: { lat: 13.7468777, lon: 100.5314603, type: "path" },
  SdFmWc: { lat: 13.7468997, lon: 100.5317098, type: "ห้องน้ำ" }, 
  SdFmLift: { lat: 13.7468593, lon: 100.5316575, type: "path" },
  SdFmPC12: { lat: 13.7465168, lon: 100.5315636, type: "path" },
  SdFmPC13: { lat: 13.7464960, lon: 100.5315408, type: "path" },

};
export const SD_FLOORM_EDGES = [
  ["SdFmPC1", "SdFmPC2"],
  ["SdFmPC2", "SdFmPC2_5"],
  ["SdFmPC2_5", "SdFmPC5"],
  ["SdFmPC2_5", "SdFmPC3"],
  ["SdFmEsc2Start", "SdFmPC3"],
  ["SdFmPC5", "SdFmPC6"],
  ["SdFmPC6", "SdFmPC7"],
  ["SdFmPC8", "SdFmPC7"],
  ["SdFmPC8", "SdFmPC9"],
  ["SdFmPC9", "SdFmPC2"],
  ["SdFmPC9", "SdFmPC10"],
  ["SdFmPC8", "SdFmPC11"],
  ["SdFmPC10", "SdFmPC11"],
  ["SdFmPC10", "SdFmEsc1End"], //
  ["SdFmPC9", "SdFmPC12"],
  ["SdFmLift", "SdFmWc"],
  ["SdFmPC9", "SdFmPC12"],
  ["SdFmPC12", "SdFmPC13"],
  ["SdFmEsc1End", "SdFmPC13"],

];
//กลับมากรอก
export const SD_INTER_FLOOR_EDGES = [
  // ✅ พิกัดตรงกัน (ห่าง <10 ม.) ยืนยันจากชุดข้อมูลที่สำรวจแล้ว
  ["SdEsc1F1Start", "SdEsc0F2", "oneway"],
  ["SdEsc4F1Start", "SdEsc3F2", "oneway"],
  ["SdEsc3F2", "SdEsc4F1End", "oneway"],
  ["SdF2Lift", "SdF1Lift1"],
  ["SdF2Lift", "SdF1Lift1"], 
 
];
export const SD_EXTERIOR_LINKS = [
  { node: "SdF2PC31", lat: 13.7467710, lon: 100.5318989, type: "path", label: "siam discovery to park"  },
  { node: "SdF1PC29", lat: 13.7463237, lon: 100.5317988, type: "path", label: "siam discovery to siam center"  },
  { node: "SdEsc2F1Start", lat: 13.7466038, lon: 100.5310653, type: "escalator", label: "บันไดเลื่อนขึ้นจาก Skywalk" }, // แก้จาก SdEsc2F1End: จุดนี้ (Start) ต่างหากที่แตะ skywalk จริง ส่วน End คือจุดในตึกหลังขึ้นบันไดแล้ว
  { node: "SdEsc3F1End",  lat: 13.7464006, lon: 100.5312128, type: "escalator", label: "exit siam discovery to  skywalk (Floor 1)" },
  { node: "SdFmPC1",  lat: 13.7465808, lon: 100.5311935, type: "path", label: "exit siam discovery to  skywalk (Floor M)" },
  { node: "SdF2PC19",  lat: 13.7465573, lon: 100.5318506, type: "path", label: "exit siam discovery to  skywalk (Floor 1)" },

];

// แปลงจุดเชื่อมนอกตึกแต่ละจุดให้เป็น node/edge ปกติ (ตั้งชื่ออัตโนมัติ SdExt0, SdExt1, ...)
export const SD_EXTERIOR_NODES = Object.fromEntries(
  SD_EXTERIOR_LINKS.map((e, i) => [`SdExt${i}`, { lat: e.lat, lon: e.lon, label: e.label || "ทางเข้า-ออก" }])
);
export const SD_EXTERIOR_EDGES = SD_EXTERIOR_LINKS.map((e, i) => [e.node, `SdExt${i}`]);
 
// 🏢 กราฟรวมทั้งตึก (ทุกชั้น + เชื่อมระหว่างชั้น + จุดเชื่อมนอกตึก) — ใช้ตอนอยากหาเส้นทางข้ามชั้น
// node id ของแต่ละชั้นต้องไม่ซ้ำกันเอง (ตั้งชื่อแยกด้วย F1/F2 อยู่แล้วในข้อมูลเดิม) ไม่งั้น merge แล้วจะทับกัน
export const SD_ALL_NODES = { ...SD_FLOOR1_NODES, ...SD_FLOOR2_NODES, ...SD_FLOORM_NODES, ...SD_EXTERIOR_NODES };
export const SD_ALL_EDGES = [...SD_FLOOR1_EDGES, ...SD_FLOOR2_EDGES, ...SD_FLOORM_EDGES, ...SD_INTER_FLOOR_EDGES, ...SD_EXTERIOR_EDGES];

// 🗺️ id node -> ชั้นที่ node นั้นอยู่จริง ("1"/"2"/"M") — ใช้ตัดสินว่าเส้นทาง/จุดไหนอยู่ชั้นไหน เวลาจะเน้น/จางเส้นตามชั้นที่ผู้ใช้เลือกดู
// จุดเชื่อมนอกตึก (SdExt0, SdExt1, ...) นับตามชั้นของ node ปลายทางใน exteriorLinks ที่มันต่อออกไป
export const SD_NODE_FLOOR = {};
for (const id in SD_FLOOR1_NODES) SD_NODE_FLOOR[id] = "1";
for (const id in SD_FLOOR2_NODES) SD_NODE_FLOOR[id] = "2";
for (const id in SD_FLOORM_NODES) SD_NODE_FLOOR[id] = "M";
SD_EXTERIOR_LINKS.forEach((e, i) => { SD_NODE_FLOOR[`SdExt${i}`] = SD_NODE_FLOOR[e.node] || "1"; });

// 🏢 รายชื่อตึกที่มีกราฟในตึก + จุดเชื่อมออกนอกตึก (exteriorLinks) — ประกาศจริงอยู่ท้ายไฟล์ (หลัง BACC_FLOOR_EDGES) เพราะต้องรอข้อมูล BACC ก่อน

export const SKYWALK_SVG = "/data/floorplans/skywalk/skywalk_platum.svg";
export const SKYWALK_BOUNDS = [
  [13.747336, 100.529719],
  [13.745367, 100.531367],
  
];


// กรอบสี่เหลี่ยมของภาพ ใช้เป็นพื้นที่กด/ตรวจจับซูมเข้าใกล้ (ยังไม่มีเส้นขอบจริงแบบ SD_OUTLINE)
export const SKYWALK_OUTLINE = [
  [SKYWALK_BOUNDS[0][0], SKYWALK_BOUNDS[0][1]],
  [SKYWALK_BOUNDS[0][0], SKYWALK_BOUNDS[1][1]],
  [SKYWALK_BOUNDS[1][0], SKYWALK_BOUNDS[1][1]],
  [SKYWALK_BOUNDS[1][0], SKYWALK_BOUNDS[0][1]],
];

export const BACC_BOUNDS = [
  [13.746017, 100.530706], // [south, west]
  [13.747422, 100.529869], // [north, east]
];
// กรอบสี่เหลี่ยมของภาพ ใช้เป็นพื้นที่กด/ตรวจจับซูมเข้าใกล้ (ยังไม่มีเส้นขอบจริงแบบ SD_OUTLINE — ใช้สี่เหลี่ยมไปก่อน)
export const BACC_OUTLINE = [
  [BACC_BOUNDS[0][0], BACC_BOUNDS[0][1]],
  [BACC_BOUNDS[0][0], BACC_BOUNDS[1][1]],
  [BACC_BOUNDS[1][0], BACC_BOUNDS[1][1]],
  [BACC_BOUNDS[1][0], BACC_BOUNDS[0][1]],
];
// เรียงบนลงล่างเหมือน SD_FLOORS (9 ชั้นบนสุด → 1 ล่างสุด) — เพิ่ม/ลดชั้นแค่แก้ array นี้
export const BACC_FLOORS = [
  { id: "9", label: "9", svg: "/data/floorplans/bacc/floor9.svg" },
  { id: "8", label: "8", svg: "/data/floorplans/bacc/floor8.svg" },
  { id: "7", label: "7", svg: "/data/floorplans/bacc/floor7.svg" },
  { id: "6", label: "6", svg: "/data/floorplans/bacc/floor6.svg" },
  { id: "5", label: "5", svg: "/data/floorplans/bacc/floor5.svg" },
  { id: "4", label: "4", svg: "/data/floorplans/bacc/floor4.svg" },
  { id: "3", label: "3", svg: "/data/floorplans/bacc/floor3.svg" },
  { id: "2", label: "2", svg: "/data/floorplans/bacc/floor2.svg" },
  { id: "1", label: "1", svg: "/data/floorplans/bacc/floor1.svg" },
];

// 🧭 กราฟเดินจริงแต่ละชั้นของ BACC — key คือ floor id ("1".."9") ตรงกับ BACC_FLOORS
// รูปแบบเดียวกับ SD_FLOOR1_NODES/EDGES: nodes เป็น object {id: {lat, lon, label?}}, edges เป็น [[idA, idB], ...]
export const BACC_FLOOR_NODES = {
  "9": {
  },
  "8": {},
  "7": {},
  "6": {},
  "5": {},
  "4": {},
  "3": {
    "BaF3PC1": { lat: 13.7465182, lon: 100.5301617, type: "path", label: "" },
    "BaF3PC2": { lat: 13.7465989, lon: 100.5301751, type: "path", label: "" },
    "BaF3PC3": { lat: 13.7466836, lon: 100.5301912, type: "path", label: "" },
    "BaF3PC4": { lat: 13.7467721, lon: 100.5301470, type: "path", label: "" },
    "BaF3PC5": { lat: 13.7468412, lon: 100.5301724, type: "path", label: "" },
    BaF3PC6: { lat: 13.7468789, lon: 100.5302261, type: "path", label: "" },
    BaF3PC7: { lat: 13.7468724, lon: 100.5303119, type: "path", label: "" },
    BaF3PC8: { lat: 13.7468190, lon: 100.5303642, type: "path", label: "" },
    BaF3PC9: { lat: 13.7468138, lon: 100.5304314, type: "path", label: "" },
    BaF3PC10: { lat: 13.7468073, lon: 100.5305119, type: "path", label: "" },
    BaF3PC11: { lat: 13.7468398, lon: 100.5305816, type: "path", label: "" },
    BaF3PC12: { lat: 13.7468789, lon: 100.5306339, type: "path", label: "" },
    BaF3PC13: { lat: 13.7467695, lon: 100.5304140, type: "path", label: "" },
    BaF3PC14: { lat: 13.7467226, lon: 100.5303375, type: "path", label: "" },
    
    BaF3PC15: { lat: 13.7467148, lon: 100.5303159, type: "path", label: "" },
    BaF3PC16: { lat: 13.7467396, lon: 100.5302958, type: "path", label: "" },
    BaF3PC17: { lat: 13.7466783, lon: 100.5302958, type: "path", label: "" },
    BaF3PC18: { lat: 13.7466770, lon: 100.5302314, type: "path", label: "" },
    BaEsc1F3: { lat: 13.7467632, lon: 100.5303147, type: "escalator", label: "ตัวใน" },
    BaEsc2F3: { lat: 13.7467436, lon: 100.5303255, type: "escalator", label: "ตัวนอก" },

  },
  "2": {},
  "1": {},
};

export const BACC_FLOOR_EDGES = {
  "9": [
    // ["BaccEsc0F9", "BaccPC1F9"],
  ],
  "8": [],
  "7": [],
  "6": [],
  "5": [],
  "4": [],
  "3": [
    ["BaF3PC1","BaF3PC2"],
    ["BaF3PC2","BaF3PC3"],
    ["BaF3PC3","BaF3PC4"],
    ["BaF3PC4","BaF3PC5"],
    ["BaF3PC5","BaF3PC6"],
    ["BaF3PC6","BaF3PC7"],
    ["BaF3PC7","BaF3PC8"],
    ["BaF3PC8","BaF3PC9"],
    ["BaF3PC9","BaF3PC10"],
    ["BaF3PC10","BaF3PC11"],
    ["BaF3PC11","BaF3PC12"],
    ["BaF3PC9","BaF3PC13"],
    ["BaF3PC13","BaF3PC14"],
    ["BaF3PC14","BaF3PC15"],
    ["BaF3PC15","BaF3PC16"],
    ["BaF3PC16","BaF3PC17"],
    ["BaF3PC18","BaF3PC17"],
    ["BaF3PC18","BaF3PC3"],
    ["BaEsc1F3","BaF3PC15"],
    ["BaEsc2F3","BaF3PC15"],
  ],
  "2": [],
  "1": [],
};

// 🏢 รวมทุกชั้นของ BACC เป็นกราฟเดียว (ตอนนี้มีข้อมูลจริงแค่ชั้น 3 ชั้นอื่นว่างไว้ก่อน) + จุดเชื่อมออกนอกตึก
export const BACC_ALL_NODES = Object.assign({}, ...Object.values(BACC_FLOOR_NODES));
export const BACC_ALL_EDGES_RAW = Object.values(BACC_FLOOR_EDGES).flat();
// 🗺️ id node -> ชั้นที่อยู่จริง (ใช้แบบเดียวกับ SD_NODE_FLOOR)
export const BACC_NODE_FLOOR = {};
for (const floor in BACC_FLOOR_NODES) for (const id in BACC_FLOOR_NODES[floor]) BACC_NODE_FLOOR[id] = floor;
// 🌉 จุดเชื่อมออกนอกตึกของ BACC — ชั้น 3 เชื่อมออกไป skywalk ผ่าน BaF3PC1 (ยืนยันจากข้อมูลที่สำรวจแล้ว)
export const BACC_EXTERIOR_LINKS = [
  { node: "BaF3PC1", lat: 13.7465182, lon: 100.5301617, type: "path", label: "BACC ชั้น 3 เชื่อมออก Skywalk" },
];
export const BACC_EXTERIOR_NODES = Object.fromEntries(
  BACC_EXTERIOR_LINKS.map((e, i) => [`BaExt${i}`, { lat: e.lat, lon: e.lon, label: e.label || "ทางเข้า-ออก" }])
);
export const BACC_EXTERIOR_EDGES = BACC_EXTERIOR_LINKS.map((e, i) => [e.node, `BaExt${i}`]);
BACC_EXTERIOR_LINKS.forEach((e, i) => { BACC_NODE_FLOOR[`BaExt${i}`] = BACC_NODE_FLOOR[e.node] || "3"; });
export const BACC_ALL_NODES_FULL = { ...BACC_ALL_NODES, ...BACC_EXTERIOR_NODES };
export const BACC_ALL_EDGES = [...BACC_ALL_EDGES_RAW, ...BACC_EXTERIOR_EDGES];

// 🏢 รายชื่อตึกที่มีกราฟในตึก + จุดเชื่อมออกนอกตึก (exteriorLinks) พร้อมใช้จริงแล้ว
// ใช้รวมกับกราฟทางเท้ากลางแจ้ง (walkNet) ให้ Dijkstra เดินทะลุจากพื้นธรรมดา เข้าตึก ขึ้น/ลงชั้น ออกอีกฝั่งเป็นเส้นเดียวได้
export const BUILDING_GRAPHS = [
  { name: "siam_discovery", nodes: SD_ALL_NODES, edges: SD_ALL_EDGES, exteriorLinks: SD_EXTERIOR_LINKS },
  { name: "bacc", nodes: BACC_ALL_NODES_FULL, edges: BACC_ALL_EDGES, exteriorLinks: BACC_EXTERIOR_LINKS },
];
export const OVERPASS_MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
export const CAT = {
  sidewalk: { color: "#e63946", label: "ทางเท้า" },
  road: { color: "#f4a261", label: "ถนน" },
  flood: { color: "#1d6fb8", label: "น้ำท่วม" },
  light: { color: "#3a0ca3", label: "จุดมืด/แสงสว่าง" },
  obstruct: { color: "#9d4edd", label: "กีดขวาง" },
  cctv_broken: { color: "#ff5da2", label: "กล้องเสีย (ร้องเรียน)" },
};
export const catColor = (c) => (CAT[c]?.color || "#888");
// แปลงรหัสการเลี้ยวของ ORS เป็นภาษาไทย
export const MAN = { 0: "เลี้ยวซ้าย", 1: "เลี้ยวขวา", 2: "เลี้ยวซ้ายหักศอก", 3: "เลี้ยวขวาหักศอก", 4: "เบี่ยงซ้าย", 5: "เบี่ยงขวา", 6: "ตรงไป", 7: "เข้าวงเวียน", 8: "ออกวงเวียน", 9: "กลับรถ", 10: "ถึงปลายทาง", 11: "เริ่มเดิน", 12: "ชิดซ้าย", 13: "ชิดขวา" };
export const thaiInstr = (st) => (MAN[st.type] || "ไปต่อ") + (st.name ? ` เข้า ${st.name}` : "");
// ระบบเสียง (speak/speakNow/unlockSpeech/loadVoices/hasThaiVoice) ย้ายไป ./speech แล้ว ใช้ร่วมกับ Nav3D
export const TURN_EN = { "เลี้ยวซ้าย": "turn left", "เลี้ยวขวา": "turn right", "เบี่ยงซ้าย": "keep left", "เบี่ยงขวา": "keep right", "เลี้ยวซ้ายหักศอก": "sharp left turn", "เลี้ยวขวาหักศอก": "sharp right turn", "ตรงไป": "go straight", "กลับตัว": "make a U-turn" };
export const ROAD_EN = {
  "อังรีดูนังต์": "Henri Dunant Road", "พระรามที่ 1": "Rama I Road", "พระราม 1": "Rama I Road",
  "พระรามที่ 4": "Rama IV Road", "พระราม 4": "Rama IV Road", "พระรามที่ 6": "Rama VI Road", "พระราม 6": "Rama VI Road",
  "พญาไท": "Phaya Thai Road", "ราชดำริ": "Ratchadamri Road", "เพชรบุรี": "Phetchaburi Road",
  "สุขุมวิท": "Sukhumvit Road", "สีลม": "Silom Road", "สาทร": "Sathon Road", "ศรีอยุธยา": "Si Ayutthaya Road",
  "ราชปรารภ": "Ratchaprarop Road", "เพลินจิต": "Phloen Chit Road", "วิทยุ": "Witthayu Road",
  "จุฬาลงกรณ์": "Chulalongkorn", "พระราม 3": "Rama III Road", "นราธิวาส": "Narathiwat Road",
};
export function roadEN(th) { if (!th) return ""; if (ROAD_EN[th]) return ROAD_EN[th]; const k = Object.keys(ROAD_EN).find((x) => th.includes(x)); return k ? ROAD_EN[k] : ""; }
// ========================================================================
// 🏢 SIAM CENTER (SC) — ผังตึกเหมือน SD ทุกอย่าง (bounds/outline/floors/nodes/edges)
// ⚠️ ข้อมูลย้ายมาจากไฟล์ MapView เก่า — ยังไม่ได้ปรับเทียบ NW/SE ในแอปจริง ต้องกด "🔧 ปรับตำแหน่ง" ก่อนใช้งานจริง
// ========================================================================
export const CEN_BOUNDS = [[13.745825, 100.531931], [13.746742, 100.533631]]; // [south,west],[north,east]
export const CEN_VIEWBOX = { w: 351, h: 181 };
export const CEN_OUTLINE_PX = [
  [343.418, 72.3965], [325.601, 168.91], [7.58691, 105.606], [26.3926, 10.5859], [343.418, 72.3965],
];
export function cenPxToLatLng([x, y]) {
  const [[south, west], [north, east]] = CEN_BOUNDS;
  return [north - (y / CEN_VIEWBOX.h) * (north - south), west + (x / CEN_VIEWBOX.w) * (east - west)];
}
export const CEN_OUTLINE = CEN_OUTLINE_PX.map(cenPxToLatLng);
export const CEN_FLOORS = [
  { id: "2", label: "2", svg: "/data/floorplans/siam_center/floor2.svg" },
  { id: "1", label: "1", svg: "/data/floorplans/siam_center/floor1.svg" },
];

// 🧭 กราฟเดินจริงชั้น 1 Siam Center
export const SC_FLOOR1_NODES = {
  ScF1PC1: { lat: 13.7465149, lon: 100.5321772, type: "path", label: "" },
  ScF1PC2: { lat: 13.7464901, lon: 100.5323019, type: "path", label: "" },
  ScLift1f1: { lat: 13.7465239, lon: 100.5323307, type: "lift", label: "" },
  ScF1PC3: { lat: 13.7464732, lon: 100.5324440, type: "path", label: "" },
  ScF1PC4: { lat: 13.7464654, lon: 100.5324963, type: "path", label: "" },
  ScF1PC5: { lat: 13.7464415, lon: 100.5326051, type: "path", label: "" },
  ScF1PC6: { lat: 13.7464146, lon: 100.5327404, type: "path", label: "" },
  ScLift2f1: { lat: 13.7464509, lon: 100.5327411, type: "lift", label: "" },
  ScF1PC7: { lat: 13.7463893, lon: 100.5328707, type: "path", label: "" },
  ScF1PC8: { lat: 13.7463612, lon: 100.5330288, type: "path", label: "" },
  ScF1PC9: { lat: 13.7463443, lon: 100.5331401, type: "path", label: "" },
  ScLift3f1: { lat: 13.7463481, lon: 100.5332963, type: "lift", label: "" },
  ScF1PC10: { lat: 13.7462693, lon: 100.5332730, type: "path", label: "" },
  ScF1PC11: { lat: 13.7462440, lon: 100.5333627, type: "path", label: "" },
  ScF1PC12: { lat: 13.7462244, lon: 100.5334459, type: "path", label: "" },
  ScF1PC13: { lat: 13.7464355, lon: 100.5321383, type: "path", label: "" },
  ScF1PC14: { lat: 13.7463888, lon: 100.5324514, type: "path", label: "" },
  ScF1PC15: { lat: 13.7463522, lon: 100.5325929, type: "path", label: "" },
  ScF1PC16: { lat: 13.7463237, lon: 100.5328564, type: "path", label: "" },
  ScF1PC17: { lat: 13.7461732, lon: 100.5332448, type: "path", label: "" },
  ScEsc3F1_DownStart: { lat: 13.7462217, lon: 100.5331421, type: "escalator", label: "บันไดเลื่อนลงไปชั้น M" },
  ScEsc3F1_DownEnd: { lat: 13.7461787, lon: 100.5332252, type: "escalator", label: "" },
  ScEsc3F1_UpStart: { lat: 13.7461865, lon: 100.5331340, type: "escalator", label: "บันไดเลื่อนขึ้นไปชั้น 2" },
  ScEsc2F1_DownStart: { lat: 13.7462934, lon: 100.5327398, type: "escalator", label: "บันไดเลื่อนลงไปชั้น M" },
  ScEsc2F1_DownEnd: { lat: 13.7462530, lon: 100.5328242, type: "escalator", label: "" },
  ScEsc2F1_UpStart: { lat: 13.7462569, lon: 100.5327304, type: "escalator", label: "บันไดเลื่อนขึ้นไปชั้น 2" },
  ScEsc1F1_DownStart: { lat: 13.7463859, lon: 100.5323227, type: "escalator", label: "บันไดเลื่อนลงไปชั้น M" },
  ScEsc1F1_DownEnd: { lat: 13.7463442, lon: 100.5324206, type: "escalator", label: "" },
  ScEsc1F1_UpStart: { lat: 13.7463468, lon: 100.5323267, type: "escalator", label: "บันไดเลื่อนขึ้นไปชั้น 2" },
  // ⚠️ ScEsc0F1_R/_L พิกัดซ้ำกันเป๊ะ (13.7465005,100.5321148) — ต้นฉบับน่าจะยังไม่ได้แยกจุดจริง รอสำรวจแก้
  ScEsc0F1_R: { lat: 13.7465005, lon: 100.5321148, type: "escalator", label: "บันไดเลื่อนฝั่งติด Siam Discovery" },
  ScEsc0F1_L: { lat: 13.7465005, lon: 100.5321148, type: "escalator", label: "บันไดเลื่อนฝั่งติด Siam Discovery" },
  SpEscScStart: { lat: 13.7461580, lon: 100.5336115, type: "escalator", label: "บันไดเลื่อนไป SIAM CENTER" },
  SpEscScEnd: { lat: 13.7461801, lon: 100.5335377, type: "escalator", label: "" },
  ScEscSpStart: { lat: 13.7462088, lon: 100.5335404, type: "escalator", label: "บันไดเลื่อนลงไป SIAM PARAGON" },
  ScEscSpEnd: { lat: 13.7461918, lon: 100.5336168, type: "escalator", label: "" },
  ScF1PC18: { lat: 13.7461432, lon: 100.5333401, type: "path", label: "" },
  ScF1PC19: { lat: 13.7463339, lon: 100.5321141, type: "path", label: "" },
  ScF1PC20: { lat: 13.7462962, lon: 100.5322885, type: "path", label: "" },
  ScF1PC21: { lat: 13.7462688, lon: 100.5324239, type: "path", label: "" },
  ScF1PC22: { lat: 13.7462376, lon: 100.5325621, type: "path", label: "" },
  ScF1PC23: { lat: 13.7462245, lon: 100.5328343, type: "path", label: "" },
  ScF1PC24: { lat: 13.7461289, lon: 100.5328143, type: "path", label: "" },
  ScF1PC25: { lat: 13.7460995, lon: 100.5330945, type: "path", label: "" },
  ScF1PC26: { lat: 13.7460415, lon: 100.5332127, type: "path", label: "" },
  ScF1PC27: { lat: 13.7460220, lon: 100.5333132, type: "path", label: "" },
  ScF1PC28: { lat: 13.7460031, lon: 100.5334003, type: "path", label: "" },
  ScLinkToBTS_start: { lat: 13.7459468, lon: 100.5333835, type: "stairs", label: "บันไดเชื่อม Siam Center-BTS สยาม" },
  ScLinkToBTS_end: { lat: 13.7458765, lon: 100.5333661, type: "stairs", label: "บันไดเชื่อม Siam Center-BTS สยาม" },
  ScF1PC29: { lat: 13.7460513, lon: 100.5331039, type: "path", label: "" },
  ScF1PC30: { lat: 13.7460917, lon: 100.5329563, type: "path", label: "" },
  ScF1PC31: { lat: 13.7461757, lon: 100.5325434, type: "path", label: "" },
  ScF1PC32: { lat: 13.7462031, lon: 100.5324040, type: "path", label: "" },
  ScF1PC33: { lat: 13.7462113, lon: 100.5323354, type: "path", label: "" },
  ScF1PC34: { lat: 13.7462252, lon: 100.5322712, type: "path", label: "" },
  ScF1PC35: { lat: 13.7462517, lon: 100.5321195, type: "path", label: "" },
  ScF1PC36: { lat: 13.7462608, lon: 100.5320699, type: "path", label: "" },
  ScF1PC9_5: { lat: 13.7462993, lon: 100.5331376, type: "path", label: "" },
  ScF1PC15_5: { lat: 13.7463334, lon: 100.5327218, type: "path", label: "" },
  ScF1PC15_6: { lat: 13.7462943, lon: 100.5327191, type: "path", label: "" },

  ScLinkToSsq: { lat: 13.7462191, lon: 100.5319921, type: "escalator", label: "เชื่อมไป Siam Square" },
};
export const SC_FLOOR1_EDGES = [
  ["ScF1PC1", "ScF1PC2"], ["ScF1PC1", "ScF1PC13"], ["ScF1PC2", "ScF1PC3"],
  ["ScF1PC2", "ScLift1f1"], ["ScLift1f1", "ScF1PC3"], ["ScF1PC3", "ScF1PC4"], ["ScF1PC3", "ScF1PC14"], ["ScF1PC14", "ScF1PC4"],
  ["ScF1PC4", "ScF1PC5"], ["ScF1PC5", "ScF1PC6"], ["ScF1PC5", "ScF1PC15"],
  ["ScF1PC6", "ScLift2f1"], ["ScLift2f1", "ScF1PC7"], ["ScF1PC7", "ScF1PC16"], ["ScF1PC7", "ScF1PC8"],
  ["ScF1PC8", "ScF1PC9"], ["ScF1PC9", "ScF1PC9_5"],["ScF1PC10", "ScF1PC9_5"],  ["ScF1PC6", "ScF1PC7"],
  ["ScF1PC10", "ScLift3f1"], ["ScLift3f1", "ScF1PC10"],
  ["ScF1PC10", "ScF1PC11"], ["ScF1PC11", "ScF1PC12"], ["ScF1PC10", "ScF1PC17"],
  ["ScF1PC11", "ScF1PC18"], ["ScF1PC18", "ScF1PC27"],
  ["ScF1PC13", "ScF1PC19"], ["ScF1PC19", "ScF1PC35"], ["ScF1PC19", "ScF1PC36"],
  ["ScF1PC35", "ScF1PC36"], ["ScF1PC34", "ScF1PC35"], ["ScF1PC34", "ScF1PC20"], ["ScF1PC34", "ScF1PC33"], ["ScF1PC15", "ScF1PC22"],
  ["ScF1PC16", "ScF1PC23"], ["ScF1PC15_5", "ScF1PC15"], ["ScF1PC15_5", "ScF1PC15_6"],
  ["ScEsc3F1_DownEnd", "ScF1PC10"], ["ScEsc3F1_DownEnd", "ScF1PC18"], ["ScEsc3F1_DownEnd", "ScF1PC17"],
  ["ScF1PC17", "ScF1PC18"], ["ScF1PC17", "ScF1PC26"],
  ["ScF1PC21", "ScF1PC32"], ["ScF1PC33", "ScF1PC32"],
  ["ScF1PC31", "ScF1PC22"], ["ScF1PC22", "ScF1PC31"], ["ScF1PC32", "ScF1PC31"],
  ["ScF1PC23", "ScF1PC24"], ["ScF1PC24", "ScF1PC30"],
  ["ScF1PC25", "ScF1PC26"], ["ScF1PC26", "ScF1PC27"],
  ["ScF1PC27", "ScF1PC28"], ["ScF1PC28", "ScLinkToBTS_start"], ["ScLinkToBTS_start", "ScLinkToBTS_end"],
  ["ScF1PC29", "ScF1PC25"], ["ScF1PC29", "ScF1PC26"], ["ScF1PC29", "ScF1PC30"],
  ["ScF1PC24", "ScF1PC31"], ["ScF1PC36", "ScLinkToSsq"],
  ["SpEscScEnd", "ScF1PC12"], ["ScEscSpStart", "ScF1PC12"], ["SpEscScStart", "SpEscScEnd"], ["ScEscSpStart", "ScEscSpEnd"],
  ["ScF1PC25", "ScEsc3F1_UpStart"],
  ["ScEsc0F1_L", "ScF1PC1"], ["ScEsc0F1_L", "ScEsc0F1_R"], ["ScEsc0F1_R", "ScF1PC1"], ["ScEsc0F1_R", "ScF1PC13"],
  ["ScEsc1F1_UpStart", "ScF1PC20"],
  ["ScEsc1F1_DownStart", "ScF1PC2"], ["ScEsc1F1_DownStart", "ScLift1f1"],
  ["ScEsc1F1_DownEnd", "ScF1PC21"],
  ["ScEsc1F1_DownEnd", "ScF1PC14"], ["ScF1PC14", "ScF1PC21"],
  ["ScEsc2F1_UpStart", "ScF1PC15_6"], ["ScEsc2F1_DownStart", "ScLift2f1"], ["ScEsc2F1_DownStart", "ScF1PC15_6"],
  ["ScEsc2F1_DownEnd", "ScF1PC23"], ["ScEsc2F1_DownEnd", "ScF1PC16"],
  ["ScEsc3F1_UpStart", "ScF1PC25"], ["ScEsc3F1_UpStart", "ScEsc3F1_DownStart"], ["ScEsc3F1_DownStart", "ScF1PC9"],
];

// 🧭 กราฟเดินจริงชั้น 2 Siam Center
export const SC_FLOOR2_NODES = {
  SdLinkToSc: { lat: 13.7465018, lon: 100.5318841, type: "path", label: "Skywalk ไป Siam Center" },
  ScEnt1F2: { lat: 13.7464705, lon: 100.5320303, type: "path", label: "Skywalk ไป Siam Discovery" },
  ScF2PC1: { lat: 13.7464640, lon: 100.5321027, type: "path", label: "" },
  ScF2PC2: { lat: 13.7464458, lon: 100.5321993, type: "path", label: "" },
  ScF2PC3: { lat: 13.7464275, lon: 100.5322932, type: "path", label: "" },
  ScF2PC4: { lat: 13.7463885, lon: 100.5323455, type: "path", label: "" },
  ScF2PC5: { lat: 13.7463647, lon: 100.5324361, type: "path", label: "" },
  ScF2PC6: { lat: 13.7464393, lon: 100.5324501, type: "path", label: "" },
  ScF2PC7: { lat: 13.7464588, lon: 100.5323857, type: "path", label: "" },
  ScLift1f2: { lat: 13.7464844, lon: 100.5323452, type: "lift", label: "" },
  ScToPark1f2: { lat: 13.7465565, lon: 100.5324380, type: "path", label: "" },
  ScEsc1F2_DownStart: { lat: 13.7463280, lon: 100.5323208, type: "escalator", label: "บันไดเลื่อนลงไปชั้น 1" },
  ScF2PC24: { lat: 13.7462986, lon: 100.5322938, type: "path", label: "" },
  ScF2PC25: { lat: 13.7462127, lon: 100.5322751, type: "path", label: "" },
  ScEsc1F2_UpEnd: { lat: 13.7462837, lon: 100.5324107, type: "escalator", label: "" },
  ScF2PC27: { lat: 13.7462634, lon: 100.5324266, type: "path", label: "" },
  ScF2PC26: { lat: 13.7461944, lon: 100.5323394, type: "path", label: "" },
  ScF2PC28: { lat: 13.7461853, lon: 100.5324132, type: "path", label: "" },
  ScF2PC8: { lat: 13.7463560, lon: 100.5324762, type: "path", label: "" },
  ScF2PC9: { lat: 13.7463365, lon: 100.5325661, type: "path", label: "" },
  ScF2PC10: { lat: 13.7463125, lon: 100.5327084, type: "path", label: "" },
  ScF2PC11: { lat: 13.7463156, lon: 100.5327498, type: "path", label: "" },
  ScF2PC12: { lat: 13.7463781, lon: 100.5327673, type: "path", label: "" },
  ScF2PC13: { lat: 13.7464914, lon: 100.5327847, type: "path", label: "" },
  ScF2PC14: { lat: 13.7463078, lon: 100.5328276, type: "path", label: "" },
  ScF2PC15: { lat: 13.7463052, lon: 100.5329027, type: "path", label: "" },
  ScF2PC16: { lat: 13.7462922, lon: 100.5329711, type: "path", label: "" },
  ScF2PC17: { lat: 13.7462752, lon: 100.5330556, type: "path", label: "" },
  ScF2PC18: { lat: 13.7462648, lon: 100.5331253, type: "path", label: "" },
  ScF2PC19: { lat: 13.7462526, lon: 100.5332878, type: "path", label: "" },
  ScF2PC20: { lat: 13.7462440, lon: 100.5333144, type: "path", label: "" },
  ScF2PC21: { lat: 13.7462296, lon: 100.5333842, type: "path", label: "" },
  ScF2PC22: { lat: 13.7462856, lon: 100.5334324, type: "path", label: "" },
  ScF2PC23: { lat: 13.7463364, lon: 100.5335196, type: "path", label: "" },
  ScF2PC29: { lat: 13.7461697, lon: 100.5324870, type: "path", label: "" },
  ScF2PC30: { lat: 13.7461567, lon: 100.5325621, type: "path", label: "" },
  ScF2PC31: { lat: 13.7461411, lon: 100.5326506, type: "path", label: "" },
  ScF2PC32: { lat: 13.7461880, lon: 100.5326881, type: "path", label: "" },
  ScF2PC33: { lat: 13.7462362, lon: 100.5326975, type: "path", label: "" },
  ScF2PC34: { lat: 13.7461294, lon: 100.5327096, type: "path", label: "" },
  ScF2PC35: { lat: 13.7461189, lon: 100.5327833, type: "path", label: "" },
  ScF2PC36: { lat: 13.7461072, lon: 100.5328383, type: "path", label: "" },
  ScF2PC37: { lat: 13.7460955, lon: 100.5328947, type: "path", label: "" },
  ScF2PC38: { lat: 13.7461866, lon: 100.5328142, type: "path", label: "" },
  ScF2PC39: { lat: 13.7461762, lon: 100.5328933, type: "path", label: "" },
  ScF2PC40: { lat: 13.7462114, lon: 100.5329791, type: "path", label: "" },
  ScF2PC41: { lat: 13.7461866, lon: 100.5330730, type: "path", label: "" },
  ScF2PC42: { lat: 13.7460733, lon: 100.5329993, type: "path", label: "" },
  ScF2PC43: { lat: 13.7460603, lon: 100.5330811, type: "path", label: "" },
  ScF2PC44: { lat: 13.7460473, lon: 100.5331589, type: "path", label: "" },
  ScF2PC45: { lat: 13.7460616, lon: 100.5332849, type: "path", label: "" },
  ScF2PC46: { lat: 13.7461332, lon: 100.5333037, type: "path", label: "" },
  ScEsc2F2_DownStart: { lat: 13.7462655, lon: 100.5327151, type: "escalator", label: "บันไดเลื่อนลงไปชั้น 1" },
  ScEsc2F2_UpEnd: { lat: 13.7462205, lon: 100.5327994, type: "escalator", label: "" },
  ScEsc3F2_DownStart: { lat: 13.7461881, lon: 100.5331515, type: "escalator", label: "บันไดเลื่อนลงไปชั้น 1" },
  ScEsc3F2_UpEnd: { lat: 13.7461372, lon: 100.5332433, type: "escalator", label: "" },
  ScToPark3f2: { lat: 13.7464080, lon: 100.5332165, type: "path", label: "" },
  ScToPark2f2: { lat: 13.7464901, lon: 100.5327833, type: "path", label: "" },
  ScLift2f2: { lat: 13.7464145, lon: 100.5327230, type: "lift", label: "" },
  ScLift3f2: { lat: 13.7463025, lon: 100.5332983, type: "lift", label: "" },
  Scf2WC1: { lat: 13.7464718, lon: 100.5327331, type: "toilet", label: "" },
  Scf2WC2: { lat: 13.7459380, lon: 100.5332641, type: "toilet", label: "" },

  ScF2PC3_5: { lat: 13.7463686, lon: 100.5323128, type: "path", label: "" },

};
export const SC_FLOOR2_EDGES = [
  ["SdLinkToSc", "ScEnt1F2"], ["ScEnt1F2", "ScF2PC1"], ["ScF2PC1", "ScF2PC2"], ["ScF2PC2", "ScF2PC3"],
  ["ScEsc2F2_UpEnd", "ScF2PC38"], ["ScEsc2F2_UpEnd", "ScF2PC11"], ["ScEsc2F2_UpEnd", "ScF2PC40"],
  ["ScToPark2f2", "ScF2PC13"], ["Scf2WC1", "ScF2PC13"],["ScF2PC3_5","ScF2PC3"],["ScF2PC3_5","ScF2PC4"],
  ["ScF2PC3", "ScF2PC4"], ["ScF2PC5", "ScF2PC4"], ["ScF2PC3", "ScLift1f2"], ["ScF2PC3", "ScEsc1F2_DownStart"],
  ["ScF2PC24", "ScEsc1F2_DownStart"], ["ScF2PC25", "ScF2PC26"], ["ScF2PC25", "ScF2PC24"],  ["ScF2PC27", "ScF2PC28"],
  ["ScF2PC26", "ScF2PC28"], ["ScF2PC27", "ScEsc1F2_UpEnd"], ["ScF2PC5", "ScEsc1F2_UpEnd"],["ScF2PC5", "ScF2PC27"],
  ["ScF2PC5", "ScF2PC6"], ["ScF2PC6", "ScF2PC7"], ["ScLift1f2", "ScF2PC7"], ["ScToPark1f2", "ScF2PC7"],
  ["ScF2PC5", "ScF2PC8"], ["ScF2PC8", "ScF2PC9"], ["ScF2PC9", "ScF2PC10"], ["ScF2PC10", "ScF2PC11"],
  ["ScF2PC11", "ScF2PC12"], ["ScF2PC12", "ScF2PC13"], ["ScF2PC10", "ScEsc2F2_DownStart"], ["ScF2PC14", "ScF2PC15"],
  ["ScF2PC11", "ScF2PC14"], ["ScF2PC15", "ScF2PC16"], ["ScF2PC15", "ScF2PC40"], ["ScF2PC16", "ScF2PC17"],
  ["ScF2PC17", "ScF2PC18"], ["ScF2PC17", "ScF2PC41"], ["ScF2PC17", "ScEsc3F2_DownStart"], ["ScF2PC18", "ScEsc3F2_DownStart"],
  ["ScF2PC18", "ScF2PC19"], ["ScF2PC18", "ScToPark3f2"], ["ScF2PC19", "ScToPark3f2"], ["ScF2PC19", "ScF2PC20"],
  ["ScF2PC19", "ScLift3f2"], ["ScF2PC20", "ScLift3f2"], ["ScF2PC19", "ScEsc3F2_UpEnd"], ["ScF2PC46", "ScEsc3F2_UpEnd"],
  ["ScF2PC20", "ScF2PC21"], ["ScF2PC20", "ScF2PC46"], ["ScF2PC21", "ScF2PC22"], ["ScF2PC22", "ScF2PC23"],
  ["ScF2PC28", "ScF2PC29"], ["ScF2PC29", "ScF2PC30"], ["ScF2PC30", "ScF2PC31"], ["ScF2PC31", "ScF2PC32"],
  ["ScF2PC32", "ScF2PC33"], ["ScF2PC32", "ScF2PC34"], ["ScF2PC31", "ScF2PC34"], ["ScF2PC34", "ScF2PC35"],
  ["ScF2PC35", "ScF2PC36"], ["ScF2PC36", "ScF2PC37"], ["ScF2PC37", "ScF2PC38"], ["ScF2PC38", "ScF2PC39"],
  ["ScF2PC37", "ScF2PC39"], ["ScF2PC39", "ScF2PC40"], ["ScF2PC40", "ScF2PC41"], ["ScF2PC37", "ScF2PC42"],
  ["ScF2PC41", "ScF2PC42"], ["ScF2PC41", "ScEsc3F2_DownStart"], ["ScF2PC42", "ScF2PC43"], ["ScF2PC43", "ScF2PC44"],
  ["ScF2PC44", "Scf2WC2"], ["ScF2PC45", "Scf2WC2"], ["ScF2PC45", "ScF2PC46"],
  ["ScLift2f2", "ScF2PC10"], ["ScLift2f2", "ScF2PC11"], ["ScLift2f2", "ScF2PC12"],
];

// 🔗 เชื่อมชั้น 1↔2 ของ Siam Center — จับคู่บันไดเลื่อน/ลิฟต์จากพิกัดที่ใกล้กันจริง (<6 ม.)
// ⚠️ ทิศทางยังไม่ยืนยันจากผู้ใช้ (ต่างจาก SD ที่ยืนยันแล้ว) — ใส่เป็นเดินได้ 2 ทางไว้ก่อน ปลอดภัยกว่าเดาทิศผิด
export const SC_INTER_FLOOR_EDGES = [
  ["ScLift1f1", "ScLift1f2"], ["ScLift2f1", "ScLift2f2"], ["ScLift3f1", "ScLift3f2"],
  
  ["ScEsc1F1_UpStart", "ScEsc1F2_DownStart"], ["ScEsc1F1_DownEnd", "ScEsc1F2_UpEnd"],
  ["ScEsc2F1_UpStart", "ScEsc2F2_DownStart"], ["ScEsc2F1_DownEnd", "ScEsc2F2_UpEnd"],
  ["ScEsc3F1_UpStart", "ScEsc3F2_DownStart"], ["ScEsc3F1_DownEnd", "ScEsc3F2_UpEnd"],
];

// 🚶 Skywalk เชื่อม Siam Center ↔ Siam Paragon
// ⚠️ ยังไม่มีรูปทรงตึกจริงจาก SVG (ใช้ viewBox คำนวณ outline คร่าวๆ) และยังไม่ได้ปรับเทียบ NW/SE ในแอปจริง
export const SW_BOUNDS = [[13.7456944, 100.5333944], [13.7464028, 100.5344278]]; // [south,west],[north,east]
export const SW_VIEWBOX = { w: 2486, h: 2844 };
export const SW_OUTLINE_PX = [
  [400.337, 84.5001], [1398.84, 220.001], [2485.34, -0.00071023], [2215.84, 220.001], [2052.97, 456.5],
  [1966.84, 738.5], [1966.84, 1041.0], [1999.84, 1290.0], [2095.66, 1460.0], [2161.84, 1600.5],
  [2261.34, 1696.0], [2095.34, 2721.5], [2077.84, 2843.5], [0.000425934, 2538.39], [400.337, 84.5001],
];
export function swPxToLatLng([x, y]) {
  const [[south, west], [north, east]] = SW_BOUNDS;
  return [north - (y / SW_VIEWBOX.h) * (north - south), west + (x / SW_VIEWBOX.w) * (east - west)];
}
export const SW_OUTLINE = SW_OUTLINE_PX.map(swPxToLatLng);
export const SW_FLOORS = [{ id: "1", label: "1", svg: "/data/floorplans/skywalk_sc_sp/floor1.svg" }];
export const SW_SC_SP_NODES = {
  SpEscScStart: { lat: 13.7461580, lon: 100.5336115, type: "escalator", label: "บันไดเลื่อนไป SIAM CENTER" },
  SpEscScEnd: { lat: 13.7461801, lon: 100.5335377, type: "escalator", label: "" },
  ScEscSpStart: { lat: 13.7462088, lon: 100.5335404, type: "escalator", label: "บันไดเลื่อนลงไป SIAM PARAGON" },
  ScEscSpEnd: { lat: 13.7461918, lon: 100.5336168, type: "escalator", label: "" },
  SwF1PC1: { lat: 13.7459090, lon: 100.5335873, type: "path", label: "" },
  SwF1PC2: { lat: 13.7458908, lon: 100.5336919, type: "path", label: "" },
  SwF1PC3: { lat: 13.7458699, lon: 100.5338207, type: "path", label: "" },
  SwF1PC4: { lat: 13.7458517, lon: 100.5339307, type: "path", label: "" },
  SwF1PC5: { lat: 13.7458230, lon: 100.5340514, type: "path", label: "" },
  SwF1PC6: { lat: 13.7458048, lon: 100.5341613, type: "path", label: "" },
  SwF1PC7: { lat: 13.7457891, lon: 100.5342579, type: "path", label: "" },
  SwF1PC8: { lat: 13.7457214, lon: 100.5342579, type: "path", label: "" },
  SwF1PC9: { lat: 13.7460080, lon: 100.5336088, type: "path", label: "" },
  SwF1PC10: { lat: 13.7459950, lon: 100.5337134, type: "path", label: "" },
  SwF1PC11: { lat: 13.7459689, lon: 100.5338368, type: "path", label: "" },
  SwF1PC12: { lat: 13.7459507, lon: 100.5339575, type: "path", label: "" },
  SwF1PC13: { lat: 13.7461070, lon: 100.5336249, type: "path", label: "" },
  SwF1PC14: { lat: 13.7460966, lon: 100.5337322, type: "path", label: "" },
  SwF1PC15: { lat: 13.7460705, lon: 100.5338475, type: "path", label: "" },
  SwF1PC16: { lat: 13.7460523, lon: 100.5339736, type: "path", label: "" },
  SwF1PC17: { lat: 13.7461799, lon: 100.5336544, type: "path", label: "" },
  SwF1PC18: { lat: 13.7461669, lon: 100.5337590, type: "path", label: "" },
  SwF1PC19: { lat: 13.7461487, lon: 100.5338582, type: "path", label: "" },
  SwF1PC20: { lat: 13.7461461, lon: 100.5339468, type: "path", label: "" },
  SwF1PC21: { lat: 13.7462711, lon: 100.5336785, type: "path", label: "" },
  SwF1PC22: { lat: 13.7462529, lon: 100.5337778, type: "path", label: "" },
  SwF1PC23: { lat: 13.7462373, lon: 100.5338931, type: "path", label: "" },
  SwF1PC24: { lat: 13.7463441, lon: 100.5336973, type: "path", label: "" },
  SwF1PC25: { lat: 13.7463337, lon: 100.5338046, type: "path", label: "" },
  SwF1PC26: { lat: 13.7463285, lon: 100.5339226, type: "path", label: "" },
};
export const SW_SC_SP_EDGES = [
  ["SwF1PC1", "SwF1PC2"], ["SwF1PC2", "SwF1PC3"], ["SwF1PC3", "SwF1PC4"],
  ["SwF1PC9", "SwF1PC10"], ["SwF1PC10", "SwF1PC11"], ["SwF1PC11", "SwF1PC12"],
  ["SwF1PC13", "SwF1PC14"], ["SwF1PC14", "SwF1PC15"], ["SwF1PC15", "SwF1PC16"],
  ["SwF1PC17", "SwF1PC18"], ["SwF1PC18", "SwF1PC19"], ["SwF1PC19", "SwF1PC20"],
  ["SwF1PC21", "SwF1PC22"], ["SwF1PC22", "SwF1PC23"],
  ["SwF1PC24", "SwF1PC25"], ["SwF1PC25", "SwF1PC26"],
  ["SwF1PC1", "SwF1PC9"], ["SwF1PC9", "SwF1PC13"], ["SwF1PC13", "SwF1PC17"], ["SwF1PC17", "SwF1PC21"], ["SwF1PC21", "SwF1PC24"],
  ["SwF1PC2", "SwF1PC10"], ["SwF1PC10", "SwF1PC14"], ["SwF1PC14", "SwF1PC18"], ["SwF1PC18", "SwF1PC22"], ["SwF1PC22", "SwF1PC25"],
  ["SwF1PC3", "SwF1PC11"], ["SwF1PC11", "SwF1PC15"], ["SwF1PC15", "SwF1PC19"], ["SwF1PC19", "SwF1PC23"], ["SwF1PC23", "SwF1PC26"],
  ["SwF1PC4", "SwF1PC12"], ["SwF1PC12", "SwF1PC16"], ["SwF1PC16", "SwF1PC20"],
  ["SpEscScStart", "SpEscScEnd"], ["SpEscScStart", "SwF1PC17"],
  ["ScEscSpStart", "ScEscSpEnd"], ["ScEscSpEnd", "SwF1PC17"],
  ["SwF1PC4", "SwF1PC5"], ["SwF1PC6", "SwF1PC5"], ["SwF1PC7", "SwF1PC6"], ["SwF1PC7", "SwF1PC8"],
  ["SwF1PC7", "BtsSiam_gate3"],
];

// 🚉 สถานี BTS สยาม — ไฟล์ SVG เป็นภาพประกอบหลายชิ้น ไม่มี path ขอบเดียวชัดเจนแบบตึกอื่น เลยใช้กรอบ viewBox ทั้งใบแทน
export const BTS_BOUNDS = [[13.7452778, 100.5332500], [13.7460361, 100.5351611]]; // [south,west],[north,east]
export const BTS_VIEWBOX = { w: 11800, h: 3779 };
export const BTS_OUTLINE_PX = [[0, 0], [11800, 0], [11800, 3779], [0, 3779], [0, 0]];
export function btsPxToLatLng([x, y]) {
  const [[south, west], [north, east]] = BTS_BOUNDS;
  return [north - (y / BTS_VIEWBOX.h) * (north - south), west + (x / BTS_VIEWBOX.w) * (east - west)];
}
export const BTS_OUTLINE = BTS_OUTLINE_PX.map(btsPxToLatLng);
export const BTS_FLOORS = [{ id: "1", label: "1", svg: "/data/floorplans/bts_siam/floor1.svg" }];
export const BTS_FLOOR1_NODES = {
  BtsSiam_gate1: { lat: 13.7458615, lon: 100.5333815, type: "bts_gate", label: "ประตู BTS สยาม 1" },
  BtsSiam_gate2: { lat: 13.7457079, lon: 100.5333339, type: "bts_gate", label: "ประตู BTS สยาม 2" },
  BtsSiam_gate3: { lat: 13.7457064, lon: 100.5342545, type: "bts_gate", label: "ประตู BTS สยาม 3" },
  BtsSiam_gate4: { lat: 13.7455255, lon: 100.5342103, type: "bts_gate", label: "ประตู BTS สยาม 4" },
  path1_BTSWALK: { lat: 13.7458591, lon: 100.5333741, type: "path", label: "" },
  path2_BTSWALK: { lat: 13.7458213, lon: 100.5333674, type: "path", label: "" },
  path3_BTSWALK: { lat: 13.7457848, lon: 100.5333580, type: "path", label: "" },
  path4_BTSWALK: { lat: 13.7457444, lon: 100.5333473, type: "path", label: "" },
  path6_BTSWALK: { lat: 13.7456876, lon: 100.5342485, type: "path", label: "" },
  path7_BTSWALK: { lat: 13.7456459, lon: 100.5342405, type: "path", label: "" },
  path8_BTSWALK: { lat: 13.7456055, lon: 100.5342297, type: "path", label: "" },
  path9_BTSWALK: { lat: 13.7455665, lon: 100.5342230, type: "path", label: "" },
};
export const BTS_FLOOR1_EDGES = [
  ["ScLinkToBTS_end", "BtsSiam_gate1"],
  ["BtsSiam_gate1", "path1_BTSWALK"], ["path1_BTSWALK", "path2_BTSWALK"], ["path2_BTSWALK", "path3_BTSWALK"],
  ["path3_BTSWALK", "path4_BTSWALK"], ["path4_BTSWALK", "BtsSiam_gate2"],
  ["BtsSiam_gate3", "path6_BTSWALK"], ["path6_BTSWALK", "path7_BTSWALK"], ["path7_BTSWALK", "path8_BTSWALK"],
  ["path8_BTSWALK", "path9_BTSWALK"], ["path9_BTSWALK", "BtsSiam_gate4"],
];

export const SC_ALL_NODES = { ...SC_FLOOR1_NODES, ...SC_FLOOR2_NODES, ...BTS_FLOOR1_NODES, ...SW_SC_SP_NODES };
// 🌉 รวม BTS สยาม + Skywalk SC-SP เข้ากราฟ Siam Center เป็นก้อนเดียว — เพราะมี edge เชื่อมข้ามถึงกันโดยตรง
// (ScLinkToBTS_end→BtsSiam_gate1, SwF1PC7→BtsSiam_gate3 ฯลฯ) ต้องรวมกราฟไม่งั้นเดินข้ามไม่ได้จริง เหมือนตอนรวมชั้น 1↔2 ของ Center เอง
export const SC_ALL_EDGES_RAW = [...SC_FLOOR1_EDGES, ...SC_FLOOR2_EDGES, ...SC_INTER_FLOOR_EDGES, ...BTS_FLOOR1_EDGES, ...SW_SC_SP_EDGES];
export const SC_NODE_FLOOR = {};
for (const id in SC_FLOOR1_NODES) SC_NODE_FLOOR[id] = "1";
for (const id in SC_FLOOR2_NODES) SC_NODE_FLOOR[id] = "2";
for (const id in BTS_FLOOR1_NODES) SC_NODE_FLOOR[id] = "1";
for (const id in SW_SC_SP_NODES) SC_NODE_FLOOR[id] = "1";
// 🌉 จุดเชื่อมออกนอกตึกของ Siam Center — "ScLinkToBTS_end"/"ScEscSpStart" ไม่ใช่จุดออกจริงอีกต่อไป (กลายเป็นทางเดินภายในหลังรวมกราฟ BTS/Skywalk เข้ามา)
// จุดออกจริงตอนนี้คือประตู BTS สยามทั้ง 4 ประตู (แตะถนน/ทางเท้าจริง) แทน
export const SC_EXTERIOR_LINKS = [
  { node: "ScLinkToSsq", lat: 13.7462191, lon: 100.5319921, type: "escalator", label: "Siam Center เชื่อม Siam Square" },
  { node: "ScEnt1F2", lat: 13.7464705, lon: 100.5320303, type: "path", label: "Skywalk ไป Siam Discovery" },
  { node: "BtsSiam_gate1", lat: 13.7458615, lon: 100.5333815, type: "bts_gate", label: "ประตู BTS สยาม 1" },
  { node: "BtsSiam_gate2", lat: 13.7457079, lon: 100.5333339, type: "bts_gate", label: "ประตู BTS สยาม 2" },
  { node: "BtsSiam_gate3", lat: 13.7457064, lon: 100.5342545, type: "bts_gate", label: "ประตู BTS สยาม 3" },
  { node: "BtsSiam_gate4", lat: 13.7455255, lon: 100.5342103, type: "bts_gate", label: "ประตู BTS สยาม 4" },
];
export const SC_EXTERIOR_NODES = Object.fromEntries(
  SC_EXTERIOR_LINKS.map((e, i) => [`ScExt${i}`, { lat: e.lat, lon: e.lon, label: e.label || "ทางเข้า-ออก" }])
);
export const SC_EXTERIOR_EDGES = SC_EXTERIOR_LINKS.map((e, i) => [e.node, `ScExt${i}`]);
SC_EXTERIOR_LINKS.forEach((e, i) => { SC_NODE_FLOOR[`ScExt${i}`] = SC_NODE_FLOOR[e.node] || "1"; });
export const SC_ALL_NODES_FULL = { ...SC_ALL_NODES, ...SC_EXTERIOR_NODES };
export const SC_ALL_EDGES = [...SC_ALL_EDGES_RAW, ...SC_EXTERIOR_EDGES];

// ========================================================================
// 🏢 LIDO CONNECT (LD) — ผังตึกเหมือน SD ทุกอย่าง
// ⚠️ พิกัดกรอบภาพเป็นค่าประมาณ ต้องกด "🔧 ปรับตำแหน่ง" ในแอปก่อนใช้งานจริง
// ========================================================================
export const LD_BOUNDS = [[13.745797, 100.532317], [13.745022, 100.532725]]; // [south,west],[north,east]
export const LD_VIEWBOX = { w: 3806, h: 7614 };
export const LD_OUTLINE_PX = [
  [779.422, 1865.38], [1081.81, 248.413], [925.52, 219.185], [875.98, 484.093], [360.418, 387.677],
  [111.521, 1718.6], [228.985, 1740.57], [239.82, 1791.43], [735.723, 1884.17], [779.422, 1865.38],
];
export function ldPxToLatLng([x, y]) {
  const [[south, west], [north, east]] = LD_BOUNDS;
  return [north - (y / LD_VIEWBOX.h) * (north - south), west + (x / LD_VIEWBOX.w) * (east - west)];
}
export const LD_OUTLINE = LD_OUTLINE_PX.map(ldPxToLatLng);
export const LD_FLOORS = [
  { id: "2", label: "2", svg: "/data/floorplans/lido/floor2.svg" },
  { id: "1", label: "1", svg: "/data/floorplans/lido/floor1.svg" },
];

export const LD_FLOOR1_NODES = {
  LidoSt1f1start: { lat: 13.7457135, lon: 100.5326673, type: "stairs", label: "" },
  LidoSt2f1start: { lat: 13.7457135, lon: 100.5324554, type: "stairs", label: "" },
  LidoSt2f1end: { lat: 13.7456745, lon: 100.5324487, type: "stairs", label: "" },
  LidoLiftf1: { lat: 13.7457448, lon: 100.5324541, type: "lift", label: "" },
  LidoSt3f1start: { lat: 13.7452394, lon: 100.5323683, type: "stairs", label: "" },
  LidoSt3f1end: { lat: 13.7452030, lon: 100.5323616, type: "stairs", label: "" },
  LdF1WC: { lat: 13.7453306, lon: 100.5325212, type: "toilet", label: "" },
  LdF1PC1: { lat: 13.7456225, lon: 100.5326271, type: "path", label: "" },
  LdF1PC2: { lat: 13.7455834, lon: 100.5326177, type: "path", label: "" },
  LdF1PC3: { lat: 13.7455365, lon: 100.5326056, type: "path", label: "" },
  LdF1PC4: { lat: 13.7454883, lon: 100.5325989, type: "path", label: "" },
  LdF1PC5: { lat: 13.7454427, lon: 100.5325896, type: "path", label: "" },
  LdF1PC6: { lat: 13.7453906, lon: 100.5325815, type: "path", label: "" },
  LdF1PC7: { lat: 13.7453424, lon: 100.5325708, type: "path", label: "" },
  LdF1PC8: { lat: 13.7453033, lon: 100.5325614, type: "path", label: "" },
  LdF1PC9: { lat: 13.7452486, lon: 100.5325520, type: "path", label: "" },
  LdF1PC10: { lat: 13.7451991, lon: 100.5325413, type: "path", label: "" },
  LdF1PC11: { lat: 13.7451418, lon: 100.5325305, type: "path", label: "" },
  LdF1PC12: { lat: 13.7451040, lon: 100.5325238, type: "path", label: "" },
  LdF1PC13: { lat: 13.7451131, lon: 100.5324769, type: "path", label: "" },
  LdF1PC14: { lat: 13.7451235, lon: 100.5324326, type: "path", label: "" },
  LdF1PC15: { lat: 13.7450923, lon: 100.5323951, type: "path", label: "" },
  LdF1PC16: { lat: 13.7451431, lon: 100.5323777, type: "path", label: "" },
  LdF1PC17: { lat: 13.7452108, lon: 100.5323924, type: "path", label: "" },
  LdF1PC18: { lat: 13.7452812, lon: 100.5324112, type: "path", label: "" },
  LdF1PC19: { lat: 13.7453489, lon: 100.5324273, type: "path", label: "" },
  LdF1PC20: { lat: 13.7454127, lon: 100.5324407, type: "path", label: "" },
  LdF1PC21: { lat: 13.7454662, lon: 100.5324487, type: "path", label: "" },
  LdF1PC22: { lat: 13.7455130, lon: 100.5324769, type: "path", label: "" },
  LdF1PC23: { lat: 13.7455678, lon: 100.5324876, type: "path", label: "" },
  LdF1PC24: { lat: 13.7456121, lon: 100.5324943, type: "path", label: "" },
  LdF1PC25: { lat: 13.7456485, lon: 100.5325010, type: "path", label: "" },
  LdF1PC26: { lat: 13.7456355, lon: 100.5325614, type: "path", label: "" },
  LdF1PC27: { lat: 13.7454779, lon: 100.5325547, type: "path", label: "" },
  LdF1PC28: { lat: 13.7454844, lon: 100.5325145, type: "path", label: "" },
  LdF1PC29: { lat: 13.7454297, lon: 100.5324957, type: "path", label: "" },
  LdF1PC30: { lat: 13.7453737, lon: 100.5324876, type: "path", label: "" },
  LdF1PC31: { lat: 13.7453203, lon: 100.5324742, type: "path", label: "" },
  LdF1PC32: { lat: 13.7453085, lon: 100.5325158, type: "path", label: "" },
  LidoSt1f1door: { lat: 13.7457423, lon: 100.5326566, type: "path", label: "" },
  LidoEnt1: { lat: 13.7456485, lon: 100.5325963, type: "path", label: "ทางเข้า Lido 1" },
  LidoEnt2: { lat: 13.7456590, lon: 100.5325346, type: "path", label: "ทางเข้า Lido 2" },
  LidoSt3f1door: { lat: 13.7452603, lon: 100.5323844, type: "path", label: "" },
};
export const LD_FLOOR1_EDGES = [
  ["LidoSt3f1start", "LidoSt3f1door"], ["LidoSt1f1start", "LidoSt1f1door"],
  ["LidoSt2f1start", "LidoLiftf1"], ["LidoSt2f1start", "LidoSt2f1end"], ["LidoSt2f1end", "LdF1PC25"],
  ["LidoSt1f1start", "LidoEnt1"], ["LdF1PC1", "LidoEnt1"], ["LdF1PC26", "LidoEnt1"],
  ["LdF1PC26", "LidoEnt2"], ["LdF1PC25", "LidoEnt2"],
  ["LdF1PC17", "LidoSt3f1door"], ["LdF1PC18", "LidoSt3f1door"],
  ["LdF1PC1", "LdF1PC2"], ["LdF1PC2", "LdF1PC3"], ["LdF1PC3", "LdF1PC4"], ["LdF1PC4", "LdF1PC5"],
  ["LdF1PC5", "LdF1PC6"], ["LdF1PC6", "LdF1PC7"], ["LdF1PC7", "LdF1PC8"], ["LdF1PC8", "LdF1PC9"],
  ["LdF1PC9", "LdF1PC10"], ["LdF1PC10", "LdF1PC11"], ["LdF1PC11", "LdF1PC12"], ["LdF1PC12", "LdF1PC13"],
  ["LdF1PC13", "LdF1PC14"], ["LdF1PC14", "LdF1PC15"], ["LdF1PC15", "LdF1PC16"], ["LdF1PC16", "LdF1PC17"],
  ["LdF1PC17", "LdF1PC18"], ["LdF1PC18", "LdF1PC19"], ["LdF1PC19", "LdF1PC20"], ["LdF1PC20", "LdF1PC21"],
  ["LdF1PC21", "LdF1PC22"], ["LdF1PC22", "LdF1PC23"], ["LdF1PC23", "LdF1PC24"], ["LdF1PC24", "LdF1PC25"],
  ["LdF1PC25", "LdF1PC26"], ["LdF1PC25", "LdF1PC1"], ["LdF1PC4", "LdF1PC27"], ["LdF1PC5", "LdF1PC27"],
  ["LdF1PC27", "LdF1PC28"], ["LdF1PC28", "LdF1PC29"], ["LdF1PC29", "LdF1PC30"], ["LdF1PC30", "LdF1PC31"],
  ["LdF1PC31", "LdF1PC32"], ["LdF1PC7", "LdF1PC32"], ["LdF1PC8", "LdF1PC32"],
  ["LidoSt3f1end", "LdF1PC17"], ["LidoSt3f1end", "LdF1PC16"], ["LidoSt3f1end", "LdF1PC18"],
  ["LdF1WC", "LdF1PC32"],
];
export const LD_FLOOR2_NODES = {
  LidoSt1f2end: { lat: 13.7456498, lon: 100.5326539, type: "stairs", label: "" },
  LidoSt2f2end: { lat: 13.7456745, lon: 100.5324487, type: "stairs", label: "" },
  LidoLiftf2: { lat: 13.7457448, lon: 100.5324541, type: "lift", label: "" },
  LidoSt3f2start: { lat: 13.7451678, lon: 100.5323535, type: "stairs", label: "" },
  LidoSt3f2end: { lat: 13.7451288, lon: 100.5323441, type: "stairs", label: "" },
  LdF2PC1: { lat: 13.7456928, lon: 100.5326338, type: "path", label: "" },
  LdF2PC2: { lat: 13.7455990, lon: 100.5326459, type: "path", label: "" },
  LdF2PC3: { lat: 13.7455834, lon: 100.5326043, type: "path", label: "" },
  LdF2PC4: { lat: 13.7455951, lon: 100.5325480, type: "path", label: "" },
  LdF2PC5: { lat: 13.7456055, lon: 100.5325024, type: "path", label: "" },
  LdF2PC6: { lat: 13.7456147, lon: 100.5324394, type: "path", label: "" },
  LdF2PC7: { lat: 13.7454531, lon: 100.5326258, type: "path", label: "" },
  LdF2PC8: { lat: 13.7453984, lon: 100.5326124, type: "path", label: "" },
  LdF2PC9: { lat: 13.7453450, lon: 100.5326030, type: "path", label: "" },
  LdF2PC10: { lat: 13.7454896, lon: 100.5324541, type: "path", label: "" },
  LdF2PC11: { lat: 13.7454362, lon: 100.5324407, type: "path", label: "" },
  LdF2PC12: { lat: 13.7453763, lon: 100.5324313, type: "path", label: "" },
  LdF2PC13: { lat: 13.7453046, lon: 100.5324152, type: "path", label: "" },
  LdF2PC14: { lat: 13.7452955, lon: 100.5324514, type: "path", label: "" },
  LdF2PC15: { lat: 13.7452838, lon: 100.5324943, type: "path", label: "" },
  LdF2PC16: { lat: 13.7452760, lon: 100.5325319, type: "path", label: "" },
  LdF2PC17: { lat: 13.7452668, lon: 100.5325735, type: "path", label: "" },
  LdF2PC18: { lat: 13.7452017, lon: 100.5325761, type: "path", label: "" },
  LdF2PC19: { lat: 13.7451235, lon: 100.5325614, type: "path", label: "" },
  LdF2PC20: { lat: 13.7450610, lon: 100.5325453, type: "path", label: "" },
  LdF2PC21: { lat: 13.7450727, lon: 100.5324890, type: "path", label: "" },
  LdF2PC22: { lat: 13.7450832, lon: 100.5324353, type: "path", label: "" },
  LdF2PC23: { lat: 13.7450975, lon: 100.5323803, type: "path", label: "" },
  LdF2PC24: { lat: 13.7451574, lon: 100.5323870, type: "path", label: "" },
  LdF2PC25: { lat: 13.7452317, lon: 100.5324018, type: "path", label: "" },
  LdF2WC2: { lat: 13.7455065, lon: 100.5326284, type: "toilet", label: "" },
  LdF2WC1: { lat: 13.7455274, lon: 100.5324595, type: "toilet", label: "" },
  Lidof2door01: { lat: 13.7456238, lon: 100.5326942, type: "path", label: "" },
  Lidof2door02: { lat: 13.7455782, lon: 100.5326848, type: "path", label: "" },
  LdH1door1: { lat: 13.7456420, lon: 100.5326097, type: "path", label: "" },
  LdH2door1: { lat: 13.7453059, lon: 100.5325882, type: "path", label: "" },
  LdH2door2: { lat: 13.7453346, lon: 100.5324326, type: "path", label: "" },
  LdH3door1: { lat: 13.7452291, lon: 100.5325735, type: "path", label: "" },
  LdH3door2: { lat: 13.7451001, lon: 100.5324635, type: "path", label: "" },
  LdH3door3: { lat: 13.7452590, lon: 100.5324246, type: "path", label: "" },
};
export const LD_FLOOR2_EDGES = [
  ["LdF2PC13", "LdH2door2"], ["LidoSt3f2start", "LdF2PC24"], ["LdF2PC17", "LdH2door1"], ["LdF2PC8", "LdF2PC7"],
  ["LidoSt2f2end", "LidoLiftf2"], ["LdF2PC3", "LdF2WC2"], ["LdF2PC1", "LdF2PC2"], ["LdH1door1", "LdF2PC1"],
  ["LdH1door1", "LdF2PC2"], ["LdF2PC2", "LdF2PC3"], ["LdF2PC3", "LdF2PC4"], ["LdF2PC4", "LdF2PC5"],
  ["LdF2PC5", "LdF2PC6"], ["LidoSt1f2end", "Lidof2door01"], ["LidoSt1f2end", "Lidof2door02"],
  ["LdF2PC2", "Lidof2door01"], ["LdF2PC2", "Lidof2door02"], ["LidoSt2f2end", "LdF2PC6"],
  ["LdF2WC2", "LdF2PC7"], ["LdF2PC8", "LdF2PC9"], ["LdF2PC9", "LdH2door1"],
  ["LdF2WC1", "LdF2PC10"], ["LdF2PC10", "LdF2PC11"], ["LdF2PC11", "LdF2PC12"], ["LdH2door2", "LdF2PC12"],
  ["LdF2PC13", "LidoSt3f2start"], ["LdF2PC13", "LdF2PC14"], ["LdF2PC14", "LdF2PC15"], ["LdF2PC15", "LdF2PC16"],
  ["LdF2PC16", "LdF2PC17"], ["LidoSt3f2start", "LidoSt3f2end"],
  ["LdH3door1", "LdF2PC18"], ["LdF2PC18", "LdF2PC19"], ["LdF2PC19", "LdF2PC20"], ["LdF2PC20", "LdF2PC21"],
  ["LdF2PC21", "LdF2PC22"], ["LdH3door2", "LdF2PC21"], ["LdH3door2", "LdF2PC22"], ["LdF2PC22", "LdF2PC23"],
  ["LdF2PC23", "LdF2PC24"], ["LdF2PC24", "LdF2PC25"], ["LdH3door3", "LdF2PC25"],
];
// ⚠️ แก้ edge สุดท้ายที่อ้าง node ไม่มีจริงออก (กันพัง) — เอาออกเพราะไม่ใช่ข้อมูลจริง แค่กันลืมล้าง
export const LD_FLOOR2_EDGES_CLEAN = LD_FLOOR2_EDGES.filter(([a, b]) => LD_FLOOR2_NODES[a] && LD_FLOOR2_NODES[b]);

// 🔗 เชื่อมชั้น 1↔2 ของ Lido Connect — จับคู่บันได/ลิฟต์จากพิกัดที่ใกล้กันจริง (LidoSt2f1end/LidoLiftf1 พิกัดตรงกับฝั่งชั้น 2 เป๊ะ 0.0 ม. เพราะเป็นจุดเดียวกันจริง)
// ⚠️ ทิศทางยังไม่ยืนยันจากผู้ใช้ — ใส่เป็นเดินได้ 2 ทางไว้ก่อน ปลอดภัยกว่าเดาทิศผิด
export const LD_INTER_FLOOR_EDGES = [
  ["LidoLiftf1", "LidoLiftf2"],
  ["LidoSt1f1start", "LidoSt1f2end"],
  ["LidoSt2f1end", "LidoSt2f2end"],
  ["LidoSt3f1end", "LidoSt3f2start"],
];
export const LD_ALL_NODES = { ...LD_FLOOR1_NODES, ...LD_FLOOR2_NODES };
export const LD_ALL_EDGES_RAW = [...LD_FLOOR1_EDGES, ...LD_FLOOR2_EDGES_CLEAN, ...LD_INTER_FLOOR_EDGES];
export const LD_NODE_FLOOR = {};
for (const id in LD_FLOOR1_NODES) LD_NODE_FLOOR[id] = "1";
for (const id in LD_FLOOR2_NODES) LD_NODE_FLOOR[id] = "2";
// 🌉 จุดเชื่อมออกนอกตึกของ Lido — ใช้ทางเข้าหลัก 2 จุด + บันไดหัว-ท้ายตึกที่แตะถนนจริง
export const LD_EXTERIOR_LINKS = [
  { node: "LidoEnt1", lat: 13.7456485, lon: 100.5325963, type: "path", label: "ทางเข้า Lido Connect 1" },
  { node: "LidoEnt2", lat: 13.7456590, lon: 100.5325346, type: "path", label: "ทางเข้า Lido Connect 2" },
  { node: "LidoSt3f1door", lat: 13.7452603, lon: 100.5323844, type: "path", label: "ทางเข้า Lido Connect (บันไดฝั่งใต้)" },
];
export const LD_EXTERIOR_NODES = Object.fromEntries(
  LD_EXTERIOR_LINKS.map((e, i) => [`LdExt${i}`, { lat: e.lat, lon: e.lon, label: e.label || "ทางเข้า-ออก" }])
);
export const LD_EXTERIOR_EDGES = LD_EXTERIOR_LINKS.map((e, i) => [e.node, `LdExt${i}`]);
LD_EXTERIOR_LINKS.forEach((e, i) => { LD_NODE_FLOOR[`LdExt${i}`] = LD_NODE_FLOOR[e.node] || "1"; });
export const LD_ALL_NODES_FULL = { ...LD_ALL_NODES, ...LD_EXTERIOR_NODES };
export const LD_ALL_EDGES = [...LD_ALL_EDGES_RAW, ...LD_EXTERIOR_EDGES];

// 🏢 เพิ่ม siam_center และ lido เข้า BUILDING_GRAPHS (ตัวแปรนี้ประกาศไว้แล้วด้านบน — ต่อท้าย array ตรงนี้)
BUILDING_GRAPHS.push(
  { name: "siam_center", nodes: SC_ALL_NODES_FULL, edges: SC_ALL_EDGES, exteriorLinks: SC_EXTERIOR_LINKS },
  { name: "lido", nodes: LD_ALL_NODES_FULL, edges: LD_ALL_EDGES, exteriorLinks: LD_EXTERIOR_LINKS }
);
// 🗂️ รวมทุกตึกไว้จุดเดียว (สำหรับ UI ทั่วไป: แสดงชื่อ/เปิดผัง/ปรับเทียบตำแหน่ง) — เพิ่มตึกใหม่ในอนาคตแค่เพิ่ม entry ตรงนี้ ไม่ต้องแก้โค้ดส่วนอื่น
export const BUILDINGS = {
  discovery: { name: "SIAM DISCOVERY", bounds: SD_BOUNDS, outline: SD_OUTLINE, floors: SD_FLOORS },
  bacc: { name: "BACC", bounds: BACC_BOUNDS, outline: BACC_OUTLINE, floors: BACC_FLOORS },
  center: { name: "SIAM CENTER", bounds: CEN_BOUNDS, outline: CEN_OUTLINE, floors: CEN_FLOORS },
  lido: { name: "LIDO CONNECT", bounds: LD_BOUNDS, outline: LD_OUTLINE, floors: LD_FLOORS },
  swScSp: { name: "SKYWALK SC-SP", bounds: SW_BOUNDS, outline: SW_OUTLINE, floors: SW_FLOORS },
  btsSiam: { name: "BTS SIAM", bounds: BTS_BOUNDS, outline: BTS_OUTLINE, floors: BTS_FLOORS },
};
// 🔒 ตึกที่ล็อกตำแหน่งแล้ว/ไม่มีรูปทรงจริงให้ปรับเทียบ (BTS เป็นแค่กรอบสี่เหลี่ยม, Skywalk ยังไม่ได้ปรับเทียบแต่ผูกกับ Siam Center แล้ว) — ซ่อนปุ่ม "ปรับตำแหน่ง" กันมือลั่นลากพิกัดขยับตอนปักหมุด node
export const LOCKED_BUILDINGS = new Set(["swScSp", "btsSiam"]);

// 🎯 กลุ่มปลายทางแบบ "ถึงจุดไหนก็ได้ก็ถือว่าถึง" — จับคู่ตาม prefix ของชื่อ node (ใช้ตอนผู้ใช้เลือก "ไป BTS สยาม" แบบไม่เจาะจงประตู)
export const NODE_GROUP_PREFIXES = [
  { prefix: "BtsSiam_gate", label: "🚉 BTS สยาม (ถึงจุดไหนก็ได้)" },
];

// 🗂️ รวมกราฟนำทางในตึกทุกอันไว้จุดเดียว — key เป็น "buildingKey:floorId" ใช้กับเครื่องมือทดสอบเส้นทางในตึก (dropdown เลือกจุดเริ่ม/จุดปลาย)
// center/btsSiam/swScSp ชี้ไปกราฟรวมชุดเดียวกัน (SC_ALL_NODES/EDGES) เพราะ BTS+Skywalk ถูกรวมเข้ากราฟ Siam Center แล้ว เดินข้ามกันได้จริงในทุกจุดทางเข้า
export const ROUTE_GRAPHS = {
  "discovery:1": { nodes: SD_FLOOR1_NODES, edges: SD_FLOOR1_EDGES },
  "discovery:2": { nodes: SD_FLOOR2_NODES, edges: SD_FLOOR2_EDGES },
  "discovery:M": { nodes: SD_FLOORM_NODES, edges: SD_FLOORM_EDGES },
  "bacc:3": { nodes: BACC_FLOOR_NODES["3"], edges: BACC_FLOOR_EDGES["3"] },
  "center:1": { nodes: SC_ALL_NODES, edges: SC_ALL_EDGES_RAW },
  "center:2": { nodes: SC_ALL_NODES, edges: SC_ALL_EDGES_RAW },
  "lido:1": { nodes: LD_FLOOR1_NODES, edges: LD_FLOOR1_EDGES },
  "lido:2": { nodes: LD_FLOOR2_NODES, edges: LD_FLOOR2_EDGES_CLEAN },
  "btsSiam:1": { nodes: SC_ALL_NODES, edges: SC_ALL_EDGES_RAW },
  "swScSp:1": { nodes: SC_ALL_NODES, edges: SC_ALL_EDGES_RAW },
};