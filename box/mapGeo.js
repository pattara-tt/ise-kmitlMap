// 🧭 ตรรกะเส้นทาง/ภูมิศาสตร์ทั้งหมด: โหลด Leaflet, คำนวณระยะ/ทิศทาง, ให้คะแนนความร่ม-แสงสว่าง,
// ดึงข้อมูล OSM/ไฟถนน BMA, Dijkstra หาเส้นทางในตึก/ทางเท้า, ค้นหา/geocode สถานที่
import { CAT, SD_FLOOR1_NODES, SD_FLOOR1_EDGES, SD_FLOOR2_NODES, SD_FLOOR2_EDGES, BUILDING_GRAPHS, OVERPASS_MIRRORS } from "./mapConstants";

// 💡 เช็คว่าหลอดไฟ (bulb node) ควรติดอยู่ไหมตามชั่วโมงปัจจุบัน — รองรับช่วงข้ามเที่ยงคืน (เช่น เปิด 18 ปิด 6)
export function isBulbOn(onHour, offHour, hour) {
  if (onHour == null || offHour == null || onHour === offHour) return true; // ไม่ได้ตั้งเวลา/ตั้งเท่ากัน = เปิดตลอด
  if (onHour < offHour) return hour >= onHour && hour < offHour;
  return hour >= onHour || hour < offHour;
}

// Dijkstra ธรรมดาบนกราฟเล็ก (ไม่กี่สิบโหนด) — ระยะทางจริงด้วย haversine ระหว่างโหนดที่เชื่อมกัน
// ใช้ได้กับกราฟชั้นไหนก็ได้ ส่ง nodes/edges ของชั้นนั้นเข้ามา (ดีฟอลต์เป็นชั้น 2 ไว้เพื่อความเข้ากันได้ย้อนหลัง)
export function sdFloorRoute(fromId, toId, nodes = SD_FLOOR2_NODES, edges = SD_FLOOR2_EDGES) {
  const adj = {};
  for (const id in nodes) adj[id] = [];
  for (const [a, b, dir] of edges) {
    const d = haversine([nodes[a].lon, nodes[a].lat], [nodes[b].lon, nodes[b].lat]);
    adj[a].push([b, d]);
    if (dir !== "oneway") adj[b].push([a, d]); // "oneway" = เดินได้ a→b ทางเดียว (เช่นบันไดเลื่อนขึ้นทางเดียว) ไม่สร้าง edge ย้อนกลับ
  }
  const dist = { [fromId]: 0 }, prev = {}, visited = new Set();
  const pq = [[0, fromId]];
  while (pq.length) {
    pq.sort((x, y) => x[0] - y[0]);
    const [d, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === toId) break;
    for (const [v, w] of adj[u] || []) {
      const nd = d + w;
      if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; pq.push([nd, v]); }
    }
  }
  if (dist[toId] === undefined) return null;
  const path = [toId];
  let cur = toId;
  while (prev[cur]) { cur = prev[cur]; path.unshift(cur); }
  return { path, distance: dist[toId] };
}

// เส้นทางชั้น 2 Siam Discovery (ของเดิม) — คงชื่อไว้ให้โค้ดเก่าที่เรียกใช้อยู่ไม่ต้องแก้อะไร
export function sdFloor2Route(fromId, toId) {
  return sdFloorRoute(fromId, toId, SD_FLOOR2_NODES, SD_FLOOR2_EDGES);
}

// เส้นทางชั้น 1 Siam Discovery (ใหม่) — ใช้ SD_FLOOR1_NODES/EDGES
export function sdFloor1Route(fromId, toId) {
  return sdFloorRoute(fromId, toId, SD_FLOOR1_NODES, SD_FLOOR1_EDGES);
}

