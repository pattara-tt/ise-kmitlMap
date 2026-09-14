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
  //["SdEsc2F1Start", "SdEsc4F1End", "oneway"], // ⚠️ บันไดเลื่อนทางเดียว: ขึ้นจาก Skywalk เข้าตึกเท่านั้น ห้ามเดินย้อนออกจากตึกไป Skywalk ทางนี้

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