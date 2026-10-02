// Full basemap tiles; indoor floor plans, routes and database overlays stay on top.
// CARTO requires a project API key. Without one, use OSM tiles for local testing.
// In production, configure NEXT_PUBLIC_CARTO_BASEMAP_KEY (or CARTO_BASEMAP_KEY in Docker .env).
import { OVERPASS_MIRRORS } from "./mapConfig";

const CARTO_KEY = String(process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY || "").trim();
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>`;

export function fullBasemapConfig(key = CARTO_KEY) {
  if (key) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      options: {
        subdomains: "abcd",
        maxNativeZoom: 20,
        maxZoom: 21,
        attribution: CARTO_ATTRIBUTION,
      },
      provider: "carto",
    };
  }
  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxNativeZoom: 19, maxZoom: 21, attribution: OSM_ATTRIBUTION },
    provider: "osm",
  };
}

// Legacy function name is preserved for MapView, registrar and event MapPicker.
export async function drawGoogleLikeBaseMap(L, map, bbox) {
  const [south, west, north, east] = bbox;
  if (!map.getPane("bdiLabelPane")) {
    map.createPane("bdiLabelPane");
    map.getPane("bdiLabelPane").style.zIndex = "250";
    map.getPane("bdiLabelPane").style.pointerEvents = "none";
  }
  if (!map.getPane("bdiPoiPane")) {
    map.createPane("bdiPoiPane");
    map.getPane("bdiPoiPane").style.zIndex = "690";
    map.getPane("bdiPoiPane").style.pointerEvents = "auto";
  }

  // A full raster tile already includes streets, buildings, water, parks and labels.
  // Do not paint the old Overpass geometry on top: it duplicates or masks the tiles.
  const { url, options } = fullBasemapConfig();
  map.getContainer().style.background = "#F4F5F5";
  const baseLayer = L.layerGroup().addTo(map); // Retained for legacy caller compatibility.
  const poiLayer = L.layerGroup().addTo(map);
  const labels = L.tileLayer(url, {
    ...options,
    pane: "bdiLabelPane",
  }).addTo(map);

  // ดึงสถานที่สำคัญจาก OpenStreetMap แล้วแสดงเป็นไอคอนบนแผนที่
  // จำกัดเฉพาะจุดที่มีชื่อ เพื่อลดความรกและจำนวน marker
  const poiCacheKey = `bdi-poi:${south.toFixed(3)},${west.toFixed(3)},${north.toFixed(3)},${east.toFixed(3)}`;
  const poiQuery = `[out:json][timeout:30];(
    nwr["name"]["amenity"](${south},${west},${north},${east});
    nwr["name"]["shop"](${south},${west},${north},${east});
    nwr["name"]["tourism"](${south},${west},${north},${east});
    nwr["name"]["leisure"](${south},${west},${north},${east});
    nwr["name"]["public_transport"](${south},${west},${north},${east});
    nwr["name"]["railway"~"station|halt|subway_entrance"](${south},${west},${north},${east});
  );out center tags;`;

  let poiJson = null;
  for (const url of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        method: "POST",
        body: "data=" + encodeURIComponent(poiQuery),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      poiJson = await res.json();
      try {
        if (poiJson?.elements?.length) {
          localStorage.setItem(poiCacheKey, JSON.stringify(poiJson));
        }
      } catch (e) {}
      break;
    } catch (e) {
      clearTimeout(timer);
    }
  }

  // ถ้า Overpass ล่ม/timeout ให้ใช้ POI ที่เคยโหลดสำเร็จไว้ เพื่อไม่ให้ไอคอนหายหลัง refresh
  if (!poiJson) {
    try {
      const cachedPoi = localStorage.getItem(poiCacheKey);
      if (cachedPoi) poiJson = JSON.parse(cachedPoi);
    } catch (e) {}
  }

  // ไอคอน POI แบบ filled: รูปทึบ สีเดียว ไม่มีวงกลมหรือพื้นหลังครอบ
  const poiSvg = (type, color) => {
    const common = `viewBox="0 0 24 24" width="24" height="24" fill="${color}" aria-hidden="true"`;
    const paths = {
      transit: '<path d="M7 2h10c2.2 0 4 1.8 4 4v9c0 1.7-1.3 3-3 3l2 3h-3l-2-3H9l-2 3H4l2-3c-1.7 0-3-1.3-3-3V6c0-2.2 1.8-4 4-4Zm0 3a1 1 0 0 0-1 1v4h12V6a1 1 0 0 0-1-1H7Zm1 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/>',
      food: '<path d="M7 2h2v8c0 1.4-.8 2.6-2 3.2V22H5v-8.8A3.5 3.5 0 0 1 3 10V2h2v6h2V2Zm9 0c3 1.7 5 5 5 8.5 0 2.1-.8 3.8-2 4.8V22h-2v-6.2c-1.8-.5-3-2.2-3-4.8V2h2Z"/>',
      cafe: '<path d="M4 5h13v2h2a4 4 0 0 1 0 8h-2.4A6.5 6.5 0 0 1 4 12.5V5Zm13 4v4h2a2 2 0 0 0 0-4h-2ZM3 19h16v2H3v-2Z"/>',
      medical: '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2Z"/>',
      pharmacy: '<path d="M8 2h8v4h3v16H5V6h3V2Zm2 2v2h4V4h-4Zm1 5v3H8v4h3v3h4v-3h3v-4h-3V9h-4Z"/>',
      education: '<path d="M12 2 1 8l11 6 9-4.9V17h2V8L12 2Zm-7 9.8V17c0 2 3.1 4 7 4s7-2 7-4v-5.2l-7 3.8-7-3.8Z"/>',
      bank: '<path d="M12 2 2 7v3h20V7L12 2ZM4 12h3v7H4v-7Zm6 0h4v7h-4v-7Zm7 0h3v7h-3v-7ZM2 21v-2h20v2H2Z"/>',
      parking: '<path d="M5 2h8a7 7 0 0 1 0 14H9v6H5V2Zm4 4v6h4a3 3 0 1 0 0-6H9Z"/>',
      fuel: '<path d="M5 2h10v20H3V4a2 2 0 0 1 2-2Zm1 3v6h6V5H6Zm11 1 3 3v8.5a1.5 1.5 0 0 0 3 0V10h-2v7.5a.5.5 0 0 1-1 0V8l-3-3v1Z"/>',
      toilet: '<path d="M7 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm10 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM4 9h6l1 6H9v7H5v-7H3l1-6Zm10 0h6l1 6h-2v7h-4v-7h-2l1-6Z"/>',
      police: '<path d="M12 2 3 6v6c0 5.5 3.8 9.2 9 11 5.2-1.8 9-5.5 9-11V6l-9-4Zm0 5 1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4L12 7Z"/>',
      hotel: '<path d="M3 5h4a4 4 0 0 1 4 4v2h10a2 2 0 0 1 2 2v8h-3v-3H4v3H1V7a2 2 0 0 1 2-2Zm1 3v3h4V9a1 1 0 0 0-1-1H4Zm0 6v2h16v-2H4Z"/>',
      attraction: '<path d="M7 4h3l1.5-2h3L16 4h4a2 2 0 0 1 2 2v14H2V6a2 2 0 0 1 2-2h3Zm5 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/>',
      shop: '<path d="M4 3h16l2 6a4 4 0 0 1-2 3.5V22H4v-9.5A4 4 0 0 1 2 9l2-6Zm3 11v5h4v-5H7Zm6 0v5h4v-5h-4Z"/>',
      place: '<path d="M12 2a8 8 0 0 1 8 8c0 5.8-8 12-8 12S4 15.8 4 10a8 8 0 0 1 8-8Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>',
    };
    return `<svg ${common}>${paths[type] || paths.place}</svg>`;
  };


  // โทนสี POI แบบ "พาสเทลสด" — อิ่มสีมากกว่าชุดหม่นเดิม ~30-40% ให้แผนที่ดูมีชีวิต แต่ยังอ่อนกว่าเส้นนำทาง 1 สเต็ป
  // transit/bank/parking เลี่ยงตระกูลน้ำเงินทั้งหมด (น้ำเงินถูกจองโดยเส้นทาง #1A73E8/#8AB4F8 และถนน #C4CFDA แล้ว)
  // → ตอนนี้ไม่มีหมวดไหนใช้ตระกูลน้ำเงินสดแล้ว: shop เขียวมะกอก, police กรมท่าเข้มจัด (น้ำเงินสดสงวนให้เส้นทางอย่างเดียว)
  // เส้นทางใช้สีสด (#1A73E8 / #34A853 / #FBBC04 / #8E24AA ใน SEGMENT_COLORS) จึงเลี่ยงเฉดสดพวกนั้นทั้งหมด
  const poiStyle = (tags = {}) => {
    const a = tags.amenity || "";
    const shop = tags.shop || "";
    const tourism = tags.tourism || "";
    const railway = tags.railway || "";
    const pt = tags.public_transport || "";
    if (railway === "station" || railway === "halt" || railway === "subway_entrance" || pt === "station") return { type: "transit", color: "#12938B" };
    if (["restaurant", "fast_food", "food_court"].includes(a)) return { type: "food", color: "#E08245" };
    if (a === "cafe") return { type: "cafe", color: "#CF8F52" };
    if (["hospital", "clinic", "doctors"].includes(a)) return { type: "medical", color: "#E06A60" };
    if (a === "pharmacy") return { type: "pharmacy", color: "#57A468" };
    if (["school", "college", "university", "kindergarten"].includes(a)) return { type: "education", color: "#A76BC8" };
    if (["bank", "atm"].includes(a)) return { type: "bank", color: "#A87E4C" };
    if (a === "parking") return { type: "parking", color: "#6E7887" };
    if (a === "fuel") return { type: "fuel", color: "#D9A93F" };
    if (a === "toilets") return { type: "toilet", color: "#3AA8A0" };
    if (a === "police") return { type: "police", color: "#44506E" };
    if (tourism === "hotel" || tourism === "hostel") return { type: "hotel", color: "#BC79AE" };
    if (tourism === "attraction" || tourism === "museum") return { type: "attraction", color: "#63A392" };
    if (shop || a === "marketplace") return { type: "shop", color: "#98A24A" };
    return { type: "place", color: "#8F959B" };
  };
  
  const NAME_OVERRIDE = {
    "ตึกปฏิบัติการณ์หลังใหม่": "ตึกพระจอมเกล้าฯ (Sc8)",
    "ตึกปฏิบัติการหลังใหม่": "ตึกพระจอมเกล้าฯ (Sc8)",
    "ถนนหลวงพรตพิทยพยัต": "ตึกพระจอมเกล้าฯ (Sc8)",
    "ถนนหลวงพรตพิทยพยัตต์": "ตึกพระจอมเกล้าฯ (Sc8)",
  };

  if (poiJson) {
    const seen = new Set();
    for (const el of poiJson.elements || []) {
      // node ใช้ lat/lon โดยตรง ส่วน way/relation ใช้ center จาก Overpass
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
      const tags = el.tags || {};

    const rawName =
      tags["name:th"] ||
      tags.name ||
      tags["name:en"];

    if (!rawName) continue;

    const name =
      NAME_OVERRIDE[rawName.trim()] ||
      rawName;

    const key =
      `${lat.toFixed(6)},${lon.toFixed(6)},${name}`;   
      if (seen.has(key)) continue;
      seen.add(key);
      const st = poiStyle(tags);
      const icon = L.divIcon({
        className: "",
        html: `<span class="bdi-poi-icon" style="color:${st.color}">${poiSvg(st.type, st.color)}</span>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const marker = L.marker([lat, lon], {
        pane: "bdiPoiPane",
        icon,
        keyboard: false,
        riseOnHover: true,
        zIndexOffset: 3000,
      }).bindTooltip(name, { direction: "top", offset: [0, -10], opacity: 0.95 });
      marker.bindPopup(`<b>${name}</b>`);
      marker.addTo(poiLayer);
    }
  }

  // ลดความรก: แสดง POI เมื่อซูมระดับถนนขึ้นไป
  const updatePoiVisibility = () => {
    if (map.getZoom() >= 15) {
      if (!map.hasLayer(poiLayer)) poiLayer.addTo(map);
    } else if (map.hasLayer(poiLayer)) {
      map.removeLayer(poiLayer);
    }
  };
  map.on("zoomend", updatePoiVisibility);
  updatePoiVisibility();

  return { baseLayer, labels, poiLayer };
}