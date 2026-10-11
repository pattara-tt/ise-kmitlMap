// Registrar-managed room icon; map position continues to be owned by GIS.
// Never interpolate an unescaped user-supplied value into Leaflet HTML.
const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function safeImageSource(value) {
  const v = String(value || "");
  if (/^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(v)) return v;
  if (/^\/data\/icon\/[a-zA-Z0-9_-]+\.svg$/.test(v)) return v;
  return null;
}

export function resolveRoomNodeIcon(room, roomTypes, fallback) {
  if (!room) return fallback;
  const chosen = (roomTypes || []).find((t) =>
    String(t.name || "").trim().toLocaleLowerCase() === String(room.type || "").trim().toLocaleLowerCase()
  );
  // A room without a registered category/icon must never inherit the GIS/default door icon.
  if (!chosen?.icon) return {
    type: "room",
    html: `<span aria-label="ไม่พบประเภทห้อง" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;font-size:20px;font-weight:800;line-height:1;color:#B3261E">?</span>`
  };
  const src = safeImageSource(chosen.icon);
  return {
    type: "room",
    html: src
      ? `<img src="${escapeHtml(src)}" alt="" style="width:22px;height:22px;object-fit:contain;display:block"/>`
      : `<span aria-hidden="true" style="font-size:21px;line-height:1">${escapeHtml(chosen.icon)}</span>`
  };
}