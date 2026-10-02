"use client";

import { useMemo, useRef, useState } from "react";
import { SC8_CENTER } from "../../mapConfig";
import { Btn } from "../../ui";
import OSMMap from "./OSMMap";
import { makeProjection } from "./projection";

export default function BoundaryPointEditor({
  title,
  initialPoints = [],
  onCancel,
  onSave
}) {
  const viewportRef = useRef(null);
  const [zoom, setZoom] = useState(18);
  const [center, setCenter] = useState(Array.isArray(SC8_CENTER) ? SC8_CENTER : [13.729721, 100.780099]);
  const [points, setPoints] = useState(Array.isArray(initialPoints) ? initialPoints.filter(p => Array.isArray(p) && p.length >= 2).map(p => [Number(p[0]), Number(p[1])]) : []);
  const [saving, setSaving] = useState(false);
  const projection = useMemo(() => makeProjection(zoom), [zoom]);

  // ==========================================
  // คลิกบนแผนที่
  // Pixel -> Lat/Lon
  // ==========================================
  const handleMapClick = e => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // พิกัด pixel ของจุดศูนย์กลางแผนที่
    const centerPx = projection.project(center);

    // Pixel ที่คลิกจริงบนโลกแผนที่
    const mapX = centerPx[0] + (x - rect.width / 2);
    const mapY = centerPx[1] + (y - rect.height / 2);

    // แปลง Pixel -> [Lat, Lon]
    const latLon = projection.unproject([mapX, mapY]);
    const lat = Number(latLon[0].toFixed(7));
    const lon = Number(latLon[1].toFixed(7));
    setPoints(prev => [...prev, [lat, lon]]);
  };

  // ==========================================
  // แปลงตำแหน่งเมาส์ -> Lat/Lon
  // ==========================================
  const pointerToLatLon = e => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerPx = projection.project(center);
    const mapX = centerPx[0] + (x - rect.width / 2);
    const mapY = centerPx[1] + (y - rect.height / 2);
    const latLon = projection.unproject([mapX, mapY]);
    return [Number(latLon[0].toFixed(7)), Number(latLon[1].toFixed(7))];
  };

  // ==========================================
  // ลากจุดเพื่อปรับขอบเขต
  // ==========================================
  const draggingPointRef = useRef(null);
  const handlePointPointerDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    draggingPointRef.current = index;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const handlePointPointerMove = e => {
    const index = draggingPointRef.current;
    if (index === null || index === undefined) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const latLon = pointerToLatLon(e);
    if (!latLon) return;
    setPoints(prev => prev.map((point, i) => i === index ? latLon : point));
  };
  const handlePointPointerUp = e => {
    e.stopPropagation();
    e.preventDefault();
    draggingPointRef.current = null;
  };

  // ==========================================
  // เพิ่มจุดใหม่ตรงกลางเส้น
  // ==========================================
  const addPointAt = (index, e) => {
    e.stopPropagation();
    e.preventDefault();
    const latLon = pointerToLatLon(e);
    if (!latLon) return;
    setPoints(prev => {
      const next = [...prev];
      next.splice(index, 0, latLon);
      return next;
    });
  };

  // ==========================================
  // ลบจุด
  // ==========================================
  const removePoint = index => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // ล้างจุด
  // ==========================================
  const clearPoints = () => {
    setPoints([]);
  };

  // ==========================================
  // Zoom
  // ==========================================
  const changeZoom = amount => {
    setZoom(z => Math.min(20, Math.max(15, z + amount)));
  };

  // ==========================================
  // บันทึก
  // ==========================================
  const handleSave = async () => {
    if (points.length < 3) {
      alert("กรุณาเลือกอย่างน้อย 3 จุดเพื่อสร้างขอบเขต");
      return;
    }
    setSaving(true);
    try {
      await onSave(points);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // แปลงทุกจุดเป็นตำแหน่งบนหน้าจอ
  // ==========================================
  const centerPx = projection.project(center);
  const screenPoints = points.map(point => {
    const p = projection.project(point);
    return [p[0] - centerPx[0], p[1] - centerPx[1]];
  });
  return <div style={{
    position: "fixed",
    inset: 0,
    zIndex: 9000,
    background: "#fff",
    display: "flex",
    flexDirection: "column"
  }}>
      {/* ======================================
          Header
          ====================================== */}
      <div style={{
      padding: "12px 18px",
      borderBottom: "1px solid #DADCE0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap"
    }}>
        <div>
          <b style={{
          fontSize: 16,
          color: "#202124"
        }}>
            🗺️ {title}
          </b>

          <div style={{
          fontSize: 12,
          color: "#5F6368",
          marginTop: 3
        }}>
            คลิกบนแผนที่เพื่อเพิ่มจุดพิกัด
          </div>
        </div>

        <div style={{
        display: "flex",
        gap: 6,
        alignItems: "center"
      }}>
          <Btn kind="ghost" onClick={clearPoints}>
            ล้างจุด
          </Btn>

          <Btn kind="ghost" onClick={onCancel}>
            ยกเลิก
          </Btn>

          <Btn kind="ok" disabled={saving || points.length < 3} onClick={handleSave}>
            {saving ? "กำลังบันทึก..." : "บันทึกพิกัด"}
          </Btn>
        </div>
      </div>

      {/* ======================================
          Main
          ====================================== */}
      <div style={{
      display: "flex",
      flex: 1,
      minHeight: 0
    }}>
        {/* ====================================
            MAP
            ==================================== */}
        <div ref={viewportRef} onClick={e => {
        if (draggingPointRef.current !== null) {
          return;
        }
        handleMapClick(e);
      }} onPointerMove={handlePointPointerMove} onPointerUp={handlePointPointerUp} onPointerCancel={handlePointPointerUp} style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        background: "#E5E7EB",
        cursor: "crosshair",
        touchAction: "none"
      }}>
          <OSMMap center={center} zoom={zoom} />

          {/* Polygon */}
          {screenPoints.length >= 3 ? <svg style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible"
        }}>
              <polygon points={screenPoints.map(([x, y]) => {
            const width = viewportRef.current?.clientWidth || 0;
            const height = viewportRef.current?.clientHeight || 0;
            return `${width / 2 + x},${height / 2 + y}`;
          }).join(" ")} fill="rgba(26,115,232,.18)" stroke="#1A73E8" strokeWidth="3" strokeDasharray="8 5" vectorEffect="non-scaling-stroke" />
            </svg> : null}

          {/* จุดที่เลือก */}
          <svg style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible"
        }}>
            {screenPoints.map(([x, y], index) => {
            const width = viewportRef.current?.clientWidth || 0;
            const height = viewportRef.current?.clientHeight || 0;
            const sx = width / 2 + x;
            const sy = height / 2 + y;
            return <g key={index}>
                    <circle cx={sx} cy={sy} r="8" fill="#fff" stroke="#1A73E8" strokeWidth="3" />

                    <text x={sx} y={sy - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#174EA6">
                      {index + 1}
                    </text>
                  </g>;
          })}
          </svg>

          {/* ==================================
              วิธีใช้งาน
              ================================== */}
          <div style={{
          position: "absolute",
          left: 14,
          top: 14,
          zIndex: 5,
          background: "rgba(255,255,255,.95)",
          border: "1px solid #DADCE0",
          borderRadius: 10,
          padding: "10px 12px",
          boxShadow: "0 2px 10px rgba(0,0,0,.12)",
          fontSize: 11.5,
          color: "#3C4043",
          maxWidth: 300,
          pointerEvents: "none"
        }}>
            <b>วิธีใช้งาน</b>

            <div>
              • คลิกบนแผนที่เพื่อเพิ่มจุด
            </div>

            <div>
              • เลือกอย่างน้อย 3 จุด
            </div>

            <div>
              • จุดจะถูกแปลงเป็น Lat / Lon
            </div>

            <div>
              • กดบันทึกเพื่อเก็บพิกัด
            </div>
          </div>

          {/* ==================================
              Zoom
              ================================== */}
          <div style={{
          position: "absolute",
          right: 14,
          top: 14,
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          gap: 4
        }}>
            <button type="button" onClick={e => {
            e.stopPropagation();
            changeZoom(1);
          }} style={{
            width: 36,
            height: 36,
            border: "1px solid #DADCE0",
            borderRadius: 8,
            background: "#fff",
            fontSize: 20,
            cursor: "pointer"
          }}>
              +
            </button>

            <button type="button" onClick={e => {
            e.stopPropagation();
            changeZoom(-1);
          }} style={{
            width: 36,
            height: 36,
            border: "1px solid #DADCE0",
            borderRadius: 8,
            background: "#fff",
            fontSize: 20,
            cursor: "pointer"
          }}>
              −
            </button>
          </div>

          <div style={{
          position: "absolute",
          left: 14,
          bottom: 14,
          zIndex: 5,
          fontSize: 10.5,
          background: "rgba(255,255,255,.9)",
          padding: "4px 7px",
          borderRadius: 6,
          color: "#5F6368",
          pointerEvents: "none"
        }}>
            © OpenStreetMap contributors
          </div>
        </div>

        {/* ====================================
            PANEL พิกัด
            ==================================== */}
        <div style={{
        width: 340,
        maxWidth: "40vw",
        borderLeft: "1px solid #DADCE0",
        padding: 16,
        overflowY: "auto",
        background: "#fff"
      }}>
          <b style={{
          fontSize: 13.5,
          color: "#202124"
        }}>
            จุดพิกัดที่เลือก
          </b>

          <div style={{
          marginTop: 8,
          padding: "8px 10px",
          borderRadius: 8,
          background: "#F8F9FA",
          border: "1px solid #E8EAED",
          fontSize: 12,
          color: "#5F6368"
        }}>
            จำนวนจุดทั้งหมด:{" "}
            <b style={{
            color: "#202124"
          }}>
              {points.length}
            </b>{" "}
            จุด
          </div>

          <div style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 7
        }}>
            {points.length === 0 ? <div style={{
            padding: 15,
            textAlign: "center",
            color: "#5F6368",
            fontSize: 12,
            border: "1px dashed #DADCE0",
            borderRadius: 8
          }}>
                ยังไม่มีจุดพิกัด
                <br />
                คลิกบนแผนที่เพื่อเพิ่มจุด
              </div> : points.map((point, index) => <div key={index} style={{
            padding: 10,
            border: "1px solid #E8EAED",
            borderRadius: 8,
            background: "#fff"
          }}>
                    <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
                      <b style={{
                fontSize: 12,
                color: "#174EA6"
              }}>
                        จุดที่ {index + 1}
                      </b>

                      <button type="button" onClick={() => removePoint(index)} style={{
                border: "none",
                background: "none",
                color: "#D93025",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700
              }}>
                        ลบ
                      </button>
                    </div>

                    <div style={{
              marginTop: 5,
              fontSize: 11.5,
              lineHeight: 1.6,
              color: "#3C4043"
            }}>
                      <div>
                        Lat:{" "}
                        <b>
                          {Number(point[0]).toFixed(7)}
                        </b>
                      </div>

                      <div>
                        Lon:{" "}
                        <b>
                          {Number(point[1]).toFixed(7)}
                        </b>
                      </div>
                    </div>
                  </div>)}
          </div>

          {/* ข้อมูลที่จะบันทึก */}
          {points.length >= 3 ? <div style={{
          marginTop: 14,
          padding: 11,
          borderRadius: 10,
          background: "#E6F4EA",
          border: "1px solid #CEEAD6",
          fontSize: 11.5,
          color: "#137333",
          lineHeight: 1.55
        }}>
              <b>✓ พร้อมบันทึกขอบเขต</b>

              <div>
                ระบบจะบันทึกทั้งหมด{" "}
                {points.length} จุด
              </div>

              <div style={{
            marginTop: 5,
            fontFamily: "monospace",
            fontSize: 10.5,
            wordBreak: "break-all"
          }}>
                [
                {points.map((p, i) => `[${p[0]}, ${p[1]}]${i < points.length - 1 ? ", " : ""}`)}
                ]
              </div>
            </div> : null}
        </div>
      </div>
    </div>;
}

/* =========================================================
   UC8 : ข้อมูลประกอบแผนผัง
========================================================= */
