"use client";

import { useEffect } from "react";

export function useMapEffect15({ 
  EVENT_PIN_ICON,
  ctx,
  events,
  interests,
  mapReady,
  mapRef,
  openEventCard,
  user
 }) {
  useEffect(() => {
    const c = ctx.current, L = c.L, m = mapRef.current;
    if (!L || !m) return;
    (c.eventMarkers || []).forEach((mk) => m.removeLayer(mk));
    c.eventMarkers = [];
  
    for (const ev of events) {
      if (!Number.isFinite(Number(ev.lat)) || !Number.isFinite(Number(ev.lon))) continue;
      const on = !!interests.find((i) => i.eventId === ev.id && i.userId === user?.id);
      const color = on ? "#D93025" : "#1A73E8";
      const size = on ? 42 : 34;
      const html = `
        <div style="position:relative;display:grid;place-items:center;width:${size}px;height:${size}px">
          ${on ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:.22"></span>` : ""}
          <span style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 6px;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);display:grid;place-items:center">
            <span style="transform:rotate(45deg);width:${on ? 19 : 16}px;height:${on ? 19 : 16}px;background:#fff;-webkit-mask:url('${EVENT_PIN_ICON}') center/contain no-repeat;mask:url('${EVENT_PIN_ICON}') center/contain no-repeat"></span>
          </span>
        </div>`;
      const mk = L.marker([Number(ev.lat), Number(ev.lon)], {
        icon: L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        zIndexOffset: on ? 3000 : 2200,
        title: ev.name,
      }).addTo(m);
      mk.on("click", () => openEventCard(ev));
      c.eventMarkers.push(mk);
    }
    return () => { (c.eventMarkers || []).forEach((mk) => { if (m.hasLayer(mk)) m.removeLayer(mk); }); c.eventMarkers = []; };
  }, [events, interests, mapReady, user?.id]);
}