export function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.crossOrigin = ""; s.onload = () => resolve(window.L); s.onerror = reject;
    document.body.appendChild(s);
  });
}
export function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180, dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180, la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function bearing(a, b) {
  const f1 = (a[1] * Math.PI) / 180, f2 = (b[1] * Math.PI) / 180, dl = ((b[0] - a[0]) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
// ทิศเลี้ยว ณ จุด wp คำนวณจากมุมเปลี่ยนทิศของเส้นทาง (ซ้าย/ขวาจริงตามทิศเดิน)
export function turnTH(coords, wp) {
  if (wp <= 0 || wp >= coords.length - 1) return null;
  const bIn = bearing(coords[wp - 1], coords[wp]);
  const bOut = bearing(coords[wp], coords[wp + 1]);
  const d = ((bOut - bIn + 540) % 360) - 180; // + = ขวา, - = ซ้าย
  const ad = Math.abs(d);
  if (ad < 18) return "ตรงไป";
  const side = d > 0 ? "ขวา" : "ซ้าย";
  if (ad > 150) return "เลี้ยว" + side + "หักศอก";
  if (ad > 55) return "เลี้ยว" + side;
  return "เบี่ยง" + side;
}
export function walkFrom(coords, wp, dist, dir) {
  let i = wp, acc = 0;
  while (true) {
    const j = i + dir;
    if (j < 0 || j >= coords.length) return coords[i];
    acc += haversine(coords[i], coords[j]);
    i = j;
    if (acc >= dist) return coords[i];
  }
}
// ทิศเลี้ยวแบบมองช่วง ~18 ม. ก่อน/หลังจุดเลี้ยว (กันมุมสั่นจาก geometry ละเอียด)
export function turnAt(coords, wp) {
  if (wp <= 0 || wp >= coords.length - 1) return null;
  const back = walkFrom(coords, wp, 18, -1);
  const fwd = walkFrom(coords, wp, 18, 1);
  const d = ((bearing(coords[wp], fwd) - bearing(back, coords[wp]) + 540) % 360) - 180;
  const ad = Math.abs(d);
  if (ad < 20) return "ตรงไป";
  const side = d > 0 ? "ขวา" : "ซ้าย";
  if (ad > 150) return "กลับตัว";
  if (ad > 115) return "เลี้ยว" + side + "หักศอก";
  if (ad > 50) return "เลี้ยว" + side;
  return "เบี่ยง" + side;
}
// ทิศเลี้ยวโดยอ้างอิง "ทิศที่ผู้ใช้กำลังมุ่งหน้าจริง" (จากตำแหน่ง -> จุดเลี้ยว) แม่นกว่า geometry ที่สั่น
export function turnSide(coords, wp, fromPt) {
  if (wp <= 0 || wp >= coords.length - 1) return null;
  const after = walkFrom(coords, wp, 16, 1);
  const bOut = bearing(coords[wp], after);
  const bIn = haversine(fromPt, coords[wp]) > 20 ? bearing(fromPt, coords[wp]) : bearing(walkFrom(coords, wp, 16, -1), coords[wp]);
  const d = ((bOut - bIn + 540) % 360) - 180;
  const ad = Math.abs(d);
  if (ad < 22) return "ตรงไป";
  const side = d > 0 ? "ขวา" : "ซ้าย";
  if (ad > 150) return "กลับตัว";
  if (ad > 115) return "เลี้ยว" + side + "หักศอก";
  if (ad > 50) return "เลี้ยว" + side;
  return "เบี่ยง" + side;
}
export function sampleLine(coords, stepM = 25) {
  const out = []; let carry = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1]; const segLen = haversine(a, b); if (segLen === 0) continue;
    let d = stepM - carry;
    while (d < segLen) { const t = d / segLen; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); d += stepM; }
    carry = (carry + segLen) % stepM;
  }
  if (out.length === 0 && coords.length) out.push(coords[0]);
  return out;
}
export function ratioNear(samples, pts, radiusM) {
  if (!pts || !pts.length) return null;
  let hit = 0; const degLat = radiusM / 111000;
  for (const s of samples) { const degLon = radiusM / (111000 * Math.cos((s[1] * Math.PI) / 180)); for (const p of pts) { if (Math.abs(p[1] - s[1]) > degLat || Math.abs(p[0] - s[0]) > degLon) continue; if (haversine(s, p) <= radiusM) { hit++; break; } } }
  return hit / samples.length;
}
export function countNear(samples, pts, radiusM) {
  if (!pts || !pts.length) return 0;
  let count = 0; const degLat = radiusM / 111000;
  for (const p of pts) { const degLon = radiusM / (111000 * Math.cos((p[1] * Math.PI) / 180)); for (const s of samples) { if (Math.abs(p[1] - s[1]) > degLat || Math.abs(p[0] - s[0]) > degLon) continue; if (haversine(p, s) <= radiusM) { count++; break; } } }
  return count;
}
// คะแนน "สว่าง" แบบดูความหนาแน่นไฟ (ไม่ใช่แค่ % จุดที่ใกล้ไฟ ≥1 ต้น) — เฉลี่ยต่อจุด: ไฟ ≥target ต้นใน radius = เต็ม 1.0
// ทำให้ "ทางสว่างที่สุด" = ทางที่ไฟหนาแน่นจริง (ซอยไฟเยอะชนะถนนที่ลิตพอแต่ไฟบาง)
// indoorLines: เส้นทางเดินในตึก (ส่งมาเฉพาะตอนห้างยังเปิดอยู่) — จุดที่อยู่ในตึกได้คะแนนสว่างเต็ม 1.0 เสมอ (ไฟอาคารสว่างทั่วถึงกว่าเสาไฟถนนอยู่แล้ว)
export function lampDensityScore(samples, grid, radius = 35, target = 3, indoorLines) {
  if (!samples.length) return null;
  if ((!grid || !grid.size) && !(indoorLines && indoorLines.length)) return null;
  let s = 0;
  for (const p of samples) {
    if (indoorLines && indoorLines.length && underCovered(p, indoorLines, 14)) { s += 1; continue; } // 🏢 ในตึก+ห้างเปิด = ไฟอาคารสว่างเต็ม
    s += grid ? Math.min(1, lampCountNearGrid(grid, p, radius) / target) : 0;
  }
  return s / samples.length;
}
// ── เฟส "ร่มสมจริง": ตำแหน่งดวงอาทิตย์ + ฝั่งเงา ──────────────────────────────
// คืน { azimuth: องศาเข็มทิศจากเหนือ-ตามเข็ม (ทิศที่ดวงอาทิตย์อยู่), elevation: องศาเหนือขอบฟ้า }
// อัลกอริทึมแบบ SunCalc (ไม่พึ่ง lib ภายนอก → ไม่ต้อง npm install / ตั้ง env เพิ่ม)
export function sunPosition(date, lat, lon) {
  const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000; // วันนับจาก J2000
  const M = rad * (357.5291 + 0.98560028 * d);            // mean anomaly
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;             // ecliptic longitude
  const e = rad * 23.4397;                                // obliquity
  const dec = Math.asin(Math.sin(L) * Math.sin(e));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const phi = rad * lat, lw = rad * -lon;
  const H = rad * (280.16 + 360.9856235 * d) - lw - ra;   // hour angle
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // 0=ใต้
  let deg = ((az + Math.PI) * 180) / Math.PI % 360; if (deg < 0) deg += 360;
  return { azimuth: deg, elevation: (alt * 180) / Math.PI };
}
// ระยะจากจุด p ถึงเส้นตรง a-b (เมตร, ประมาณด้วย equirectangular ในระยะสั้น)
export function pointToSegM(p, a, b) {
  const latR = (p[1] * Math.PI) / 180, kx = 111320 * Math.cos(latR), ky = 110540;
  const px = p[0] * kx, py = p[1] * ky, ax = a[0] * kx, ay = a[1] * ky, bx = b[0] * kx, by = b[1] * ky;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
export function nearPolyline(p, line, radiusM) {
  for (let i = 0; i < line.length - 1; i++) if (pointToSegM(p, line[i], line[i + 1]) <= radiusM) return true;
  return false;
}
// หา "จุดบนเส้นทางที่ใกล้ p ที่สุดจริงๆ" (ฉายตั้งฉากลง segment ไม่ใช่แค่จุดหักมุม)
// คืน { off: ระยะตั้งฉากถึงเส้น (ม.), along: ระยะสะสมจากต้นทางถึงจุดฉาย (ม.), seg: index ของ segment }
export function nearestOnRoute(pt, coords, rcum) {
  let best = { off: Infinity, along: 0, seg: 0 };
  const latR = (pt[1] * Math.PI) / 180, kx = 111320 * Math.cos(latR), ky = 110540;
  const px = pt[0] * kx, py = pt[1] * ky;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    const ax = a[0] * kx, ay = a[1] * ky, bx = b[0] * kx, by = b[1] * ky;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const off = Math.hypot(px - cx, py - cy);
    if (off < best.off) best = { off, along: rcum[i] + t * (rcum[i + 1] - rcum[i]), seg: i };
  }
  return best;
}
// อยู่ใต้ทางมีหลังคา/skywalk ไหม → ถือว่าร่ม 100%
export function underCovered(p, coveredWays, radiusM) {
  if (!coveredWays) return false;
  for (const line of coveredWays) if (line.length >= 2 && nearPolyline(p, line, radiusM)) return true;
  return false;
}
// ผลต่างมุมเชิงมุม (0..180)
export function angDiff(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
// มีต้นไม้/แนวต้นไม้อยู่ "ฝั่งที่บังแดด" (ระหว่างจุดกับดวงอาทิตย์) ไหม
// sunAz = ทิศที่ดวงอาทิตย์อยู่ · วัตถุจะบังแดดเมื่ออยู่ในทิศเข้าหาดวงอาทิตย์ (cone ±60° — เผื่อความกว้างพุ่มไม้/การเดินเซ, แต่ตัดต้นไม้ที่อยู่ตั้งฉากออก)
export const SHADE_CONE = 60;
export function shadedBySun(p, trees, treeRows, radiusM, sunAz, lowSun) {
  const degLat = radiusM / 111000, degLon = radiusM / (111000 * Math.cos((p[1] * Math.PI) / 180));
  for (const t of (trees || [])) {
    if (Math.abs(t[1] - p[1]) > degLat || Math.abs(t[0] - p[0]) > degLon) continue;
    if (haversine(p, t) > radiusM) continue;
    if (lowSun || angDiff(bearing(p, t), sunAz) <= SHADE_CONE) return true; // กลางคืน/ดวงอาทิตย์ต่ำ: นับใกล้พอ
  }
  for (const line of (treeRows || [])) {
    if (line.length >= 2 && nearPolyline(p, line, radiusM)) {
      if (lowSun) return true;
      // เช็คฝั่ง: ใช้จุดบนแนวที่ใกล้สุดเป็นตัวแทนทิศ
      let bj = line[0], bd = Infinity;
      for (const q of line) { const dd = haversine(p, q); if (dd < bd) { bd = dd; bj = q; } }
      if (angDiff(bearing(p, bj), sunAz) <= SHADE_CONE) return true;
    }
  }
  return false;
}
// ── เงาตึกจริงจากความสูงดาวเทียม (ย้ายวิธีคิดมาจาก shade_demo_3d.html) ──
export const M_LAT_D = 110540, M_LON_D = 111320 * Math.cos((13.7449 * Math.PI) / 180);
// เวกเตอร์เงา "ต่อความสูง 1 เมตร" (องศา lon/lat) — null ถ้าดวงอาทิตย์ต่ำ/กลางคืน
export function shadowPerM(sun) {
  if (!sun || sun.elevation <= 3) return null;
  // cap เงายาวสุด 5 เท่าความสูงตึก — เช้าตรู่/เย็นมากๆ เงาทางทฤษฎียาวหลายร้อยเมตร ทำให้แผนที่ร่มเป็นแถบมั่วและเส้นแกว่ง
  const k = Math.min(5, 1 / Math.tan((sun.elevation * Math.PI) / 180));
  const dir = ((sun.azimuth + 180) * Math.PI) / 180; // เงาทอดตรงข้ามดวงอาทิตย์
  return { dLon: (Math.sin(dir) * k) / M_LON_D, dLat: (Math.cos(dir) * k) / M_LAT_D };
}
export function pip(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) c = !c; } return c; }
// เตรียม bbox เงาต่อตึก (เร็วพอสำหรับเช็คทุกจุดตัวอย่าง)
export function shadowPrep(per, bldgs) {
  if (!per || !bldgs || !bldgs.length) return null;
  return bldgs.map((b) => {
    const dx = per.dLon * b.h, dy = per.dLat * b.h;
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const p of b.ring) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
    return { ring: b.ring, dx, dy, minx: Math.min(minx, minx + dx), maxx: Math.max(maxx, maxx + dx), miny: Math.min(miny, miny + dy), maxy: Math.max(maxy, maxy + dy) };
  });
}
// จุดนี้อยู่ในเงาตึก (หรือในตัวตึก = เดินทะลุห้าง) ไหม — Minkowski sum แบบสุ่มช่วง t
// skipInterior = ใช้ตอน routing: ไม่นับ "ในตัวตึก" ว่าร่ม (กันเส้นถูกดูดมุดเข้าตึก — เดินทะลุห้างมีเฉพาะเส้น Skywalk ที่วาดแนวจริงไว้)
// step 0.1 (เดิม 0.2) — เงายาวตอนแดดต่ำเคยมี "รูโหว่" ระหว่างจุด sample ทำให้ตรวจร่มติดๆ ดับๆ เส้นเลยแกว่ง
export function ptShaded(x, y, prep, skipInterior) {
  if (!prep) return false;
  for (const s of prep) {
    if (x < s.minx || x > s.maxx || y < s.miny || y > s.maxy) continue;
    for (let t = skipInterior ? 0.15 : 0; t <= 1.0001; t += 0.1) { if (pip(x - s.dx * t, y - s.dy * t, s.ring)) return true; }
  }
  return false;
}
// ดัชนี footprint ตึก (bbox precheck) — เช็ค "จุดอยู่ในตัวตึกไหม" เร็วพอเรียกใน Dijkstra ทุก edge
export function buildingIndex(bldgs) {
  if (!bldgs || !bldgs.length) return null;
  return bldgs.map((b) => {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const p of b.ring) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
    return { ring: b.ring, minx, miny, maxx, maxy };
  });
}
export function inBuilding(p, idx) {
  if (!idx || !p) return false;
  for (const s of idx) {
    if (p[0] < s.minx || p[0] > s.maxx || p[1] < s.miny || p[1] > s.maxy) continue;
    if (pip(p[0], p[1], s.ring)) return true;
  }
  return false;
}
// 🏢 เส้นทางเดินในตึกทุกเส้น (จาก BUILDING_GRAPHS) ถือเป็น "มีหลังคา/แอร์เย็น" เสมอ — ใช้เป็น covered-way เพิ่มเติมให้คะแนนร่ม
// เดินในห้างเย็นสบายเต็มร้อยตลอดช่วง ไม่ต้องรอ tag covered=yes จาก OSM ซึ่งมักไม่มีข้อมูลผังภายในเอกชน
let _indoorLinesCache = null;
export function indoorCoveredLines(buildingGraphs = BUILDING_GRAPHS) {
  if (_indoorLinesCache) return _indoorLinesCache;
  const lines = [];
  for (const bg of buildingGraphs) {
    for (const [a, b] of bg.edges) {
      const na = bg.nodes[a], nb = bg.nodes[b];
      if (!na || !nb) continue;
      lines.push([[na.lon, na.lat], [nb.lon, nb.lat]]);
    }
  }
  _indoorLinesCache = lines;
  return lines;
}
// สัดส่วนจุดบนเส้นทางที่ "ร่ม" (เงาตึกจริง / ใต้หลังคา-skywalk / ต้นไม้ฝั่งบังแดด) — คืน null ถ้าไม่มีข้อมูลเลย
export function shadeRatio(samples, osm, sun, prep) {
  const trees = osm.trees || [], treeRows = osm.treeRows || [], covered = [...(osm.coveredWays || []), ...indoorCoveredLines()];
  if (!trees.length && !treeRows.length && !covered.length && !prep) return null;
  if (!samples.length) return null;
  const lowSun = !sun || sun.elevation <= 5; // ดวงอาทิตย์ต่ำ/ลับขอบฟ้า → ไม่เน้นทิศ
  const sunAz = sun ? sun.azimuth : 0;
  let hit = 0;
  for (const s of samples) {
    if (underCovered(s, covered, 14) || ptShaded(s[0], s[1], prep) || shadedBySun(s, trees, treeRows, 25, sunAz, lowSun)) hit++;
  }
  return hit / samples.length;
}
export async function fetchOSM(bbox) {
  const cacheKey = "osm:" + bbox.map((x) => Math.round(x * 1000)).join(",");
  const b = bbox.join(",");
  // 1) ดึงผ่านเซิร์ฟเวอร์ (Vercel) — เสถียรกว่าดึง Overpass จากมือถือตรงๆ
  try {
    const res = await fetch("/api/osm?bbox=" + encodeURIComponent(b));
    if (res.ok) {
      const o = await res.json();
      if (o && o.ok) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ trees: o.trees, buildings: o.buildings, toilets: o.toilets, green: o.green, cameras: o.cameras, crossings: o.crossings, treeRows: o.treeRows || [], coveredWays: o.coveredWays || [] })); } catch (e) {}
        return { ...o, treeRows: o.treeRows || [], coveredWays: o.coveredWays || [], ok: true };
      }
    }
  } catch (e) {}
  // 2) สำรอง: ดึง Overpass ตรงจากเบราว์เซอร์
  const q = `[out:json][timeout:25];(node["natural"="tree"](${b});node["amenity"="toilets"](${b});way["leisure"="park"](${b});way["landuse"="grass"](${b});way["natural"="water"](${b});way["natural"="wood"](${b});node["highway"="crossing"](${b}););out center;(way["natural"="tree_row"](${b});way["highway"]["covered"~"yes|arcade"](${b});way["highway"="footway"]["bridge"](${b});way["man_made"="bridge"](${b}););out geom;`;
  for (const url of OVERPASS_MIRRORS) {
    const controller = new AbortController(); const t = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: controller.signal });
      clearTimeout(t); if (!res.ok) continue;
      const json = await res.json();
      const trees = [], buildings = [], toilets = [], green = [], cameras = [], crossings = [], treeRows = [], coveredWays = [];
      for (const el of (json?.elements || [])) {
        const tg = el.tags || {};
        if (el.type === "way" && Array.isArray(el.geometry)) {
          const line = el.geometry.map((g) => [g.lon, g.lat]).filter((p) => p[0] != null && p[1] != null);
          if (line.length < 2) continue;
          if (tg.natural === "tree_row") treeRows.push(line);
          else if (tg.covered === "yes" || tg.covered === "arcade" || tg.bridge || tg.man_made === "bridge") coveredWays.push(line);
          continue;
        }
        const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon; if (lat == null || lon == null) continue;
        const pt = [lon, lat];
        if (tg.highway === "crossing") crossings.push(pt);
        else if (tg.natural === "tree") { trees.push(pt); green.push(pt); }
        else if (tg.amenity === "toilets") toilets.push({ pt, tags: tg });
        else if (tg.building) buildings.push(pt);
        else if (tg.leisure === "park" || tg.landuse === "grass" || tg.natural === "wood" || tg.natural === "water") green.push(pt);
      }
      const out = { trees, buildings, toilets, green, cameras, crossings, treeRows, coveredWays, ok: true };
      try { if (toilets.length + trees.length + cameras.length + crossings.length > 0) localStorage.setItem(cacheKey, JSON.stringify({ trees, buildings, toilets, green, cameras, crossings, treeRows, coveredWays })); } catch (e) {}
      return out;
    } catch (e) { clearTimeout(t); continue; }
  }
  try { const c = localStorage.getItem(cacheKey); if (c) { const o = JSON.parse(c); return { ...o, ok: true, cached: true }; } } catch (e) {}
  return { ok: false, trees: [], buildings: [], toilets: [], green: [], cameras: [], crossings: [] };
}
export function timeWeights(hour) {
  const h = hour ?? new Date().getHours();
  const day = h >= 7 && h < 18;
  return day
    ? { shade: 1.0, light: 0.0, night: false, mode: "กลางวัน ☀️ ดูความร่มล้วน (เงาตึก + ทางเชื่อม/ในห้าง)" }
    : { shade: 0.0, light: 1.0, night: true, mode: "กลางคืน 🌙 ดูความสว่างล้วน (ไฟถนนจริง BMA)" };
}
// คะแนนเส้นทาง = ความร่ม (เงาตึกจริง 3D + skywalk/หลังคา + ต้นไม้) + แสงสว่าง (ไฟถนน BMA)
export function scoreRoutes(routes, osm, problems, lamps, bldgs, hour) {
  const WT = timeWeights(hour);
  // ตำแหน่งดวงอาทิตย์ ณ เวลาที่เลือก (hour = null → ตอนนี้) — เวลาเปลี่ยน เงาตึกเปลี่ยน ร่มเปลี่ยน
  const dt = new Date(); if (hour != null) dt.setHours(hour, 0, 0, 0);
  const ref = (routes[0] && routes[0].coordinates && routes[0].coordinates[0]) || [100.534, 13.737];
  const sun = sunPosition(dt, ref[1], ref[0]);
  const per = shadowPerM(sun);
  const prep = shadowPrep(per, bldgs); // เงาตึกจริง (ความสูงดาวเทียม 374 หลัง)
  const toiletPts = osm.toilets.map((t) => t.pt);
  const lampGridScore = WT.night ? buildLampGrid(lamps || []) : null; // ดัชนีไฟสำหรับให้คะแนนความหนาแน่น (สร้างครั้งเดียวต่อการคิดคะแนน)
  return routes.map((r) => {
    const samples = sampleLine(r.coordinates, 25);
    const shadeR = WT.night ? null : shadeRatio(samples, osm, sun, prep); // กลางคืนไม่มีแดด — ไม่คิด/ไม่โชว์ร่ม
    // ห้างเปิด 10:00–22:00 — นอกเวลานี้เส้น "เดินทะลุห้าง" ใช้ไม่ได้จริง (ต้องคำนวณก่อน lightR เพื่อรู้ว่าจะบวกไฟอาคารให้ไหม)
    const hh = hour ?? new Date().getHours();
    const mallOpen = hh >= 10 && hh < 22;
    const lightR = WT.night ? lampDensityScore(samples, lampGridScore, undefined, undefined, mallOpen ? indoorCoveredLines() : null) : null; // กลางวันไม่สนไฟถนน · กลางคืนดู "ความหนาแน่นไฟ" (ยิ่งเยอะยิ่งสว่าง) + ในตึกตอนห้างเปิดสว่างเต็มเสมอ
    const toiletsN = countNear(samples, toiletPts, 150);
    let shade = shadeR == null ? null : Math.round(shadeR * 100);
    let light = lightR == null ? null : Math.round(lightR * 100);
    // ไทม์ไลน์คำแนะนำ: 10-18 skywalk (ร่ม) · 18-22 skywalk (ไฟในห้าง — ยังเปิด เดินได้จริง) · 22-07 เส้นเสาไฟ BMA · 07-10 เส้นร่มจากกราฟ
    // กลางคืนช่วงห้างเปิด: ทางเชื่อม/ในห้างมี "ไฟของอาคาร" ตลอดแนว — บูสต์ 99 กันเส้นกราฟคะแนนสูงมาเสมอ/แซง
    // 💡 เส้นไฟ hardcode (MBK↔สยาม): บูสต์เฉพาะช่วงห้างปิด (22:00-06:59) — ก่อนนั้นให้ skywalk ชนะ
    // หมายเหตุ: เส้นถนนใหญ่ให้คะแนนตามข้อมูลเสาไฟ BMA จริงเท่านั้น (ไม่ boost)
    // — คำแนะนำกลางคืนจะสอดคล้องกับจุดไฟเหลืองที่ผู้ใช้เห็นบนแผนที่เสมอ
    let num = 0, den = 0; const add = (v, w) => { if (v != null && w) { num += v * w; den += w; } };
    add(shade, WT.shade); add(light, WT.light);
    let comfort = den ? Math.round(num / den) : null;
    // รายชื่อห้องน้ำใกล้เส้นทาง (ชื่อ + ระยะจากต้นทาง) — ส่งให้ผู้ช่วย AI ตอบได้ว่าห้องน้ำอยู่ตรงไหนจริง ไม่ใช่เดาเอง
    const rcum = [0]; for (let i = 1; i < r.coordinates.length; i++) rcum[i] = rcum[i - 1] + haversine(r.coordinates[i - 1], r.coordinates[i]);
    const stepRoad = (ix) => { for (const st of (r.steps || [])) { if (ix >= st.wpStart && ix <= st.wpEnd && st.name) return st.name; } return ""; };
    let toiletList = [];
    for (const t of (osm.toilets || [])) {
      const np = nearestOnRoute(t.pt, r.coordinates, rcum); // ระยะตั้งฉากถึงเส้นจริง + ตำแหน่งตามแนวเดิน
      if (np.off <= 120) toiletList.push({ name: (t.tags && (t.tags.name || t.tags["name:th"])) || "ห้องน้ำสาธารณะ", along: Math.round(np.along), off: Math.round(np.off), road: stepRoad(np.seg) || stepRoad(np.seg + 1), pt: t.pt });
    }
    // ยุบจุดที่ซ้อนใกล้กัน (≤30 ม. = น่าจะเป็นห้องน้ำเดียวกันถูก tag หลาย node) — เก็บจุดที่ใกล้เส้นทางที่สุด
    toiletList.sort((a, b) => a.off - b.off);
    const dedupT = [];
    for (const t of toiletList) {
      if (dedupT.some((u) => haversine(t.pt, u.pt) <= 30)) continue;
      dedupT.push(t);
    }
    toiletList = dedupT.sort((a, b) => a.along - b.along);
    // จุดกล้อง CCTV ใกล้เส้นทาง (≤50 ม.) — ใช้โชว์หมุดในโหมดนำทาง 3D
    const cameraList = [];
    for (const cpt of (osm.cameras || [])) {
      let cbd = Infinity;
      for (let i = 0; i < r.coordinates.length; i++) { const dd = haversine(cpt, r.coordinates[i]); if (dd < cbd) cbd = dd; }
      if (cbd <= 50) cameraList.push(cpt);
    }
    return { ...r, shade, light, mallClosed: !mallOpen, toiletsNear: toiletsN, comfort, timeMode: WT.mode, night: WT.night, toiletList: toiletList.slice(0, 8), cameraList: cameraList.slice(0, 20) };
  });
}
export function comfortColor(v) { if (v == null) return "#888"; if (v >= 70) return "#2a9d54"; if (v >= 45) return "#e9a23b"; return "#c1121f"; }
// 🎨 จำแนกเส้นทางเป็นช่วงๆ ตามหมวดจริง เพื่อวาดเส้นหลายสีตามสภาพจริงของแต่ละช่วง (ไม่ใช่สีเดียวทั้งเส้น)
// กลางวัน: "indoor" (ในอาคารจริง — เช็คจาก polygon ตึกจริง) / "shade" (ร่มนอกอาคาร — เงาตึก/ต้นไม้/หลังคา) / "sun" (โล่งแดด)
// กลางคืน: "lit" (มีเสาไฟ/ไฟอาคารพอ) / "dark" (ไม่พอ มืด)
// คืน array ของ { cat, coordinates } เรียงตามลำดับเส้นทางจริง ต่อเนื่องกัน (จุดเปลี่ยนหมวดซ้อนอยู่ปลาย-หัวช่วงติดกันให้เส้นไม่ขาด)
export function routeSegments(coords, osm, bldgs, hour, lamps) {
  if (!coords || coords.length < 2) return [];
  const WT = timeWeights(hour);
  const dt = new Date(); if (hour != null) dt.setHours(hour, 0, 0, 0);
  const sun = WT.night ? null : sunPosition(dt, coords[0][1], coords[0][0]);
  const prep = WT.night ? null : shadowPrep(shadowPerM(sun), bldgs);
  const bIdx = buildingIndex(bldgs);
  const covered = [...((osm && osm.coveredWays) || []), ...indoorCoveredLines()];
  const trees = (osm && osm.trees) || [], treeRows = (osm && osm.treeRows) || [];
  const lowSun = !sun || sun.elevation <= 5;
  const lampGrid = WT.night ? buildLampGrid(lamps || []) : null;
  const indoorLines = indoorCoveredLines();
  const hh = hour ?? new Date().getHours();
  const mallOpen = hh >= 10 && hh < 22;
  const catOf = (p) => {
    if (WT.night) {
      // 🏢 ในตึกช่วงห้างเปิด = สว่างเต็มเสมอ (lit/ฟ้า) — ไม่มีเสาไฟถนนในตึกให้เช็ค ใช้ logic เดียวกับตอนกลางวัน (เช็คใกล้ indoorLines ก่อน)
      if (mallOpen && (underCovered(p, indoorLines, 12) || inBuilding(p, bIdx))) return "lit";
      return lampCountNearGrid(lampGrid, p, 28) >= 1 ? "lit" : "dark";
    }
    // 🏢 เช็คใกล้เส้นทางในตึกที่ปักหมุด/สำรวจเองจริงก่อน (≤12 ม.) — แม่นกว่า polygon ตึกจากดาวเทียมที่อาจเยื้องจากจุดสำรวจจริง
    if (underCovered(p, indoorLines, 12) || inBuilding(p, bIdx)) return "indoor";
    const shaded = underCovered(p, covered, 14) || ptShaded(p[0], p[1], prep, true) || shadedBySun(p, trees, treeRows, 25, sun ? sun.azimuth : 0, lowSun);
    return shaded ? "shade" : "sun";
  };
  const segs = [];
  let curCat = catOf(coords[0]);
  let curPts = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const cat = catOf(coords[i]);
    if (cat !== curCat) {
      curPts.push(coords[i]); // จุดเปลี่ยนหมวดอยู่ปลายช่วงเดิม กันเส้นขาดตรงรอยต่อ
      segs.push({ cat: curCat, coordinates: curPts });
      curPts = [coords[i]];
      curCat = cat;
    } else {
      curPts.push(coords[i]);
    }
  }
  segs.push({ cat: curCat, coordinates: curPts });
  return segs;
}
// สีตามหมวด — กลางวัน: ฟ้า=ในอาคาร เขียว=ร่มนอกอาคาร เหลือง=นอกอาคารแดด / กลางคืน: ฟ้า=สว่างพอ ม่วง=มืด
export const SEGMENT_COLORS = { indoor: "#1A73E8", shade: "#34A853", sun: "#FBBC04", lit: "#1A73E8", dark: "#8E24AA" };
export function popupHtml(p) {
  const photo = p.photo ? `<img src="${p.photo}" alt="" style="width:100%;max-width:240px;border-radius:8px;margin-top:6px"/>` : "";
  const date = (p.timestamp || "").slice(0, 16); const lbl = CAT[p.cat]?.label || p.type || "ปัญหา";
  return `<div style="max-width:240px;font-family:system-ui"><div style="font-weight:700;color:${catColor(p.cat)}">${lbl}</div><div style="font-size:13px;margin:4px 0;white-space:pre-wrap">${(p.comment || "").slice(0, 240)}</div><div style="font-size:12px;color:#555">สถานะ: <b>${p.state || "-"}</b></div><div style="font-size:11px;color:#888">${date}</div>${photo}</div>`;
}
// ── 🌉 เส้นทางร่ม Skywalk (จุดขายหลัก) ──
// แนวเดิน MBK ชั้น 2 → Skywalk แยกปทุมวัน → Siam Discovery → Siam Center ชั้น 2 → ลงบันไดเลื่อนชั้น 1 (Starbucks) → ประตูทางออก → ลงบันได → BTS สยาม
// อิงแนวเดียวกับ shade_demo_3d.html / Figma frame "route" (เดินใต้หลังคา-ในห้างเกือบตลอด)

