"use client";

import { useEffect, useState } from "react";
import UsersTab from "./admin/UsersTab";
import RequestsTab from "./admin/RequestsTab";
import RequestReportTab from "./admin/RequestReportTab";
import QuotaTab from "./admin/QuotaTab";
import RolesTab from "./admin/RolesTab";
import AccountStatusTab from "./admin/AccountStatusTab";

const DEFAULT_REQUEST_FILTERS = { q: "", status: "pending", sortBy: "newest" };

export default function AdminPanel({ uc, user }) {
  const [adminPage, setAdminPage] = useState(uc);
  const [requestFilters, setRequestFilters] = useState(DEFAULT_REQUEST_FILTERS);

  useEffect(() => {
    setAdminPage(uc);
    setRequestFilters(DEFAULT_REQUEST_FILTERS); // ย้ายไปแท็บอื่นในเมนูเมื่อไหร่ ค่อยล้างตัวกรอง
  }, [uc]);

  if (adminPage === "users") return <UsersTab user={user} />;
  if (adminPage === "requests") return <RequestsTab user={user} filters={requestFilters} setFilters={setRequestFilters} onReport={() => setAdminPage("report")} onQuota={() => setAdminPage("quota")} />;
  if (adminPage === "quota") return <QuotaTab user={user} onBack={() => setAdminPage("requests")} />;
  if (adminPage === "report") return <RequestReportTab onBack={() => setAdminPage("requests")} />;
  if (adminPage === "roles") return <RolesTab user={user} />;
  return <AccountStatusTab user={user} />;
}