// Verify raster basemap selection and Leaflet integration without network access.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve("components/mapBaseLayer.js"), "utf8");
const standalone = src.replace('import { OVERPASS_MIRRORS } from "./mapConfig";', "const OVERPASS_MIRRORS = [];");
assert.notEqual(src, standalone, "Could not isolate the basemap for this test");
const { fullBasemapConfig, drawGoogleLikeBaseMap } = await import(`data:text/javascript;base64,${Buffer.from(standalone).toString("base64")}`);

const carto = fullBasemapConfig("key + & demo");
assert.equal(carto.provider, "carto");
assert.match(carto.url, /\/light_all\//);
assert.match(carto.url, /key=key%20%2B%20%26%20demo/);
assert.match(carto.options.attribution, /OpenStreetMap/);
assert.match(carto.options.attribution, /CARTO/);
const osm = fullBasemapConfig("");
assert.equal(osm.provider, "osm");
assert.equal(osm.url, "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
assert.doesNotMatch(src, /\/light_only_labels\//);
assert.doesNotMatch(src, /way\["highway"\]/); // no duplicate Overpass road polygons

const panes = new Map();
const added = new Set();
const events = new Map();
let capturedTile;
const map = {
  getPane: (name) => panes.get(name),
  createPane(name) { panes.set(name, { style: {} }); return panes.get(name); },
  getContainer() { return { style: {} }; },
  getZoom: () => 17,
  hasLayer: (layer) => added.has(layer),
  removeLayer: (layer) => added.delete(layer),
  on: (name, fn) => events.set(name, fn),
};
const L = {
  layerGroup() { return { addTo(m) { added.add(this); return this; } }; },
  tileLayer(url, options) {
    capturedTile = { url, options, addTo(m) { added.add(this); return this; } };
    return capturedTile;
  },
};
const layers = await drawGoogleLikeBaseMap(L, map, [13.715, 100.771, 13.742, 100.786]);
assert.equal(layers.labels, capturedTile);
assert.equal(capturedTile.options.pane, "bdiLabelPane");
assert.equal(panes.get("bdiLabelPane").style.zIndex, "250");
assert.equal(panes.get("bdiPoiPane").style.zIndex, "690");
assert.equal(typeof events.get("zoomend"), "function");
assert(added.has(layers.poiLayer));
console.log("PASS: CARTO light_all + project key, OSM fallback, attributions, Leaflet panes and POI hooks");