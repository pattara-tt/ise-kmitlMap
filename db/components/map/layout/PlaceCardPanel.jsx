"use client";

import { useEffect, useRef, useState } from "react";

export default function PlaceCardPanel({ view }) {
  const { CompassIcon, navigateFromCard, openReportForm, placeCard, setPlaceCard,
    rooms = [], nodeIdByKey = {}, floorRecords = [] } = view;
  const [expanded, setExpanded] = useState(false);
  const startY = useRef(null);
  useEffect(() => { setExpanded(false); }, [placeCard?.name, placeCard?.nodeId]);
  if (!placeCard) return null;

  // placeCard.nodeId is a map nodeKey, while rooms.nodeId is the DB nodes.id FK.
  const internalNodeId = nodeIdByKey[placeCard.nodeId] || placeCard.nodeId;
  const room = rooms.find(r => r.nodeId === internalNodeId || r.id === placeCard.roomId);
  const floorRow = room ? floorRecords.find(f => f.id === room.floorId) : null;
  const floorLabel = floorRow?.name || (floorRow?.floorNo != null ? `ชั้น ${floorRow.floorNo}` : null);
  const typeLabel = room?.type || null;
  const hasRoomDetails = !!room;
  // extract from indoor nodes is only a search label (e.g. "ห้องเรียน · ชั้น 1"), not a place description.
  const description = placeCard.description || (!placeCard.nodeId ? placeCard.extract : null);

  const dragStart = (e) => { startY.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const dragMove = (e) => {
    if (startY.current == null) return;
    const d = e.clientY - startY.current;
    if (d < -18) setExpanded(true);
    if (d > 18) setExpanded(false);
  };
  const dragEnd = (e) => {
    if (startY.current == null) return;
    const d = e.clientY - startY.current;
    startY.current = null;
    if (Math.abs(d) < 10) setExpanded(v => !v);
  };

  return <div style={{position:"absolute",left:0,right:0,bottom:0,zIndex:2100,padding:"0 10px calc(10px + env(safe-area-inset-bottom))",pointerEvents:"none"}}>
    <div style={{width:"min(520px, 100%)",margin:"0 auto",background:"#fff",borderRadius:"20px 20px 14px 14px",overflow:"hidden",boxShadow:"0 -4px 24px rgba(32,33,36,.28)",pointerEvents:"auto",height:expanded?"min(72vh, 610px)":"auto",maxHeight:"72vh",transition:"height .22s ease"}}>
      <div onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={()=>{startY.current=null;}} style={{padding:"10px 0 6px",cursor:"ns-resize",touchAction:"none"}}><div style={{width:42,height:5,borderRadius:999,background:"#B8BDC4",margin:"0 auto"}} /></div>
      <div style={{padding:"7px 16px 16px",overflowY:expanded?"auto":"visible",height:expanded?"calc(100% - 21px)":"auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:25,lineHeight:1}}>{placeCard.icon || "📍"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:18,color:"#202124"}}>{placeCard.name}</div>
            {(typeLabel || floorLabel) && <div style={{marginTop:3,fontSize:12,color:"#5F6368"}}>{[typeLabel, floorLabel].filter(Boolean).join(" · ")}</div>}
          </div>
          <button onClick={openReportForm} title="แจ้งปัญหา" aria-label="แจ้งปัญหาข้อมูลสถานที่" style={{width:32,height:32,borderRadius:"50%",border:0,background:"#F1F3F4",color:"#5F6368",cursor:"pointer",display:"grid",placeItems:"center"}}>⚑</button>
          <button onClick={()=>setPlaceCard(null)} aria-label="ปิด" style={{width:32,height:32,borderRadius:"50%",border:0,background:"#F1F3F4",color:"#5F6368",cursor:"pointer"}}>✕</button>
        </div>

        {placeCard.image && <img src={placeCard.image} alt={placeCard.name || "รูปสถานที่"} style={{width:"100%",height:expanded?190:110,objectFit:"cover",borderRadius:12,marginTop:11,display:"block"}} />}

        {expanded && <div style={{marginTop:12,borderTop:"1px solid #EEF0F2",paddingTop:12}}>
          {hasRoomDetails && <div style={{padding:"10px 12px",background:"#F8F9FA",borderRadius:12,fontSize:13,lineHeight:1.85,color:"#3C4043"}}>
            <div><b>รหัสห้อง:</b> {room.code || "-"}</div>
            <div><b>ประเภทห้อง:</b> {room.type || "-"}</div>
            <div><b>ชั้น:</b> {floorLabel || "-"}</div>
            <div><b>ความจุ:</b> {room.capacity != null ? `${room.capacity} คน` : "-"}</div>
            <div><b>อาจารย์/ผู้รับผิดชอบ:</b> {room.teacher && room.teacher !== "-" ? room.teacher : "-"}</div>
          </div>}
          {!hasRoomDetails && description && <><div style={{fontWeight:800,fontSize:13,color:"#3C4043",marginBottom:5}}>รายละเอียดสถานที่</div><div style={{fontSize:13.5,color:"#5F6368",lineHeight:1.6}}>{description}</div></>}
          {!hasRoomDetails && !description && <div style={{fontSize:13,color:"#80868B"}}>สถานที่นี้ยังไม่มีข้อมูลห้องเพิ่มเติมในระบบ</div>}
        </div>}

        <button onClick={navigateFromCard} style={{width:"100%",marginTop:13,padding:"12px 0",border:"none",borderRadius:12,background:"#1A73E8",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}><CompassIcon size={16} color="#fff" /> เส้นทางไปที่นี่</button>
        {!expanded && <div onClick={()=>setExpanded(true)} style={{textAlign:"center",fontSize:11.5,color:"#80868B",marginTop:8,cursor:"pointer"}}>ลากขึ้นเพื่อดูข้อมูลเพิ่มเติม</div>}
      </div>
    </div>
  </div>;
}
