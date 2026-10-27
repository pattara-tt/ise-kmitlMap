"use client";

import { useEffect, useRef, useState } from "react";

export default function PlaceCardPanel({ view }) {
  const { CompassIcon, navigateFromCard, openReportForm, placeCard, setPlaceCard,
    rooms = [], nodeIdByKey = {}, floorRecords = [], showBuildingFloorplan } = view;
  const [expanded, setExpanded] = useState(false);
  const [naturalH, setNaturalH] = useState(0); // ความสูงจริงของส่วนรายละเอียด (px)
  const [dragH, setDragH] = useState(null); // ความสูงส่วนรายละเอียดระหว่างลาก; null = ไม่ได้ลาก
  const drag = useRef(null);
  const detailsRef = useRef(null);
  const hasCard = Boolean(placeCard);

  useEffect(() => { setExpanded(false); setDragH(null); }, [placeCard?.name, placeCard?.nodeId]);

  // วัดความสูงจริงของรายละเอียด — กรอบจะยืดตามเนื้อหา ไม่ใช่ขนาดตายตัว
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return undefined;
    const measure = () => setNaturalH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasCard]);

  if (!placeCard) return null;

  // placeCard.nodeId is a map nodeKey, while rooms.nodeId is the DB nodes.id FK.
  const internalNodeId = nodeIdByKey[placeCard.nodeId] || placeCard.nodeId;
  const room = rooms.find(r => r.nodeId === internalNodeId || r.id === placeCard.roomId);
  const floorRow = room ? floorRecords.find(f => f.id === room.floorId) : null;
  const floorLabel = floorRow?.name || (floorRow?.floorNo != null ? `ชั้น ${floorRow.floorNo}` : null);
  const typeLabel = room?.type || null;
  const displayName = room?.name || placeCard.name;
  const hasRoomDetails = !!room;
  // extract from indoor nodes is only a search label (e.g. "ห้องเรียน · ชั้น 1"), not a place description.
  const description = placeCard.description || (!placeCard.nodeId ? placeCard.extract : null);

  const detailsH = dragH ?? (expanded ? naturalH : 0);

  // ลากหัวการ์ด: ความสูงตามนิ้ว/เมาส์แบบ real-time พอปล่อยค่อยเลือกกางหรือพับ (แตะ = สลับ)
  const gripDown = (e) => {
    if (e.target.closest("button")) return;
    drag.current = { y: e.clientY, base: expanded ? naturalH : 0, moved: false, t: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const gripMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 6) d.moved = true;
    if (d.moved) setDragH(Math.max(0, Math.min(naturalH, d.base - dy)));
  };
  const gripUp = (e) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const dy = e.clientY - d.y;
    const speed = dy / Math.max(1, performance.now() - d.t); // px/ms ค่าลบ = ปัดขึ้น
    const finalH = Math.max(0, Math.min(naturalH, d.base - dy));
    setDragH(null);
    if (!d.moved) { setExpanded(v => !v); return; }
    if (speed < -0.4) setExpanded(true);
    else if (speed > 0.4) setExpanded(false);
    else setExpanded(finalH > naturalH / 2);
  };

  return <div style={{position:"absolute",left:0,right:0,bottom:0,zIndex:2100,padding:"0 10px calc(10px + env(safe-area-inset-bottom))",pointerEvents:"none"}}>
    <div style={{width:"min(520px, 100%)",margin:"0 auto",background:"#fff",borderRadius:"20px 20px 14px 14px",overflow:"hidden",boxShadow:"0 -4px 24px rgba(32,33,36,.28)",pointerEvents:"auto",display:"flex",flexDirection:"column",maxHeight:"min(72vh, 610px)"}}>

      {/* โซนลาก: แถบจับ + แถวชื่อสถานที่ (ปุ่มธง/ปิดยังกดได้ปกติ) */}
      <div role="button" tabIndex={0} aria-expanded={expanded} aria-label="ลากขึ้นหรือลงเพื่อดูข้อมูลเพิ่มเติม"
        onPointerDown={gripDown} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={()=>{drag.current=null;setDragH(null);}}
        onKeyDown={e=>{ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(v=>!v); } }}
        style={{flex:"none",padding:"10px 16px 0",cursor:"grab",touchAction:"none",userSelect:"none",outline:"none"}}>
        <div style={{padding:"0 0 8px"}}><div style={{width:42,height:5,borderRadius:999,background:"#B8BDC4",margin:"0 auto"}} /></div>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          {placeCard.kind !== "building" && (
            placeCard.iconHtml ? (
              <span aria-hidden="true" style={{width:26,height:26,display:"inline-flex",alignItems:"center",justifyContent:"center",flex:"none"}}
                dangerouslySetInnerHTML={{__html:placeCard.iconHtml}} />
            ) : (
              <span aria-hidden="true" style={{ fontSize: 25, lineHeight: 1 }}>
                {placeCard.icon || "📍"}
              </span>
            )
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:18,color:"#202124"}}>{displayName}</div>
            {!expanded && (typeLabel || floorLabel) && <div style={{marginTop:3,fontSize:12,color:"#5F6368"}}>{[typeLabel, floorLabel].filter(Boolean).join(" · ")}</div>}
          </div>
          <button className="round-btn tip" data-tip="แจ้งปัญหาข้อมูลสถานที่" onClick={openReportForm} aria-label="แจ้งปัญหาข้อมูลสถานที่">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 21V4m0 0h11l-2.5 4L17 12H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="round-btn" onClick={()=>setPlaceCard(null)} aria-label="ปิด" title="ปิด">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      <div style={{flex:"0 1 auto",minHeight:0,overflowY:"auto",padding:"0 16px 16px"}}>
        {placeCard.image && <img src={placeCard.image} alt={displayName || "รูปสถานที่"} style={{width:"100%",height:expanded?190:110,objectFit:"cover",borderRadius:12,marginTop:11,display:"block",transition:"height .22s ease"}} />}

        {/* ส่วนรายละเอียด: สูงเท่าเนื้อหาจริงเมื่อกางเต็ม (ไม่มีพื้นที่ว่างเกิน) */}
        <div aria-hidden={detailsH === 0} style={{height:detailsH,overflow:"hidden",transition:dragH == null ? "height .22s ease" : "none"}}>
          <div ref={detailsRef} style={{paddingTop:12}}>
            <div style={{borderTop:"1px solid #EEF0F2",paddingTop:12}}>
              {hasRoomDetails && <div style={{padding:"10px 12px",background:"#F8F9FA",borderRadius:12,fontSize:13,lineHeight:1.85,color:"#3C4043"}}>
                <div><b>รหัสห้อง:</b> {room.code || "-"}</div>
                <div><b>ประเภทห้อง:</b> {room.type || "-"}</div>
                <div><b>ชั้น:</b> {floorLabel || "-"}</div>
                <div><b>ความจุ:</b> {room.capacity != null ? `${room.capacity} คน` : "-"}</div>
                <div><b>อาจารย์/ผู้รับผิดชอบ:</b> {room.teacher && room.teacher !== "-" ? room.teacher : "-"}</div>
              </div>}
              {!hasRoomDetails && description && <><div style={{fontWeight:800,fontSize:13,color:"#3C4043",marginBottom:5}}>รายละเอียดสถานที่</div><div style={{fontSize:13.5,color:"#5F6368",lineHeight:1.6}}>{description}</div></>}
              {!hasRoomDetails && !description && placeCard.kind !== "building" && <div style={{fontSize:13,color:"#80868B"}}>สถานที่นี้ยังไม่มีข้อมูลห้องเพิ่มเติมในระบบ</div>}
            </div>
          </div>
        </div>

        {placeCard.kind === "building" && <button onClick={showBuildingFloorplan} className="sm-b-primary" style={{width:"100%",marginTop:13,padding:"12px 0",border:"none",borderRadius:12,background:"#1A73E8",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-3px",marginRight:6}}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2"/></svg>แสดงรายละเอียดผังตึก</button>}
        <button onClick={navigateFromCard} className="sm-b-primary" style={{width:"100%",marginTop:placeCard.kind === "building" ? 8 : 13,padding:"12px 0",border:"none",borderRadius:12,background:placeCard.kind === "building" ? "#F1F5F9" : "#1A73E8",color:placeCard.kind === "building" ? "#334155" : "#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}><CompassIcon size={16} color={placeCard.kind === "building" ? "#334155" : "#fff"} /> เส้นทางไปที่นี่</button>
        {!expanded && <div onClick={()=>setExpanded(true)} style={{textAlign:"center",fontSize:11.5,color:"#80868B",marginTop:8,cursor:"pointer"}}>ลากขึ้นเพื่อดูข้อมูลเพิ่มเติม</div>}
      </div>
    </div>
  </div>;
}