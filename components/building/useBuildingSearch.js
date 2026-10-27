"use client";

import { useMemo } from "react";
import { normalize, getNodeIcon, getNodeTypeLabel } from "./nodePresentation";
import { logSearch } from "../../lib/searchLog";

export function useBuildingSearch({
  search, allRooms, floorRecords, b, buildingRegistry, nodesByKey,
  nodeKeyById, floorNodes, roomByNode, setSearchOpen, ctx,
  setOpenKey, setCurFloor, onChangeRef, fitBuilding,
  onSelectRoomRef, setSearchedNodeId,
}) {
  const buildingById = useMemo(() => new Map(
    Object.values(buildingRegistry).map((entry) => [String(entry.id), entry])
  ), [buildingRegistry]);

  const searchResults = useMemo(() => {
    const query = normalize(search);
    if (!query) return [];
    const result = [];

    for (const [key, entry] of Object.entries(buildingRegistry)) {
      if (normalize([entry.name, entry.code].filter(Boolean).join(" ")).includes(query)) {
        result.push({ kind: "building", key, name: entry.name, icon: "🏢" });
      }
    }

    for (const room of allRooms || []) {
      const floor = (floorRecords || []).find((row) => row.id === room.floorId);
      const roomBuilding = floor && buildingById.get(String(floor.buildingId));
      if (!roomBuilding) continue;
      const text = normalize([
        room.code, room.name, room.type, room.teacher,
        floor.floorNo, roomBuilding.name, roomBuilding.code,
      ].filter((value) => value != null && value !== "").join(" "));
      if (!text.includes(query)) continue;

      const nodeKey = nodeKeyById[room.nodeId] || room.nodeId;
      const node = String(roomBuilding.id) === String(b?.id)
        ? nodesByKey[nodeKey] : null;
      result.push({
        kind: "room", room, node,
        buildingId: roomBuilding.id,
        buildingName: roomBuilding.name,
        floorNo: floor.floorNo,
        name: room.name || ("ห้อง " + (room.code || "")),
        icon: "🚪",
      });
    }

    for (const [id, node] of Object.entries(floorNodes)) {
      const text = normalize([id, node.type, node.label].filter(Boolean).join(" "));
      if (!text.includes(query) || roomByNode[id] || node.__routeConnector) continue;
      const icon = getNodeIcon(node);
      result.push({
        kind: "node", id, node,
        name: node.label || getNodeTypeLabel(node),
        icon: icon.type === "toilet" ? "🚻"
          : icon.type === "lift" ? "🛗"
          : icon.type === "stairs" ? "🪜"
          : icon.type === "exit" ? "🚪" : "📍",
      });
    }
    return result.slice(0, 10);
  }, [search, allRooms, floorRecords, b?.id, buildingRegistry, buildingById,
    nodesByKey, nodeKeyById, floorNodes, roomByNode]);

  const selectSearch = (item) => {
    setSearchOpen(false);
    const map = ctx.current.map;
    if (!map) return;

    if (item.kind === "building") {
      const entry = buildingRegistry[item.key];
      if (!entry) return;
      const firstFloor = entry.floors.find((floor) => String(floor.id) === "1")
        || entry.floors[0];
      const floor = firstFloor ? String(firstFloor.id) : "";
      setSearchedNodeId(null);
      logSearch({ kind: "search", placeLabel: item.name, query: search, buildingId: entry.id });
      setOpenKey(entry.key);
      setCurFloor(floor);
      onChangeRef.current?.({ building: entry.name, buildingId: entry.id, floor });
      const layer = ctx.current.buildingLayers[entry.key];
      if (layer) fitBuilding(map, layer.poly);
      return;
    }

    if (item.kind === "room") {
      const room = item.room;
      const floorRow = floorRecords.find((row) => row.id === room.floorId);
      const entry = floorRow && buildingById.get(String(floorRow.buildingId));
      if (!entry) return;
      const floor = String(floorRow.floorNo);
      logSearch({
        kind: "search", placeLabel: item.name + " (" + entry.name + ")",
        query: search, buildingId: entry.id, roomId: room.id,
      });
      setOpenKey(entry.key);
      setCurFloor(floor);
      // Keep the database node ID while another building's graph is loading.
      // The picker resolves it to that graph's nodeKey once the request finishes.
      setSearchedNodeId(room.nodeId || null);
      onChangeRef.current?.({ building: entry.name, buildingId: entry.id, floor });
      onSelectRoomRef.current?.(room);
      const layer = ctx.current.buildingLayers[entry.key];
      if (layer) fitBuilding(map, layer.poly);
      if (item.node) map.setView([item.node.lat, item.node.lon], 20, { animate: true });
      return;
    }

    if (item.kind === "node") {
      logSearch({ kind: "search", placeLabel: item.name || item.node?.label, query: search, buildingId: b?.id });
      setSearchedNodeId(item.id);
      const node = item.node;
      map.setView([node.lat, node.lon], 20, { animate: true });
      const marker = ctx.current.markersByNodeId?.[item.id];
      if (marker) marker.openPopup();
    }
  };

  return { searchResults, selectSearch };
}