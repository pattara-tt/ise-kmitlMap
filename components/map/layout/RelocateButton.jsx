"use client";

export default function RelocateButton({ view }) {
  const {
    CENTER,
    ZOOM,
    ctx,
    mapRef,
    nav,
    navTarget,
    routeData,
    routeSheetOpen
  } = view;
  return !nav?.active ? <button onClick={() => {
  const c = ctx.current,
    L = c.L,
    m = mapRef.current;
  if (!m) return;
  const goTo = (lon, lat) => {
    if (L) {
      if (!c.myLocMarker) {
        c.myLocMarker = L.marker([lat, lon], {
          icon: L.divIcon({
            className: "",
            html: '<div style="width:16px;height:16px;border-radius:50%;background:#1A73E8;border:3px solid #fff;box-shadow:0 1px 8px rgba(26,115,232,.65)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          }),
          zIndexOffset: 900
        }).bindPopup("ตำแหน่งของฉัน").addTo(m);
      } else {
        c.myLocMarker.setLatLng([lat, lon]);
      }
    }
    m.setView([lat, lon], Math.max(m.getZoom(), 17), {
      animate: true
    });
  };
  if (!navigator.geolocation) {
    const r = c.scored?.[navTarget];
    if (r && L) m.fitBounds(L.polyline(r.coordinates.map(([lo, la]) => [la, lo])).getBounds().pad(0.2));else m.setView(CENTER, ZOOM);
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    c.myLocation = [pos.coords.longitude, pos.coords.latitude];
    goTo(pos.coords.longitude, pos.coords.latitude);
  }, () => {
    if (c.myLocation) {
      goTo(c.myLocation[0], c.myLocation[1]);
      return;
    }
    const r = c.scored?.[navTarget];
    if (r && L) m.fitBounds(L.polyline(r.coordinates.map(([lo, la]) => [la, lo])).getBounds().pad(0.2));else m.setView(CENTER, ZOOM);
  }, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  });
}} className="gm-fab" style={{
  bottom: routeData ? routeSheetOpen ? "58%" : 224 : 120
}}>◎</button> : null;
}
