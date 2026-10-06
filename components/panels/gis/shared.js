import { SC8_CENTER } from "../../mapConfig";

export const todayStr = () => new Date().toISOString().slice(0, 10);

/* =========================================================
   UC7 : ขอบเขตแผนผัง
========================================================= */

/* =========================================================
   UC8 : ข้อมูลประกอบแผนผัง
========================================================= */

export const DEFAULT_PLACEMENT = {
  center: [...SC8_CENTER],
  widthMeters: 100,
  heightMeters: 80,
  rotation: 0
};
