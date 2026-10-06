// Presentation shared by the registrar's marker creation and marker refresh.
// The search state takes priority over the ordinary selected-room state.
export function registrarMarkerHtml({ iconHtml, iconType, size, selected = false, searchHit = false }) {
  const isTile = iconType === "room" || iconType === "toilet";
  const background = searchHit ? "#FFF1F2" : selected ? "#E8F0FE" : isTile ? "rgba(255,255,255,.94)" : "transparent";
  const radius = isTile || selected || searchHit ? "6px" : "50%";
  const shadow = searchHit
    ? "0 0 0 3px #DC2626, 0 0 0 9px rgba(239,68,68,.36), 0 0 24px 11px rgba(239,68,68,.5)"
    : selected ? "0 0 0 2px #1A73E8, 0 1px 5px rgba(0,0,0,.3)"
    : isTile ? "0 1px 4px rgba(0,0,0,.25)" : "none";
  return `<div class="${searchHit ? "scimap-registrar-search-hit" : ""}" style="
    width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;background:${background};border-radius:${radius};box-shadow:${shadow};
  ">${iconHtml}</div>`;
}

export function registrarMarkerZIndex(iconType, selected = false, searchHit = false) {
  return searchHit ? 2500 : selected ? 1200 : iconType === "room" || iconType === "toilet" ? 900 : 750;
}