// ไม่มีเส้นทาง hardcode/fixed แล้ว
// เส้นทางทั้งหมดมาจาก:
// 1) /api/route
// 2) กราฟทางเท้า OSM + Dijkstra ซึ่งคำนวณใหม่ตามต้นทาง ปลายทาง และเวลา

// ── 🧭 Routing ของเราเอง: กราฟทางเท้า OSM + Dijkstra ถ่วงน้ำหนัก "ไฟ BMA" (กลางคืน) / "เงาตึก" (กลางวัน) ──
// ทำให้เส้น comfort ยอมอ้อมเข้าซอยที่สว่าง/ร่มจริง แทนที่จะใช้แค่ทางสั้นสุดจาก ORS
export async function fetchWalkNet(bbox) {
  const cacheKey = "walknet5:" + bbox.map((x) => Math.round(x * 1000)).join(",");
  try { const cch = localStorage.getItem(cacheKey); if (cch) return JSON.parse(cch); } catch (e) {}
  const b = bbox.join(",");
  // 0) ไฟล์สำเร็จรูปที่ฝังมากับเว็บ (public/data/walknet_pathumwan.json) — โหลดทันที ไม่ต้องรอ OSM
  //    ทำให้ demo เปิดครั้งแรกก็มีเส้นเกาะไฟเลย ไม่ขึ้นแถบ "กำลังโหลด" (ถ้าไม่มีไฟล์ = ข้ามไปข้อ 1)
  try {
    const rs = await fetch("/data/walknet_pathumwan.json");
    if (rs.ok) {
      const o = await rs.json();
      if (o && o.ways && o.ways.length) {
        try { localStorage.setItem(cacheKey, JSON.stringify(o)); } catch (e) {}
        return o;
      }
    }
  } catch (e) {}
  // 1) ผ่านเซิร์ฟเวอร์ (มี cache — โหลดครั้งต่อไปเร็วทันที)
  try {
    const r = await fetch("/api/walknet?bbox=" + encodeURIComponent(b));
    if (r.ok) {
      const o = await r.json();
      if (o.ways && o.ways.length) {
        try { localStorage.setItem(cacheKey, JSON.stringify(o)); } catch (e) {}
        return o;
      }
    }
  } catch (e) {}
  // 2) สำรอง: Overpass ตรงจากเบราว์เซอร์
  const q = `[out:json][timeout:25];way["highway"~"footway|path|pedestrian|living_street|residential|unclassified|service|steps|primary|secondary|tertiary|primary_link|secondary_link|tertiary_link"](${b});out geom;`;
  for (const url of OVERPASS_MIRRORS) {
    const controller = new AbortController(); const t = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: controller.signal });
      clearTimeout(t); if (!res.ok) continue;
      const j = await res.json();
      const ways = [];
      for (const el of j.elements || []) if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length > 1) ways.push(el.geometry.map((g) => [g.lon, g.lat]));
      if (!ways.length) continue;
      const out = { ways };
      try { localStorage.setItem(cacheKey, JSON.stringify(out)); } catch (e) {}
      return out;
    } catch (e) { clearTimeout(t); continue; }
  }
  return null;
}
// รวม way เป็นกราฟ: โหนด = จุดพิกัด (ปัดทศนิยม 5 ตำแหน่ง ≈ 1 ม. → จุดตัดซอยเชื่อมถึงกัน)
export function buildGraph(ways, bldgs, skywalkWays) {
  const bIdx = buildingIndex(bldgs); // ใช้กรอง snap edge ที่ลัดทะลุตึก (ถ้าข้อมูลตึกยังไม่มา factor ตอน routing กันซ้ำอีกชั้น)
  const skySet = new Set(skywalkWays || []); // 🌉 way ไหนเป็นเส้น skywalk จริง (อ้างอิงตัวเดียวกับที่ merge เข้ามา) — tag edge ที่เกิดจาก way พวกนี้
  const nodes = new Map();
  const keyOf = (p) => p[0].toFixed(5) + "," + p[1].toFixed(5);
  const addEdge = (a, b2, isSky) => {
    const d = haversine(a, b2);
    if (d < 0.5 || d > 400) return;
    const ka = keyOf(a), kb = keyOf(b2);
    if (!nodes.has(ka)) nodes.set(ka, { pt: a, edges: [] });
    if (!nodes.has(kb)) nodes.set(kb, { pt: b2, edges: [] });
    const mid = [(a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2];
    const extra = isSky ? { skywalk: true } : null;
    nodes.get(ka).edges.push({ to: kb, d, mid, ...extra });
    nodes.get(kb).edges.push({ to: ka, d, mid, ...extra });
  };
  for (const w of ways) {
    const isSky = skySet.has(w);
    // แบ่งช่วงยาวเป็นท่อนละ ≤50 ม. — เช็คไฟ/เงาต่อท่อนได้ละเอียด ไม่เหมาช่วงยาวจาก midpoint เดียว
    for (let i = 0; i < w.length - 1; i++) {
      const a = w[i], b2 = w[i + 1];
      const d = haversine(a, b2);
      const n = Math.max(1, Math.ceil(d / 50));
      let prevPt = a;
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const q = k === n ? b2 : [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t];
        addEdge(prevPt, q, isSky);
        prevPt = q;
      }
    }
  }
  // เชื่อม "โหนดที่เกือบชนกัน" (≤10 ม.) ที่ยังไม่ต่อกัน — OSM ทางเดินในสยามสแควร์หลายเส้นปลายซอยไม่ได้ต่อ node กัน
  // ทำให้ Dijkstra ทะลุเข้าซอยไฟเยอะได้ (ก่อนหน้านี้ซอยเป็น "เกาะ" แยกจากกัน เข้าไม่ถึง เลยเลาะขอบ)
  const SNAP = 16, scs = SNAP / 111000;
  const cell = new Map();
  for (const [k, n] of nodes) { const cx = Math.round(n.pt[0] / scs), cy = Math.round(n.pt[1] / scs); const ck = cx + "_" + cy; if (!cell.has(ck)) cell.set(ck, []); cell.get(ck).push(k); }
  for (const [k, n] of nodes) {
    const cx = Math.round(n.pt[0] / scs), cy = Math.round(n.pt[1] / scs);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const arr = cell.get((cx + dx) + "_" + (cy + dy)); if (!arr) continue;
      for (const k2 of arr) {
        if (k2 === k) continue;
        const n2 = nodes.get(k2); const d = haversine(n.pt, n2.pt);
        if (d > 0.5 && d <= SNAP && !n.edges.some((e) => e.to === k2)) {
          const mid = [(n.pt[0] + n2.pt[0]) / 2, (n.pt[1] + n2.pt[1]) / 2];
          if (inBuilding(mid, bIdx)) continue; // ❌ snap ข้ามช่องว่างได้ แต่ห้ามลัดทะลุตัวตึก
          n.edges.push({ to: k2, d, mid });
        }
      }
    }
  }
  return nodes;
}

