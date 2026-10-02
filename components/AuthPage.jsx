"use client";

import { useEffect, useState } from "react";
import { Btn, Field, Input, Logo, Select } from "./ui";

// UC27 ลงทะเบียนเข้าใช้ระบบ · UC28 เข้าสู่ระบบด้วย E-mail
export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ email: "", password: "", name: "", username: "", role: "user", institutionId: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/roles").then((r) => r.json()),
      fetch("/api/auth/institutions").then((r) => r.json()),
    ]).then(([roleData, institutionData]) => {
      setRoles(roleData.items || []);
      const rows = institutionData.items || [];
      setInstitutions(rows);
      setForm((current) => ({ ...current, institutionId: current.institutionId || rows[0]?.id || "" }));
    }).catch(() => { setRoles([]); setInstitutions([]); });
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, ...form }),
      });

      const j = await res.json();
      if (!j.ok) { 
        setErr(j.error || "ทำรายการไม่สำเร็จ");
      }
      else { onLogin(j.user, j.sessionId); }
    } 
    catch (e) {
      setErr("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    }

    setBusy(false);
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#F8F9FA", padding: "calc(34px + env(safe-area-inset-top)) 20px 28px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <Logo size={72} style={{ margin: "0 auto" }} />
        <h1 style={{ margin: "6px 0 2px", fontSize: 23, fontWeight: 800, color: "#202124", letterSpacing: 1 }}>SciMap</h1>
        <div style={{ fontSize: 12.5, color: "#5F6368" }}>ระบบแผนที่และนำทางภายในมหาวิทยาลัย</div>
      </div>

      <div style={{ display: "flex", background: "#E8EAED", borderRadius: 999, padding: 4, marginBottom: 16 }}>
        {[["login", "เข้าสู่ระบบ"], ["register", "ลงทะเบียน"]].map(([k, label]) => (
          <button key={k} onClick={() => { setMode(k); setErr(""); }}
            style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12.5,
              background: mode === k ? "#fff" : "transparent", color: mode === k ? "#1A73E8" : "#5F6368",
              boxShadow: mode === k ? "0 1px 3px rgba(60,64,67,.2)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #DADCE0", borderRadius: 14, padding: 16, boxShadow: "0 1px 3px rgba(60,64,67,.15)" }}>
        <Field label="E-mail">
          <Input type="email" value={form.email} onChange={set("email")} placeholder="you@kmitl.ac.th" autoComplete="email" />
        </Field>
        <Field label="รหัสผ่าน">
          <Input type="password" value={form.password} onChange={set("password")} placeholder="••••••" autoComplete="current-password" />
        </Field>

        {mode === "register" ? (
          <>
            <Field label="ชื่อ-นามสกุล">
              <Input value={form.name} onChange={set("name")} placeholder="เช่น อินฟินิตี้ ไอ" />
            </Field>
            <Field label="ชื่อผู้ใช้ (username)">
              <Input value={form.username} onChange={set("username")} placeholder="เช่น kittipat" />
            </Field>
            <Field label="สถาบัน">
              <Select value={form.institutionId} onChange={set("institutionId")}>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </Field>
            <Field label="บทบาทในระบบ">
              <Select value={form.role} onChange={set("role")}>
                {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </Select>
            </Field>
          </>
        ) : null}

        {err ? <div style={{ color: "#D93025", fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{err}</div> : null}

        <Btn onClick={submit} disabled={busy} style={{ width: "100%", padding: 12, fontSize: 14.5 }}>
          {busy ? "กำลังดำเนินการ…" : mode === "login" ? "เข้าสู่ระบบ" : "ลงทะเบียน"}
        </Btn>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#5F6368", lineHeight: 1.7 }}>
        <b style={{ color: "#202124" }}>บัญชีทดสอบ</b> (รหัสผ่าน <code>1234</code> ทุกบัญชี)
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>exec@kmitl.ac.th — บริหาร</li>
          <li>marketing@kmitl.ac.th — ฝ่ายการตลาด</li>
          <li>gis@kmitl.ac.th — ผู้ดูแลข้อมูลสถานที่และอาคาร</li>
          <li>admin@kmitl.ac.th — ฝ่ายดูแลระบบ</li>
          <li>pr@kmitl.ac.th — ฝ่ายประชาสัมพันธ์</li>
          <li>registrar@kmitl.ac.th — ฝ่ายทะเบียน</li>
          <li>student@kmitl.ac.th — ผู้ใช้งานทั่วไป</li>
        </ul>
      </div>
    </div>
  );
}
