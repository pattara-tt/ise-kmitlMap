"use client";

import { useEffect , useMemo, useRef, useState } from "react";
import { SC8_CENTER, SC8_OUTLINE, SC8_BOUNDS } from "../mapConstants";

import {
  Btn,
  Card,
  Field,
  Input,
  Pill,
  Select,
  Status,
  Table,
  Textarea,
  UCHead,
  useCollection,
} from "../ui";

// Actor: ผู้ดูแลข้อมูลสถานที่และอาคาร
// UC7 ขอบเขตแผนผัง · UC8 ข้อมูลประกอบแผนผัง · UC9 บันทึกข้อมูลแผนที่

export default function GisPanel({ uc, user }) {
  if (uc === "boundary") return <Boundary user={user} />;
  if (uc === "assets") return <Assets user={user} />;
  return <SaveMap user={user} />;
}

const todayStr = () =>
  new Date().toISOString().slice(0, 10);

/* =========================================================
   UC7 : ขอบเขตแผนผัง
========================================================= */

function Boundary({ user }) {
  const {
    items = [],
    create,
    patch,
    destroy,
  } = useCollection("mapBoundaries");

  const [form, setForm] = useState({
    name: "",
    type: "building",
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState(null);
  const [draftPoints, setDraftPoints] = useState([]);

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));

  // ==========================================
  // เพิ่ม Boundary ใหม่
  // ==========================================
  const openNewBoundaryEditor = () => {
    if (!form.name.trim()) {
      return alert("กรุณาระบุชื่อขอบเขต");
    }

    setEditingBoundary(null);
    setDraftPoints([]);
    setEditorOpen(true);
  };

  // ==========================================
  // แก้ไข Boundary เดิม
  // ==========================================
  const openEditBoundaryEditor = (boundary) => {
    setEditingBoundary(boundary);

    // ถ้าเป็นข้อมูลใหม่ที่มีพิกัดจริง
    if (
      Array.isArray(boundary.points) &&
      boundary.points.length > 0 &&
      Array.isArray(boundary.points[0])
    ) {
      setDraftPoints(
        boundary.points.map((p) => [
          Number(p[0]),
          Number(p[1]),
        ])
      );
    } else {
      // ข้อมูลเก่า เช่น points: 42
      setDraftPoints([]);
    }

    setEditorOpen(true);
  };

  // ==========================================
  // บันทึก Boundary ใหม่
  // ==========================================
  const saveNewBoundary = async (points) => {
    if (points.length < 3) {
      return alert("กรุณาเลือกอย่างน้อย 3 จุด");
    }

    const newBoundary = {
      id: `MB-${Date.now()}`,
      name: form.name.trim(),
      type: form.type,

      // เก็บเป็น [lat, lon]
      points,

      updatedAt: todayStr(),
      status: "draft",
    };

    await create(newBoundary, user);

    setForm({
      name: "",
      type: "building",
    });

    setDraftPoints([]);
    setEditorOpen(false);
  };

  // ==========================================
  // บันทึกการแก้ไข Boundary เดิม
  // ==========================================
  const saveExistingBoundary = async (points) => {
    if (!editingBoundary) return;

    if (points.length < 3) {
      return alert("กรุณาเลือกอย่างน้อย 3 จุด");
    }

    await patch(
      editingBoundary.id,
      {
        // เปลี่ยนจากจำนวนจุดเป็นพิกัดจริง
        points,

        updatedAt: todayStr(),

        // แก้ไขแล้วกลับไปเป็น draft
        status: "draft",
      },
      user
    );

    setEditingBoundary(null);
    setDraftPoints([]);
    setEditorOpen(false);
  };

  // ==========================================
  // รับผลจาก Map Editor
  // ==========================================
  const handleSavePoints = async (points) => {
    if (editingBoundary) {
      await saveExistingBoundary(points);
    } else {
      await saveNewBoundary(points);
    }
  };

  return (
    <>
      <UCHead
        code="UC7"
        title="จัดการขอบเขตแผนผัง"
        desc="กำหนดขอบเขตวิทยาเขต/อาคาร โดยเลือกจุดบนแผนที่เพื่อบันทึกพิกัด Latitude และ Longitude"
      />

      {/* ======================================
          เพิ่มขอบเขตใหม่
          ====================================== */}
      <Card>
        <b
          style={{
            fontSize: 13.5,
            color: "#202124",
          }}
        >
          เพิ่มขอบเขตใหม่
        </b>

        <div style={{ marginTop: 8 }}>
          <Field label="ชื่อขอบเขต">
            <Input
              value={form.name}
              onChange={set("name")}
              placeholder="เช่น ขอบเขตอาคารเรียนรวม"
            />
          </Field>

          <Field label="ประเภท">
            <Select
              value={form.type}
              onChange={set("type")}
            >
              <option value="campus">
                วิทยาเขต
              </option>

              <option value="building">
                อาคาร
              </option>

              <option value="zone">
                โซน/พื้นที่ย่อย
              </option>
            </Select>
          </Field>

          <Btn onClick={openNewBoundaryEditor}>
            🗺️ เลือกจุดบนแผนที่
          </Btn>

          <div
            style={{
              marginTop: 7,
              fontSize: 11.5,
              color: "#5F6368",
              lineHeight: 1.5,
            }}
          >
            กดปุ่มเพื่อเปิดแผนที่ จากนั้นคลิกตำแหน่งที่ต้องการ
            ระบบจะแปลงตำแหน่งที่คลิกเป็น Latitude / Longitude
            อัตโนมัติ
          </div>
        </div>
      </Card>

      {/* ======================================
          Boundary ที่มีอยู่แล้ว
          ====================================== */}
      <Table
        columns={[
          {
            key: "name",
            label: "ชื่อขอบเขต",
          },

          {
            key: "type",
            label: "ประเภท",
            render: (r) => (
              <Pill>{r.type}</Pill>
            ),
          },

          {
            key: "points",
            label: "จุดพิกัด",
            render: (r) => {
              // ข้อมูลใหม่ที่มี Lat/Lon
              if (
                Array.isArray(r.points) &&
                Array.isArray(r.points[0])
              ) {
                return `${r.points.length} จุด`;
              }

              // ข้อมูลเดิม เช่น points: 42
              return r.points ?? "-";
            },
          },

          {
            key: "updatedAt",
            label: "แก้ไขล่าสุด",
          },

          {
            key: "status",
            label: "สถานะ",
            render: (r) => (
              <Status value={r.status} />
            ),
          },

          {
            key: "act",
            label: "",
            render: (r) => (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {/* แก้ไขพิกัด */}
                <Btn
                  kind="ghost"
                  onClick={() =>
                    openEditBoundaryEditor(r)
                  }
                >
                  🗺️ แก้ไขจุด
                </Btn>

                {/* Publish / Draft */}
                {r.status === "draft" ? (
                  <Btn
                    kind="ok"
                    onClick={() =>
                      patch(
                        r.id,
                        {
                          status: "published",
                          updatedAt: todayStr(),
                        },
                        user
                      )
                    }
                  >
                    เผยแพร่
                  </Btn>
                ) : (
                  <Btn
                    kind="ghost"
                    onClick={() =>
                      patch(
                        r.id,
                        {
                          status: "draft",
                          updatedAt: todayStr(),
                        },
                        user
                      )
                    }
                  >
                    ถอนกลับร่าง
                  </Btn>
                )}

                {/* Delete */}
                <Btn
                  kind="danger"
                  onClick={() =>
                    confirm("ลบขอบเขตนี้?") &&
                    destroy(r.id, user)
                  }
                >
                  ลบ
                </Btn>
              </div>
            ),
          },
        ]}
        rows={items}
      />

        


      {/* ======================================
          เปิด Map Editor
          ====================================== */}
      {editorOpen ? (
        <BoundaryPointEditor
          title={
            editingBoundary
              ? `แก้ไขขอบเขต: ${editingBoundary.name}`
              : `เพิ่มขอบเขต: ${form.name}`
          }
          initialPoints={draftPoints}
          onCancel={() => {
            setEditorOpen(false);
            setEditingBoundary(null);
            setDraftPoints([]);
          }}
          onSave={handleSavePoints}
        />
      ) : null}
    </>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function makeProjection(zoom) {
  const scale = 256 * Math.pow(2, zoom);

  const project = ([lat, lon]) => {
    const x = ((lon + 180) / 360) * scale;

    const sinLat = Math.sin(
      (clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180
    );

    const y =
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
      scale;

    return [x, y];
  };

  const unproject = ([x, y]) => {
    const lon = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;

    const lat =
      (180 / Math.PI) * Math.atan(Math.sinh(n));

    return [lat, lon];
  };

  const metersPerPixel = (lat) =>
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) /
    Math.pow(2, zoom);

  return {
    project,
    unproject,
    metersPerPixel,
  };
}

function BoundaryPointEditor({
  title,
  initialPoints = [],
  onCancel,
  onSave,
}) {
  const viewportRef = useRef(null);

  const [zoom, setZoom] = useState(18);

  const [center, setCenter] = useState(
    Array.isArray(SC8_CENTER)
      ? SC8_CENTER
      : [13.729721, 100.780099]
  );

  const [points, setPoints] = useState(
    Array.isArray(initialPoints)
      ? initialPoints
          .filter(
            (p) =>
              Array.isArray(p) &&
              p.length >= 2
          )
          .map((p) => [
            Number(p[0]),
            Number(p[1]),
          ])
      : []
  );

  const [saving, setSaving] = useState(false);

  const projection = useMemo(
    () => makeProjection(zoom),
    [zoom]
  );

  // ==========================================
  // คลิกบนแผนที่
  // Pixel -> Lat/Lon
  // ==========================================
  const handleMapClick = (e) => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const rect =
      viewport.getBoundingClientRect();

    const x =
      e.clientX - rect.left;

    const y =
      e.clientY - rect.top;

    // พิกัด pixel ของจุดศูนย์กลางแผนที่
    const centerPx =
      projection.project(center);

    // Pixel ที่คลิกจริงบนโลกแผนที่
    const mapX =
      centerPx[0] +
      (x - rect.width / 2);

    const mapY =
      centerPx[1] +
      (y - rect.height / 2);

    // แปลง Pixel -> [Lat, Lon]
    const latLon =
      projection.unproject([
        mapX,
        mapY,
      ]);

    const lat = Number(
      latLon[0].toFixed(7)
    );

    const lon = Number(
      latLon[1].toFixed(7)
    );

    setPoints((prev) => [
      ...prev,
      [lat, lon],
    ]);
  };

    // ==========================================
  // แปลงตำแหน่งเมาส์ -> Lat/Lon
  // ==========================================
  const pointerToLatLon = (e) => {
    const viewport = viewportRef.current;
    if (!viewport) return null;

    const rect = viewport.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerPx = projection.project(center);

    const mapX =
      centerPx[0] + (x - rect.width / 2);

    const mapY =
      centerPx[1] + (y - rect.height / 2);

    const latLon =
      projection.unproject([
        mapX,
        mapY,
      ]);

    return [
      Number(latLon[0].toFixed(7)),
      Number(latLon[1].toFixed(7)),
    ];
  };

  // ==========================================
  // ลากจุดเพื่อปรับขอบเขต
  // ==========================================
  const draggingPointRef = useRef(null);

  const handlePointPointerDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();

    draggingPointRef.current = index;

    e.currentTarget.setPointerCapture?.(
      e.pointerId
    );
  };

  const handlePointPointerMove = (e) => {
    const index = draggingPointRef.current;

    if (
      index === null ||
      index === undefined
    ) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const latLon = pointerToLatLon(e);

    if (!latLon) return;

    setPoints((prev) =>
      prev.map((point, i) =>
        i === index
          ? latLon
          : point
      )
    );
  };

  const handlePointPointerUp = (e) => {
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

    setPoints((prev) => {
      const next = [...prev];

      next.splice(
        index,
        0,
        latLon
      );

      return next;
    });
  };

  // ==========================================
  // ลบจุด
  // ==========================================
  const removePoint = (index) => {
    setPoints((prev) =>
      prev.filter((_, i) => i !== index)
    );
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
  const changeZoom = (amount) => {
    setZoom((z) =>
      Math.min(
        20,
        Math.max(15, z + amount)
      )
    );
  };

  // ==========================================
  // บันทึก
  // ==========================================
  const handleSave = async () => {
    if (points.length < 3) {
      alert(
        "กรุณาเลือกอย่างน้อย 3 จุดเพื่อสร้างขอบเขต"
      );
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
  const centerPx =
    projection.project(center);

  const screenPoints = points.map(
    (point) => {
      const p =
        projection.project(point);

      return [
        p[0] - centerPx[0],
        p[1] - centerPx[1],
      ];
    }
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ======================================
          Header
          ====================================== */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom:
            "1px solid #DADCE0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <b
            style={{
              fontSize: 16,
              color: "#202124",
            }}
          >
            🗺️ {title}
          </b>

          <div
            style={{
              fontSize: 12,
              color: "#5F6368",
              marginTop: 3,
            }}
          >
            คลิกบนแผนที่เพื่อเพิ่มจุดพิกัด
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <Btn
            kind="ghost"
            onClick={clearPoints}
          >
            ล้างจุด
          </Btn>

          <Btn
            kind="ghost"
            onClick={onCancel}
          >
            ยกเลิก
          </Btn>

          <Btn
            kind="ok"
            disabled={
              saving || points.length < 3
            }
            onClick={handleSave}
          >
            {saving
              ? "กำลังบันทึก..."
              : "บันทึกพิกัด"}
          </Btn>
        </div>
      </div>

      {/* ======================================
          Main
          ====================================== */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ====================================
            MAP
            ==================================== */}
        <div
          ref={viewportRef}
          onClick={(e) => {
            if (
              draggingPointRef.current !== null
            ) {
              return;
            }

            handleMapClick(e);
          }}
          onPointerMove={handlePointPointerMove}
          onPointerUp={handlePointPointerUp}
          onPointerCancel={handlePointPointerUp}
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            background: "#E5E7EB",
            cursor: "crosshair",
            touchAction: "none",
          }}
        >
          <OSMMap
            center={center}
            zoom={zoom}
          />

          {/* Polygon */}
          {screenPoints.length >= 3 ? (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              <polygon
                points={screenPoints
                  .map(
                    ([x, y]) => {
                      const width =
                        viewportRef.current
                          ?.clientWidth || 0;

                      const height =
                        viewportRef.current
                          ?.clientHeight || 0;

                      return `${width / 2 + x},${
                        height / 2 + y
                      }`;
                    }
                  )
                  .join(" ")}
                fill="rgba(26,115,232,.18)"
                stroke="#1A73E8"
                strokeWidth="3"
                strokeDasharray="8 5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}

          {/* จุดที่เลือก */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {screenPoints.map(
              ([x, y], index) => {
                const width =
                  viewportRef.current
                    ?.clientWidth || 0;

                const height =
                  viewportRef.current
                    ?.clientHeight || 0;

                const sx =
                  width / 2 + x;

                const sy =
                  height / 2 + y;

                return (
                  <g key={index}>
                    <circle
                      cx={sx}
                      cy={sy}
                      r="8"
                      fill="#fff"
                      stroke="#1A73E8"
                      strokeWidth="3"
                    />

                    <text
                      x={sx}
                      y={sy - 12}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="#174EA6"
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              }
            )}
          </svg>

          {/* ==================================
              วิธีใช้งาน
              ================================== */}
          <div
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              zIndex: 5,
              background:
                "rgba(255,255,255,.95)",
              border:
                "1px solid #DADCE0",
              borderRadius: 10,
              padding: "10px 12px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,.12)",
              fontSize: 11.5,
              color: "#3C4043",
              maxWidth: 300,
              pointerEvents: "none",
            }}
          >
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
          <div
            style={{
              position: "absolute",
              right: 14,
              top: 14,
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                changeZoom(1);
              }}
              style={{
                width: 36,
                height: 36,
                border:
                  "1px solid #DADCE0",
                borderRadius: 8,
                background: "#fff",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              +
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                changeZoom(-1);
              }}
              style={{
                width: 36,
                height: 36,
                border:
                  "1px solid #DADCE0",
                borderRadius: 8,
                background: "#fff",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              −
            </button>
          </div>

          <div
            style={{
              position: "absolute",
              left: 14,
              bottom: 14,
              zIndex: 5,
              fontSize: 10.5,
              background:
                "rgba(255,255,255,.9)",
              padding: "4px 7px",
              borderRadius: 6,
              color: "#5F6368",
              pointerEvents: "none",
            }}
          >
            © OpenStreetMap contributors
          </div>
        </div>

        {/* ====================================
            PANEL พิกัด
            ==================================== */}
        <div
          style={{
            width: 340,
            maxWidth: "40vw",
            borderLeft:
              "1px solid #DADCE0",
            padding: 16,
            overflowY: "auto",
            background: "#fff",
          }}
        >
          <b
            style={{
              fontSize: 13.5,
              color: "#202124",
            }}
          >
            จุดพิกัดที่เลือก
          </b>

          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "#F8F9FA",
              border:
                "1px solid #E8EAED",
              fontSize: 12,
              color: "#5F6368",
            }}
          >
            จำนวนจุดทั้งหมด:{" "}
            <b style={{ color: "#202124" }}>
              {points.length}
            </b>{" "}
            จุด
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            {points.length === 0 ? (
              <div
                style={{
                  padding: 15,
                  textAlign: "center",
                  color: "#5F6368",
                  fontSize: 12,
                  border:
                    "1px dashed #DADCE0",
                  borderRadius: 8,
                }}
              >
                ยังไม่มีจุดพิกัด
                <br />
                คลิกบนแผนที่เพื่อเพิ่มจุด
              </div>
            ) : (
              points.map(
                (point, index) => (
                  <div
                    key={index}
                    style={{
                      padding: 10,
                      border:
                        "1px solid #E8EAED",
                      borderRadius: 8,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                      }}
                    >
                      <b
                        style={{
                          fontSize: 12,
                          color: "#174EA6",
                        }}
                      >
                        จุดที่ {index + 1}
                      </b>

                      <button
                        type="button"
                        onClick={() =>
                          removePoint(index)
                        }
                        style={{
                          border: "none",
                          background: "none",
                          color: "#D93025",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        ลบ
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 11.5,
                        lineHeight: 1.6,
                        color: "#3C4043",
                      }}
                    >
                      <div>
                        Lat:{" "}
                        <b>
                          {Number(
                            point[0]
                          ).toFixed(7)}
                        </b>
                      </div>

                      <div>
                        Lon:{" "}
                        <b>
                          {Number(
                            point[1]
                          ).toFixed(7)}
                        </b>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </div>

          {/* ข้อมูลที่จะบันทึก */}
          {points.length >= 3 ? (
            <div
              style={{
                marginTop: 14,
                padding: 11,
                borderRadius: 10,
                background: "#E6F4EA",
                border:
                  "1px solid #CEEAD6",
                fontSize: 11.5,
                color: "#137333",
                lineHeight: 1.55,
              }}
            >
              <b>✓ พร้อมบันทึกขอบเขต</b>

              <div>
                ระบบจะบันทึกทั้งหมด{" "}
                {points.length} จุด
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontFamily: "monospace",
                  fontSize: 10.5,
                  wordBreak: "break-all",
                }}
              >
                [
                {points.map(
                  (p, i) =>
                    `[${p[0]}, ${p[1]}]${
                      i <
                      points.length - 1
                        ? ", "
                        : ""
                    }`
                )}
                ]
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   UC8 : ข้อมูลประกอบแผนผัง
========================================================= */

const MAX_SVG_BYTES = 3 * 1024 * 1024;

const DEFAULT_PLACEMENT = {
  center: [...SC8_CENTER],
  widthMeters: 100,
  heightMeters: 80,
  rotation: 0,
};

function Assets({ user }) {
  const {
    items,
    create,
    patch,
    destroy,
  } = useCollection("mapAssets");

  const [form, setForm] = useState({
    name: "",
    kind: "floorplan",
    building: "Sc8",
    floor: "1",
    file: "",
  });

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [uploadError, setUploadError] =
    useState("");

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editingAsset, setEditingAsset] =
    useState(null);

  const [draftPlacement, setDraftPlacement] =
    useState(null);

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));

  /* -----------------------------------------
     Upload SVG
  ----------------------------------------- */

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    e.target.value = "";

    if (!file) return;

    setUploadError("");

    const isSvgType =
      file.type === "image/svg+xml" ||
      file.type === "";

    const isSvgExt =
      /\.svg$/i.test(file.name);

    if (!isSvgType || !isSvgExt) {
      setUploadError(
        "กรุณาเลือกไฟล์นามสกุล .svg เท่านั้น"
      );
      return;
    }

    if (file.size > MAX_SVG_BYTES) {
      setUploadError(
        "ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 3MB)"
      );
      return;
    }

    setUploading(true);

    try {
      const dataUrl =
        await new Promise(
          (resolve, reject) => {
            const reader =
              new FileReader();

            reader.onload = () =>
              resolve(reader.result);

            reader.onerror = () =>
              reject(
                reader.error ||
                  new Error(
                    "อ่านไฟล์ไม่สำเร็จ"
                  )
              );

            reader.readAsDataURL(file);
          }
        );

      setSelectedFile({
        name: file.name,
        size: file.size,
      });

      setForm((f) => ({
        ...f,
        file: dataUrl,
      }));
    } catch (err) {
      setUploadError(
        "อัปโหลดไฟล์ไม่สำเร็จ: " +
          err.message
      );
    } finally {
      setUploading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);

    setForm((f) => ({
      ...f,
      file: "",
    }));

    setUploadError("");
  };

  /* -----------------------------------------
     เปิด Editor สำหรับไฟล์ใหม่
  ----------------------------------------- */

  const openNewEditor = () => {
    if (!form.name.trim()) {
      return alert(
        "กรุณาระบุชื่อรายการ"
      );
    }

    if (!form.file.trim()) {
      return alert(
        "กรุณาอัปโหลดไฟล์ .svg ก่อน"
      );
    }

    if (form.kind !== "floorplan") {
      return alert(
        "ระบบจัดตำแหน่งบนแผนที่รองรับเฉพาะผังชั้น SVG"
      );
    }

    setEditingAsset({
      id: null,
      name: form.name,
      kind: form.kind,
      building:
        form.building || "Sc8",
      floor: form.floor || "1",
      file: form.file,
      __new: true,
    });

    setDraftPlacement({
      ...DEFAULT_PLACEMENT,
      center: [...SC8_CENTER],
    });

    setEditorOpen(true);
  };

  /* -----------------------------------------
     เปิด Editor ของรายการเดิม
  ----------------------------------------- */

  const openExistingEditor = (
    asset
  ) => {
    if (!asset.file) {
      return alert(
        "ไม่พบไฟล์ SVG ของรายการนี้"
      );
    }

    setEditingAsset(asset);

    setDraftPlacement(
      asset.placement
        ? {
            ...DEFAULT_PLACEMENT,
            ...asset.placement,
            center: [
              ...(asset.placement
                .center ||
                SC8_CENTER),
            ],
          }
        : {
            ...DEFAULT_PLACEMENT,
            center: [...SC8_CENTER],
          }
    );

    setEditorOpen(true);
  };

  /* -----------------------------------------
     Save placement ของไฟล์ใหม่
  ----------------------------------------- */

  const saveNewAsset = async (
    placement
  ) => {
    try {
      const asset = {
        ...editingAsset,
        placement,
        updatedAt: todayStr(),
        status: "draft",
      };

      delete asset.__new;

      await create(asset, user);

      setForm({
        name: "",
        kind: "floorplan",
        building: "Sc8",
        floor: "1",
        file: "",
      });

      setSelectedFile(null);
      setUploadError("");
      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    } catch (err) {
      console.error(err);

      alert(
        "บันทึกไฟล์ไม่สำเร็จ"
      );
    }
  };

  /* -----------------------------------------
     Save placement ของไฟล์เดิม
  ----------------------------------------- */

  const saveExistingAsset = async (
    placement
  ) => {
    try {
      await patch(
        editingAsset.id,
        {
          placement,
          updatedAt: todayStr(),
        },
        user
      );

      setEditorOpen(false);
      setEditingAsset(null);
      setDraftPlacement(null);
    } catch (err) {
      console.error(err);

      alert(
        "บันทึกตำแหน่งไม่สำเร็จ"
      );
    }
  };

  const handleEditorSave = async (
    placement
  ) => {
    if (!editingAsset) return;

    if (editingAsset.__new) {
      await saveNewAsset(
        placement
      );
    } else {
      await saveExistingAsset(
        placement
      );
    }
  };

  /* -----------------------------------------
     ถ้าเปิด Editor ให้แสดงเต็มหน้าจอ
  ----------------------------------------- */

  if (
    editorOpen &&
    editingAsset &&
    draftPlacement
  ) {
    return (
      <FloorplanEditor
        asset={editingAsset}
        placement={draftPlacement}
        onChange={setDraftPlacement}
        onCancel={() => {
          setEditorOpen(false);
          setEditingAsset(null);
          setDraftPlacement(null);
        }}
        onSave={handleEditorSave}
      />
    );
  }

  /* -----------------------------------------
     UC8 UI เดิม
  ----------------------------------------- */

  return (
    <>
      <UCHead
        code="UC8"
        title="จัดการข้อมูลประกอบแผนผัง"
        desc="อัปโหลดไฟล์ผังชั้น (.svg) ภาพประกอบ และไอคอน ที่ใช้แสดงบนแผนที่ได้โดยตรงจากหน้านี้ — สำหรับผังชั้นสามารถปรับตำแหน่ง ขนาด และการหมุนบนแผนที่จริงได้"
      />

      <Card>
        <b
          style={{
            fontSize: 13.5,
            color: "#202124",
          }}
        >
          เพิ่มไฟล์ประกอบ
        </b>

        <div style={{ marginTop: 8 }}>
          <Field label="ชื่อรายการ">
            <Input
              value={form.name}
              onChange={set("name")}
              placeholder="เช่น ผังชั้น 3 อาคาร Sc8"
            />
          </Field>

          <Field label="ประเภท">
            <Select
              value={form.kind}
              onChange={set("kind")}
            >
              <option value="floorplan">
                ผังชั้น (SVG)
              </option>

              <option value="image">
                ภาพประกอบ
              </option>

              <option value="icon">
                ไอคอน
              </option>
            </Select>
          </Field>

          {form.kind === "floorplan" ? (
            <>
              <Field label="อาคาร">
                <Input
                  value={form.building}
                  onChange={set(
                    "building"
                  )}
                  placeholder="Sc8"
                />
              </Field>

              <Field label="ชั้น">
                <Select
                  value={form.floor}
                  onChange={set("floor")}
                >
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                  ].map((n) => (
                    <option
                      key={n}
                      value={n}
                    >
                      ชั้น {n}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}

          <Field label="อัปโหลดไฟล์แผนผัง (.svg)">
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
                flexWrap:
                  "wrap",
              }}
            >
              <label
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 6,
                  padding:
                    "9px 15px",
                  borderRadius: 10,
                  border:
                    "1px solid #DADCE0",
                  background:
                    "#F8F9FA",
                  color:
                    "#1A73E8",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor:
                    "pointer",
                }}
              >
                📤 เลือกไฟล์ .svg

                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={
                    handleFileChange
                  }
                  style={{
                    display: "none",
                  }}
                />
              </label>

              {uploading ? (
                <span
                  style={{
                    fontSize: 12,
                    color:
                      "#5F6368",
                  }}
                >
                  กำลังอ่านไฟล์...
                </span>
              ) : null}

              {selectedFile ? (
                <span
                  style={{
                    fontSize: 12,
                    color:
                      "#3C4043",
                  }}
                >
                  {selectedFile.name} ·{" "}
                  {(
                    selectedFile.size /
                    1024
                  ).toFixed(1)}{" "}
                  KB

                  <button
                    type="button"
                    onClick={
                      clearSelectedFile
                    }
                    style={{
                      marginLeft: 8,
                      background:
                        "none",
                      border: "none",
                      color:
                        "#D93025",
                      cursor:
                        "pointer",
                      fontWeight:
                        700,
                      fontSize: 12,
                    }}
                  >
                    ลบ
                  </button>
                </span>
              ) : null}
            </div>

            {uploadError ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11.5,
                  color:
                    "#D93025",
                }}
              >
                {uploadError}
              </div>
            ) : null}

            {form.file ? (
              <div
                style={{
                  marginTop: 10,
                  width: 140,
                  height: 140,
                  borderRadius: 10,
                  border:
                    "1px solid #DADCE0",
                  background:
                    "#F8F9FA",
                  display:
                    "grid",
                  placeItems:
                    "center",
                  overflow:
                    "hidden",
                }}
              >
                <img
                  src={form.file}
                  alt="ตัวอย่างผังชั้น"
                  style={{
                    maxWidth:
                      "100%",
                    maxHeight:
                      "100%",
                    objectFit:
                      "contain",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11.5,
                  color:
                    "#5F6368",
                }}
              >
                ยังไม่ได้เลือกไฟล์
                — อัปโหลดภาพ
                .svg
                ของผังชั้นเพื่อดูตัวอย่างที่นี่
              </div>
            )}
          </Field>

          {/* ปุ่มเดิม */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Btn
              disabled={uploading}
              onClick={async () => {
                if (
                  !form.name.trim()
                ) {
                  return alert(
                    "กรุณาระบุชื่อรายการ"
                  );
                }

                if (
                  !form.file.trim()
                ) {
                  return alert(
                    "กรุณาอัปโหลดไฟล์ .svg ก่อน"
                  );
                }

                await create(
                  {
                    ...form,
                    updatedAt:
                      todayStr(),
                    status:
                      "draft",
                  },
                  user
                );

                setForm({
                  name: "",
                  kind: "floorplan",
                  building: "Sc8",
                  floor: "1",
                  file: "",
                });

                setSelectedFile(
                  null
                );

                setUploadError(
                  ""
                );
              }}
            >
              เพิ่มไฟล์
            </Btn>

            {/* ปุ่มใหม่ */}
            {form.kind ===
              "floorplan" &&
            form.file ? (
              <Btn
                disabled={uploading}
                onClick={
                  openNewEditor
                }
              >
                🗺️ เพิ่มไฟล์และจัดตำแหน่งบนแผนที่
              </Btn>
            ) : null}
          </div>
        </div>
      </Card>

      {/* รายการเดิม */}

      {items.map((a) => (
        <Card key={a.id}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems:
                "center",
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                flex: "none",
                borderRadius: 10,
                border:
                  "1px solid #DADCE0",
                background:
                  "#F8F9FA",
                overflow:
                  "hidden",
                display:
                  "grid",
                placeItems:
                  "center",
              }}
            >
              <img
                src={a.file}
                alt=""
                style={{
                  maxWidth:
                    "100%",
                  maxHeight:
                    "100%",
                  objectFit:
                    "contain",
                }}
                onError={(e) => {
                  e.currentTarget.style.display =
                    "none";
                }}
              />
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <b
                style={{
                  fontSize: 14,
                  color:
                    "#202124",
                }}
              >
                {a.name}
              </b>

              <div
                style={{
                  fontSize: 11.5,
                  color:
                    "#5F6368",
                  wordBreak:
                    "break-all",
                }}
              >
                {String(
                  a.file || ""
                ).startsWith(
                  "data:"
                )
                  ? "📤 ไฟล์อัปโหลด (SVG)"
                  : a.file}
              </div>

              <div
                style={{
                  marginTop: 5,
                  display:
                    "flex",
                  gap: 6,
                  alignItems:
                    "center",
                  flexWrap:
                    "wrap",
                }}
              >
                <Pill>
                  {a.kind}
                </Pill>

                {a.kind ===
                "floorplan" ? (
                  <Pill>
                    {a.building ||
                      "Sc8"}{" "}
                    · ชั้น{" "}
                    {a.floor ||
                      "?"}
                  </Pill>
                ) : null}

                <Status
                  value={
                    a.status ||
                    "draft"
                  }
                />

                <span
                  style={{
                    fontSize: 11,
                    color:
                      "#5F6368",
                  }}
                >
                  อัปเดต{" "}
                  {a.updatedAt}
                </span>
              </div>

              {/* แสดง placement */}
              {a.placement ? (
                <div
                  style={{
                    marginTop: 7,
                    fontSize: 11,
                    color:
                      "#5F6368",
                  }}
                >
                  📍{" "}
                  {a.placement.center?.[0]?.toFixed(
                    6
                  )}{" "}
                  ,{" "}
                  {a.placement.center?.[1]?.toFixed(
                    6
                  )}
                  {"  "}
                  📐{" "}
                  {Number(
                    a.placement
                      .widthMeters ||
                      0
                  ).toFixed(
                    1
                  )}{" "}
                  m
                  {"  "}
                  🔄{" "}
                  {Number(
                    a.placement
                      .rotation ||
                      0
                  ).toFixed(
                    1
                  )}
                  °
                </div>
              ) : null}
            </div>

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: 6,
              }}
            >
              {a.kind ===
              "floorplan" ? (
                <Btn
                  onClick={() =>
                    openExistingEditor(
                      a
                    )
                  }
                >
                  🗺️ ปรับตำแหน่ง
                </Btn>
              ) : null}

              <Btn
                kind="danger"
                onClick={() =>
                  confirm(
                    "ลบไฟล์ประกอบนี้?"
                  ) &&
                  destroy(
                    a.id,
                    user
                  )
                }
              >
                ลบ
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

/* =========================================================
   Floorplan Editor
   ใช้เฉพาะ UC8
========================================================= */

function FloorplanEditor({
  asset,
  placement,
  onChange,
  onCancel,
  onSave,
}) {
  const mapRef = useRef(null);

  const [zoom, setZoom] =
    useState(18);

  const [dragging, setDragging] =
    useState(false);

  const dragRef = useRef(null);

  const center =
    placement.center ||
    SC8_CENTER;

  /* -----------------------------------------
     Map calculations
  ----------------------------------------- */

  const metersPerPixel =
    156543.03392 *
    Math.cos(
      (center[0] * Math.PI) /
        180
    ) /
    Math.pow(2, zoom);

  const widthPx =
    placement.widthMeters /
    metersPerPixel;

  const heightPx =
    placement.heightMeters /
    metersPerPixel;

  /* -----------------------------------------
     Lat/Lon ↔ pixel
  ----------------------------------------- */

  const latLonToPixel = (
    lat,
    lon
  ) => {
    const scale =
      256 *
      Math.pow(2, zoom);

    const x =
      ((lon + 180) / 360) *
      scale;

    const latRad =
      (lat * Math.PI) /
      180;

    const y =
      ((1 -
        Math.log(
          Math.tan(
            latRad
          ) +
            1 /
              Math.cos(
                latRad
              )
        ) /
          Math.PI) /
        2) *
      scale;

    return {
      x,
      y,
    };
  };

  const centerPixel =
    latLonToPixel(
      center[0],
      center[1]
    );

  /* -----------------------------------------
     Drag SVG
  ----------------------------------------- */

  const startDrag = (e) => {
    e.preventDefault();

    setDragging(true);

    dragRef.current = {
      clientX:
        e.clientX,
      clientY:
        e.clientY,
      center: [
        ...center,
      ],
    };

    window.addEventListener(
      "pointermove",
      moveDrag
    );

    window.addEventListener(
      "pointerup",
      stopDrag
    );
  };

  const moveDrag = (e) => {
    if (
      !dragRef.current
    )
      return;

    const dx =
      e.clientX -
      dragRef.current
        .clientX;

    const dy =
      e.clientY -
      dragRef.current
        .clientY;

    const latDelta =
      (-dy *
        metersPerPixel) /
      111320;

    const lonDelta =
      (dx *
        metersPerPixel) /
      (111320 *
        Math.cos(
          (dragRef.current
            .center[0] *
            Math.PI) /
            180
        ));

    onChange({
      ...placement,
      center: [
        dragRef.current
            .center[0] +
          latDelta,
        dragRef.current
            .center[1] +
          lonDelta,
      ],
    });
  };

  const stopDrag = () => {
    setDragging(false);

    dragRef.current = null;

    window.removeEventListener(
      "pointermove",
      moveDrag
    );

    window.removeEventListener(
      "pointerup",
      stopDrag
    );
  };

  /* -----------------------------------------
     Size
  ----------------------------------------- */

  const changeScale = (
    factor
  ) => {
    const newWidth =
      Math.min(
        500,
        Math.max(
          20,
          placement.widthMeters *
            factor
        )
      );

    const ratio =
      placement.heightMeters /
      placement.widthMeters;

    onChange({
      ...placement,
      widthMeters:
        newWidth,
      heightMeters:
        newWidth * ratio,
    });
  };

  const changeWidth = (
    value
  ) => {
    const newWidth =
      Math.min(
        500,
        Math.max(
          20,
          Number(value) ||
            20
        )
      );

    const ratio =
      placement.heightMeters /
      placement.widthMeters;

    onChange({
      ...placement,
      widthMeters:
        newWidth,
      heightMeters:
        newWidth * ratio,
    });
  };

  /* -----------------------------------------
     Rotation
  ----------------------------------------- */

  const changeRotation = (
    value
  ) => {
    let rotation =
      Number(value) || 0;

    while (
      rotation > 180
    ) {
      rotation -= 360;
    }

    while (
      rotation < -180
    ) {
      rotation += 360;
    }

    onChange({
      ...placement,
      rotation,
    });
  };

  /* -----------------------------------------
     Reset
  ----------------------------------------- */

  const reset = () => {
    onChange({
      ...DEFAULT_PLACEMENT,
      center: [
        ...SC8_CENTER,
      ],
    });

    setZoom(18);
  };

  /* -----------------------------------------
     Building outline
  ----------------------------------------- */

  const outlinePoints =
    SC8_OUTLINE?.map(
      ([lat, lon]) => {
        const p =
          latLonToPixel(
            lat,
            lon
          );

        return {
          x:
            p.x -
            centerPixel.x +
            window.innerWidth /
              2,
          y:
            p.y -
            centerPixel.y +
            (window.innerHeight -
              64) /
              2,
        };
      }
    ) || [];

  return (
    <div
      style={{
        position:
          "fixed",
        inset: 0,
        zIndex: 99999,
        background:
          "#111",
        display:
          "flex",
        flexDirection:
          "column",
      }}
    >
      {/* Header */}

      <div
        style={{
          height: 64,
          flex: "none",
          background:
            "#fff",
          borderBottom:
            "1px solid #ddd",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          padding:
            "0 16px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight:
                800,
              fontSize: 17,
            }}
          >
            🗺️ จัดตำแหน่งแปลนบนแผนที่
          </div>

          <div
            style={{
              fontSize: 12,
              color:
                "#5F6368",
            }}
          >
            {asset.name} ·{" "}
            {asset.building ||
              "Sc8"}{" "}
            · ชั้น{" "}
            {asset.floor ||
              "1"}
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            gap: 7,
          }}
        >
          <button
            onClick={reset}
            style={editorButton}
          >
            รีเซ็ต
          </button>

          <button
            onClick={onCancel}
            style={editorButton}
          >
            ยกเลิก
          </button>

          <button
            onClick={() =>
              onSave(
                placement
              )
            }
            style={{
              ...editorButton,
              background:
                "#111",
              color:
                "#fff",
              borderColor:
                "#111",
            }}
          >
            💾 บันทึกตำแหน่ง
          </button>
        </div>
      </div>

      {/* Map */}

      <div
        ref={mapRef}
        style={{
          position:
            "relative",
          flex: 1,
          overflow:
            "hidden",
          cursor: dragging
            ? "grabbing"
            : "default",
          background:
            "#ddd",
        }}
      >
        <OSMMap
          center={center}
          zoom={zoom}
        />

        {/* Building outline */}

        <svg
          style={{
            position:
              "absolute",
            inset: 0,
            width:
              "100%",
            height:
              "100%",
            pointerEvents:
              "none",
          }}
        >
          <polygon
            points={outlinePoints
              .map(
                (p) =>
                  `${p.x},${p.y}`
              )
              .join(" ")}
            fill="rgba(255,0,0,.08)"
            stroke="red"
            strokeWidth="3"
            strokeDasharray="8 6"
          />
        </svg>

        {/* Floorplan */}

        <div
          onPointerDown={
            startDrag
          }
          style={{
            position:
              "absolute",
            left: "50%",
            top: "50%",
            width:
              Math.max(
                30,
                widthPx
              ),
            height:
              Math.max(
                30,
                heightPx
              ),
            transform: `
              translate(-50%, -50%)
              rotate(${placement.rotation}deg)
            `,
            transformOrigin:
              "center",
            cursor:
              dragging
                ? "grabbing"
                : "grab",
            touchAction:
              "none",
            border:
              "2px solid rgba(26,115,232,.75)",
            boxShadow:
              "0 2px 10px rgba(0,0,0,.18)",
            background:
              "transparent",
          }}
        >
          <img
            src={asset.file}
            alt="floorplan"
            draggable={false}
            style={{
              width:
                "100%",
              height:
                "100%",
              display:
                "block",
              objectFit:
                "fill",
              opacity:
                 0.9,
              userSelect:
                "none",
              pointerEvents:
                "none",
            }}
          />

          {/* จุดกึ่งกลาง */}

          <div
            style={{
              position:
                "absolute",
              left: "50%",
              top: "50%",
              width: 12,
              height: 12,
              transform:
                "translate(-50%,-50%)",
              borderRadius:
                "50%",
              background:
                "#1a73e8",
              border:
                "2px solid white",
              boxShadow:
                "0 1px 5px rgba(0,0,0,.4)",
            }}
          />
        </div>

        {/* Left information */}

        <div
          style={{
            position:
              "absolute",
            left: 14,
            bottom: 14,
            width: 285,
            background:
              "rgba(255,255,255,.96)",
            borderRadius:
              10,
            padding: 14,
            boxShadow:
              "0 6px 25px rgba(0,0,0,.2)",
          }}
        >
          <b
            style={{
              fontSize: 13,
            }}
          >
            📍 ตำแหน่งปัจจุบัน
          </b>

          <InfoRow
            label="Latitude"
            value={center[0].toFixed(6)}
          />

          <InfoRow
            label="Longitude"
            value={center[1].toFixed(6)}
          />

          <InfoRow
            label="ความกว้าง"
            value={`${Number(
              placement.widthMeters
            ).toFixed(
              1
            )} m`}
          />

          <InfoRow
            label="ความสูง"
            value={`${Number(
              placement.heightMeters
            ).toFixed(
              1
            )} m`}
          />

          <InfoRow
            label="Rotation"
            value={`${Number(
              placement.rotation
            ).toFixed(
              1
            )}°`}
          />

          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color:
                "#5F6368",
              lineHeight: 1.5,
            }}
          >
            💡 ลากแปลนด้วยเมาส์เพื่อเปลี่ยนตำแหน่ง
          </div>
        </div>

        {/* Right controls */}

        <div
          style={{
            position:
              "absolute",
            right: 14,
            bottom: 14,
            width: 285,
            background:
              "rgba(255,255,255,.96)",
            borderRadius:
              10,
            padding: 14,
            boxShadow:
              "0 6px 25px rgba(0,0,0,.2)",
          }}
        >
          <b
            style={{
              fontSize: 13,
            }}
          >
            ⚙️ ปรับแต่งแปลน
          </b>

          {/* Zoom */}

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            🔍 Zoom แผนที่
          </div>

          <input
            type="range"
            min="15"
            max="20"
            step="1"
            value={zoom}
            onChange={(e) =>
              setZoom(
                Number(
                  e.target.value
                )
              )
            }
            style={{
              width:
                "100%",
            }}
          />

          <div
            style={{
              fontSize: 11,
              color:
                "#5F6368",
            }}
          >
            Zoom {zoom}
          </div>

          {/* Size */}

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            📐 ขนาดแปลน
          </div>

          <div
            style={{
              display:
                "flex",
              gap: 6,
              marginTop: 7,
            }}
          >
            <button
              onClick={() =>
                changeScale(
                  0.9
                )
              }
              style={
                smallEditorButton
              }
            >
              −
            </button>

            <button
              onClick={() =>
                changeScale(
                  1.1
                )
              }
              style={
                smallEditorButton
              }
            >
              +
            </button>

            <input
              type="number"
              value={Math.round(
                placement.widthMeters
              )}
              onChange={(e) =>
                changeWidth(
                  e.target.value
                )
              }
              style={{
                flex: 1,
                minWidth: 0,
                border:
                  "1px solid #DADCE0",
                borderRadius:
                  6,
                padding:
                  "6px 8px",
              }}
            />

            <span
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                fontSize: 12,
              }}
            >
              m
            </span>
          </div>

          {/* Rotation */}

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            🔄 หมุนแปลน
          </div>

          <div
            style={{
              display:
                "flex",
              gap: 6,
              marginTop: 7,
            }}
          >
            <button
              onClick={() =>
                changeRotation(
                  placement.rotation -
                    1
                )
              }
              style={
                smallEditorButton
              }
            >
              ↶ 1°
            </button>

            <input
              type="number"
              value={Number(
                placement.rotation.toFixed(
                  1
                )
              )}
              onChange={(e) =>
                changeRotation(
                  e.target.value
                )
              }
              style={{
                flex: 1,
                minWidth: 0,
                border:
                  "1px solid #DADCE0",
                borderRadius:
                  6,
                padding:
                  "6px 8px",
              }}
            />

            <button
              onClick={() =>
                changeRotation(
                  placement.rotation +
                    1
                )
              }
              style={
                smallEditorButton
              }
            >
              ↷ 1°
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   OSM Map
========================================================= */

