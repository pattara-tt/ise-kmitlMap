import { getNodeType, KMITL_EXTERIOR_LINKS } from "../mapConfig";

export const normalize = text => String(text || "").trim().toLowerCase().replace(/\s+/g, "");

export function getNodeIcon(node) {
  if (!node) {
    return {
      html: "•",
      type: "other"
    };
  }
  switch (node.type) {
    case "Study_Room":
      return {
        html: `<img
            src="/data/icon/room.svg"
            alt=""
            style=" width:22px; height:22px; display:block;
              filter:drop-shadow(0 1px 3px rgba(0,0,0,.35));"/>`,
        type: "room"
      };
    case "Co_Work":
      return {
        html: getNodeType("Co_Work").icon,
        type: "room"
      };
    case "Toilet":
      return {
        html: "🚻",
        type: "toilet"
      };
    case "lift":
      return {
        html: "🛗",
        type: "lift"
      };
    case "Stair":
      return {
        html: "🪜",
        type: "stairs"
      };
    case "exit":
    case "Entrance":
    case "Fire_Exit":
    case "entrance":
    case "Exterior":
    case "exterior":
    case "door":
      return {
        html: "🚪",
        type: "exit"
      };
    default:
      {
        const t = getNodeType(node.type);
        return {
          html: t?.icon || "•",
          type: "other"
        };
      }
  }
}

/* label สำหรับ Popup*/

/* label สำหรับ Popup*/
export function getNodeTypeLabel(node) {
  if (!node) return "จุดบนผัง";
  const labels = {
    Study_Room: "ห้องเรียน",
    Co_Work: "พื้นที่ทำงาน",
    Toilet: "ห้องน้ำ",
    lift: "ลิฟต์",
    Stair: "บันได",
    Entrance: "ทางเข้า",
    Fire_Exit: "ทางหนีไฟ",
    entrance: "ทางเข้า",
    exit: "ทางออก",
    Exterior: "ทางเข้า/ออกอาคาร",
    exterior: "ทางเข้า/ออกอาคาร",
    door: "ประตู",
    path: "ทางเดิน"
  };
  if (labels[node.type]) return labels[node.type];
  const t = getNodeType(node.type);
  return t?.label || node.type || "จุดบนผัง";
}

/* node ที่ถือว่าเป็นจุดทางเข้า/ทางออก */

/* node ที่ถือว่าเป็นจุดทางเข้า/ทางออก */
export function isExteriorNode(id) {
  return new Set((KMITL_EXTERIOR_LINKS || []).map(x => x.node)).has(id);
}

/* Main component */
