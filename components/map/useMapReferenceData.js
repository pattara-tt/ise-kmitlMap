"use client";

import { useCallback, useMemo } from "react";
import { useCollection } from "../ui";
import { formatDateTime } from "../../lib/datetime";
import { KMITL_BOUNDS, WALKWAY_NODE_TYPES, getNodeType } from "../mapConfig";
import { getNodeIcon } from "../building/nodePresentation";
import { resolveRoomNodeIcon } from "../building/roomTypeIcon";
import { resolveBuildingPhoto } from "./mapViewHelpers";

// bounds [[south, west], [north, east]] จากพิกัดขอบเขต [[lat, lon], ...]
function boundsFromGeometry(geometry) {
  const pts = (geometry || [])
    .map((p) => [Number(p?.[0]), Number(p?.[1])])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (pts.length < 3) return null;
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
}

export function useMapReferenceData(mapData, selectedBuildingId = null, boundaries = []) {
  const { items: rooms } = useCollection("rooms");
  const { items: roomTypes } = useCollection("roomTypes");
  const { items: mapAssetItems } = useCollection("mapAssets");

  // ทุกอาคาร (ถ้า API ยังไม่ส่ง buildings ให้ fallback เป็น building เดียวเหมือนเดิม)
  const allBuildings = useMemo(() => {
    const list = mapData.data?.buildings;
    if (Array.isArray(list) && list.length) return list;
    return mapData.data?.building ? [mapData.data.building] : [];
  }, [mapData.data]);

  // อาคารที่เลือก — ยังไม่เลือกให้ใช้อาคารหลักเดิม (Sc8)
  const selectedBuilding = useMemo(
    () =>
      allBuildings.find((b) => b.id === selectedBuildingId) ||
      mapData.data?.building ||
      allBuildings[0] ||
      null,
    [allBuildings, selectedBuildingId, mapData.data]
  );

  // ใช้ค้นหาห้อง: รวมทุกอาคาร และมี buildingId กำกับ
  const indoorSearchNodes = useMemo(() => {
    const nodes = mapData.data?.nodes || [];
    const floorById = new Map();
    const buildingByFloorId = new Map();
    for (const b of allBuildings) {
      for (const floor of b.floors || []) {
        floorById.set(floor.id, floor);
        buildingByFloorId.set(floor.id, b);
      }
    }
    const roomByNodeId = new Map(rooms.map((room) => [room.nodeId, room]));
    const centersByName = new Map();

    for (const node of nodes) {
      if (String(node.type).toLowerCase() === "path" && /center/i.test(node.nodeKey || "")) {
        centersByName.set(String(node.name || "").trim().toLowerCase(), node);
      }
    }

    return nodes
      .filter(
        (node) =>
          !WALKWAY_NODE_TYPES.includes(String(node.type || "").toLowerCase()) &&
          String(node.type).toLowerCase() !== "exterior"
      )
      .map((node) => {
        const room = roomByNodeId.get(node.id);
        const center = centersByName.get(String(node.name || "").trim().toLowerCase());
        const floor = floorById.get(node.floorId);
        const building = buildingByFloorId.get(node.floorId);
        const typeInfo = getNodeType(node.type);
        const resolvedIcon = resolveRoomNodeIcon(room, roomTypes, getNodeIcon(node));
        return {
          id: node.nodeKey,
          internalId: node.id,
          buildingId: building?.id || null,
          markerId: center?.nodeKey || null,
          coord: [Number(node.x), Number(node.y)],
          markerCoord: center ? [Number(center.x), Number(center.y)] : [Number(node.x), Number(node.y)],
          floor: String(floor?.floorNo || "1"),
          name: room?.name || node.name || node.nodeKey,
          aliases: [room?.code, room?.teacher, node.nodeKey, typeInfo.label, building?.name].filter(Boolean),
          extract: `${typeInfo.label || "สถานที่"}${
            building ? ` · ${building.name}` : ""
          }${floor ? ` · ${floor.name || `ชั้น ${floor.floorNo}`}` : ""}`,
          icon: typeInfo.icon || "📍",
          iconHtml: resolvedIcon.html,
          iconType: resolvedIcon.type,
        };
      });
  }, [mapData.data, allBuildings, rooms, roomTypes]);

  const nodeIdByKey = useMemo(
    () => Object.fromEntries((mapData.data?.nodes || []).map((node) => [node.nodeKey, node.id])),
    [mapData.data]
  );

  // ผังชั้นของ "อาคารที่เลือก" เท่านั้น
  const effectiveFloors = useMemo(() => {
    const floorById = new Map((selectedBuilding?.floors || []).map((floor) => [floor.id, floor]));
    return mapAssetItems
      .filter((asset) => asset.kind === "floorplan" && floorById.has(asset.floorId) && asset.file)
      .map((asset) => {
        const floor = floorById.get(asset.floorId);
        return {
          id: String(floor.floorNo),
          apiId: floor.id,
          label: floor.name || String(floor.floorNo),
          svg: asset.file,
          placement: asset.placement || null,
          assetId: asset.id,
        };
      })
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [mapAssetItems, selectedBuilding]);

  // bounds: ใช้ของอาคารถ้ามี ไม่งั้นคำนวณจากขอบเขต UC7 ไม่งั้นค่อย fallback Sc8
  const buildingBounds = useMemo(() => {
    if (selectedBuilding?.bounds?.length === 2) return selectedBuilding.bounds;
    const bd = (boundaries || []).find(
      (b) =>
        b.type === "building" &&
        b.status !== "deleted" &&
        (b.buildingId ? b.buildingId === selectedBuilding?.id : b.name === selectedBuilding?.name)
    );
    return boundsFromGeometry(bd?.geometry) || KMITL_BOUNDS;
  }, [selectedBuilding, boundaries]);

  const getBuildingPhoto = useCallback(
    (building) => resolveBuildingPhoto(building, mapAssetItems),
    [mapAssetItems]
  );
  const buildingPhoto = getBuildingPhoto(selectedBuilding);

  return {
    rooms, roomTypes, indoorSearchNodes, nodeIdByKey,
    effectiveFloors, buildingBounds, buildingPhoto, getBuildingPhoto, selectedBuilding,
  };
}