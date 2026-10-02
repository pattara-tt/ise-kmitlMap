"use client";

export default function NavigationPanel({ view }) {
  const {
    nav,
    stopNav,
    toggleVoice,
    toggleVoiceLang,
    voice,
    voiceLang
  } = view;
  return nav?.active ? <div className="wb-card wb-nav">
          <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  }}>
            <div style={{
      flex: 1
    }}>
              {nav.arrived ? <div style={{
        fontSize: 20,
        fontWeight: 800
      }}>🎉 ถึงปลายทางแล้ว</div> : <>
                  <div style={{
          fontSize: 20,
          fontWeight: 800,
          lineHeight: 1.2
        }}>{nav.instr}</div>
                  {nav.distTurn != null ? <div style={{
          fontSize: 14,
          opacity: 0.9
        }}>อีก {nav.distTurn} ม. · เหลือถึงปลายทาง {nav.distDest} ม.</div> : <div style={{
          fontSize: 13,
          opacity: 0.9
        }}>{nav.distDest != null ? `เหลือ ${nav.distDest} ม.` : ""}</div>}
                </>}
              {nav.cross ? <div style={{
        marginTop: 6,
        background: "#e9a23b",
        borderRadius: 6,
        padding: "5px 8px",
        fontWeight: 700,
        fontSize: 14
      }}>🚸 เตรียมข้ามถนน อีก ~{nav.cross.dist} ม.</div> : null}
              {nav.hazard ? <div style={{
        marginTop: 6,
        background: "#c1121f",
        borderRadius: 6,
        padding: "5px 8px",
        fontWeight: 700,
        fontSize: 14
      }}>⚠️ ระวัง {nav.hazard.label} อีก ~{nav.hazard.dist} ม.</div> : null}
              {nav.toilet ? <div style={{
        marginTop: 6,
        background: "#0f8a8a",
        borderRadius: 6,
        padding: "5px 8px",
        fontWeight: 700,
        fontSize: 14
      }}>🚻 ห้องน้ำข้างหน้า ~{nav.toilet.dist} ม.{nav.toilet.off ? ` (เบี่ยงจากทาง ~${nav.toilet.off} ม.)` : ""}{nav.toilet.where ? ` · ${nav.toilet.where}` : ""}</div> : null}
              {nav.transit ? <div style={{
        marginTop: 6,
        background: "#8E24AA",
        borderRadius: 6,
        padding: "5px 8px",
        fontWeight: 700,
        fontSize: 14
      }}>{nav.transit.type === "lift" ? "🛗" : "⬆"} {nav.transit.label} ~{nav.transit.dist} ม.</div> : null}
            </div>
            <div style={{
      display: "flex",
      gap: 6
    }}>
              <button onClick={toggleVoiceLang} style={{
        background: "rgba(255,255,255,.25)",
        border: "none",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 10px",
        fontWeight: 700,
        cursor: "pointer",
        fontSize: 13
      }}>{voiceLang === "en" ? "EN" : "ไทย"}</button>
              <button onClick={toggleVoice} style={{
        background: "rgba(255,255,255,.25)",
        border: "none",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 11px",
        fontWeight: 700,
        cursor: "pointer",
        fontSize: 16
      }}>{voice ? "🔊" : "🔇"}</button>
              <button onClick={stopNav} style={{
        background: "rgba(255,255,255,.25)",
        border: "none",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 12px",
        fontWeight: 700,
        cursor: "pointer"
      }}>หยุด</button>
            </div>
          </div>
        </div> : null;
}
