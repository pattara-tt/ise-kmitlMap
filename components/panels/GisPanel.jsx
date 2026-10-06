"use client";

import AssetsTab from "./gis/AssetsTab";
import BoundaryTab from "./gis/BoundaryTab";
import SaveMapTab from "./gis/SaveMapTab";

export default function GisPanel({ uc, user }) {
  if (uc === "boundary") return <BoundaryTab user={user} />;
  if (uc === "assets") return <AssetsTab user={user} />;
  return <SaveMapTab user={user} />;
}
