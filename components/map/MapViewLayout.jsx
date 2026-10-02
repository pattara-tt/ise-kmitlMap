"use client";

import NavigationPanel from "./layout/NavigationPanel";
import SearchPanel from "./layout/SearchPanel";
import PlaceCardPanel from "./layout/PlaceCardPanel";
import ReportPanel from "./layout/ReportPanel";
import EventCardPanel from "./layout/EventCardPanel";
import ChipsPanel from "./layout/ChipsPanel";
import RouteSheetPanel from "./layout/RouteSheetPanel";
import BuildingPanel from "./layout/BuildingPanel";
import RelocateButton from "./layout/RelocateButton";

export default function MapViewLayout({ view }) {
  const { mapEl, viewMode } = view;
  return <div className={"bdi-mapwrap " + (viewMode === "desktop" ? "force-desktop" : viewMode === "mobile" ? "force-mobile" : "auto")} style={{
  position: "relative",
  height: "100%",
  width: "100%"
}}>
      <style>{`
        .bdi-mapwrap{
          --gm-blue:#1A73E8;--gm-blue-dark:#1967D2;--gm-blue-soft:#E8F0FE;
          --gm-green:#188038;--gm-red:#D93025;--gm-yellow:#F9AB00;
          --gm-text:#202124;--gm-muted:#5F6368;--gm-line:#DADCE0;--gm-bg:#F8F9FA;
          --bdi-surface:#FFFFFF;--bdi-surface-2:#F8F9FA;--bdi-text:#202124;--bdi-text-dim:#5F6368;
          --bdi-line:#DADCE0;--bdi-green:#1A73E8;--bdi-danger:#D93025;
          font-family:Roboto,Arial,"Noto Sans Thai",sans-serif;background:#FFFFFF;color:var(--gm-text);
          -webkit-font-smoothing:antialiased;
        }
        .bdi-mapwrap *{box-sizing:border-box}
        .bdi-mapwrap button,.bdi-mapwrap input{font:inherit}
        .bdi-mapwrap .leaflet-control-zoom{border:0!important;box-shadow:0 1px 6px rgba(60,64,67,.30)!important;border-radius:8px!important;overflow:hidden;margin-right:12px!important;margin-bottom:140px!important}
        .bdi-mapwrap .leaflet-control-zoom a{width:40px!important;height:40px!important;line-height:40px!important;color:#3C4043!important;background:#fff!important;border-color:#E8EAED!important;font-size:22px!important;font-weight:400!important}
        .bdi-mapwrap .leaflet-control-zoom a:hover{background:#F8F9FA!important}
        .bdi-mapwrap .leaflet-control-attribution{background:rgba(255,255,255,.9)!important;color:#5F6368!important;font-size:10px!important}
        .bdi-mapwrap .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 3px 14px rgba(60,64,67,.30);color:#202124;padding:3px}
        .bdi-mapwrap .leaflet-popup-content{margin:12px 14px;line-height:1.45}
        .bdi-mapwrap .leaflet-popup-tip{box-shadow:2px 2px 4px rgba(60,64,67,.12)}
        .wb-card,.bdi-card{background:#fff;border:0;color:var(--gm-text);box-shadow:0 2px 8px rgba(60,64,67,.28);font-family:inherit}
        .wb-card{position:absolute;z-index:1000}
        .wb-search{left:12px;right:12px;top:calc(54px + env(safe-area-inset-top));padding:0;z-index:2000;border-radius:12px;overflow:visible}
        .gm-search-collapsed{height:52px;display:flex!important;align-items:center;gap:13px;padding:0 16px;cursor:pointer;border-radius:12px;background:#fff;min-width:0}
        .gm-menu{width:22px;height:22px;display:grid;place-items:center;color:#5F6368;font-size:20px}
        .gm-search-text{flex:1;min-width:0;font-size:16px;color:#3C4043;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .gm-avatar{width:30px;height:30px;border-radius:50%;background:#1A73E8;color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px}
        .gm-search-open{padding:12px;border-radius:12px;background:#fff}
        .gm-search-head{display:flex;align-items:center;gap:9px;margin-bottom:9px}
        .gm-back{width:36px;height:36px;border:0;background:transparent;border-radius:50%;cursor:pointer;color:#5F6368;font-size:21px}
        .gm-back:hover{background:#F1F3F4}
        .gm-route-inputs{position:relative;display:flex;flex-direction:column;gap:8px;padding-left:32px}
        .gm-route-inputs:before{content:"";position:absolute;left:14px;top:18px;bottom:18px;border-left:2px dotted #9AA0A6}
        .gm-origin-dot,.gm-dest-pin{position:absolute;left:8px;z-index:2;background:#fff}
        .gm-origin-dot{top:14px;width:12px;height:12px;border:3px solid #5F6368;border-radius:50%}
        .gm-dest-pin{bottom:13px;width:12px;height:12px;background:#D93025;border-radius:50% 50% 50% 0;transform:rotate(-45deg)}
        .gm-search-action{width:100%;margin-top:10px;height:42px;border-radius:21px}
        .wb-nav{top:0;left:0;right:0;border-radius:0 0 16px 16px;background:#1A73E8;color:#fff;padding:calc(32px + env(safe-area-inset-top)) 16px 14px;z-index:1700;border:none;box-shadow:0 3px 12px rgba(26,115,232,.35)}
        .wb-startbtn{display:block;width:100%;margin-top:8px;padding:12px;border:none;border-radius:22px;background:#1A73E8;color:#fff;font-weight:600;font-size:14px;cursor:pointer;box-shadow:none;transition:background .15s ease}
        .wb-startbtn:hover,.bdi-btn:hover{background:#1967D2}
        .bdi-btn{border:0;border-radius:20px;background:#1A73E8;color:#fff;padding:10px 18px;font-weight:600;cursor:pointer;transition:background .15s ease}
        .bdi-btn.ghost{background:#E8F0FE!important;color:#1967D2!important}
        .bdi-chips{position:absolute;left:12px;right:8px;z-index:1250;display:flex;gap:8px;overflow-x:auto;padding:2px 4px 8px 0;scrollbar-width:none}
        .bdi-chips::-webkit-scrollbar{display:none}
        .bdi-chip{height:36px;white-space:nowrap;border:1px solid #DADCE0;border-radius:18px;background:#fff;color:#3C4043;padding:0 14px;font-size:13px;font-weight:500;box-shadow:0 1px 3px rgba(60,64,67,.20);cursor:pointer;display:flex;align-items:center;gap:6px}
        .bdi-chip:hover{background:#F8F9FA}
        .bdi-chip.on{background:#E8F0FE;border-color:#AECBFA;color:#1967D2}
        .gm-bottom-stack{position:absolute;left:0!important;right:0!important;bottom:0!important;z-index:1300!important;gap:0!important}
        .gm-route-sheet{max-height:44vh!important;border-radius:18px 18px 0 0!important;padding:0 16px calc(12px + env(safe-area-inset-bottom))!important;overflow:auto!important;box-shadow:0 -2px 12px rgba(60,64,67,.22)!important;background:linear-gradient(135deg,#dbeafe 0%,#e0e7ff 52%,#ede9fe 100%)!important}
        .bdi-sheet-handle{display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-radius:18px 18px 0 0;min-height:54px;font-weight:600}
        .bdi-sheet-handle:before{content:"";position:absolute;top:7px;left:50%;transform:translateX(-50%);width:36px;height:4px;border-radius:2px;background:#DADCE0}
        .bdi-route-opt{width:100%;box-sizing:border-box;text-align:left;background:#fff;border:0;cursor:pointer;border-top:1px solid #ECEFF1;border-radius:0;padding:14px 2px;margin:0;color:#202124;cursor:pointer}
        .bdi-route-opt:first-of-type{border-top:0}
        .bdi-route-opt.on{background:#F8FBFF;box-shadow:inset 4px 0 0 #1A73E8;padding-left:12px}
        .bdi-badge{display:inline-flex;align-items:center;border-radius:4px;background:#E8F0FE;color:#1967D2;padding:3px 7px;font-size:11px;font-weight:600}
        .bdi-stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;color:#5F6368;font-size:12px}
        .bdi-cross-ic{width:12px;height:12px;border-radius:50%;background:#1A73E8;border:2px solid #fff;box-shadow:0 1px 4px rgba(60,64,67,.35)}
        .bdi-poi-icon{width:12px;height:12px;display:block;line-height:0;user-select:none;filter:drop-shadow(0 1px 2px rgba(255,255,255,.95)) drop-shadow(0 1px 1px rgba(0,0,0,.22))}.bdi-poi-icon svg{display:block;width:12px;height:12px}
        .bdi-lift,.bdi-wc,.bdi-esc{background:#fff;color:#1A73E8;border:1px solid #AECBFA;box-shadow:0 1px 4px rgba(60,64,67,.25)}
        .bdi-lift{width:17px;height:17px;border-radius:4px;display:grid;place-items:center;font-size:12px;font-weight:800}
        .bdi-wc{padding:1px 3px;border-radius:4px;font-size:9px;font-weight:800}
        .bdi-esc{width:14px;height:16px;border-radius:3px;position:relative}
        .gm-fab{position:absolute;right:12px;z-index:1200;width:48px;height:48px;border-radius:50%;border:0;background:#fff;color:#1A73E8;font-size:22px;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 8px rgba(60,64,67,.3)}
        .gm-fab:hover{background:#F8F9FA}
        input:focus{border-color:#1A73E8!important;box-shadow:0 0 0 1px #1A73E8!important;outline:none!important}
        @media(min-width:760px){
          .bdi-mapwrap.auto .wb-search{right:auto;width:392px}
          .bdi-mapwrap.auto .bdi-chips{right:auto;width:620px}
          .bdi-mapwrap.auto .gm-bottom-stack{left:12px!important;right:auto!important;bottom:12px!important;width:420px}
          .bdi-mapwrap.auto .gm-route-sheet{border-radius:18px!important;max-height:52vh!important}
        }
        /* 🖥️/📱 บังคับ layout ผ่านปุ่มมุมขวาบน — ไม่รอขนาดจอจริงแล้ว (ใช้แทน @media ด้านบนตอนกดเลือกโหมดเอง) */
        .bdi-mapwrap.force-desktop .wb-search{right:auto;width:392px}
        .bdi-mapwrap.force-desktop .bdi-chips{right:auto;width:620px}
        .bdi-mapwrap.force-desktop .gm-bottom-stack{left:12px!important;right:auto!important;bottom:12px!important;width:420px}
        .bdi-mapwrap.force-desktop .gm-route-sheet{border-radius:18px!important;max-height:52vh!important}
      `}</style>


      <div ref={mapEl} style={{
    height: "100%",
    width: "100%"
  }} />

      <NavigationPanel view={view} />

      {/* ค้นหาสถานที่ปกติก่อน — หลังเลือกสถานที่จึงค่อยเปิดฟอร์มต้นทาง/ปลายทางเดิม */}
      <SearchPanel view={view} />

      {/* ข้อมูลสถานที่แบบ bottom sheet — แผนที่ยังมองเห็นตรงกลาง และ node ถูกจัดให้อยู่กลางพื้นที่แผนที่ */}
      <PlaceCardPanel view={view} />

      {/* 🚩 ฟอร์มแจ้งปัญหา / ขอแก้ไขข้อมูลสถานที่ → ส่งเป็นคำร้องให้ฝ่ายดูแลระบบ */}
      <ReportPanel view={view} />

      {/* 🎪 การ์ดรายละเอียดกิจกรรม — ข้อมูลตามที่ฝ่ายประชาสัมพันธ์กรอกไว้ + ปุ่มกดสนใจ */}
      <EventCardPanel view={view} />

      {/* Chips เปิด/ปิดเลเยอร์ (ทางเชื่อม/Skywalk, ห้องน้ำ) */}
      <ChipsPanel view={view} />

      {/* แผงล่าง: ชีตรายละเอียดเส้นทาง (พับได้ ดีฟอลต์พับ) — ตัดการ์ดสไลเดอร์เวลาออกแล้ว (นำทางปกติ ไม่มีกลางวัน/กลางคืน) */}
      <RouteSheetPanel view={view} />

      {/* 🏢 แผงผังตึก Sc8 — เปิดเมื่อกดบริเวณ SVG ของอาคาร มีแถบเลือกชั้นด้านข้าง */}
      <BuildingPanel view={view} />

      {/* ปุ่ม relocate — กลับไปที่ตำแหน่งจริงของผู้ใช้ */}
      <RelocateButton view={view} />

    </div>;
}
