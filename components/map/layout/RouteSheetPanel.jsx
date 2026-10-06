"use client";

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
  return routeData && !nav?.active ? <div className="gm-bottom-stack" style={{
  position: "absolute",
  left: 10,
  right: 10,
  bottom: 10,
  zIndex: 1300,
  display: "flex",
  flexDirection: "column",
  gap: 8
}}>
          <div className="bdi-card gm-route-sheet" style={{
    maxHeight: "38vh",
    overflow: "auto",
    padding: "0 14px 10px"
  }}>
          <div className="bdi-sheet-handle" onClick={() => setRouteSheetOpen(v => !v)} style={{
      position: "sticky",
      top: 0,
      background: "rgba(255,255,255,.72)",
      backdropFilter: "blur(10px)",
      margin: "0 -16px",
      padding: "18px 16px 10px",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
            <span>{routeData.loading ? "กำลังหาเส้นทาง…" : "รายละเอียดเส้นทาง"}</span>
            <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
              <span style={{
          color: "var(--bdi-green)",
          fontSize: 15
        }}>{routeSheetOpen ? "⌄" : "⌃"}</span>
              <span onClick={e => {
          e.stopPropagation(); // กันไม่ให้ toggle sheet open/close ไปด้วย
          setSFrom("");
          setSTo("");
          setSearchQuery("");
          setRouteData(null);
          const c = ctx.current;
          c.routeKey = null;
          c.scored = null;
          c.routeLayer?.clearLayers?.();
        }} title="ล้างการค้นหา" style={{
          width: 26,
          height: 26,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          color: "#5F6368",
          fontSize: 16,
          cursor: "pointer"
        }}>✕</span>
            </div>
          </div>
          {routeSheetOpen ? routeData.loading ? <div style={{
      fontSize: 13,
      color: "var(--bdi-text-dim)"
    }}>กำลังคำนวณเส้นทาง…</div> : routeData.error ? <div style={{
      fontSize: 12,
      color: "var(--bdi-danger)"
    }}>ใช้ไม่ได้: {routeData.error}</div> : <div>
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
              {routeData.routes[routeData.best] ? (() => {
        const r = routeData.routes[routeData.best];
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
              fontSize: 12,
              padding: "6px 12px"
            }}>🚶 เริ่มนำทาง</button>
                      <button onClick={e => {
              e.stopPropagation();
              startSim(r.index);
            }} className="bdi-btn ghost" style={{
              fontSize: 12,
              padding: "6px 12px"
            }}>▶ จำลอง</button>
                    </div>
                  </div>;
      })() : null}
            </div> : null}
          </div>
        </div> : null;
}
