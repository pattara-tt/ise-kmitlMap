"use client";

import { useRef, useState } from "react";
import { SC8_CENTER, SC8_OUTLINE } from "../../mapConfig";
import OSMMap from "./OSMMap";
import { DEFAULT_PLACEMENT } from "./shared";
import { InfoRow, editorButton, smallEditorButton } from "./EditorShared";

/* =========================================================
   Floorplan Editor
   ใช้เฉพาะ UC8
========================================================= */

function FloorplanEditor({
  asset,
  placement,
  onChange,
  onCancel,
  onSave
}) {
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(18);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const center = placement.center || SC8_CENTER;

  /* -----------------------------------------
     Map calculations
  ----------------------------------------- */

  const metersPerPixel = 156543.03392 * Math.cos(center[0] * Math.PI / 180) / Math.pow(2, zoom);
  const widthPx = placement.widthMeters / metersPerPixel;
  const heightPx = placement.heightMeters / metersPerPixel;

  /* -----------------------------------------
     Lat/Lon ↔ pixel
  ----------------------------------------- */

  const latLonToPixel = (lat, lon) => {
    const scale = 256 * Math.pow(2, zoom);
    const x = (lon + 180) / 360 * scale;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
    return {
      x,
      y
    };
  };
  const centerPixel = latLonToPixel(center[0], center[1]);

  /* -----------------------------------------
     Drag SVG
  ----------------------------------------- */

  const startDrag = e => {
    e.preventDefault();
    setDragging(true);
    dragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      center: [...center]
    };
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", stopDrag);
  };
  const moveDrag = e => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.clientX;
    const dy = e.clientY - dragRef.current.clientY;
    const latDelta = -dy * metersPerPixel / 111320;
    const lonDelta = dx * metersPerPixel / (111320 * Math.cos(dragRef.current.center[0] * Math.PI / 180));
    onChange({
      ...placement,
      center: [dragRef.current.center[0] + latDelta, dragRef.current.center[1] + lonDelta]
    });
  };
  const stopDrag = () => {
    setDragging(false);
    dragRef.current = null;
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", stopDrag);
  };

  /* -----------------------------------------
     Size
  ----------------------------------------- */

  const changeScale = factor => {
    const newWidth = Math.min(500, Math.max(20, placement.widthMeters * factor));
    const ratio = placement.heightMeters / placement.widthMeters;
    onChange({
      ...placement,
      widthMeters: newWidth,
      heightMeters: newWidth * ratio
    });
  };
  const changeWidth = value => {
    const newWidth = Math.min(500, Math.max(20, Number(value) || 20));
    const ratio = placement.heightMeters / placement.widthMeters;
    onChange({
      ...placement,
      widthMeters: newWidth,
      heightMeters: newWidth * ratio
    });
  };

  /* -----------------------------------------
     Rotation
  ----------------------------------------- */

  const changeRotation = value => {
    let rotation = Number(value) || 0;
    while (rotation > 180) {
      rotation -= 360;
    }
    while (rotation < -180) {
      rotation += 360;
    }
    onChange({
      ...placement,
      rotation
    });
  };

  /* -----------------------------------------
     Reset
  ----------------------------------------- */

  const reset = () => {
    onChange({
      ...DEFAULT_PLACEMENT,
      center: [...SC8_CENTER]
    });
    setZoom(18);
  };

  /* -----------------------------------------
     Building outline
  ----------------------------------------- */

  const outlinePoints = SC8_OUTLINE?.map(([lat, lon]) => {
    const p = latLonToPixel(lat, lon);
    return {
      x: p.x - centerPixel.x + window.innerWidth / 2,
      y: p.y - centerPixel.y + (window.innerHeight - 64) / 2
    };
  }) || [];
  return <div style={{
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "#111",
    display: "flex",
    flexDirection: "column"
  }}>
      {/* Header */}

      <div style={{
      height: 64,
      flex: "none",
      background: "#fff",
      borderBottom: "1px solid #ddd",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px"
    }}>
        <div>
          <div style={{
          fontWeight: 800,
          fontSize: 17
        }}>
            🗺️ จัดตำแหน่งแปลนบนแผนที่
          </div>

          <div style={{
          fontSize: 12,
          color: "#5F6368"
        }}>
            {asset.name} ·{" "}
            {asset.buildingName || "อาคาร"}{" "}
            · ชั้น{" "}
            {asset.floorNo || "?"}
          </div>
        </div>

        <div style={{
        display: "flex",
        gap: 7
      }}>
          <button onClick={reset} style={editorButton}>
            รีเซ็ต
          </button>

          <button onClick={onCancel} style={editorButton}>
            ยกเลิก
          </button>

          <button onClick={() => onSave(placement)} style={{
          ...editorButton,
          background: "#111",
          color: "#fff",
          borderColor: "#111"
        }}>
            💾 บันทึกตำแหน่ง
          </button>
        </div>
      </div>

      {/* Map */}

      <div ref={mapRef} style={{
      position: "relative",
      flex: 1,
      overflow: "hidden",
      cursor: dragging ? "grabbing" : "default",
      background: "#ddd"
    }}>
        <OSMMap center={center} zoom={zoom} />

        {/* Building outline */}

        <svg style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none"
      }}>
          <polygon points={outlinePoints.map(p => `${p.x},${p.y}`).join(" ")} fill="rgba(255,0,0,.08)" stroke="red" strokeWidth="3" strokeDasharray="8 6" />
        </svg>

        {/* Floorplan */}

        <div onPointerDown={startDrag} style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: Math.max(30, widthPx),
        height: Math.max(30, heightPx),
        transform: `
              translate(-50%, -50%)
              rotate(${placement.rotation}deg)
            `,
        transformOrigin: "center",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        border: "2px solid rgba(26,115,232,.75)",
        boxShadow: "0 2px 10px rgba(0,0,0,.18)",
        background: "transparent"
      }}>
          <img src={asset.file} alt="floorplan" draggable={false} style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "fill",
          opacity: 0.9,
          userSelect: "none",
          pointerEvents: "none"
        }} />

          {/* จุดกึ่งกลาง */}

          <div style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 12,
          height: 12,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "#1a73e8",
          border: "2px solid white",
          boxShadow: "0 1px 5px rgba(0,0,0,.4)"
        }} />
        </div>

        {/* Left information */}

        <div style={{
        position: "absolute",
        left: 14,
        bottom: 14,
        width: 285,
        background: "rgba(255,255,255,.96)",
        borderRadius: 10,
        padding: 14,
        boxShadow: "0 6px 25px rgba(0,0,0,.2)"
      }}>
          <b style={{
          fontSize: 13
        }}>
            📍 ตำแหน่งปัจจุบัน
          </b>

          <InfoRow label="Latitude" value={center[0].toFixed(6)} />

          <InfoRow label="Longitude" value={center[1].toFixed(6)} />

          <InfoRow label="ความกว้าง" value={`${Number(placement.widthMeters).toFixed(1)} m`} />

          <InfoRow label="ความสูง" value={`${Number(placement.heightMeters).toFixed(1)} m`} />

          <InfoRow label="Rotation" value={`${Number(placement.rotation).toFixed(1)}°`} />

          <div style={{
          marginTop: 10,
          fontSize: 11,
          color: "#5F6368",
          lineHeight: 1.5
        }}>
            💡 ลากแปลนด้วยเมาส์เพื่อเปลี่ยนตำแหน่ง
          </div>
        </div>

        {/* Right controls */}

        <div style={{
        position: "absolute",
        right: 14,
        bottom: 14,
        width: 285,
        background: "rgba(255,255,255,.96)",
        borderRadius: 10,
        padding: 14,
        boxShadow: "0 6px 25px rgba(0,0,0,.2)"
      }}>
          <b style={{
          fontSize: 13
        }}>
            ⚙️ ปรับแต่งแปลน
          </b>

          {/* Zoom */}

          <div style={{
          marginTop: 12,
          fontSize: 12,
          fontWeight: 700
        }}>
            🔍 Zoom แผนที่
          </div>

          <input type="range" min="15" max="20" step="1" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{
          width: "100%"
        }} />

          <div style={{
          fontSize: 11,
          color: "#5F6368"
        }}>
            Zoom {zoom}
          </div>

          {/* Size */}

          <div style={{
          marginTop: 14,
          fontSize: 12,
          fontWeight: 700
        }}>
            📐 ขนาดแปลน
          </div>

          <div style={{
          display: "flex",
          gap: 6,
          marginTop: 7
        }}>
            <button onClick={() => changeScale(0.9)} style={smallEditorButton}>
              −
            </button>

            <button onClick={() => changeScale(1.1)} style={smallEditorButton}>
              +
            </button>

            <input type="number" value={Math.round(placement.widthMeters)} onChange={e => changeWidth(e.target.value)} style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #DADCE0",
            borderRadius: 6,
            padding: "6px 8px"
          }} />

            <span style={{
            display: "flex",
            alignItems: "center",
            fontSize: 12
          }}>
              m
            </span>
          </div>

          {/* Rotation */}

          <div style={{
          marginTop: 14,
          fontSize: 12,
          fontWeight: 700
        }}>
            🔄 หมุนแปลน
          </div>

          <div style={{
          display: "flex",
          gap: 6,
          marginTop: 7
        }}>
            <button onClick={() => changeRotation(placement.rotation - 1)} style={smallEditorButton}>
              ↶ 1°
            </button>

            <input type="number" value={Number(placement.rotation.toFixed(1))} onChange={e => changeRotation(e.target.value)} style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #DADCE0",
            borderRadius: 6,
            padding: "6px 8px"
          }} />

            <button onClick={() => changeRotation(placement.rotation + 1)} style={smallEditorButton}>
              ↷ 1°
            </button>
          </div>
        </div>
      </div>
    </div>;
}

/* =========================================================
   OSM Map
========================================================= */

export default FloorplanEditor;