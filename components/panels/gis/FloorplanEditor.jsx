"use client";

import { useRef, useState } from "react";
import { SC8_CENTER, SC8_OUTLINE } from "../../mapConfig";
import OSMMap from "./OSMMap";
import { DEFAULT_PLACEMENT } from "./shared";
import { InfoRow, editorButton, smallEditorButton } from "./EditorShared";

/* =========================================================
   Floorplan Editor
   - mode "placement" : จัดตำแหน่งแปลนบนแผนที่ (UC8) แบบเต็มจอ
   - mode "pin-node"  : ปักหมุด Node / กำหนด Edge (ใช้ใน NodeEdgeTab)
                        ส่ง embedded มาเพื่อแสดงเป็นกรอบในหน้า ไม่คลุมเต็มจอ
   Node เก็บเป็นพิกัดจริง (x = longitude, y = latitude)
========================================================= */

const M_PER_DEG_LAT = 111320;

function FloorplanEditor({
  asset,
  placement,
  mode = "placement",
  embedded = false,
  nodes = [],            // node ของชั้นนี้ ใช้แสดงหมุดเดิม
  edges = [],            // edge ที่จะวาดเป็นเส้น
  nodeById,              // Map(id -> node) สำหรับหาปลายทางของ edge
  draft = null,          // { x, y } หมุดใหม่ที่ยังไม่บันทึก
  editingNodeId = null,
  fromNodeId = "",
  toNodeId = "",
  pickMode = "node",     // "node" = คลิกพื้นที่ว่างเพื่อวางหมุด, "edge" = คลิก node เพื่อเลือกเส้นทาง
  onSelectPosition,
  onPickNode,
  onChange,
  onCancel,
  onSave
}) {
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(mode === "pin-node" ? 19 : 18);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const center = placement.center || SC8_CENTER;
  const isPin = mode === "pin-node";

  /* -----------------------------------------
     Map calculations
  ----------------------------------------- */

  const cosLat = Math.cos(center[0] * Math.PI / 180);
  const metersPerPixel = 156543.03392 * cosLat / Math.pow(2, zoom);
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

  // lat/lon -> ระยะพิกเซลเทียบกับจุดกึ่งกลางแผนที่ (ใช้วาด node / edge)
  const toOffset = (lat, lon) => ({
    dx: (lon - center[1]) * M_PER_DEG_LAT * cosLat / metersPerPixel,
    dy: -(lat - center[0]) * M_PER_DEG_LAT / metersPerPixel
  });

  /* -----------------------------------------
     Drag SVG (โหมดจัดวางแปลนเท่านั้น)
     เก็บค่าตอนเริ่มลากไว้ใน dragRef เพื่อไม่ให้ใช้ค่าเก่าจาก render ก่อนหน้า
  ----------------------------------------- */

  const startDrag = e => {
    if (isPin) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      center: [...center],
      placement,
      metersPerPixel
    };
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", stopDrag);
  };
  const moveDrag = e => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.clientX;
    const dy = e.clientY - d.clientY;
    const latDelta = -dy * d.metersPerPixel / M_PER_DEG_LAT;
    const lonDelta = dx * d.metersPerPixel / (M_PER_DEG_LAT * Math.cos(d.center[0] * Math.PI / 180));
    onChange({
      ...d.placement,
      center: [d.center[0] + latDelta, d.center[1] + lonDelta]
    });
  };

  const stopDrag = () => {
    setDragging(false);
    dragRef.current = null;
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", stopDrag);
  };

  /* -----------------------------------------
     Click บนแผนที่ (โหมดปักหมุด Node)
     คำนวณเป็น lat/lon จริงจากตำแหน่งคลิกเทียบกับจุดกึ่งกลางกรอบแผนที่
     ชั้น overlay ไม่หมุนตามแปลน จึงไม่ต้องคิด rotation
  ----------------------------------------- */
  const handleMapClick = e => {
    if (!isPin || pickMode !== "node" || !onSelectPosition || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const longitude = center[1] + dx * metersPerPixel / (M_PER_DEG_LAT * cosLat);
    const latitude = center[0] - dy * metersPerPixel / M_PER_DEG_LAT;
    onSelectPosition({
      x: Number(longitude.toFixed(7)),
      y: Number(latitude.toFixed(7)),
      longitude,
      latitude
    });
  };

  // --- ฟังก์ชันจัดการ Zoom ---
  const changeZoom = value => {
    const newZoom = Math.min(22, Math.max(1, Number(value) || 18));
    setZoom(newZoom);
  };

  /* -----------------------------------------
     Size
  ----------------------------------------- */

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
     Building outline (โหมดจัดวางแปลน)
  ----------------------------------------- */

  const outlinePoints = isPin || embedded ? [] : SC8_OUTLINE?.map(([lat, lon]) => {
    const p = latLonToPixel(lat, lon);
    return {
      x: p.x - centerPixel.x + window.innerWidth / 2,
      y: p.y - centerPixel.y + (window.innerHeight - 64) / 2
    };
  }) || [];

  /* -----------------------------------------
     Node / Edge overlay
  ----------------------------------------- */

  const validNodes = nodes.filter(n => n.x !== "" && n.y !== "" && n.x != null && n.y != null && Number.isFinite(Number(n.x)) && Number.isFinite(Number(n.y)));
  const fromNode = fromNodeId ? nodeById?.get(fromNodeId) : null;
  const toNode = toNodeId ? nodeById?.get(toNodeId) : null;
  const nodeColor = n => {
    if (n.id === fromNodeId) return "#188038";
    if (n.id === toNodeId) return "#E37400";
    if (n.id === editingNodeId) return "#1A73E8";
    return "#EA4335";
  };
  const drawLine = (a, b, key, style) => {
    const p = toOffset(Number(a.y), Number(a.x));
    const q = toOffset(Number(b.y), Number(b.x));
    return <line key={key} x1={p.dx} y1={p.dy} x2={q.dx} y2={q.dy} {...style} />;
  };
  const hasDraft = draft && draft.x !== "" && draft.y !== "" && Number.isFinite(Number(draft.x)) && Number.isFinite(Number(draft.y));

  return <div style={embedded ? {
    position: "relative",
    height: "min(62vh, 560px)",
    minHeight: 320,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid #DADCE0",
    background: "#111",
    display: "flex",
    flexDirection: "column"
  } : {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "#111",
    display: "flex",
    flexDirection: "column"
  }}>
      {/* Header (ไม่แสดงเมื่อฝังในหน้า เพราะ NodeEdgeTab มีหัวข้อของตัวเอง) */}

      {!embedded && (
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
          <div style={{ fontWeight: 800, fontSize: 17 }}>
            {isPin ? "📍 เลือกตำแหน่งปักหมุด Node บนแปลน" : "🗺️ จัดตำแหน่งแปลนบนแผนที่"}
          </div>
          <div style={{ fontSize: 12, color: "#5F6368" }}>
            {asset.name} · {asset.buildingName || "อาคาร"} · ชั้น {asset.floorNo || "?"}
          </div>
        </div>

        <div style={{display: "flex",gap: 7}}>
          {!isPin && (
            <button onClick={reset} style={editorButton}>รีเซ็ต</button>
          )}

          <button onClick={onCancel} style={editorButton}>
            {isPin ? "เสร็จสิ้น / กลับ" : "ยกเลิก"}
          </button>

          {!isPin && (
          <button onClick={() => onSave(placement)} style={{
            ...editorButton,
            background: "#111",
            color: "#fff",
            borderColor: "#111"
          }}>
            💾 บันทึกตำแหน่ง
          </button>
          )}
        </div>
      </div>
      )}

      {/* Map */}

      <div ref={mapRef}
        style={{
          position: "relative",
          flex: 1,
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "default",
          background: "#ddd"
      }}>
        <OSMMap center={center} zoom={zoom} />

        {/* Building outline */}
        {!isPin && !embedded && (
          <svg style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none"
          }}>
            <polygon points={outlinePoints.map(p => `${p.x},${p.y}`).join(" ")} fill="rgba(255,0,0,.08)" stroke="red" strokeWidth="3" strokeDasharray="8 6" />
          </svg>
        )}

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
          cursor: isPin ? "default" : dragging ? "grabbing" : "grab",
          pointerEvents: isPin ? "none" : "auto",
          touchAction: "none",
          border: "2px solid rgba(26,115,232,.75)",
          boxShadow: "0 2px 10px rgba(0,0,0,.18)",
          background: "transparent"
        }}>

        {asset?.file && (
        <img src={asset.file} alt="floorplan" draggable={false} style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "fill",
          opacity: 0.9,
          userSelect: "none",
          pointerEvents: "none"
        }} />
        )}

          {/* จุดกึ่งกลางแปลน (เฉพาะโหมดจัดวาง) */}

        {!isPin && (
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
          boxShadow: "0 1px 5px rgba(0,0,0,.4)",
          pointerEvents: "none"
        }} />
        )}
        </div>

        {/* ชั้น overlay สำหรับปักหมุด: Node / Edge อยู่นอกกล่องแปลนที่หมุนได้ จึงใช้พิกัดจริงตรง ๆ */}
        {isPin && (
          <div onClick={handleMapClick} style={{
            position: "absolute",
            inset: 0,
            cursor: pickMode === "node" ? "crosshair" : "default"
          }}>
            <svg width="1" height="1" style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              overflow: "visible",
              pointerEvents: "none"
            }}>
              {edges.map(ed => {
                const a = nodeById?.get(ed.fromNodeId);
                const b = nodeById?.get(ed.toNodeId);
                if (!a || !b || a.floorId !== b.floorId) return null;
                return drawLine(a, b, ed.id, {
                  stroke: ed.accessible === false ? "#9AA0A6" : "#1A73E8",
                  strokeWidth: 3,
                  strokeDasharray: ed.accessible === false ? "6 5" : undefined
                });
              })}
              {fromNode && toNode && fromNode.floorId === toNode.floorId &&
                drawLine(fromNode, toNode, "preview", { stroke: "#E37400", strokeWidth: 4, strokeDasharray: "2 6", strokeLinecap: "round" })}
            </svg>

            {/* เรนเดอร์ Node ที่มีอยู่แล้ว */}
            {validNodes.map(node => {
              const { dx, dy } = toOffset(Number(node.y), Number(node.x));
              return (
                <div key={node.id} title={node.label || node.nodeKey || ""}
                  onClick={e => { e.stopPropagation(); onPickNode && onPickNode(node); }}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${dx}px)`,
                    top: `calc(50% + ${dy}px)`,
                    transform: "translate(-50%, -50%)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                  <span style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    border: `3px solid ${nodeColor(node)}`,
                    boxShadow: "0 1px 5px rgba(0,0,0,.35)"
                  }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: nodeColor(node),
                    background: "rgba(255,255,255,.85)",
                    padding: "0 4px",
                    borderRadius: 4,
                    whiteSpace: "nowrap"
                  }}>{node.label || node.name || node.nodeKey}</span>
                </div>
              );
            })}

            {/* หมุดใหม่ที่ยังไม่บันทึก */}
            {hasDraft && (() => {
              const { dx, dy } = toOffset(Number(draft.y), Number(draft.x));
              return (
                <div style={{
                  position: "absolute",
                  left: `calc(50% + ${dx}px)`,
                  top: `calc(50% + ${dy}px)`,
                  transform: "translate(-50%, -100%)",
                  fontSize: 26,
                  lineHeight: 1,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 2px 3px rgba(0,0,0,.4))"
                }}>📍</div>
              );
            })()}
          </div>
        )}

        {/* Left information (เฉพาะโหมดจัดวาง) */}

        {!isPin && (
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
          <b style={{fontSize: 13}}>
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
        )}

        {/* โหมดปักหมุด: แสดงเฉพาะตัวปรับซูม เพื่อให้พื้นที่แผนผังกว้างที่สุด */}

        {isPin && (
          <div onClick={e => e.stopPropagation()} style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            background: "rgba(255,255,255,.95)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            boxShadow: "0 2px 10px rgba(0,0,0,.2)"
          }}>
            🔍 ซูม {zoom.toFixed(1)}
            <input type="range" min="16" max="22" step="0.1" value={zoom}
              onChange={e => changeZoom(Number(e.target.value))}
              style={{ display: "block", width: 140 }} />
          </div>
        )}

        {/* Right controls (เฉพาะโหมดจัดวาง) */}

        {!isPin && (
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
            ⚙️ ปรับแต่งแผนผัง
          </b>

          {/* Zoom Map */}
          <div style={{
            marginTop: 14,
            fontSize: 12,
            fontWeight: 700
          }}>
            🔍 ซูมแผนที่ (Zoom)
          </div>

          <input
            type="range"
            min="10"
            max="22"
            step="0.1"
            value={zoom}
            onChange={e => changeZoom(Number(e.target.value))}
            style={{
              width: "100%",
              marginTop: 7
            }}
          />

          <div style={{ fontSize: 11, color: "#5F6368" }}>
            ระดับซูม {zoom.toFixed(1)}
          </div>


          {/* Size */}

          <div style={{
          marginTop: 14,
          fontSize: 12,
          fontWeight: 700
        }}>
            📐 ปรับขนาดแผนผัง (size)
        </div>

        <input
          type="range"
          min="20"
          max="100"
          step="0.25"
          value={placement.widthMeters}
          onChange={e => changeWidth(Number(e.target.value))}
          style={{
            width: "100%",
            marginTop: 7
          }}
        />

        <div style={{fontSize: 11,color: "#5F6368"}}>
          ความกว้าง {Math.round(placement.widthMeters)} เมตร
        </div>

          {/* Rotation */}

          <div style={{
          marginTop: 14,
          fontSize: 12,
          fontWeight: 700
        }}>
            🔄 หมุนแผนผัง
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
        )}
      </div>
    </div>;
}

export default FloorplanEditor;