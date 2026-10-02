"use client";

export default function PlaceCardPanel({ view }) {
  const {
    CompassIcon,
    KMITL_NODE_FLOOR,
    navigateFromCard,
    openReportForm,
    placeCard,
    setPlaceCard
  } = view;
  return placeCard ? <div style={{
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2100,
  padding: "0 10px calc(10px + env(safe-area-inset-bottom))",
  pointerEvents: "none"
}}>
          <div style={{
    width: "min(520px, 100%)",
    margin: "0 auto",
    background: "#FFFFFF",
    borderRadius: "20px 20px 14px 14px",
    overflow: "hidden",
    boxShadow: "0 -4px 24px rgba(32,33,36,.28)",
    pointerEvents: "auto"
  }}>
            <div style={{
      width: 38,
      height: 4,
      borderRadius: 999,
      background: "#DADCE0",
      margin: "9px auto 4px"
    }} />
            {placeCard.image ? <img src={placeCard.image} alt={placeCard.name} style={{
      width: "100%",
      height: 125,
      objectFit: "cover",
      display: "block"
    }} /> : null}
            <div style={{
      padding: "13px 16px 15px"
    }}>
              <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }}>
                <span style={{
          fontSize: 25,
          lineHeight: 1
        }}>{placeCard.icon || "📍"}</span>
                <div style={{
          flex: 1,
          minWidth: 0
        }}>
                  <div style={{
            fontWeight: 800,
            fontSize: 18,
            color: "#202124"
          }}>{placeCard.name}</div>
                  {placeCard.nodeId ? <div style={{
            marginTop: 3,
            fontSize: 11.5,
            color: "#5F6368"
          }}>ชั้น {placeCard.floor || KMITL_NODE_FLOOR[placeCard.nodeId] || "1"} · node: {placeCard.nodeId}</div> : null}
                </div>
                <button onClick={() => setPlaceCard(null)} aria-label="ปิด" style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: 0,
          background: "#F1F3F4",
          color: "#5F6368",
          cursor: "pointer",
          fontSize: 16
        }}>✕</button>
              </div>
              <div style={{
        fontSize: 13.5,
        color: "#5F6368",
        lineHeight: 1.55,
        marginTop: 9,
        maxHeight: 70,
        overflowY: "auto"
      }}>
                {placeCard.loading ? "กำลังค้นหาข้อมูล…" : placeCard.extract || "ไม่พบข้อมูลรายละเอียดของสถานที่นี้"}
              </div>
              <button onClick={navigateFromCard} style={{
        width: "100%",
        marginTop: 13,
        padding: "12px 0",
        border: "none",
        borderRadius: 12,
        background: "#1A73E8",
        color: "#fff",
        fontWeight: 800,
        fontSize: 15,
        cursor: "pointer"
      }}>
                <CompassIcon size={16} color="#fff" /> เส้นทางไปที่นี่
              </button>
              <button onClick={openReportForm} style={{
        width: "100%",
        marginTop: 8,
        padding: "11px 0",
        border: "1px solid #DADCE0",
        borderRadius: 12,
        background: "#fff",
        color: "#D93025",
        fontWeight: 800,
        fontSize: 14,
        cursor: "pointer"
      }}>
                แจ้งปัญหา
              </button>
            </div>
          </div>
        </div> : null;
}