// 🏢🌳 รวมกราฟในตึก (ทางเดิน/บันได/ลิฟต์ + จุดเชื่อมออกนอกตึก) เข้ากับกราฟทางเท้ากลางแจ้ง (walkNet)
// เพื่อให้ Dijkstra เส้นเดียวเดินทะลุจากพื้นธรรมดา → เข้าตึก → ขึ้น/ลงชั้น → ออกอีกฝั่งได้เลย ไม่ต้องหาเส้นแยกกันคนละรอบ
// outdoorNodes: Map จาก buildGraph() (คีย์พิกัด, {pt:[lon,lat], edges})
// buildingGraphs: [{ name, nodes:{id:{lat,lon}}, edges:[[a,b],...], exteriorLinks:[{node,lat,lon}] }] — ดีฟอลต์ใช้ BUILDING_GRAPHS จาก mapConstants
// bridgeMaxM: ระยะไกลสุดที่ยอมต่อจุดเชื่อมออกนอกตึกเข้ากับโหนดกลางแจ้งที่ใกล้ที่สุด (เกินนี้ = ยังไม่มีข้อมูล OSM ตรงนั้น ไม่ต่อ กันเส้นมั่ว)
export function mergeIndoorGraph(outdoorNodes, buildingGraphs = BUILDING_GRAPHS, bridgeMaxM = 60) {
  if (!outdoorNodes || !buildingGraphs || !buildingGraphs.length) return outdoorNodes;
  const merged = new Map(outdoorNodes); // shallow copy — ไม่แก้กราฟกลางแจ้งต้นฉบับ (rebuild ทีหลังจะได้ไม่สะสมโหนดซ้ำ)
  for (const bg of buildingGraphs) {
    const keyOf = (id) => `IN:${bg.name}:${id}`;
    for (const id in bg.nodes) {
      const n = bg.nodes[id];
      merged.set(keyOf(id), { pt: [n.lon, n.lat], edges: [] });
    }
    for (const [a, b, dir] of bg.edges) {
      const na = bg.nodes[a], nb = bg.nodes[b];
      if (!na || !nb) continue; // กัน edge ที่อ้าง node ไม่มีจริง (ข้อมูลตกหล่น/พิมพ์ผิด) ไม่ให้กราฟพัง
      const d = haversine([na.lon, na.lat], [nb.lon, nb.lat]);
      const mid = [(na.lon + nb.lon) / 2, (na.lat + nb.lat) / 2];
      const ka = keyOf(a), kb = keyOf(b);
      merged.get(ka).edges.push({ to: kb, d, mid, indoor: true });
      if (dir !== "oneway") merged.get(kb).edges.push({ to: ka, d, mid, indoor: true }); // "oneway" = เดินได้ a→b ทางเดียว (เช่นบันไดเลื่อน) ไม่สร้าง edge ย้อนกลับ
    }
    // 🌉 จุดเชื่อมออกนอกตึก — หาโหนดกลางแจ้งที่ใกล้ที่สุด แล้วต่อ edge จริงด้วยระยะ haversine (ไม่ใช่ระยะสมมติ)
    for (const link of bg.exteriorLinks || []) {
      const inKey = keyOf(link.node);
      if (!merged.has(inKey)) continue; // node อ้างผิด/ยังไม่มีจริง ข้ามอย่างปลอดภัย
      const pIn = [link.lon, link.lat];
      let bestKey = null, bestD = bridgeMaxM;
      for (const [k, n] of outdoorNodes) {
        const d = haversine(pIn, n.pt);
        if (d < bestD) { bestD = d; bestKey = k; }
      }
      if (!bestKey) continue; // ไกลจากกราฟกลางแจ้งเกินไป (แถวนั้นยังไม่มีข้อมูล OSM) — ปักหมุด/หาเส้นในตึกได้ปกติ แค่ยังต่อพื้นไม่ได้
      const d = haversine(pIn, merged.get(bestKey).pt);
      merged.get(inKey).edges.push({ to: bestKey, d });
      merged.get(bestKey).edges.push({ to: inKey, d });
    }
  }
  return merged;
}
// ดัชนีตารางไฟถนน — เก็บไฟรายเซลล์ แล้วเช็คระยะจริง ≤30 ม. (เกณฑ์เดียวกับตอนให้คะแนน)
export const LAMP_CS = 0.0003;
export function buildLampGrid(lamps) {
  const g = new Map();
  for (const p of lamps || []) {
    const k = Math.round(p[0] / LAMP_CS) + "_" + Math.round(p[1] / LAMP_CS);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(p);
  }
  return g;
}
export function lampNearGrid(grid, p) {
  if (!grid) return false;
  const gx = Math.round(p[0] / LAMP_CS), gy = Math.round(p[1] / LAMP_CS);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const arr = grid.get((gx + dx) + "_" + (gy + dy));
    if (arr) { for (const q of arr) if (haversine(p, q) <= 30) return true; }
  }
  return false;
}
// นับ "จำนวนเสาไฟ" รอบจุด (ไม่ใช่แค่มี/ไม่มี) — ยิ่งหนาแน่น = ยิ่งสว่าง = ยิ่งควรเดิน
// ใช้ทั้งตอนให้คะแนน "ทางสว่างที่สุด" และตอน routing (ยอมอ้อมมาเกาะซอยที่ไฟเยอะกว่า)
export function lampCountNearGrid(grid, p, radius = 40) {
  if (!grid) return 0;
  const gx = Math.round(p[0] / LAMP_CS), gy = Math.round(p[1] / LAMP_CS);
  const R = Math.max(1, Math.ceil(radius / (LAMP_CS * 111000 * Math.cos((p[1] * Math.PI) / 180))));
  let c = 0;
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
    const arr = grid.get((gx + dx) + "_" + (gy + dy));
    if (arr) { for (const q of arr) if (haversine(p, q) <= radius) c++; }
  }
  return c;
}
// Dijkstra: cost = ระยะ × ตัวคูณ (ช่วงมืด/โดนแดด = แพง 2.2-2.6 เท่า) → เส้นยอมอ้อมเพื่อความสว่าง/ร่ม
export function graphRoute(nodes, start, end, hour, lampGrid, bldgs, osm) {
  if (!nodes || !nodes.size || !start || !end) return null;
  const WTg = timeWeights(hour);
  const dtg = new Date(); if (hour != null) dtg.setHours(hour, 0, 0, 0);
  const sunG = WTg.night ? null : sunPosition(dtg, start[1], start[0]);
  const prep = WTg.night ? null : shadowPrep(shadowPerM(sunG), bldgs);
  // แดดต่ำจริงๆ เท่านั้น (elevation <8° เช่นเช้าตรู่หน้าหนาว) ค่อยเลิกไล่เงา — เงายาวพาดทั่วย่านอยู่แล้ว
  // (เดิมตั้ง <18° กว้างไป ทำให้ 07:00 หน้าร้อนใช้คนละโหมดกับ 08:00 เส้นออกตัวคนละทิศ)
  const lowSunG = !WTg.night && (!sunG || sunG.elevation < 8);
  const covered = [...((osm && osm.coveredWays) || []), ...indoorCoveredLines()];
  // เช็ค "สว่าง/ร่ม" ทั้ง midpoint และหัว-ท้าย edge — กันช่วงยาว ~50 ม. ที่จุดกลางบังเอิญตกร่องว่างระหว่างเสาไฟ
  // ถูกตัดสินว่ามืดทั้งที่ปลายทั้งสองมีไฟ · กลางคืนถ่วง ×3.2 (เดิม 2.6) ให้เส้นยอมอ้อมมาเกาะถนนใหญ่ที่มีไฟมากขึ้น
  const bIdx = buildingIndex(bldgs);
  // 🏬 ห้างเปิด 10:00–22:00 — นอกเวลานี้ทางในห้างเดินจริงไม่ได้ (เอาออกจากกราฟไปเลย ไม่ใช่แค่แพงขึ้น)
  const hhG = hour ?? new Date().getHours();
  const mallOpenG = hhG >= 10 && hhG < 22;
  const factor = (mid, p1, p2) => {
    // 🚫 เส้นกราฟห้ามมุดตึก: edge ที่จุดกลางอยู่ในตัวตึก = แพง ×6 (ครอบคลุมทั้ง edge จาก OSM และ edge ที่เกิดจาก snap)
    // "เดินทะลุห้าง" มีเฉพาะเส้น Skywalk ที่วาดตามแนวทางเดินจริงเท่านั้น
    const inb = inBuilding(mid, bIdx) ? 6 : 1;
    if (WTg.night) {
      // นิยามแสงให้ตรง "ตาเห็น": ไฟถนนส่องถึงจริง ~20-30 ม. → รัศมีนับ 28 ม. (เดิม 60 — ซอยมืดข้างซอยสว่างได้เครดิตฟรี
      // ทำให้ตัวคูณเท่ากันแล้วระบบเลือกเส้นสั้นกว่าแทนเส้นที่มีไฟจริง)
      // เฉลี่ยทั้ง 3 จุด (เดิม max จุดเดียว — ท่อนมืดเกือบทั้งท่อนแต่ปลายติดไฟถูกนับสว่างทั้งท่อน)
      // ส่วนลดแบบ log ไม่ตัน (เดิมตันที่ 8 ต้น) — ซอยไฟแน่นกว่าชนะเสมอ: 0 ต้น ×1.5 · 1 ต้น ×1.15 · 3 ต้น ×0.8 · 7 ต้น ×0.45 · 13+ ต้น ×0.2
      const pts = [mid, p1, p2].filter(Boolean);
      const c = pts.reduce((s, q) => s + lampCountNearGrid(lampGrid, q, 28), 0) / pts.length;
      return inb * Math.max(0.2, 1.5 - 0.35 * Math.log2(1 + c));
    }
    // กลางวัน: นับร่มแบบ "เสียงข้างมาก" (≥2 ใน 3 จุด) — เดิมจุดเดียวร่มก็นับทั้งท่อน เส้นเลยซิกแซกไล่เก็บหย่อมเงา
    // penalty ไม่ร่มลดจาก ×2.2 → ×1.45 — ยอมอ้อมเพื่อร่มได้ ≤45% ของระยะตรง ไม่พาอ้อมเป็นเขาวงกต
    const shd = (q) => q && (underCovered(q, covered, 14) || ptShaded(q[0], q[1], prep, true));
    const nsh = (shd(mid) ? 1 : 0) + (shd(p1) ? 1 : 0) + (shd(p2) ? 1 : 0);
    if (lowSunG) return inb * (nsh >= 2 ? 1 : nsh === 1 ? 1.04 : 1.1); // แดดต่ำ: เกือบเป็นทางสั้นสุด
    return inb * (nsh >= 2 ? 1 : nsh === 1 ? 1.25 : 1.45);
  };
  // จุดเริ่ม/จบ = โหนดใกล้สุด (≤120 ม. — เดิม 250 ทำให้เกิดเส้นตรงเฉียงยาวพุ่งทะลุตึกเข้าหาหมุด)
  let sk = null, ek = null, sd = 120, ed = 120;
  for (const [k, n] of nodes) {
    const d1 = haversine(start, n.pt); if (d1 < sd) { sd = d1; sk = k; }
    const d2 = haversine(end, n.pt); if (d2 < ed) { ed = d2; ek = k; }
  }
  if (!sk || !ek || sk === ek) return null;
  const dist = new Map(), prev = new Map();
  const heap = [[0, sk]]; dist.set(sk, 0);
  const hpush = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r2 = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [cd, k] = hpop();
    if (k === ek) break;
    if (cd > (dist.get(k) ?? Infinity)) continue;
    const kp = nodes.get(k).pt;
    for (const e of nodes.get(k).edges) {
      if (e.indoor && !mallOpenG) continue; // 🏬 ห้างปิด — เดินทะลุห้างจริงไม่ได้ ตัดออกจากกราฟ ไม่ให้แนะนำเส้นที่เดินจริงไม่ได้
      // 🌉 skywalk จริง (มีหลังคา ไม่มีรถ ปลอดภัยเสมอไม่ว่ากลางวัน/กลางคืน) → เลือกก่อนทุกกรณี ถูกกว่าแม้แต่ทางในห้าง
      // 🏢 ห้างเปิด: ทางในตึกเย็นกว่าทางนอกที่ร่มที่สุด (×1) เสมอ — บวกโบนัสให้ dijkstra เลือกเดินในห้างก่อนเมื่อเปิดอยู่
      const mult = e.skywalk ? 0.5 : e.indoor ? 0.55 : factor(e.mid, kp, nodes.get(e.to)?.pt);
      const nd = cd + e.d * mult;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, k); hpush([nd, e.to]); }
    }
  }
  if (!dist.has(ek)) return null;
  const pathKeys = []; let cur = ek;
  while (cur) { pathKeys.push(cur); cur = prev.get(cur); if (pathKeys.length > 5000) return null; }
  pathKeys.reverse();
  const coords = [start, ...pathKeys.map((k) => nodes.get(k).pt), end];
  const nodeKeys = [null, ...pathKeys, null]; // คู่กับ coords ทุกจุด — null = จุดเริ่ม/จบสังเคราะห์ ไม่ใช่ node จริงในกราฟ
  let distM = 0; for (let i = 1; i < coords.length; i++) distM += haversine(coords[i - 1], coords[i]);
  if (distM < 50) return null;
  return { graphed: true, coordinates: coords, nodeKeys, distance_m: Math.round(distM), duration_min: Math.max(1, Math.round(distM / 75)), steps: [] };
}

