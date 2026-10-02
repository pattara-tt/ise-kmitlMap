"use client";

export default function BuildingPanel({ view }) {
  const {
    KMITL_FLOORS,
    effectiveFloors,
    kmitlFloor,
    kmitlOpen,
    nav,
    setKmitlFloor,
    setKmitlOpen
  } = view;
  return kmitlOpen && !nav?.active ? <>
          <div style={{
    position: "absolute",
    top: 200,
    right: 14,
    zIndex: 1900,
    background: "#FFFFFF",
    border: "1px solid #DADCE0",
    borderRadius: 12,
    padding: "6px 12px",
    color: "#202124",
    fontWeight: 800,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 10,
    maxWidth: 320
  }}>
            <span style={{
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      minWidth: 0
    }}>
              <span>Sc8 · ชั้น {kmitlFloor}</span>
              {KMITL_FLOORS.find(x => x.id === kmitlFloor)?.detail ? <span style={{
        fontWeight: 500,
        fontSize: 11.5,
        color: "#5F6368",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}>
                  · {KMITL_FLOORS.find(x => x.id === kmitlFloor).detail}
                </span> : null}
            </span>
            <button onClick={() => setKmitlOpen(false)} style={{
      background: "none",
      border: "none",
      color: "#5F6368",
      fontSize: 15,
      cursor: "pointer",
      lineHeight: 1
    }}>✕</button>
          </div>

          {/* เครื่องมือสำหรับผู้พัฒนา (ปรับตำแหน่งผัง / ปักหมุด / ทดสอบเส้นทาง) ถูกนำออกจากหน้าผู้ใช้ทั่วไป */}

          {!KMITL_FLOORS.find(x => x.id === kmitlFloor)?.svg ? <div style={{
    position: "absolute",
    top: 196,
    left: 14,
    zIndex: 1900,
    background: "#FFFFFF",
    border: "1px solid #DADCE0",
    borderRadius: 12,
    padding: "8px 12px",
    color: "var(--bdi-text-dim)",
    fontSize: 12,
    maxWidth: 220
  }}>
              ยังไม่มีไฟล์ผังของชั้นนี้
            </div> : null}
          <div style={{
    position: "absolute",
    right: 10,
    top: "30%",
    zIndex: 1900,
    display: "flex",
    flexDirection: "column",
    gap: 8
  }}>
            {effectiveFloors.map(f => <button key={f.id} onClick={() => setKmitlFloor(f.id)} style={{
      width: 38,
      height: 38,
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
      boxShadow: "0 3px 10px rgba(0,0,0,.45)",
      background: kmitlFloor === f.id ? "#1A73E8" : "#FFFFFF",
      color: kmitlFloor === f.id ? "#fff" : "#3C4043",
      border: "1px solid #DADCE0",
      opacity: f.svg ? 1 : 0.55
    }}>
                {f.label}
              </button>)}
          </div>

        </> : null;
}
