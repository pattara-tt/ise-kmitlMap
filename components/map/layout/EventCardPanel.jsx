"use client";

import { useEffect, useRef, useState } from "react";

export default function EventCardPanel({ view }) {
  const { CompassIcon, EVENT_PIN_ICON, eventCard, fmtEventTime, myInterest,
    openPlaceCard, setEventCard, toggleInterest, categories = [], interests = [], rooms = [], floorRecords = [] } = view;
  const [expanded, setExpanded] = useState(false);
  const [detailsNat, setDetailsNat] = useState(0); // ความสูงจริงของรายละเอียดเต็ม (px)
  const [summaryNat, setSummaryNat] = useState(0); // ความสูงจริงของสรุปย่อ 3 บรรทัด (px)
  const [dragH, setDragH] = useState(null); // ความสูงรายละเอียดระหว่างลาก; null = ไม่ได้ลาก
  const drag = useRef(null);
  const detailsRef = useRef(null);
  const summaryRef = useRef(null);
  const hasCard = Boolean(eventCard);

  useEffect(() => { setExpanded(false); setDragH(null); }, [eventCard?.id]);

  // วัดความสูงจริงของเนื้อหา — กรอบจะยืดตามเนื้อหา ไม่ใช่ขนาดตายตัว
  useEffect(() => {
    const d = detailsRef.current;
    const s = summaryRef.current;
    if (!d || !s) return undefined;
    const measure = () => { setDetailsNat(d.offsetHeight); setSummaryNat(s.offsetHeight); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(d);
    ro.observe(s);
    return () => ro.disconnect();
  }, [hasCard]);

  if (!eventCard) return null;

  const on = !!myInterest(eventCard.id);
  const category = categories.find(c => c.id === (eventCard.categoryId || eventCard.category_id));
  const room = rooms.find(r => r.id === (eventCard.roomId || eventCard.room_id));
  const floorRow = room ? floorRecords.find(f => f.id === room.floorId) : null;
  const floorLabel = floorRow?.name || (floorRow?.floorNo != null ? `ชั้น ${floorRow.floorNo}` : null);
  const temporaryType = eventCard.temporaryRoomType || eventCard.temporary_room_type || null;
  const interestCount = interests.filter(i => i.eventId === eventCard.id).length;
  const placeName = eventCard.placeName || eventCard.place_name || room?.name || null;

  // สัดส่วนการกาง 0..1 — สรุปย่อค่อย ๆ หุบ ขณะที่รายละเอียดเต็มค่อย ๆ โผล่
  const detailsH = dragH ?? (expanded ? detailsNat : 0);
  const p = detailsNat > 0 ? Math.min(1, detailsH / detailsNat) : (expanded ? 1 : 0);
  const anim = dragH == null ? "height .22s ease, opacity .22s ease" : "none";

  // ลากหัวการ์ด: ความสูงตามนิ้ว/เมาส์แบบ real-time พอปล่อยค่อยเลือกกางหรือพับ (แตะ = สลับ)
  const gripDown = (e) => {
    if (e.target.closest("button")) return;
    drag.current = { y: e.clientY, base: expanded ? detailsNat : 0, moved: false, t: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const gripMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 6) d.moved = true;
    if (d.moved) setDragH(Math.max(0, Math.min(detailsNat, d.base - dy)));
  };
  const gripUp = (e) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const dy = e.clientY - d.y;
    const speed = dy / Math.max(1, performance.now() - d.t); // px/ms ค่าลบ = ปัดขึ้น
    const finalH = Math.max(0, Math.min(detailsNat, d.base - dy));
    setDragH(null);
    if (!d.moved) { setExpanded(v => !v); return; }
    if (speed < -0.4) setExpanded(true);
    else if (speed > 0.4) setExpanded(false);
    else setExpanded(finalH > detailsNat / 2);
  };

  return <div style={{position:"absolute",left:0,right:0,bottom:0,zIndex:2200,padding:"0 10px calc(10px + env(safe-area-inset-bottom))",pointerEvents:"none"}}>
    <div style={{width:"min(520px, 100%)",margin:"0 auto",background:"#fff",borderRadius:"20px 20px 14px 14px",overflow:"hidden",boxShadow:"0 -4px 24px rgba(32,33,36,.28)",pointerEvents:"auto",display:"flex",flexDirection:"column",maxHeight:"min(72vh, 650px)"}}>

      {/* โซนลาก: แถบจับ + แถวชื่อกิจกรรม (ปุ่มปิดยังกดได้ปกติ) */}
      <div role="button" tabIndex={0} aria-expanded={expanded} aria-label="ลากขึ้นหรือลงเพื่อดูข้อมูลเพิ่มเติม"
        onPointerDown={gripDown} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={()=>{drag.current=null;setDragH(null);}}
        onKeyDown={e=>{ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(v=>!v); } }}
        style={{flex:"none",padding:"10px 16px 0",cursor:"grab",touchAction:"none",userSelect:"none",outline:"none"}}>
        <div style={{padding:"0 0 8px"}}><div style={{width:42,height:5,borderRadius:999,background:"#B8BDC4",margin:"0 auto"}} /></div>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{width:40,height:40,flex:"none",borderRadius:"50%",background:on?"#1A73E8":"#D93025",display:"grid",placeItems:"center"}}><span style={{width:21,height:21,background:"#fff",WebkitMask:`url('${EVENT_PIN_ICON}') center/contain no-repeat`,mask:`url('${EVENT_PIN_ICON}') center/contain no-repeat`}} /></span>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:18,color:"#202124"}}>{eventCard.name}</div>{!expanded && <div style={{marginTop:3,fontSize:12,color:"#5F6368"}}>{category?.name || "กิจกรรม"}</div>}</div>
          <button className="round-btn" onClick={()=>setEventCard(null)} aria-label="ปิด" title="ปิด">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      <div style={{flex:"0 1 auto",minHeight:0,overflowY:"auto",padding:"0 16px 16px"}}>
        {/* สรุปย่อ (ตอนพับ) */}
        <div aria-hidden={p === 1} style={{height:summaryNat ? summaryNat * (1 - p) : "auto",opacity:1 - p,overflow:"hidden",transition:anim}}>
          <div ref={summaryRef} style={{paddingTop:9,fontSize:12.5,color:"#5F6368",lineHeight:1.75}}>🕘 {fmtEventTime(eventCard.startAt)} — {fmtEventTime(eventCard.endAt)}<br/>📍 {placeName || "ไม่ระบุสถานที่"}<br/>⭐ สนใจ {interestCount} คน</div>
        </div>

        {/* รายละเอียดเต็ม (ตอนกาง): สูงเท่าเนื้อหาจริง ไม่มีพื้นที่ว่างเกิน */}
        <div aria-hidden={detailsH === 0} style={{height:detailsH,overflow:"hidden",transition:dragH == null ? "height .22s ease" : "none"}}>
          <div ref={detailsRef} style={{paddingTop:12}}>
            <div style={{borderTop:"1px solid #EEF0F2",paddingTop:12,fontSize:13.5,color:"#3C4043",lineHeight:1.7}}>
              <div style={{marginBottom:10}}><b>ประเภทกิจกรรม:</b> {category?.name || "-"}</div>
              <div style={{fontWeight:800,fontSize:13,marginBottom:4}}>รายละเอียดกิจกรรม</div>
              <div style={{whiteSpace:"pre-wrap",marginBottom:11}}>{eventCard.detail || "-"}</div>
              <div><b>วัน/เวลา:</b> {fmtEventTime(eventCard.startAt)} — {fmtEventTime(eventCard.endAt)}</div>
              <div><b>สถานที่:</b> {placeName || "-"}</div>
              {room && <>
                <div><b>ห้อง:</b> {[room.code, room.name].filter(Boolean).join(" · ") || "-"}</div>
                {floorLabel && <div><b>ชั้น:</b> {floorLabel}</div>}
                {temporaryType && <div><b>ประเภทห้องชั่วคราว:</b> {temporaryType}</div>}
              </>}
              <div><b>จำนวนคนสนใจ:</b> {interestCount} คน</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={()=>toggleInterest(eventCard)} style={{flex:1,padding:"12px 0",border:on?"1px solid #1A73E8":"none",borderRadius:12,background:on?"#E8F0FE":"#1A73E8",color:on?"#1A73E8":"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>{on?"✓ สนใจแล้ว — กดเพื่อยกเลิก":"⭐ สนใจเข้าร่วมกิจกรรม"}</button>
          <button onClick={()=>{setEventCard(null);openPlaceCard(placeName||eventCard.name,[Number(eventCard.lon),Number(eventCard.lat)],{});}} style={{padding:"12px 16px",border:"1px solid #DADCE0",borderRadius:12,background:"#fff",color:"#1A73E8",fontWeight:800,cursor:"pointer"}}><CompassIcon size={15} color="#1A73E8" /> เส้นทาง</button>
        </div>
        {!expanded && <div onClick={()=>setExpanded(true)} style={{textAlign:"center",fontSize:11.5,color:"#80868B",marginTop:8,cursor:"pointer"}}>ลากขึ้นเพื่อดูข้อมูลเพิ่มเติม</div>}
      </div>
    </div>
  </div>;
}