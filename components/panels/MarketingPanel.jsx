"use client";

import ContractsTab from "./marketing/ContractsTab";
import BroadcastTab from "./marketing/BroadcastTab";
import AccessTab from "./marketing/AccessTab";

export default function MarketingPanel({ uc, user }) {
  if (uc === "contracts") return <ContractsTab user={user} />;
  if (uc === "broadcast") return <BroadcastTab user={user} />;
  return <AccessTab user={user} />;
}
