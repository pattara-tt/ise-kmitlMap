"use client";

import { useCallback, useEffect, useState } from "react";

// ───────── ชุด UI กลางของคอนโซล KMITL MAP (ธีมขาวแบบ Google Maps) ─────────

export function UCHead({ code, title, desc }) {
  return (
    <div style={{ margin: "2px 0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#1A73E8", background: "#E8F0FE", padding: "3px 9px", borderRadius: 999 }}>{code}</span>
        <b style={{ fontSize: 16, color: "#202124" }}>{title}</b>
      </div>
      {desc ? <div style={{ fontSize: 12.5, color: "#5F6368", marginTop: 5 }}>{desc}</div> : null}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #DADCE0", borderRadius: 14, boxShadow: "0 1px 3px rgba(60,64,67,.15)", padding: 14, marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}

export function Tiles({ items }) {
  return (
    <div className="bdi-stat-tiles">
      {items.map((t) => (
        <div className="bdi-tile" key={t.label}>
          <b>{t.value}</b>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 9 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#5F6368", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 11px", borderRadius: 10,
  border: "1px solid #DADCE0", background: "#fff", color: "#202124", fontSize: 14, outline: "none",
};

export function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function Textarea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 78, resize: "vertical", ...(props.style || {}) }} />;
}
export function Select({ children, ...props }) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>;
}

export function Btn({ children, kind = "primary", ...props }) {
  const base = { padding: "9px 15px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", border: "1px solid transparent" };
  const kinds = {
    primary: { background: "#1A73E8", color: "#fff" },
    ghost: { background: "#fff", color: "#1A73E8", border: "1px solid #DADCE0" },
    danger: { background: "#fff", color: "#D93025", border: "1px solid #F5C2C0" },
    ok: { background: "#188038", color: "#fff" },
  };
  return <button {...props} style={{ ...base, ...kinds[kind], opacity: props.disabled ? 0.55 : 1, ...(props.style || {}) }}>{children}</button>;
}

export function Pill({ children, color = "#5F6368", bg = "#F1F3F4" }) {
  return <span style={{ fontSize: 11, fontWeight: 800, color, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{children}</span>;
}

const STATUS_STYLE = {
  pending: ["#B06000", "#FEF7E0", "รอพิจารณา"],
  approved: ["#188038", "#E6F4EA", "อนุมัติ"],
  rejected: ["#D93025", "#FCE8E6", "ไม่อนุมัติ"],
  cancelled: ["#5F6368", "#F1F3F4", "ยกเลิกแล้ว"],
  active: ["#188038", "#E6F4EA", "ใช้งาน"],
  suspended: ["#D93025", "#FCE8E6", "ระงับ"],
  expired: ["#D93025", "#FCE8E6", "หมดอายุ"],
  published: ["#188038", "#E6F4EA", "เผยแพร่"],
  draft: ["#5F6368", "#F1F3F4", "ฉบับร่าง"],
  new: ["#1A73E8", "#E8F0FE", "ใหม่"],
  reviewed: ["#188038", "#E6F4EA", "ตรวจแล้ว"],
};
export function Status({ value }) {
  const [color, bg, label] = STATUS_STYLE[value] || ["#5F6368", "#F1F3F4", value];
  return <Pill color={color} bg={bg}>{label}</Pill>;
}

export function Table({ columns, rows, empty = "ไม่มีข้อมูล" }) {
  if (!rows.length) return <div style={{ fontSize: 13, color: "#5F6368", padding: "10px 2px" }}>{empty}</div>;
  return (
    <div style={{ overflowX: "auto", border: "1px solid #DADCE0", borderRadius: 12, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 420 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: "left", padding: "10px 12px", background: "#F8F9FA", color: "#5F6368", fontSize: 11.5, fontWeight: 800, borderBottom: "1px solid #DADCE0", whiteSpace: "nowrap" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "10px 12px", borderBottom: "1px solid #E8EAED", color: "#202124", verticalAlign: "top" }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <span style={{ position: "absolute", left: 11, top: 9, fontSize: 14, color: "#5F6368" }}>🔍</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 32 }} />
    </div>
  );
}

// ───────── hook เรียกข้อมูลจาก /api/data/[name] ─────────
export function useCollection(name) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/data/" + name);
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      setItems([]);
    }
    setLoading(false);
  }, [name]);

  useEffect(() => { reload(); }, [reload]);

  // const create = useCallback(async (item, actor) => {
  //   await fetch("/api/data/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, _actor: actor }) });
  //   await reload();
  // }, [name, reload]);

  const create = useCallback(async (item, actor) => {
    const r = await fetch("/api/data/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, _actor: actor })
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw new Error(j.error || `สร้างข้อมูลไม่สำเร็จ (${r.status})`);
    }

    await reload();
    return j.item;
  }, [name, reload]);

  const patch = useCallback(async (id, p, actor) => {
    await fetch("/api/data/" + name, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...p, _actor: actor }) });
    await reload();
  }, [name, reload]);

  const destroy = useCallback(async (id, actor) => {
    await fetch(`/api/data/${name}?id=${encodeURIComponent(id)}&actor=${encodeURIComponent(actor?.name || "")}`, { method: "DELETE" });
    await reload();
  }, [name, reload]);

  return { items, loading, reload, create, patch, destroy };
}

export function useStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => setStats(null));
  }, []);
  return stats;
}

// กราฟแท่งเล็กๆ แบบไม่ต้องพึ่งไลบรารีภายนอก
export function BarChart({ data, labelKey, valueKey, color = "#1A73E8" }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey] || 0));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130, padding: "8px 2px" }}>
      {data.map((d) => (
        <div key={d[labelKey]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, color: "#5F6368" }}>{d[valueKey]}</span>
          <div style={{ width: "100%", height: Math.round(((d[valueKey] || 0) / max) * 88) + 4, background: color, borderRadius: "6px 6px 0 0" }} />
          <span style={{ fontSize: 9.5, color: "#5F6368" }}>{String(d[labelKey]).slice(-2)}</span>
        </div>
      ))}
    </div>
  );
}
