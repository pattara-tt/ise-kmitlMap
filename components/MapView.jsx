"use client";

import { useReportActions } from "./map/useReportActions";
import { useEventInterest } from "./map/useEventInterest";
import { useMapReferenceData } from "./map/useMapReferenceData";
import { usePlaceActions } from "./map/usePlaceActions";
import { useNavigationActions } from "./map/useNavigationActions";
import { CHIP_DEFS } from "./map/chips";
import { EVENT_PIN_ICON, fetchPlaceInfo, fmtEventTime, isEventVisible, placementToBounds } from "./map/mapViewHelpers";
import MapViewLayout from "./map/MapViewLayout";
import CompassIcon from "./map/CompassIcon";
import SearchPlaceInput from "./map/SearchPlaceInput";
import { useMapEffect05 } from "./map/hooks/useMapEffect05";
import { useMapEffect06 } from "./map/hooks/useMapEffect06";
import { useMapEffect07 } from "./map/hooks/useMapEffect07";
import { useMapEffect08 } from "./map/hooks/useMapEffect08";
import { useMapEffect12 } from "./map/hooks/useMapEffect12";
import { useMapEffect13 } from "./map/hooks/useMapEffect13";
import { useMapEffect14 } from "./map/hooks/useMapEffect14";
import { useMapEffect15 } from "./map/hooks/useMapEffect15";
import { useMapEffect16 } from "./map/hooks/useMapEffect16";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMapData } from "../lib/useMapData";
import { dayKey, monthKey, todayKey } from "../lib/datetime";
import { apiFetch } from "../lib/api";
import PlaceInput from "./PlaceInput";
import { Btn, Field, Input, Textarea, useCollection } from "./ui";
import { speak, speakNow, unlockSpeech, loadVoices, hasThaiVoice } from "./speech";
import { drawGoogleLikeBaseMap } from "./mapBaseLayer";
import {
  CENTER,
  ZOOM,
  DEMO_BBOX,
  KMITL_BOUNDS,
  KMITL_OUTLINE,
  KMITL_FLOORS as KMITL_FLOORS_STATIC,
  NODE_TYPES,
  CHIP_NODE_TYPES,
  WALKWAY_NODE_TYPES,
  getNodeType,
  KMITL_FLOOR1_NODES,
  KMITL_FLOOR1_EDGES,
  KMITL_ALL_NODES,
  KMITL_NODE_FLOOR,
  KMITL_EXTERIOR_LINKS,
  CAT,
  MAN,
  ROAD_EN,
  TURN_EN,
  catColor,
  thaiInstr,
  roadEN,
  OVERPASS_MIRRORS,
  BUILDINGS,
} from "./mapConfig";
import {
  loadLeaflet,
  haversine,
  bearing,
  turnTH,
  walkFrom,
  turnAt,
  turnSide,
  sampleLine,
  ratioNear,
  countNear,
  pointToSegM,
  nearPolyline,
  nearestOnRoute,
  buildingIndex,
  inBuilding,
  fetchOSM,
  scoreRoutes,
  popupHtml,
  fetchWalkNet,
  buildGraph,
  mergeIndoorGraph,
  routeSegments,
  SEGMENT_COLORS,
  graphRoute,
  pickRoutes,
  resolveLandmark,
  resolvePlace,
  geocodeNominatim,
  pointAtDistance,
  queuedGeocode,
  reverseGeocode,
  queuedReverse,
  suggestPlaces,
  LANDMARKS,
} from "./mapGeo";



// กิจกรรมที่ยังไม่สิ้นสุด ถึงจะขึ้นบนแผนที่


// ไอคอนในหมุดกิจกรรม — เรนเดอร์เป็นสีขาวผ่าน CSS mask ให้ตัดกับพื้นหมุด

// ไอคอนเข็มทิศจากไฟล์ SVG — ย้อมสีตามบริบทที่ใช้


