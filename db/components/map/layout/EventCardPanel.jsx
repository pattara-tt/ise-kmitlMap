"use client";

import { useEffect, useRef, useState } from "react";

export default function EventCardPanel({ view }) {
  const { CompassIcon, EVENT_PIN_ICON, eventCard, fmtEventTime, myInterest,
    openPlaceCard, setEventCard, toggleInterest, categories = [], interests = [], rooms = [], floorRecords = [] } = view;
  const [expanded, setExpanded] = useState(false);
  const startY = useRef(null);
  useEffect(() => { setExpanded(false); }, [eventCard?.id]);
  if (!eventCard) return null;

  const on = !!myInterest(eventCard.id);
  const category = categories.find(c => c.id === (eventCard.categoryId || eventCard.category_id));
  const room = rooms.find(r => r.id === (eventCard.roomId || eventCard.room_id));
  const floorRow = room ? floorRecords.find(f => f.id === room.floorId) : null;
  const floorLabel = floorRow?.name || (floorRow?.floorNo != null ? `ชั้น ${floorRow.floorNo}` : null);
  const temporaryType = eventCard.temporaryRoomType || eventCard.temporary_room_type || null;
  const interestCount = interests.filter(i => i.eventId === eventCard.id).length;
  const placeName = eventCard.placeName || eventCard.place_name || room?.name || null;

  const dragStart = (e) => { startY.current=e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const dragMove = (e) => { if(startY.current==null)return; const d=e.clientY-startY.current; if(d < -18)setExpanded(true); if(d > 18)setExpanded(false); };
  const dragEnd = (e) => { if(startY.current==null)return; const d=e.clientY-startY.current; startY.current=null; if(Math.abs(d)<10)setExpanded(v=>!v); };

  return <div style={{position:"absolute",left:0,right:0,bottom:0,zIndex:2200,padding:"0 10px calc(10px + env(safe-area-inset-bottom))",pointerEvents:"none"}}>
    <div style={{width:"min(520px, 100%)",margin:"0 auto",background:"#fff",borderRadius:"20px 20px 14px 14px",overflow:"hidden",boxShadow:"0 -4px 24px rgba(32,33,36,.28)",pointerEvents:"auto",height:expanded?"min(72vh, 650px)":"auto",maxHeight:"72vh",transition:"height .22s ease"}}>
      <div onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={()=>{startY.current=null;}} style={{padding:"10px 0 6px",cursor:"ns-resize",touchAction:"none"}}><div style={{width:42,height:5,borderRadius:999,background:"#B8BDC4",margin:"0 auto"}} /></div>
      <div style={{padding:"7px 16px 16px",overflowY:expanded?"auto":"visible",height:expanded?"calc(100% - 21px)":"auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{width:40,height:40,flex:"none",borderRadius:"50%",background:on?"#1A73E8":"#D93025",display:"grid",placeItems:"center"}}><span style={{width:21,height:21,background:"#fff",WebkitMask:`url('${EVENT_PIN_ICON}') center/contain no-repeat`,mask:`url('${EVENT_PIN_ICON}') center/contain no-repeat`}} /></span>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:18,color:"#202124"}}>{eventCard.name}</div><div style={{marginTop:3,fontSize:12,color:"#5F6368"}}>{category?.name || "กิจกรรม"}</div></div>
          <button onClick={()=>setEventCard(null)} aria-label="ปิด" style={{width:32,height:32,borderRadius:"50%",border:0,background:"#F1F3F4",color:"#5F6368",cursor:"pointer"}}>✕</button>
        </div>

        {expanded && <div style={{marginTop:12,borderTop:"1px solid #EEF0F2",paddingTop:12,fontSize:13.5,color:"#3C4043",lineHeight:1.7}}>
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
        </div>}

        {!expanded && <div style={{fontSize:12.5,color:"#5F6368",lineHeight:1.75,marginTop:9}}>🕘 {fmtEventTime(eventCard.startAt)} — {fmtEventTime(eventCard.endAt)}<br/>📍 {placeName || "ไม่ระบุสถานที่"}<br/>⭐ สนใจ {interestCount} คน</div>}

        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={()=>toggleInterest(eventCard)} style={{flex:1,padding:"12px 0",border:on?"1px solid #1A73E8":"none",borderRadius:12,background:on?"#E8F0FE":"#1A73E8",color:on?"#1A73E8":"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>{on?"✓ สนใจแล้ว — กดเพื่อยกเลิก":"⭐ สนใจเข้าร่วมกิจกรรม"}</button>
          <button onClick={()=>{setEventCard(null);openPlaceCard(placeName||eventCard.name,[Number(eventCard.lon),Number(eventCard.lat)],{});}} style={{padding:"12px 16px",border:"1px solid #DADCE0",borderRadius:12,background:"#fff",color:"#1A73E8",fontWeight:800,cursor:"pointer"}}><CompassIcon size={15} color="#1A73E8" /> เส้นทาง</button>
        </div>
        {!expanded && <div onClick={()=>setExpanded(true)} style={{textAlign:"center",fontSize:11.5,color:"#80868B",marginTop:8,cursor:"pointer"}}>ลากขึ้นเพื่อดูข้อมูลเพิ่มเติม</div>}
      </div>
    </div>
  </div>;
}
