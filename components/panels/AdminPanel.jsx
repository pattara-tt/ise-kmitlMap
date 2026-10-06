"use client";

import { useEffect, useState } from "react";
import UsersTab from "./admin/UsersTab";
import RequestsTab from "./admin/RequestsTab";
import RequestReportTab from "./admin/RequestReportTab";
import QuotaTab from "./admin/QuotaTab";
import RolesTab from "./admin/RolesTab";
import AccountStatusTab from "./admin/AccountStatusTab";

export default function AdminPanel({ uc, user }) {
  const [adminPage, setAdminPage] = useState(uc);
  useEffect(() => setAdminPage(uc), [uc]);
  if (adminPage === "users") return <UsersTab />;
  if (adminPage === "requests") return <RequestsTab user={user} onReport={() => setAdminPage("report")} onQuota={() => setAdminPage("quota")} />;
  if (adminPage === "quota") return <QuotaTab user={user} onBack={() => setAdminPage("requests")} />;
  if (adminPage === "report") return <RequestReportTab onBack={() => setAdminPage("requests")} />;
  if (adminPage === "roles") return <RolesTab user={user} />;
  return <AccountStatusTab user={user} />;
}