export default function MapView({ apiRef, viewMode = "auto", user = null }) {
  const mapData = useMapData();
  const { events, interests, eventCard, setEventCard, myInterest, toggleInterest } = useEventInterest(user);

  // 🚩 แจ้งปัญหา/ขอแก้ไขข้อมูลสถานที่ — ส่งเป็นคำร้องให้ฝ่ายดูแลระบบพิจารณา
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState(null);
  const [reportSending, setReportSending] = useState(false);

  const { rooms, indoorSearchNodes, nodeIdByKey, effectiveFloors, buildingBounds } =
    useMapReferenceData(mapData);
  const { items: requests, create: createRequest } = useCollection("requests");
  const { items: quotaItems } = useCollection("requestQuota");
  const requestQuota = quotaItems[0] || {};
  // โควต้าคงเหลือของผู้ใช้ (นับเหมือน backend: ไม่รวมที่ยกเลิก, ตามเวลาไทย)
  const reportQuota = useMemo(() => {
    const dailyLimit = requestQuota.perUserPerDay ?? 3;
    const monthlyLimit = requestQuota.perUserPerMonth ?? 20;
    const today = todayKey();
    const month = monthKey();
    const mine = requests.filter((r) => r.userId === user?.id && r.status !== "cancelled");
    const dailyLeft = Math.max(0, dailyLimit - mine.filter((r) => dayKey(r.createdAt) === today).length);
    const monthlyLeft = Math.max(0, monthlyLimit - mine.filter((r) => monthKey(r.createdAt) === month).length);
    return { dailyLeft, monthlyLeft, dailyLimit, monthlyLimit, canSubmit: dailyLeft > 0 && monthlyLeft > 0 };
  }, [requests, requestQuota, user?.id]);


  // viewMode ถูกควบคุมจากปุ่มสลับ "มือถือ/คอม" ที่แถบบนของแอป (app/page.jsx)
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const ctx = useRef({ L: null, routeLayer: null, problems: [], osmPromise: null, select: () => {}, scored: null, voiceOn: true, voiceLang: "th", crossings: [], placeCache: {} });
  const [toilets, setToilets] = useState(null);
  const [cams, setCams] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [active, setActive] = useState(null);
  const [nav, setNav] = useState(null);
  const [voice, setVoice] = useState(true);
  const [voiceLang, setVoiceLang] = useState("th");

  const [sFrom, setSFrom] = useState("");
  const [sTo, setSTo] = useState("");
  // chips คุมเลเยอร์แผนที่ (ตัด Street light/lamp ออกแล้ว — เหลือแค่ทางเชื่อม/ห้องน้ำ)
  const [chips, setChips] = useState({ room: true, toilet: true, lift: true, stairs: true });
  const [mapZoom, setMapZoom] = useState(ZOOM);
  const [mapReady, setMapReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [placeCard, setPlaceCard] = useState(null); // { name, coord, extract, image, loading, error } — การ์ดรายละเอียดสถานที่หลังค้นหา
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);



  // 🔧 สลับโหมดแล้วต้องสั่ง Leaflet คำนวณขนาด container ใหม่เอง — ไม่งั้นแผนที่ค้างขนาดเดิม (เห็นแค่ UI overlay ขยับนิดเดียว แผนที่ไม่เต็มจอ)
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    const t1 = setTimeout(() => m.invalidateSize(), 50);   // เรียกซ้ำหลายจังหวะ กัน transition/reflow ของ CSS ยังไม่จบตอนเรียกครั้งแรก
    const t2 = setTimeout(() => m.invalidateSize(), 250);
    const t3 = setTimeout(() => m.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [viewMode]);

  // 🏢 ตึก Sc8 — ตึกเดียว (ตัดของเก่า SD/BACC/CEN/LD/BTS/SW ทั้งหมดออกแล้ว)
  const [kmitlOpen, setKmitlOpen] = useState(false);
  const kmitlOpenRef = useRef(kmitlOpen);
  useEffect(() => { kmitlOpenRef.current = kmitlOpen; }, [kmitlOpen]);
  // เครื่องมือผู้พัฒนา (คาลิเบรตผัง / ปักหมุด / ทดสอบเส้นทางในตึก) ถูกถอดออกจากหน้าผู้ใช้ทั่วไป
  // คงตัวแปรไว้เป็นค่าคงที่เพื่อให้ effect ที่อ้างถึงยังทำงานได้ตามปกติ (ปิดอยู่เสมอ)
  const kmitlCalibrate = false;
  const kmitlNodeMode = false;
  const kmitlNodes = [];
  const kmitlRouteResult = null;
  const setKmitlCalReadout = () => {};
  const setKmitlNodes = () => {};
  const setKmitlRouteResult = () => {};
  const [kmitlFloor, setKmitlFloor] = useState("1");
  const kmitlFloorRef = useRef(kmitlFloor);
  useEffect(() => { kmitlFloorRef.current = kmitlFloor; ctx.current.drawFloorOverlay?.(); }, [kmitlFloor]);

  // 📋 ดึง "รายละเอียดชั้น" ที่ฝ่ายทะเบียนกรอกไว้ (collection "floors") มาผสานกับข้อมูลชั้นแบบ static (svg, id, label)
  // — ใช้ id ชั้น + ชื่ออาคาร (BUILDINGS.kmitl.name = "Sc8") จับคู่ ถ้าไม่มีข้อมูลในระบบ จะ fallback เป็นค่า detail เดิมใน mapConfig (ปกติเป็น null)
  const { items: floorRecords } = useCollection("floors");
  const KMITL_FLOORS = useMemo(
    () =>
      KMITL_FLOORS_STATIC.map((f) => {
        const rec = floorRecords.find((r) => r.buildingId === BUILDINGS.kmitl?.id && String(r.floorNo) === String(f.id));
        return rec?.note ? { ...f, detail: rec.note, apiId: rec.id } : { ...f, apiId: rec?.id || f.apiId };
      }),
    [floorRecords, mapData.data]
  );

  // 🧭 กราฟ node/edge ของชั้นที่กำลังดูอยู่ — เพิ่มชั้นใหม่ในอนาคตแค่ต่อ ternary นี้
  const kmitlFloorNodes = kmitlFloor === "1" ? KMITL_FLOOR1_NODES : {};
  const kmitlFloorEdges = kmitlFloor === "1" ? KMITL_FLOOR1_EDGES : [];

  // 🎪 การ์ดสถานที่/กิจกรรมต้องประกาศก่อน map effects ที่เรียกใช้ callbacks เหล่านี้
  // เพื่อหลีกเลี่ยง Temporal Dead Zone (Cannot access before initialization) ใน production build
  // 🎪 เปิดการ์ดรายละเอียดกิจกรรม (ข้อมูลตามที่ฝ่ายประชาสัมพันธ์กรอกไว้)
  const { openEventCard, openPlaceCard, navigateFromCard } = usePlaceActions({
    mapRef,
    setEventCard,
    setPlaceCard,
    setSearchOpen,
    ctx,
    setSearchQuery,
    setSTo,
    setRouteFormOpen,
    setKmitlFloor,
    setKmitlOpen,
    placeCard,
    setRouteSheetOpen,
  });

  useMapEffect05({
    CENTER,
    DEMO_BBOX,
    KMITL_ALL_NODES,
    KMITL_BOUNDS,
    KMITL_FLOOR1_EDGES,
    KMITL_FLOORS,
    KMITL_NODE_FLOOR,
    KMITL_OUTLINE,
    ZOOM,
    buildGraph,
    ctx,
    drawGoogleLikeBaseMap,
    fetchOSM,
    fetchWalkNet,
    getNodeType,
    hasThaiVoice,
    haversine,
    kmitlFloorRef,
    kmitlOpenRef,
    loadLeaflet,
    loadVoices,
    mapData,
    mapEl,
    mapRef,
    mergeIndoorGraph,
    queuedReverse,
    setCams,
    setKmitlOpen,
    setMapReady,
    setMapZoom,
    setRouteFormOpen,
    setSFrom,
    setSTo,
    setSearchOpen,
    setToilets,
    setVoiceLang,
  });

  // 🎓 ป้ายชื่ออาคาร — วางกลางตึกตาม bounds ใน BUILDINGS registry พร้อมไอคอนหมวกปริญญาบอกพิกัด
  // (แทนที่ label สำเร็จรูปจาก CARTO tile ที่ถูกเอาออกไปแล้วใน mapBaseLayer.js เพราะชื่อผิด/ไม่ตรงกับชื่อจริงของอาคาร)
  useMapEffect06({ BUILDINGS, ctx, mapReady, mapRef });

  // 📍 หมุด POI ถาวรสำหรับห้อง/ห้องน้ำที่มีจุด "กลาง" (center) แยกจากหน้าประตู — โชว์บนแผนที่เสมอเหมือน POI ทั่วไป ไม่ต้องรอค้นหาก่อน
  useMapEffect07({
    KMITL_ALL_NODES,
    KMITL_NODE_FLOOR,
    ctx,
    indoorSearchNodes,
    mapReady,
    mapRef,
    nodeIdByKey,
    openPlaceCard,
    rooms,
  });

  // 🏢 วาด/ลบ overlay ผังชั้น KMITL ตาม state เปิด/ปิด และชั้นที่เลือก
  useMapEffect08({
    buildingBounds,
    ctx,
    effectiveFloors,
    kmitlCalibrate,
    kmitlFloor,
    kmitlOpen,
    mapRef,
    mapZoom,
    placementToBounds,
  });

  // เก็บ flag ล่าสุดไว้ใน ctx เพื่อให้ map click handler (ผูกครั้งเดียวตอน mount) อ่านค่าปัจจุบันได้เสมอ
  useEffect(() => { ctx.current.navActive = !!nav?.active; }, [nav]);
  useEffect(() => { ctx.current.kmitlCalibrateActive = kmitlCalibrate; }, [kmitlCalibrate]);
  useEffect(() => { ctx.current.kmitlNodeModeActive = kmitlNodeMode; }, [kmitlNodeMode]);

  // 🔧 โหมดปรับเทียบ — ลากมุม NW/SE ของภาพให้ตรงกับตึกจริงบนแผนที่ฐาน แล้วอ่านค่าพิกัดที่ถูกต้องออกมา
  useMapEffect12({
    buildingBounds,
    ctx,
    effectiveFloors,
    kmitlCalibrate,
    kmitlFloor,
    kmitlOpen,
    mapRef,
    placementToBounds,
    setKmitlCalReadout,
  });

  // 📍 โหมดปักหมุด node บนผังตึก — วาด marker ตามประเภท ลากปรับตำแหน่งได้ คลิกขวาลบ
  useMapEffect13({
    ctx,
    getNodeType,
    kmitlFloor,
    kmitlNodes,
    kmitlOpen,
    mapRef,
    setKmitlNodes,
  });

  // 🧭 วาดกราฟชั้นที่สำรวจจริง + ผลลัพธ์เส้นทางที่หาได้จาก indoorFloorRoute
  useMapEffect14({
    CHIP_NODE_TYPES,
    NODE_TYPES,
    WALKWAY_NODE_TYPES,
    chips,
    ctx,
    indoorSearchNodes,
    kmitlFloor,
    kmitlFloorNodes,
    kmitlOpen,
    kmitlRouteResult,
    mapRef,
    openPlaceCard,
    setKmitlRouteResult,
  });

  // 🎪 หมุดกิจกรรม — กิจกรรมที่ผู้ใช้กดสนใจจะเป็นหมุดแดงเด่น แสดงตลอดไม่ว่าจะซูมระดับไหน
  useMapEffect15({
    EVENT_PIN_ICON,
    ctx,
    events,
    interests,
    mapReady,
    mapRef,
    openEventCard,
    user,
  });


  useMapEffect16({
    DEMO_BBOX,
    KMITL_ALL_NODES,
    KMITL_EXTERIOR_LINKS,
    KMITL_NODE_FLOOR,
    apiRef,
    buildingIndex,
    ctx,
    fetchOSM,
    geocodeNominatim,
    graphRoute,
    haversine,
    kmitlFloorRef,
    mapRef,
    pickRoutes,
    queuedReverse,
    resolvePlace,
    routeSegments,
    scoreRoutes,
    setActive,
    setKmitlFloor,
    setKmitlOpen,
    setRouteData,
  });

  // ---------- โหมดนำทาง GPS ----------
  const { startNav, startSim, stopNav, toggleVoice, toggleVoiceLang, doSearch } = useNavigationActions({
    ctx,
    mapRef,
    setNav,
    setVoice,
    setVoiceLang,
    apiRef,
    sFrom,
    sTo,
    setRouteSheetOpen,
    setSearchOpen,
  });

  // 📚 ดึงข้อมูลสถานที่จาก Wikipedia อัตโนมัติ (ข้อความย่อ + รูปภาพ) — ลองภาษาไทยก่อน ถ้าไม่มีค่อย fallback เป็นอังกฤษ
  // ✏️ ใส่ข้อมูลสถานที่เอง — เช็คตารางนี้ก่อนเสมอ (key = ชื่อที่ขึ้นในช่องค้นหา/BUILDINGS registry) เพิ่ม entry ใหม่ตรงนี้ได้เลย

  // 📚 ดึงข้อมูลสถานที่ — เช็ค PLACE_INFO (ใส่เอง) ก่อนเสมอ ถ้าไม่มีค่อย fallback ไป OpenStreetMap/Nominatim (ไม่ใช้ Wikipedia แล้ว)

  // เปิดฟอร์มแจ้งปัญหาของสถานที่ที่กำลังเปิดการ์ดอยู่
  const { openReportForm, submitReport } = useReportActions({
    nodeIdByKey,
    placeCard,
    rooms,
    setReportForm,
    setReportOpen,
    createRequest,
    reportForm,
    requestQuota,
    requests,
    setReportSending,
    user,
  });


  // เปิด/ปิดเลเยอร์บนแผนที่ตาม chip (ทางเชื่อม/skywalk, ห้องน้ำ) — ตัด Street light chip ออกแล้ว
  function toggleChip(k) {
    setChips((p) => ({ ...p, [k]: !p[k] }));
  }
  const navTarget = active ?? (routeData && !routeData.error && !routeData.loading ? routeData.best : null);

  if (mapData.loading) return <div style={{ padding: 24, color: "#5F6368" }}>กำลังโหลดข้อมูลแผนที่…</div>;
  if (mapData.error) return <div style={{ padding: 24, color: "#D93025" }}>โหลดข้อมูลแผนที่ไม่สำเร็จ: {mapData.error.message}</div>;

  const view = {
    Btn,
    CENTER,
    CHIP_DEFS,
    CompassIcon,
    EVENT_PIN_ICON,
    Field,
    Input,
    KMITL_FLOORS,
    KMITL_NODE_FLOOR,
    PlaceInput,
    SearchPlaceInput,
    Textarea,
    ZOOM,
    active,
    chips,
    ctx,
    doSearch,
    effectiveFloors,
    eventCard,
    events,
    fmtEventTime,
    indoorSearchNodes,
    kmitlFloor,
    kmitlOpen,
    mapEl,
    mapRef,
    myInterest,
    nav,
    navTarget,
    navigateFromCard,
    openEventCard,
    openPlaceCard,
    openReportForm,
    placeCard,
    reportForm,
    reportOpen,
    reportQuota,
    reportSending,
    resolveLandmark,
    rooms,
    routeData,
    routeFormOpen,
    routeSheetOpen,
    sFrom,
    sTo,
    searchOpen,
    searchQuery,
    setEventCard,
    setKmitlFloor,
    setKmitlOpen,
    setPlaceCard,
    setReportForm,
    setReportOpen,
    setRouteData,
    setRouteFormOpen,
    setRouteSheetOpen,
    setSFrom,
    setSTo,
    setSearchOpen,
    setSearchQuery,
    startNav,
    startSim,
    stopNav,
    submitReport,
    toggleChip,
    toggleInterest,
    toggleVoice,
    toggleVoiceLang,
    viewMode,
    voice,
    voiceLang,
  };
  return <MapViewLayout view={view} />;
}