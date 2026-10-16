"use client";

import { useMemo } from "react";
import { useCollection} from "../ui";
import { formatDateTime } from "../../lib/datetime";
import { KMITL_BOUNDS, WALKWAY_NODE_TYPES, getNodeType } from "../mapConfig";

export function useMapReferenceData(mapData) {
  const { items: rooms } = useCollection("rooms");
  const { items: mapAssetItems } = useCollection("mapAssets");

  const indoorSearchNodes = useMemo(() => {
    const nodes = mapData.data?.nodes || [];
    const floorById = new Map(
      (mapData.data?.building?.floors || []).map((floor) => [floor.id, floor])
    );
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
        const typeInfo = getNodeType(node.type);
        return {
          id: node.nodeKey,
          internalId: node.id,
          markerId: center?.nodeKey || null,
          name: room?.name || node.name || node.nodeKey,
          aliases: [room?.code, room?.teacher, node.nodeKey, typeInfo.label].filter(Boolean),
          extract: `${typeInfo.label || "สถานที่"}${
            floor ? ` · ${floor.name || `ชั้น ${floor.floorNo}`}` : ""
          }`,
          icon: typeInfo.icon || "📍",
        };
      });
  }, [mapData.data, rooms]);

  const nodeIdByKey = useMemo(
    () => Object.fromEntries((mapData.data?.nodes || []).map((node) => [node.nodeKey, node.id])),
    [mapData.data]
  );

  const effectiveFloors = useMemo(() => {
    const floorById = new Map(
      (mapData.data?.building?.floors || []).map((floor) => [floor.id, floor])
    );
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
  }, [mapAssetItems, mapData.data]);

  const buildingBounds = mapData.data?.building?.bounds || KMITL_BOUNDS;

  return { rooms, indoorSearchNodes, nodeIdByKey, effectiveFloors, buildingBounds };
}
