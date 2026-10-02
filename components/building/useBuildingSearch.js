"use client";

import { useMemo } from "react";
import { BUILDINGS, KMITL_ALL_NODES } from "../mapConfig";
import { normalize, getNodeIcon, getNodeTypeLabel } from "./nodePresentation";

export function useBuildingSearch({
  search,
  allRooms,
  floorRecords,
  b,
  nodeKeyById,
  floorNodes,
  roomByNode,
  setSearchOpen,
  ctx,
  setOpenKey,
  setCurFloor,
  onChangeRef,
  fitBuilding,
  openKey,
  curFloor,
  building,
  onSelectRoomRef,
  setSearchedNodeId,
}) {
  const searchResults = useMemo(() => {
    const q = normalize(search);
    if (!q) return [];
    const result = [];

    for (const [key, data] of Object.entries(BUILDINGS)) {
      const text = normalize(`${data.name} ${key}`);
      if (text.includes(q)) {
        result.push({ kind: "building", key, name: data.name, icon: "🏢" });
      }
    }

    for (const room of allRooms || []) {
      const text = normalize(
        [
          room.code,
          room.name,
          room.type,
          room.teacher,
          (floorRecords || []).find((f) => f.id === room.floorId)?.floorNo,
          b?.name,
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (text.includes(q)) {
        const node = room.nodeId
          ? KMITL_ALL_NODES[nodeKeyById[room.nodeId] || room.nodeId]
          : null;
        result.push({
          kind: "room",
          room,
          node,
          name: room.name || `ห้อง ${room.code || ""}`,
          icon: "🚪",
        });
      }
    }

    for (const [id, node] of Object.entries(floorNodes)) {
      const text = normalize([id, node.type, node.label].filter(Boolean).join(" "));
      if (!text.includes(q)) continue;
      if (roomByNode[id]) continue;

      const icon = getNodeIcon(node);
      result.push({
        kind: "node",
        id,
        node,
        name: node.label || getNodeTypeLabel(node),
        icon:
          icon.type === "toilet"
            ? "🚻"
            : icon.type === "lift"
              ? "🛗"
              : icon.type === "stairs"
                ? "🪜"
                : icon.type === "exit"
                  ? "🚪"
                  : "📍",
      });
    }

    return result.slice(0, 10);
  }, [search, allRooms, floorRecords, b, nodeKeyById, floorNodes, roomByNode]);

  const selectSearch = (item) => {
    setSearchOpen(false);
    const map = ctx.current.map;
    if (!map) return;

    if (item.kind === "building") {
      setSearchedNodeId(null);
      const data = BUILDINGS[item.key];
      setOpenKey(item.key);
      setCurFloor("1");
      onChangeRef.current?.({ building: data.name, floor: "1" });
      const layer = ctx.current.buildingLayers[item.key];
      if (layer) fitBuilding(map, layer.poly);
      return;
    }

    if (item.kind === "room") {
      const room = item.room;
      const roomFloor = (floorRecords || []).find((f) => f.id === room.floorId);
      const roomBuilding = Object.entries(BUILDINGS).find(
        ([, data]) => data.id === roomFloor?.buildingId
      );
      const key = roomBuilding?.[0] || openKey;
      const floorNo = String(roomFloor?.floorNo || curFloor || "1");
      const buildingName = roomBuilding?.[1]?.name || b?.name || building;

      setOpenKey(key || null);
      setCurFloor(floorNo);
      const nodeKey = nodeKeyById[room.nodeId] || room.nodeId;
      setSearchedNodeId(item.node && nodeKey ? nodeKey : null);
      onChangeRef.current?.({ building: buildingName, floor: floorNo });

      const node = item.node;
      if (node) {
        setTimeout(() => {
          map.setView([node.lat, node.lon], 20, { animate: true });
          onSelectRoomRef.current?.(room);
        }, 100);
      } else {
        onSelectRoomRef.current?.(room);
      }
      return;
    }

    if (item.kind === "node") {
      setSearchedNodeId(item.id);
      const node = item.node;
      map.setView([node.lat, node.lon], 20, { animate: true });
      const marker = ctx.current.poiLayer.find((m) => {
        const p = m.getLatLng();
        return (
          Math.abs(p.lat - node.lat) < 0.000001 &&
          Math.abs(p.lng - node.lon) < 0.000001
        );
      });
      if (marker) setTimeout(() => marker.openPopup(), 250);
    }
  };

  return { searchResults, selectSearch };
}