"use client";

import { useEffect, useState } from "react";

/* =========================================================
   OSM Map
========================================================= */

function OSMMap({
  center,
  zoom
}) {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight - 64 : 700
  });
  useEffect(() => {
    const resize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight - 64
      });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const tileSize = 256;
  const scale = tileSize * Math.pow(2, zoom);
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
  const tileCount = Math.pow(2, zoom);
  const tiles = [];
  for (let y = startTileY; y <= endTileY; y++) {
    if (y < 0 || y >= tileCount) continue;
    for (let x = startTileX; x <= endTileX; x++) {
      const wrappedX = (x % tileCount + tileCount) % tileCount;
      tiles.push(<img key={`${zoom}-${x}-${y}`} src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`} alt="" draggable={false} style={{
        position: "absolute",
        width: tileSize,
        height: tileSize,
        left: x * tileSize - startX,
        top: y * tileSize - startY,
        userSelect: "none",
        pointerEvents: "none"
      }} />);
    }
  }
  return <div style={{
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