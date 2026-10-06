"use client";

import { useEffect, useRef, useState } from "react";

/* =========================================================
   OSM Map
========================================================= */

function OSMMap({
  center,
  zoom
}) {
  // วัดขนาดจากกรอบของตัวเอง (ไม่ใช้ขนาดหน้าต่าง) เพื่อให้จุดกึ่งกลางแผนที่ตรงกับกึ่งกลางกรอบ
  // ทั้งตอนแสดงเต็มจอ (UC8) และตอนฝังในหน้า (Node / Edge)
  const boxRef = useRef(null);
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight - 64 : 700
  });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setSize(prev => prev.width === r.width && prev.height === r.height ? prev : { width: r.width, height: r.height });
      }
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  // เซิร์ฟเวอร์ OSM มีกระเบื้องเฉพาะระดับซูมที่เป็นเลขจำนวนเต็ม (สูงสุด ~19)
  // ถ้าส่งซูมทศนิยม เช่น 18.3 ไปใน URL จะโหลดไม่ได้ จึงโหลดกระเบื้องที่ระดับจำนวนเต็ม
  // แล้วย่อ/ขยายด้วย CSS ให้พอดีกับระดับซูมที่ต้องการ
  const MAX_NATIVE_ZOOM = 19;
  const tileZoom = Math.max(0, Math.min(MAX_NATIVE_ZOOM, Math.floor(zoom)));
  const tileScale = Math.pow(2, zoom - tileZoom);   // ตัวคูณขนาดกระเบื้อง
  const tileSize = 256 * tileScale;                 // ขนาดกระเบื้องที่แสดงจริง (px)
  const scale = 256 * Math.pow(2, zoom);            // ขนาดโลกทั้งใบที่ระดับซูมนี้ (px)
  const centerLat = Math.max(-85, Math.min(85, center[0]));
  const latRad = centerLat * Math.PI / 180;
  const centerX = (center[1] + 180) / 360 * scale;
  const centerY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
  const startX = centerX - size.width / 2;
  const startY = centerY - size.height / 2;
  const startTileX = Math.floor(startX / tileSize);
  const endTileX = Math.floor((startX + size.width) / tileSize);
  const startTileY = Math.floor(startY / tileSize);
  const endTileY = Math.floor((startY + size.height) / tileSize);
  const tileCount = Math.pow(2, tileZoom);
  const tiles = [];
  for (let y = startTileY; y <= endTileY; y++) {
    if (y < 0 || y >= tileCount) continue;
    for (let x = startTileX; x <= endTileX; x++) {
      const wrappedX = (x % tileCount + tileCount) % tileCount;
      tiles.push(<img key={`${tileZoom}-${x}-${y}`} src={`https://tile.openstreetmap.org/${tileZoom}/${wrappedX}/${y}.png`} alt="" draggable={false} style={{
        position: "absolute",
        width: tileSize + 0.5,
        height: tileSize + 0.5,
        left: x * tileSize - startX,
        top: y * tileSize - startY,
        userSelect: "none",
        pointerEvents: "none"
      }} />);
    }
  }
  return <div ref={boxRef} style={{
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    background: "#ddd"
  }}>
      {tiles}

      <div style={{
      position: "absolute",
      right: 8,
      top: 8,
      padding: "4px 7px",
      borderRadius: 5,
      background: "rgba(255,255,255,.9)",
      fontSize: 10,
      color: "#444"
    }}>
        © OpenStreetMap contributors
      </div>
    </div>;
}

/* =========================================================
   UC9 : บันทึกข้อมูลแผนที่
========================================================= */

export default OSMMap;