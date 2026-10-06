// กิจกรรมที่ยังไม่สิ้นสุด ถึงจะขึ้นบนแผนที่
export const isEventVisible = e => {
  if (!e?.endAt) return true;
  const end = new Date(e.endAt).getTime();
  return Number.isNaN(end) || end >= Date.now();
};

export const fmtEventTime = v => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " " + d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit"
  }) + " น.";
};

// ไอคอนในหมุดกิจกรรม — เรนเดอร์เป็นสีขาวผ่าน CSS mask ให้ตัดกับพื้นหมุด

// ไอคอนในหมุดกิจกรรม — เรนเดอร์เป็นสีขาวผ่าน CSS mask ให้ตัดกับพื้นหมุด
export const EVENT_PIN_ICON = "/data/icon/ui/bullhorn.svg";

// ไอคอนเข็มทิศจากไฟล์ SVG — ย้อมสีตามบริบทที่ใช้

export function placementToBounds(placement, fallbackBounds) {
  if (!placement || !Array.isArray(placement.center) || placement.center.length !== 2) {
    return fallbackBounds;
  }
  const lat = Number(placement.center[0]);
  const lon = Number(placement.center[1]);
  const widthMeters = Number(placement.widthMeters);
  const heightMeters = Number(placement.heightMeters);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(widthMeters) || !Number.isFinite(heightMeters) || widthMeters <= 0 || heightMeters <= 0) {
    return fallbackBounds;
  }
  const latHalf = heightMeters / (2 * 111320);
  const lonHalf = widthMeters / (2 * 111320 * Math.cos(lat * Math.PI / 180));
  return [[lat - latHalf, lon - lonHalf], [lat + latHalf, lon + lonHalf]];
}

// 🔧 สลับโหมดแล้วต้องสั่ง Leaflet คำนวณขนาด container ใหม่เอง — ไม่งั้นแผนที่ค้างขนาดเดิม (เห็นแค่ UI overlay ขยับนิดเดียว แผนที่ไม่เต็มจอ)

// 📚 ดึงข้อมูลสถานที่จาก Wikipedia อัตโนมัติ (ข้อความย่อ + รูปภาพ) — ลองภาษาไทยก่อน ถ้าไม่มีค่อย fallback เป็นอังกฤษ
// ✏️ ใส่ข้อมูลสถานที่เอง — เช็คตารางนี้ก่อนเสมอ (key = ชื่อที่ขึ้นในช่องค้นหา/BUILDINGS registry) เพิ่ม entry ใหม่ตรงนี้ได้เลย
const PLACE_INFO = {
  "ตึกพระจอมเกล้าฯ (Sc8)": {
    extract: "อาคารเรียน/ปฏิบัติการของ สจล. ภายในมีห้องเรียน และ Co-Working Space",
    image: "/data/places/sc8.png"
  }
};

// 📚 ดึงข้อมูลสถานที่ — เช็ค PLACE_INFO (ใส่เอง) ก่อนเสมอ ถ้าไม่มีค่อย fallback ไป OpenStreetMap/Nominatim (ไม่ใช้ Wikipedia แล้ว)

// 📚 ดึงข้อมูลสถานที่ — เช็ค PLACE_INFO (ใส่เอง) ก่อนเสมอ ถ้าไม่มีค่อย fallback ไป OpenStreetMap/Nominatim (ไม่ใช้ Wikipedia แล้ว)
export async function fetchPlaceInfo(query) {
  if (PLACE_INFO[query]) return {
    title: query,
    extract: PLACE_INFO[query].extract,
    image: PLACE_INFO[query].image
  };
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&namedetails=1&accept-language=th&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!arr.length) return null;
    const j = arr[0];
    const category = [j.type, j.class].filter(Boolean).join(" · ");
    const extract = j.extratags?.description || [category, j.display_name].filter(Boolean).join(" — ");
    return {
      title: j.namedetails?.name || query,
      extract: extract || null,
      image: null
    }; // OSM/Nominatim ไม่มีรูปแนบมาด้วย — ใส่เองผ่าน PLACE_INFO ถ้าต้องการรูป
  } catch (e) {
    return null;
  }
}

// 🎪 เปิดการ์ดรายละเอียดกิจกรรม (ข้อมูลตามที่ฝ่ายประชาสัมพันธ์กรอกไว้)