function OSMMap({
  center,
  zoom,
}) {
  const [size, setSize] =
    useState({
      width:
        typeof window !==
        "undefined"
          ? window.innerWidth
          : 1200,
      height:
        typeof window !==
        "undefined"
          ? window.innerHeight -
            64
          : 700,
    });

  useEffect(() => {
    const resize =
      () => {
        setSize({
          width:
            window.innerWidth,
          height:
            window.innerHeight -
            64,
        });
      };

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  }, []);

  const tileSize = 256;

  const scale =
    tileSize *
    Math.pow(2, zoom);

  const centerLat =
    Math.max(
      -85,
      Math.min(
        85,
        center[0]
      )
    );

  const latRad =
    (centerLat *
      Math.PI) /
    180;

  const centerX =
    ((center[1] + 180) /
      360) *
    scale;

  const centerY =
    ((1 -
      Math.log(
        Math.tan(
          latRad
        ) +
          1 /
            Math.cos(
              latRad
            )
      ) /
        Math.PI) /
      2) *
    scale;

  const startX =
    centerX -
    size.width / 2;

  const startY =
    centerY -
    size.height / 2;

  const startTileX =
    Math.floor(
      startX /
        tileSize
    );

  const endTileX =
    Math.floor(
      (startX +
        size.width) /
        tileSize
    );

  const startTileY =
    Math.floor(
      startY /
        tileSize
    );

  const endTileY =
    Math.floor(
      (startY +
        size.height) /
        tileSize
    );

  const tileCount =
    Math.pow(
      2,
      zoom
    );

  const tiles = [];

  for (
    let y = startTileY;
    y <= endTileY;
    y++
  ) {
    if (
      y < 0 ||
      y >= tileCount
    )
      continue;

    for (
      let x = startTileX;
      x <= endTileX;
      x++
    ) {
      const wrappedX =
        ((x %
          tileCount) +
          tileCount) %
        tileCount;

      tiles.push(
        <img
          key={`${zoom}-${x}-${y}`}
          src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`}
          alt=""
          draggable={
            false
          }
          style={{
            position:
              "absolute",
            width:
              tileSize,
            height:
              tileSize,
            left:
              x *
                tileSize -
              startX,
            top:
              y *
                tileSize -
              startY,
            userSelect:
              "none",
            pointerEvents:
              "none",
          }}
        />
      );
    }
  }

  return (
    <div
      style={{
        position:
          "absolute",
        inset: 0,
        overflow:
          "hidden",
        background:
          "#ddd",
      }}
    >
      {tiles}

      <div
        style={{
          position:
            "absolute",
          right: 8,
          top: 8,
          padding:
            "4px 7px",
          borderRadius: 5,
          background:
            "rgba(255,255,255,.9)",
          fontSize: 10,
          color:
            "#444",
        }}
      >
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

/* =========================================================
   UC9 : บันทึกข้อมูลแผนที่
========================================================= */

function SaveMap({ user }) {
  const {
    items,
    create,
    patch,
  } = useCollection(
    "mapDrafts"
  );

  const {
    items: assets = [],
    patch: patchAsset,
  } = useCollection(
    "mapAssets"
  );

  const {
    items: boundaries = [],
    patch: patchBoundary,
  } = useCollection(
    "mapBoundaries"
  );

  const [form, setForm] =
    useState({
      name: "",
      note: "",
    });

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));

  const draftAssets =
    assets.filter(
      (a) =>
        a.status ===
        "draft"
    );

  const draftBoundaries =
    boundaries.filter(
      (b) =>
        b.status ===
        "draft"
    );

  const handlePublish =
    async (draftId) => {
      if (
        !confirm(
          "ยืนยันการเผยแพร่ข้อมูลแผนที่ ขอบเขต และไฟล์ประกอบทั้งหมดขึ้นระบบจริง?"
        )
      )
        return;

      try {
        await patch(
          draftId,
          {
            status:
              "published",
            updatedAt:
              todayStr(),
          },
          user
        );

        for (const asset of draftAssets) {
          try {
            await patchAsset(
              asset.id,
              {
                status:
                  "published",
                updatedAt:
                  todayStr(),
              },
              user
            );
          } catch (e) {
            console.warn(
              `Publish asset ${asset.id} failed:`,
              e
            );
          }
        }

        for (const boundary of draftBoundaries) {
          try {
            await patchBoundary(
              boundary.id,
              {
                status:
                  "published",
                updatedAt:
                  todayStr(),
              },
              user
            );
          } catch (e) {
            console.warn(
              `Publish boundary ${boundary.id} failed:`,
              e
            );
          }
        }

        alert(
          "เผยแพร่ข้อมูลขึ้นระบบจริงเรียบร้อยแล้ว!"
        );
      } catch (error) {
        console.error(
          "Publish failed:",
          error
        );

        alert(
          "เกิดข้อผิดพลาดในการเผยแพร่ กรุณาลองใหม่อีกครั้ง"
        );
      }
    };

  return (
    <>
      <UCHead
        code="UC9"
        title="บันทึกข้อมูลแผนที่"
        desc="บันทึกการเปลี่ยนแปลงเป็นฉบับร่างก่อน แล้วจึงยืนยันเผยแพร่ขึ้นระบบจริง"
      />

      <Card>
        <b
          style={{
            fontSize: 13.5,
            color:
              "#202124",
          }}
        >
          รายการฉบับร่าง (Draft)
          ที่รอเผยแพร่ขึ้นระบบจริง
        </b>

        <div
          style={{
            marginTop: 8,
            marginBottom: 14,
            fontSize: 13,
            color:
              "#5F6368",
          }}
        >
          {draftBoundaries.length ===
            0 &&
          draftAssets.length ===
            0 ? (
            <div
              style={{
                padding:
                  "10px",
                background:
                  "#F8F9FA",
                borderRadius:
                  6,
                border:
                  "1px dashed #DADCE0",
                textAlign:
                  "center",
              }}
            >
              ไม่มีรายการฉบับร่างค้างอยู่
              (ข้อมูลเป็นระบบจริงทั้งหมดแล้ว
              หรือยังไม่ได้สร้างข้อมูลใน
              UC7/UC8)
            </div>
          ) : (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: 6,
              }}
            >
              {draftBoundaries.map(
                (b) => (
                  <div
                    key={b.id}
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      padding:
                        "8px 12px",
                      background:
                        "#F8F9FA",
                      borderRadius:
                        6,
                      border:
                        "1px solid #DADCE0",
                    }}
                  >
                    <span>
                      📍{" "}
                      <b>
                        [ขอบเขตแผนผังอาคาร: ]
                      </b>{" "}
                      {b.name}{" "}
                      ({b.type})
                    </span>

                    <Status value="draft" />
                  </div>
                )
              )}

              {draftAssets.map(
                (a) => (
                  <div
                    key={a.id}
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      padding:
                        "8px 12px",
                      background:
                        "#F8F9FA",
                      borderRadius:
                        6,
                      border:
                        "1px solid #DADCE0",
                    }}
                  >
                    <span>
                      📁{" "}
                      <b>
                        [แผนผังภายในอาคาร: ]
                      </b>{" "}
                      {a.name}{" "}
                      ({a.kind})
                    </span>

                    <Status value="draft" />
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <hr
          style={{
            border: "none",
            borderTop:
              "1px solid #E8EAED",
            margin:
              "14px 0",
          }}
        />

        <Field label="ชื่อรายการที่บันทึก">
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="เช่น ปรับพิกัดทางเข้าอาคาร"
          />
        </Field>

        <Field label="บันทึกช่วยจำ / รายละเอียดการแก้ไข">
          <Textarea
            value={form.note}
            onChange={set("note")}
          />
        </Field>

        <Btn
          onClick={async () => {
            if (
              !form.name.trim()
            ) {
              return alert(
                "กรุณาระบุชื่อรายการ"
              );
            }

            await create(
              {
                ...form,
                savedAt:
                  new Date()
                    .toISOString()
                    .slice(
                      0,
                      16
                    )
                    .replace(
                      "T",
                      " "
                    ),
                savedBy:
                  user.name,
                status:
                  "draft",
              },
              user
            );

            setForm({
              name: "",
              note: "",
            });
          }}
        >
          บันทึกเป็นฉบับร่าง
        </Btn>
      </Card>

      {items.map((d) => (
        <Card key={d.id}>
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              gap: 8,
            }}
          >
            <b
              style={{
                fontSize: 14,
                color:
                  "#202124",
              }}
            >
              {d.name}
            </b>

            <Status
              value={
                d.status
              }
            />
          </div>

          <div
            style={{
              fontSize: 13,
              color:
                "#3C4043",
              marginTop: 4,
            }}
          >
            {d.note}
          </div>

          <div
            style={{
              fontSize: 11.5,
              color:
                "#5F6368",
              marginTop: 7,
            }}
          >
            บันทึกเมื่อ{" "}
            {d.savedAt}{" "}
            โดย{" "}
            {d.savedBy}
          </div>

          <div
            style={{
              marginTop: 9,
            }}
          >
            {d.status ===
            "draft" ? (
              <Btn
                kind="ok"
                onClick={() =>
                  handlePublish(
                    d.id
                  )
                }
              >
                ยืนยันเผยแพร่ขึ้นระบบจริง
              </Btn>
            ) : (
              <Btn
                kind="ghost"
                disabled
              >
                เผยแพร่แล้ว
              </Btn>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}

/* =========================================================
   Small Components / Styles
========================================================= */

function InfoRow({
  label,
  value,
}) {
  return (
    <div
      style={{
        display:
          "flex",
        justifyContent:
          "space-between",
        gap: 10,
        marginTop: 5,
        fontSize: 11.5,
      }}
    >
      <span
        style={{
          color:
            "#5F6368",
        }}
      >
        {label}
      </span>

      <b>{value}</b>
    </div>
  );
}

const editorButton = {
  border:
    "1px solid #DADCE0",
  borderRadius: 7,
  padding:
    "8px 12px",
  background:
    "#fff",
  cursor:
    "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const smallEditorButton = {
  border:
    "1px solid #DADCE0",
  borderRadius: 6,
  padding:
    "6px 10px",
  background:
    "#fff",
  cursor:
    "pointer",
  fontSize: 12,
};