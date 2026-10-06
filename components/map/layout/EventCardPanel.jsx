"use client";

export default function EventCardPanel({ view }) {
  const {
    CompassIcon,
    EVENT_PIN_ICON,
    eventCard,
    fmtEventTime,
    myInterest,
    openPlaceCard,
    setEventCard,
    toggleInterest
  } = view;
  return eventCard ? (() => {
  const on = !!myInterest(eventCard.id);
  return <div style={{
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2200,
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
              <div style={{
        padding: "10px 16px 16px"
      }}>
                <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10
        }}>
                  <span style={{
            width: 40,
            height: 40,
            flex: "none",
            borderRadius: "50%",
            background: "#1A73E8",
            display: "grid",
            placeItems: "center"
          }}>
                    <span style={{
              width: 21,
              height: 21,
              background: "#fff",
              WebkitMask: `url('${EVENT_PIN_ICON}') center/contain no-repeat`,
              mask: `url('${EVENT_PIN_ICON}') center/contain no-repeat`
            }} />
                  </span>
                  <div style={{
            flex: 1,
            minWidth: 0
          }}>
                    <div style={{
              fontWeight: 800,
              fontSize: 18,
              color: "#202124"
            }}>{eventCard.name}</div>
                    <div style={{
              marginTop: 3,
              fontSize: 11.5,
              color: "#5F6368"
            }}>กิจกรรมจากฝ่ายประชาสัมพันธ์</div>
                  </div>
                  <button onClick={() => setEventCard(null)} aria-label="ปิด" style={{
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
          color: "#3C4043",
          lineHeight: 1.6,
          marginTop: 10,
          maxHeight: 92,
          overflowY: "auto"
        }}>
                  {eventCard.detail || "ไม่มีรายละเอียดเพิ่มเติม"}
                </div>

                <div style={{
          fontSize: 12.5,
          color: "#5F6368",
          lineHeight: 1.8,
          marginTop: 10
        }}>
                  🕘 {fmtEventTime(eventCard.startAt)} — {fmtEventTime(eventCard.endAt)}<br />
                  📍 {eventCard.placeName || "ไม่ระบุสถานที่"}
                </div>

                <div style={{
          display: "flex",
          gap: 8,
          marginTop: 14
        }}>
                  <button onClick={() => toggleInterest(eventCard)} style={{
            flex: 1,
            padding: "12px 0",
            border: on ? "1px solid #D93025" : "none",
            borderRadius: 12,
            background: on ? "#FCE8E6" : "#D93025",
            color: on ? "#D93025" : "#fff",
            fontWeight: 800,
            fontSize: 14.5,
            cursor: "pointer"
          }}>
                    {on ? "✓ สนใจแล้ว — กดเพื่อยกเลิก" : "⭐ สนใจเข้าร่วมกิจกรรม"}
                  </button>
                  <button onClick={() => {
            setEventCard(null);
            openPlaceCard(eventCard.placeName || eventCard.name, [Number(eventCard.lon), Number(eventCard.lat)], {});
          }} style={{
            flex: "none",
            padding: "12px 16px",
            border: "1px solid #DADCE0",
            borderRadius: 12,
            background: "#fff",
            color: "#1A73E8",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer"
          }}>
                    <CompassIcon size={15} color="#1A73E8" /> เส้นทาง
                  </button>
                </div>

                {on ? <div style={{
          fontSize: 11.5,
          color: "#D93025",
          marginTop: 9,
          fontWeight: 700
        }}>กิจกรรมนี้จะแสดงเป็นหมุดสีแดงเด่นบนแผนที่ตลอดเวลา</div> : null}
              </div>
            </div>
          </div>;
})() : null;
}
