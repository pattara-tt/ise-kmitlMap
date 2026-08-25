// API route: ดึงข้อมูลสถานที่จาก OSM (อาคาร, ห้องน้ำ, พื้นที่สีเขียว, ทางเชื่อมมีหลังคา) ฝั่งเซิร์ฟเวอร์
// หมายเหตุ: ตัดชุดข้อมูลที่ไม่เกี่ยวกับ SciMap ออกแล้ว (ไฟส่องสว่าง/กล้อง/ทางม้าลาย/ต้นไม้สำหรับเดินกลางคืน)
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
// south,west,north,east — พื้นที่ สจล. ลาดกระบัง
const DEFAULT_BBOX = [13.719, 100.769, 13.739, 100.789];

function buildQuery(b) {
  const bb = b.join(",");
  return `[out:json][timeout:25];(node["amenity"="toilets"](${bb});way["amenity"="toilets"](${bb});way["leisure"="park"](${bb});way["landuse"="grass"](${bb});way["natural"="water"](${bb}););out center;(way["highway"]["covered"~"yes|arcade"](${bb});way["highway"="footway"]["bridge"](${bb});way["man_made"="bridge"](${bb}););out geom;`;
}

async function fetchOverpass(query) {
  for (const url of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 22000);
    try {
      const res = await fetch(url, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      continue;
    }
  }
  return null;
}

const EMPTY = { trees: [], buildings: [], toilets: [], green: [], cameras: [], crossings: [], treeRows: [], coveredWays: [] };

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let bbox = DEFAULT_BBOX;
  const raw = searchParams.get("bbox");
  if (raw) {
    const parts = raw.split(",").map(Number);
    if (parts.length === 4 && parts.every((x) => Number.isFinite(x))) bbox = parts;
  }
  const json = await fetchOverpass(buildQuery(bbox));
  if (!json) return Response.json({ ok: false, ...EMPTY, error: "overpass ไม่ตอบ" });

  const buildings = [], toilets = [], green = [], coveredWays = [];
  for (const el of json.elements || []) {
    const tg = el.tags || {};
    if (el.type === "way" && Array.isArray(el.geometry)) {
      const line = el.geometry.map((g) => [g.lon, g.lat]).filter((p) => p[0] != null && p[1] != null);
      if (line.length < 2) continue;
      if (tg.covered === "yes" || tg.covered === "arcade" || tg.bridge || tg.man_made === "bridge") coveredWays.push(line);
      continue;
    }
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const pt = [lon, lat];
    if (tg.amenity === "toilets") toilets.push({ pt, tags: tg });
    else if (tg.building) buildings.push(pt);
    else if (tg.leisure === "park" || tg.landuse === "grass" || tg.natural === "water") green.push(pt);
  }
  return Response.json(
    { ok: true, ...EMPTY, buildings, toilets, green, coveredWays, count: { toilets: toilets.length, buildings: buildings.length } },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
