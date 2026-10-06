"use client";

import { CAT, KMITL_ALL_NODES, TURN_EN, roadEN } from "../mapConfig";
import { bearing, haversine, pointAtDistance, turnAt, turnSide } from "../mapGeo";
import { speak, speakNow } from "../speech";

export function useNavigationActions({ 
  ctx,
  mapRef,
  setNav,
  setVoice,
  setVoiceLang,
  apiRef,
  sFrom,
  sTo,
  setRouteSheetOpen,
  setSearchOpen
 }) {
  // ---------- โหมดนำทาง GPS ----------
  function updateNav(u) {
    const c = ctx.current,
      n = c.nav;
    if (!n) return;
    const lang = c.voiceLang || "th";
    c.userMarker?.setLatLng([u[1], u[0]]);
    if (c.prevPos && c.userMarker && c.L && haversine(c.prevPos, u) > 1.5) {
      const hd = bearing(c.prevPos, u);
      c.userMarker.setIcon(c.L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;line-height:24px;text-align:center;font-size:22px;color:#1d6fb8;transform:rotate(${hd}deg)">\u25B2</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }));
    }
    c.prevPos = u;
    if (mapRef.current) mapRef.current.setView([u[1], u[0]], Math.max(mapRef.current.getZoom(), 17), {
      animate: true
    });
    let idx = 0,
      bd = Infinity;
    for (let i = 0; i < n.coords.length; i++) {
      const d = haversine(u, n.coords[i]);
      if (d < bd) {
        bd = d;
        idx = i;
      }
    }
    const distDest = Math.max(0, Math.round(n.cum[n.cum.length - 1] - n.cum[idx]));
    let k = n.steps.findIndex(st => idx <= st.wpEnd);
    if (k < 0) k = n.steps.length - 1;
    let mWp = null,
      mTurn = null,
      mName = "";
    for (let j = k + 1; j < n.steps.length; j++) {
      const wp = n.steps[j].wpStart;
      const tt = turnAt(n.coords, wp);
      if (tt && tt !== "ตรงไป") {
        mWp = wp;
        mName = n.steps[j].name || "";
        const ts = turnSide(n.coords, wp, u);
        mTurn = ts && ts !== "ตรงไป" ? ts : tt;
        break;
      }
    }
    const distTurn = mWp != null ? Math.max(0, Math.round(n.cum[mWp] - n.cum[idx])) : distDest;
    const nameEN = roadEN(mName);
    const instr = lang === "en" ? (TURN_EN[mTurn] || "continue to the destination") + (nameEN ? " onto " + nameEN : "") : (mTurn || "ตรงไปยังปลายทาง") + (mName ? ` เข้า ${mName}` : "");
    let crossAhead = null,
      cbest = Infinity;
    for (const cp of c.crossings || []) {
      if (haversine(u, cp) > 60) continue;
      let ci = 0,
        cb = Infinity;
      for (let i = 0; i < n.coords.length; i++) {
        const dd = haversine(cp, n.coords[i]);
        if (dd < cb) {
          cb = dd;
          ci = i;
        }
      }
      if (cb > 10 || ci < idx) continue;
      let nearTurn = false;
      for (const st of n.steps) {
        const wp = st.wpStart;
        if (wp <= 0 || wp >= n.coords.length - 1) continue;
        if (Math.abs(n.cum[wp] - n.cum[ci]) > 25) continue;
        const tt = turnAt(n.coords, wp);
        if (tt && tt !== "ตรงไป") {
          nearTurn = true;
          break;
        }
      }
      if (!nearTurn) continue;
      const al = Math.round(n.cum[ci] - n.cum[idx]);
      if (al >= 0 && al < cbest) {
        cbest = al;
        crossAhead = {
          dist: al,
          id: cp.join(",")
        };
      }
    }
    let hazard = null,
      hbest = Infinity,
      hid = null;
    for (const p of c.problems || []) {
      if (haversine(u, p.pt) > 80) continue;
      let pidx = 0,
        pbd = Infinity;
      for (let i = 0; i < n.coords.length; i++) {
        const dd = haversine(p.pt, n.coords[i]);
        if (dd < pbd) {
          pbd = dd;
          pidx = i;
        }
      }
      if (pbd > 28 || pidx < idx - 4) continue;
      const along = Math.round(n.cum[pidx] - n.cum[idx]);
      if (along > 90) continue;
      const near = Math.abs(along);
      if (near < hbest) {
        hbest = near;
        hazard = {
          label: CAT[p.cat]?.label || "จุดเสี่ยง",
          dist: Math.max(0, along)
        };
        hid = p.pt.join(",");
      }
    }
    let toiletAhead = null,
      tbest = Infinity;
    const userAlong = n.cum[idx];
    for (const t of n.toilets || []) {
      if (!t || t.along == null) continue;
      const ahead = t.along - userAlong;
      if (ahead < -10 || ahead > 300) continue;
      if ((t.off || 0) > 90) continue;
      const walk = Math.max(0, ahead) + (t.off || 0);
      if (walk < tbest) {
        tbest = walk;
        toiletAhead = {
          dist: Math.max(0, Math.round(ahead)),
          off: Math.round(t.off || 0),
          name: t.name || "ห้องน้ำ",
          where: [t.place, t.road].filter(Boolean).join(" · "),
          id: (t.pt || []).join(",")
        };
      }
    }
    // 🛗 จุดเปลี่ยนชั้น/ขึ้นตึกข้างหน้า (บันไดเลื่อน/ลิฟต์ ที่มี label สำรวจไว้)
    const BLDG_LOOKUP = {
      kmitl: KMITL_ALL_NODES
    };
    let transitAhead = null,
      xbest = Infinity;
    for (let i = idx; i < (n.nodeKeys || []).length; i++) {
      const key = n.nodeKeys[i];
      if (!key) continue;
      const mtc = /^IN:([^:]+):(.+)$/.exec(key);
      if (!mtc) continue;
      const [, bldg, nid] = mtc;
      const node = BLDG_LOOKUP[bldg]?.[nid];
      if (!node || !node.label) continue;
      if (!(node.type === "escalator" || node.type === "lift")) continue;
      const ahead = Math.round(n.cum[i] - n.cum[idx]);
      if (ahead < -5 || ahead > 60) continue;
      if (ahead < xbest) {
        xbest = ahead;
        transitAhead = {
          dist: Math.max(0, ahead),
          label: node.label,
          type: node.type,
          id: `${bldg}:${nid}`
        };
      }
    }
    const arrived = distDest < 20;
    setNav({
      active: true,
      instr,
      distTurn,
      distDest,
      hazard,
      arrived,
      cross: crossAhead,
      toilet: toiletAhead,
      transit: transitAhead
    });
    if (c.voiceOn) {
      const rnd = m => Math.max(10, Math.round(m / 10) * 10);
      const en = lang === "en";
      if (transitAhead && transitAhead.dist <= 30 && c.spokenTransit && !c.spokenTransit.has(transitAhead.id)) {
        c.spokenTransit.add(transitAhead.id);
        const tm = rnd(transitAhead.dist);
        speakNow(en ? `${transitAhead.label}, ${tm} meters ahead` : `${transitAhead.label} อีก ${tm} เมตรข้างหน้า`, lang);
      } else if (crossAhead && crossAhead.dist <= 35 && c.spokenCross && !c.spokenCross.has(crossAhead.id)) {
        c.spokenCross.add(crossAhead.id);
        speakNow(en ? "Prepare to cross the road, watch for traffic" : "เตรียมข้ามถนน ระวังรถ", lang);
      } else if (mWp != null && distTurn <= 55 && !c.spokenTurns.has(mWp)) {
        c.spokenTurns.add(mWp);
        const m = rnd(distTurn);
        if (distTurn <= 12) speakNow(instr, lang);else speakNow(en ? `In ${m} meters, ${TURN_EN[mTurn] || "continue"}${nameEN ? " onto " + nameEN : ""}` : `ในอีก ${m} เมตร ${instr}`, lang);
      }
      if ((mWp == null || distTurn > 90) && distDest > 40 && !c.straightSpoken) {
        c.straightSpoken = true;
        speakNow(en ? "Continue straight" : "เดินตรงไป", lang);
      }
      if (mWp != null && distTurn < 60) c.straightSpoken = false;
      if (hazard && hazard.dist < 50 && !c.spokenHaz.has(hid)) {
        c.spokenHaz.add(hid);
        speak(en ? "Caution, obstacle ahead" : `ระวัง ${hazard.label} ข้างหน้า`, lang);
      }
      if (toiletAhead && toiletAhead.dist <= 45 && c.spokenToilet && !c.spokenToilet.has(toiletAhead.id)) {
        c.spokenToilet.add(toiletAhead.id);
        const tm = rnd(toiletAhead.dist);
        speak(en ? `Toilet ${tm} meters ahead` : `ห้องน้ำอีก ${tm} เมตรข้างหน้า`, lang);
      }
      if (arrived && !c.spokenArrived) {
        c.spokenArrived = true;
        speak(en ? "You have arrived" : "ถึงปลายทางแล้ว", lang);
      }
    }
  }
  
  function onPos(pos) {
    updateNav([pos.coords.longitude, pos.coords.latitude]);
  }
  
  function onErr() {
    setNav(p => ({
      ...(p || {
        active: true
      }),
      instr: "เปิด GPS ไม่สำเร็จ — อนุญาตตำแหน่ง แล้วเปิดเว็บแบบ HTTPS บนมือถือ",
      distTurn: null,
      distDest: null,
      hazard: null
    }));
  }
  
  function startNav(i) {
    const c = ctx.current,
      L = c.L;
    const r = c.scored?.[i];
    if (!r || !L) return;
    const coords = r.coordinates;
    const cum = [0];
    for (let k = 1; k < coords.length; k++) cum[k] = cum[k - 1] + haversine(coords[k - 1], coords[k]);
    c.nav = {
      coords,
      cum,
      steps: r.steps || [],
      toilets: r.toiletsNearby || [],
      nodeKeys: r.nodeKeys || []
    };
    c.spokenTurns = new Set();
    c.spokenHaz = new Set();
    c.spokenCross = new Set();
    c.spokenToilet = new Set();
    c.spokenTransit = new Set();
    c.spokenArrived = false;
    c.prevPos = null;
    c.straightSpoken = false;
    if (!c.userMarker) c.userMarker = L.marker([coords[0][1], coords[0][0]], {
      icon: L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#1A73E8;border:3px solid #fff;box-shadow:0 1px 8px rgba(26,115,232,.65)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    }).addTo(mapRef.current);
    setNav({
      active: true,
      instr: "กำลังหาตำแหน่ง…",
      distTurn: null,
      distDest: Math.round(cum[cum.length - 1]),
      hazard: null,
      arrived: false
    });
    if (!navigator.geolocation) {
      onErr();
      return;
    }
    c.navWatch = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    });
  }
  
  function startSim(i) {
    const c = ctx.current,
      L = c.L;
    const r = c.scored?.[i];
    if (!r || !L) return;
    if (c.simTimer) {
      clearInterval(c.simTimer);
      c.simTimer = null;
    }
    const coords = r.coordinates;
    const cum = [0];
    for (let k = 1; k < coords.length; k++) cum[k] = cum[k - 1] + haversine(coords[k - 1], coords[k]);
    c.nav = {
      coords,
      cum,
      steps: r.steps || [],
      toilets: r.toiletsNearby || [],
      nodeKeys: r.nodeKeys || []
    };
    c.spokenTurns = new Set();
    c.spokenHaz = new Set();
    c.spokenCross = new Set();
    c.spokenToilet = new Set();
    c.spokenTransit = new Set();
    c.spokenArrived = false;
    c.prevPos = null;
    c.straightSpoken = false;
    if (!c.userMarker) c.userMarker = L.marker([coords[0][1], coords[0][0]], {
      icon: L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#1A73E8;border:3px solid #fff;box-shadow:0 1px 8px rgba(26,115,232,.65)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    }).addTo(mapRef.current);
    setNav({
      active: true,
      instr: "เริ่มเดิน (โหมดจำลอง)",
      distTurn: null,
      distDest: Math.round(cum[cum.length - 1]),
      hazard: null,
      arrived: false
    });
    let d = 0;
    const total = cum[cum.length - 1];
    c.simTimer = setInterval(() => {
      d += 7;
      if (d > total) d = total;
      updateNav(pointAtDistance(coords, cum, d));
      if (d >= total) {
        clearInterval(c.simTimer);
        c.simTimer = null;
      }
    }, 650);
  }
  
  function stopNav() {
    const c = ctx.current;
    if (c.navWatch != null) {
      navigator.geolocation.clearWatch(c.navWatch);
      c.navWatch = null;
    }
    if (c.simTimer) {
      clearInterval(c.simTimer);
      c.simTimer = null;
    }
    if (c.userMarker && mapRef.current) {
      mapRef.current.removeLayer(c.userMarker);
      c.userMarker = null;
    }
    c.nav = null;
    setNav(null);
  }
  
  function toggleVoice() {
    const c = ctx.current;
    c.voiceOn = !c.voiceOn;
    setVoice(c.voiceOn);
    if (!c.voiceOn && window.speechSynthesis) window.speechSynthesis.cancel();
  }
  
  function toggleVoiceLang() {
    const c = ctx.current;
    c.voiceLang = c.voiceLang === "en" ? "th" : "en";
    setVoiceLang(c.voiceLang);
  }
  
  function doSearch() {
    const f = sFrom.trim(),
      t = sTo.trim();
    setSearchOpen(false);
    setRouteSheetOpen(false);
    try {
      apiRef?.current?.showRoutes?.(f || null, t || null);
    } catch (e) {}
  }
  
  // 📚 ดึงข้อมูลสถานที่จาก Wikipedia อัตโนมัติ (ข้อความย่อ + รูปภาพ) — ลองภาษาไทยก่อน ถ้าไม่มีค่อย fallback เป็นอังกฤษ
  // ✏️ ใส่ข้อมูลสถานที่เอง — เช็คตารางนี้ก่อนเสมอ (key = ชื่อที่ขึ้นในช่องค้นหา/BUILDINGS registry) เพิ่ม entry ใหม่ตรงนี้ได้เลย
  
  // 📚 ดึงข้อมูลสถานที่ — เช็ค PLACE_INFO (ใส่เอง) ก่อนเสมอ ถ้าไม่มีค่อย fallback ไป OpenStreetMap/Nominatim (ไม่ใช้ Wikipedia แล้ว)
  
  // 🎪 เปิดการ์ดรายละเอียดกิจกรรม (ข้อมูลตามที่ฝ่ายประชาสัมพันธ์กรอกไว้)

  return { startNav, startSim, stopNav, toggleVoice, toggleVoiceLang, doSearch };
}
