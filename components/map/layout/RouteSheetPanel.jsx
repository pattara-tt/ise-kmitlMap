"use client";

import { useEffect, useRef } from "react";

export default function RouteSheetPanel({ view }) {
  const {
    CompassIcon,
    active,
    ctx,
    nav,
    routeData,
    routeSheetOpen,
    setRouteData,
    setRouteSheetOpen,
    setSFrom,
    setSTo,
    setSearchQuery,
    startNav,
    startSim
  } = view;

  const sheetRef = useRef(null);
  const dragY = useRef(null);
  const dragged = useRef(false);
  const hasSheet = Boolean(routeData && !nav?.active);

  // เก็บความสูงของชีตไว้ใน CSS variable เพื่อให้ปุ่ม ◎ ลอยพ้นชีตเสมอ (ไม่ว่าชีตจะกางหรือพับ)
  useEffect(() => {
    const el = sheetRef.current;
    const wrap = el?.closest(".bdi-mapwrap");
    if (!el || !wrap) return undefined;
    const apply = () => wrap.style.setProperty("--route-sheet-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      wrap.style.removeProperty("--route-sheet-h");
    };
  }, [hasSheet]);

  // ปัดหัวชีตลง = พับ, ปัดขึ้น = กาง, แตะ = สลับ
  const onHeadDown = e => {
    if (e.target.closest("button")) return;
    dragY.current = e.clientY;
    dragged.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHeadMove = e => {
    if (dragY.current != null && Math.abs(e.clientY - dragY.current) > 8) dragged.current = true;
  };
  const onHeadUp = e => {
    if (dragY.current == null) return;
    const dy = e.clientY - dragY.current;
    dragY.current = null;
    if (dy > 36) setRouteSheetOpen(false);
    else if (dy < -36) setRouteSheetOpen(true);
  };
  const toggleSheet = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setRouteSheetOpen(v => !v);
  };
  const clearRoute = e => {
    e.stopPropagation(); // กันไม่ให้ toggle sheet open/close ไปด้วย
    setSFrom("");
    setSTo("");
    setSearchQuery("");
    setRouteData(null);
    const c = ctx.current;
    c.routeKey = null;
    c.scored = null;
    c.routeLayer?.clearLayers?.();
  };

  if (!hasSheet) return null;

  const best = routeData.routes?.[routeData.best];
  const isError = Boolean(routeData.error);
  const title = routeData.loading ? "กำลังหาเส้นทาง…" : isError ? "หาเส้นทางไม่ได้" : "รายละเอียดเส้นทาง";
  // บรรทัดสรุปตอนพับ — ให้เห็นผลหลักได้โดยไม่ต้องกาง
  const summary = isError ? "แตะเพื่อดูสาเหตุ" : best ? `${(best.distance_m / 1000).toFixed(2)} กม. · ${best.duration_min} นาที` : "";
  const errorText = isError ? String(routeData.error).replace(/^ใช้ไม่ได้:\s*/, "") : "";

  return <div className="gm-bottom-stack" style={{
  position: "absolute",
  left: 10,
  right: 10,
  bottom: 10,
  zIndex: 1300,
  display: "flex",
  flexDirection: "column",
  gap: 8
}}>
          <div ref={sheetRef} className="bdi-card gm-route-sheet" style={{
    maxHeight: "38vh",
    overflow: "auto",
    padding: "0 14px 10px"
  }}>
          <div className="bdi-sheet-handle" role="button" tabIndex={0} aria-expanded={Boolean(routeSheetOpen)} onPointerDown={onHeadDown} onPointerMove={onHeadMove} onPointerUp={onHeadUp} onPointerCancel={() => {
      dragY.current = null;
    }} onClick={toggleSheet} onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setRouteSheetOpen(v => !v);
      }
    }} style={{
      position: "sticky",
      top: 0,
      background: "rgba(255,255,255,.72)",
      backdropFilter: "blur(10px)",
      margin: "0 -16px",
      padding: "18px 16px 10px",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      touchAction: "none"
    }}>
            <div style={{
        minWidth: 0
      }}>
              <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: isError ? "#C5221F" : "#202124"
        }}>{title}</div>
              {!routeSheetOpen && summary ? <div style={{
          fontSize: 12,
          color: "#5F6368",
          marginTop: 2
        }}>{summary}</div> : null}
            </div>
            <button type="button" className="round-btn" onClick={clearRoute} title="ล้างการค้นหา" aria-label="ล้างการค้นหาเส้นทาง">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>
          </div>
          {routeSheetOpen ? routeData.loading ? <div style={{
      fontSize: 13,
      color: "var(--bdi-text-dim)"
    }}>กำลังคำนวณเส้นทาง…</div> : isError ? <div role="alert" style={{
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      padding: "12px 14px",
      borderRadius: 12,
      background: "#FCE8E6",
      border: "1px solid #F5C6C2",
      color: "#A50E0E",
      fontSize: 13,
      lineHeight: 1.5
    }}>
              <span aria-hidden="true" style={{
        fontSize: 18,
        lineHeight: 1.2
      }}>⚠️</span>
              <div style={{
        minWidth: 0
      }}>
                <div style={{
          fontWeight: 700,
          marginBottom: 2
        }}>ไม่สามารถนำทางได้</div>
                <div>{errorText}</div>
              </div>
            </div> : <div>
              <div style={{
        fontSize: 12.5,
        color: "var(--bdi-text-dim)",
        marginBottom: 6
      }}>{routeData.startName || "Sc8"} → {routeData.endName || "ปลายทาง"}</div>
              {routeData.graphOk === false ? <div style={{
        fontSize: 11,
        color: "#f4b860",
        marginTop: 4
      }}>⏳ โครงข่ายทางเท้า OSM กำลังโหลด — เส้นแนะนำจะแม่นขึ้นอัตโนมัติเมื่อพร้อม</div> : null}
              {best ? (() => {
        const r = best;
        return <div role="button" tabIndex={0} onClick={() => ctx.current.select(r.index)} onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            ctx.current.select(r.index);
          }
        }} className={"bdi-route-opt" + (active === r.index ? " on" : "")}>
                    <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
                      <span className="bdi-badge"><CompassIcon size={13} color="currentColor" /> เส้นทางแนะนำ</span>
                    </div>
                    <div className="bdi-stats">
                      <span>📏 {(r.distance_m / 1000).toFixed(2)} KM</span>
                      <span>🔥 {Math.round(r.distance_m * 0.053)} kcal</span>
                      <span>⏱ {r.duration_min} MINS</span>
                    </div>
                    <div style={{
            display: "flex",
            gap: 8,
            marginTop: 10
          }}>
                      <button onClick={e => {
              e.stopPropagation();
              startNav(r.index);
            }} className="bdi-btn" style={{
              flex: 1,
              fontSize: 13,
              padding: "9px 12px"
            }}>🚶 เริ่มนำทาง</button>
                      <button onClick={e => {
              e.stopPropagation();
              startSim(r.index);
            }} className="bdi-btn ghost" style={{
              flex: 1,
              fontSize: 13,
              padding: "9px 12px"
            }}>▶ จำลอง</button>
                    </div>
                  </div>;
      })() : null}
            </div> : null}
          </div>
        </div>;
}