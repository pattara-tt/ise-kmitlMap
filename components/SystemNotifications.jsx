"use client";

import { useMemo, useState } from "react";
import { Card, Icon, UCHead, useCollection } from "./ui";

/** Shared system-announcement inbox for non-user roles.
 * Intentionally excludes events and PR news to keep this menu scoped to Marketing broadcasts.
 */
export default function SystemNotifications({ user }) {
  const { items: notifications } = useCollection("notifications");
  const { items: broadcasts } = useCollection("broadcasts");

  const feed = useMemo(() => {
    const out = [];
    const notifiedBroadcastIds = new Set();

    for (const n of notifications) {
      if (n.userId !== user?.id || n.kind !== "system") continue;
      const b = n.broadcastId ? broadcasts.find((x) => x.id === n.broadcastId) : null;
      const at = n.createdAt || b?.sendAt || b?.sentAt || b?.createdAt;
      const timestamp = new Date(at || "").getTime();
      if (Number.isFinite(timestamp) && timestamp > Date.now()) continue;
      if (b) notifiedBroadcastIds.add(b.id);
      out.push({
        id: n.id,
        title: n.title || b?.title || "ประกาศแจ้งเตือนจากระบบ",
        body: n.body || b?.body || "",
        at,
      });
    }

    for (const b of broadcasts) {
      if (notifiedBroadcastIds.has(b.id)) continue;
      const audience = b.audience || "ทุกมหาวิทยาลัย";
      const institution = user?.institutionName || user?.institutionId;
      if (audience !== "ทุกมหาวิทยาลัย" && (!institution || audience !== institution)) continue;
      const at = b.sendAt || b.sentAt || b.createdAt;
      const timestamp = new Date(at || "").getTime();
      if (Number.isFinite(timestamp) && timestamp > Date.now()) continue;
      out.push({ id: b.id, title: b.title, body: b.body, at, audience });
    }

    return out.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }, [notifications, broadcasts, user?.id, user?.institutionName, user?.institutionId]);

  const rows = feed;
  return (
    <>
      <UCHead title="การแจ้งเตือนระบบ"  />
      {rows.length === 0 ? <div style={{ fontSize: 13, color: "#5F6368" }}>ยังไม่มีการแจ้งเตือน</div> : rows.map((item) => (
        <Card key={item.id}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: "#FCE8E6", display: "grid", placeItems: "center" }}>
              <Icon name="notification" size={19} color="#D93025" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "inline-block", color: "#D93025", background: "#FCE8E6", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 800 }}>ประกาศแจ้งเตือนจากระบบ</span>
              <b style={{ display: "block", fontSize: 14.5, color: "#202124", marginTop: 6 }}>{item.title}</b>
              <div style={{ fontSize: 13, color: "#3C4043", marginTop: 4, whiteSpace: "pre-wrap" }}>{item.body}</div>
              <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 7 }}>ถึง {item.audience}{item.at ? ` · ${item.at}` : ""}</div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