// เหลือทางเลือกแค่ 2 เส้น: (1) ทางร่ม/สว่างที่สุด (2) ทางเร็วที่สุด — เส้นที่ใช้ไม่ได้จริง (เช่นทะลุห้างตอนห้างปิด) ตัดทิ้งเลย
export function pickRoutes(scored) {
  const usable = scored.filter((r) => !r.mallClosed);
  const pool = usable.length ? usable : scored;
  const comfort = pool.reduce((b, r) => ((r.comfort ?? -1) >= (b.comfort ?? -1) ? r : b), pool[0]); // เสมอกัน → เอาเส้นจากกราฟ (อยู่ท้ายสุด)
  const fast = pool.reduce((b, r) => ((r.duration_min ?? 1e9) < (b.duration_min ?? 1e9) ? r : b), pool[0]);
  return { comfortIdx: comfort ? comfort.index : 0, fastIdx: fast ? fast.index : 0 };
}

// พจนานุกรมสถานที่สำคัญย่านปทุมวัน (พิกัดจริงโดยประมาณ) — ใช้ก่อนถาม Nominatim เพื่อความแม่นยำ/กันชื่อกำกวม
export const LANDMARKS = [
  { aliases: ["สนามกีฬาแห่งชาติ", "สนามกีฬา", "national stadium", "สนามศุภ", "ศุภชลาศัย"], coord: [100.5294, 13.7466], name: "สนามกีฬาแห่งชาติ" },
  { aliases: ["สยามพารากอน", "พารากอน", "paragon"], coord: [100.5347, 13.7462], name: "สยามพารากอน" },
  { aliases: ["สยามสแควร์", "สยาม", "siam"], coord: [100.53298, 13.74582], name: "สยาม (BTS)" },
  { aliases: ["มาบุญครอง", "mbk", "เอ็มบีเค"], coord: [100.52980, 13.74462], name: "MBK / มาบุญครอง" },
  { aliases: ["โรงพยาบาลจุฬา", "รพ.จุฬา", "รพจุฬา", "chula hospital"], coord: [100.5356, 13.7314], name: "รพ.จุฬาฯ", query: "โรงพยาบาลจุฬาลงกรณ์ ปทุมวัน กรุงเทพ" },
  { aliases: ["จุฬาลงกรณ์มหาวิทยาลัย", "จุฬาลงกรณ์", "จุฬา", "chulalongkorn", "chula"], coord: [100.5318, 13.7378], name: "จุฬาลงกรณ์มหาวิทยาลัย" },
  { aliases: ["สามย่านมิตรทาวน์", "สามย่าน", "samyan"], coord: [100.5283, 13.7320], name: "สามย่าน" },
  { aliases: ["จามจุรีสแควร์", "จามจุรี", "chamchuri"], coord: [100.5295, 13.7335], name: "จามจุรีสแควร์" },
  { aliases: ["เซ็นทรัลเวิลด์", "centralworld", "central world"], coord: [100.5396, 13.7466], name: "เซ็นทรัลเวิลด์" },
  { aliases: ["ราชประสงค์", "ratchaprasong"], coord: [100.5400, 13.7445], name: "ราชประสงค์" },
  { aliases: ["ราชเทวี", "ratchathewi"], coord: [100.5320, 13.7585], name: "ราชเทวี" },
  { aliases: ["สีลม", "silom"], coord: [100.5340, 13.7248], name: "สีลม" },
  { aliases: ["หัวลำโพง", "hua lamphong", "hualamphong"], coord: [100.5170, 13.7373], name: "หัวลำโพง" },
  { aliases: ["ปทุมวัน", "pathumwan", "pathum wan"], coord: [100.5320, 13.7440], name: "ปทุมวัน" },
];
// แก้พิกัดแลนด์มาร์กให้ "ทนทาน": ถ้า lm มี query เฉพาะ -> ถาม OSM (Nominatim) เอาพิกัดจริง
// แต่ยอมรับเฉพาะเมื่ออยู่ใกล้พิกัด curated (<1.5 กม.) กัน Nominatim คืนที่ผิด/กำกวม
// ถ้าออฟไลน์/หาไม่เจอ -> ใช้พิกัด curated เป็น fallback · ผลลัพธ์ cache ใน localStorage
export async function resolveLandmark(lm) {
  if (!lm.query) return { coord: lm.coord, name: lm.name, landmark: true };
  const key = "lmpos:" + lm.name;
  try { const cc = localStorage.getItem(key); if (cc) { const o = JSON.parse(cc); if (o && o.coord) return { coord: o.coord, name: lm.name, landmark: true }; } } catch (e) {}
  try {
    const g = await geocodeNominatim(lm.query);
    if (g && g.coord && haversine(g.coord, lm.coord) < 1500) {
      try { localStorage.setItem(key, JSON.stringify({ coord: g.coord })); } catch (e) {}
      return { coord: g.coord, name: lm.name, landmark: true };
    }
  } catch (e) {}
  return { coord: lm.coord, name: lm.name, landmark: true };
}
export async function resolvePlace(q) {
  if (!q) return null;
  const s = q.trim().toLowerCase();
  if (s.length < 2) return null;
  for (const lm of LANDMARKS) {
    for (const a of lm.aliases) {
      const al = a.toLowerCase();
      if (s.includes(al) || (al.length >= 3 && al.includes(s))) return await resolveLandmark(lm);
    }
  }
  return null;
}
export async function geocodeNominatim(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=th&countrycodes=th&viewbox=100.45,13.95,100.75,13.55&bounded=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } }); if (!r.ok) return null;
    const j = await r.json(); if (!j.length) return null;
    return { coord: [parseFloat(j[0].lon), parseFloat(j[0].lat)], name: (j[0].display_name || q).split(",")[0] };
  } catch (e) { return null; }
}

