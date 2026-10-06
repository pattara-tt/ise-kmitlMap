export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function makeProjection(zoom) {
  const scale = 256 * Math.pow(2, zoom);
  const project = ([lat, lon]) => {
    const x = (lon + 180) / 360 * scale;
    const sinLat = Math.sin(clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180);
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    return [x, y];
  };
  const unproject = ([x, y]) => {
    const lon = x / scale * 360 - 180;
    const n = Math.PI - 2 * Math.PI * y / scale;
    const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
    return [lat, lon];
  };
  const metersPerPixel = lat => 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
  return {
    project,
    unproject,
    metersPerPixel
  };
}
