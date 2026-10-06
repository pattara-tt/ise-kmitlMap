// Dependency-free regression checks for the registrar's map / save interactions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registrarMarkerHtml, registrarMarkerZIndex } from '../components/building/registrarMarker.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const marker = registrarMarkerHtml({ iconHtml: 'room', iconType: 'room', size: 24, selected: true, searchHit: true });
assert.match(marker, /scimap-registrar-search-hit/);
assert.match(marker, /#DC2626/);
assert.equal(registrarMarkerZIndex('room', true, true), 2500);
assert.doesNotMatch(registrarMarkerHtml({ iconHtml: 'room', iconType: 'room', size: 24 }), /scimap-registrar-search-hit/);

const layout = read('components/building/BuildingFloorPickerLayout.jsx');
assert.match(layout, /\{String\(f\.id\)\}/, 'Floor buttons should show the floor number, not the prefixed floor label');
assert.match(layout, /onClick=\{resetToCampus\}/, 'Building X must restore the campus view');
const picker = read('components/Buildingfloorpicker.jsx');
assert.match(picker, /searchedNodeId: activeSearchNodeId/, 'Search hit must be forwarded to marker hooks');
assert.match(picker, /map\.fitBounds\(bounds/, 'Closing a building must restore campus bounds');
const manager = read('components/panels/RegistrarPanel.jsx');
assert.match(manager, /await patch\(matchedRoom\.id, changes, user\)/, 'Room edits must submit only editable fields');
assert.match(manager, /onSearchMatch\(singleSearchNodeId\)/, 'An exact table search should locate its room on the map');
assert.match(manager, /onCloseRoomPopup=\{\(\) => \{[\s\S]*?setSelected\(\{ building: null, floor: "1" \}\)/, 'Popup X should restore the initial campus view');
const collections = read('components/ui.jsx');
assert.match(collections, /scimap-collection-changed/, 'Other consumers must refresh after room/floor edits');
assert.match(read('app/globals.css'), /@keyframes scimapRegistrarSearchAura/, 'Search matches must have a red aura');
console.log('PASS: registrar floor labels, red search aura, bubble focus, room edit wiring, cross-panel reload, campus reset');