export function pointAtDistance(coords, cum, d) {
  if (d <= 0) return coords[0];
  const last = cum.length - 1;
  if (d >= cum[last]) return coords[last];
  let k = 0; while (k < last && cum[k + 1] < d) k++;
  const seg = (cum[k + 1] - cum[k]) || 1; const t = (d - cum[k]) / seg;
  return [coords[k][0] + (coords[k + 1][0] - coords[k][0]) * t, coords[k][1] + (coords[k + 1][1] - coords[k][1]) * t];
}

let _gcChain = Promise.resolve();
export function queuedGeocode(query) {
  const key = "fg:" + query;
  try { const c = localStorage.getItem(key); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
  const run = async () => {
    await new Promise((r) => setTimeout(r, 1100)); // เคารพ rate limit Nominatim
    const g = await geocodeNominatim(query);
    try { if (g) localStorage.setItem(key, JSON.stringify(g)); } catch (e) {}
    return g;
  };
  const pr = _gcChain.then(run, run);
  _gcChain = pr.catch(() => {});
  return pr;
}
// reverse geocode: พิกัด -> ชื่อถนน/ตึก/ย่าน (ใช้บอกว่าห้องน้ำ "อยู่ตึกไหน ถนนอะไร")
export async function reverseGeocode(lonlat) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=th&zoom=18&lon=${lonlat[0]}&lat=${lonlat[1]}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const a = j.address || {};
    const road = a.road || a.pedestrian || a.footway || a.path || "";
    // เลือกชื่อ "ตำแหน่งจริง" ที่เจาะจงก่อน (ตึก/POI/สวน) — เลี่ยง neighbourhood/suburb ที่กว้างและทำให้เข้าใจผิดว่าอยู่คนละที่
    const place = a.building || a.amenity || a.leisure || a.shop || a.mall || a.office || a.tourism || a.neighbourhood || "";
    return { road, place };
  } catch (e) { return null; }
}
// ต่อคิวเดียวกับ geocode (เคารพ rate limit Nominatim 1 req/วิ) + cache ลง localStorage
export function queuedReverse(lonlat) {
  const key = "rev:" + lonlat.map((x) => x.toFixed(5)).join(",");
  try { const c = localStorage.getItem(key); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
  const run = async () => {
    await new Promise((r) => setTimeout(r, 1100));
    const g = await reverseGeocode(lonlat);
    try { if (g) localStorage.setItem(key, JSON.stringify(g)); } catch (e) {}
    return g;
  };
  const pr = _gcChain.then(run, run);
  _gcChain = pr.catch(() => {});
  return pr;
}

// แนะนำสถานที่แบบสด: รวมแลนด์มาร์กในเครื่อง + ค้นจาก OSM (Nominatim) ตามที่พิมพ์
export async function suggestPlaces(q) {
  const s = (q || "").trim().toLowerCase();
  const out = [];
  for (const lm of LANDMARKS) {
    if (lm.aliases.some((a) => { const al = a.toLowerCase(); return al.includes(s) || s.includes(al); })) {
      if (!out.some((o) => o.name === lm.name)) out.push({ name: lm.name, coord: lm.coord, src: "landmark", lm });
    }
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=th&countrycodes=th&viewbox=100.45,13.95,100.75,13.55&bounded=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (r.ok) {
      const j = await r.json();
      for (const it of j) {
        const name = (it.display_name || "").split(",").slice(0, 2).join(", ").trim();
        if (name && !out.some((o) => o.name === name)) out.push({ name, coord: [parseFloat(it.lon), parseFloat(it.lat)], src: "osm" });
      }
    }
  } catch (e) {}
  return out.slice(0, 8);
}