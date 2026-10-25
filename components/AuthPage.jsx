"use client";

import { useEffect, useState } from "react";
import { Btn, Field, Input, Logo } from "./ui";
import InstitutionPicker from "./InstitutionPicker";

const EMPTY_FORM = { email: "", password: "", name: "", institutionId: "" };

// UC27 ลงทะเบียนเข้าใช้ระบบ · UC28 เข้าสู่ระบบด้วย E-mail
export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState(EMPTY_FORM);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    fetch("/api/auth/institutions")
      .then((r) => r.json())
      .then((institutionData) => setInstitutions(institutionData.items || []))
      .catch(() => { setInstitutions([]); });
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // เปลี่ยนแท็บ = ล้างทุกช่อง กันอีเมล/รหัสผ่านค้างข้ามแท็บ
  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setForm(EMPTY_FORM);
    setErr("");
  }

  async function submit() {
    setErr("");
    if (mode === "register" && !form.institutionId) {
      setErr("กรุณาพิมพ์และเลือกสถาบันจากรายการ");
      return;
    }
    setBusy(true);
    try {
      const payload = mode === "login"
        ? { action: "login", email: form.email, password: form.password }
        : { action: "register", ...form };
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!j.ok) {
        setErr(j.error || "ทำรายการไม่สำเร็จ");
      } else {
        onLogin(j.user, j.sessionId);
      }
    } catch (e) {
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

      <div className="sm-seg" style={{ display: "flex", background: "#E8EAED", borderRadius: 999, padding: 4, marginBottom: 16 }}>
        {[["login", "เข้าสู่ระบบ"], ["register", "ลงทะเบียน"]].map(([k, label]) => (
          <button key={k} onClick={() => switchMode(k)} aria-pressed={mode === k}
            style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12.5,
              background: mode === k ? "#fff" : "transparent", color: mode === k ? "#1A73E8" : "#5F6368",
              boxShadow: mode === k ? "0 1px 3px rgba(60,64,67,.2)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* key={mode} → สร้างช่องกรอกใหม่ทุกครั้งที่เปลี่ยนแท็บ กันเบราว์เซอร์คืนค่าเดิมให้ */}
      <div key={mode} style={{ background: "#fff", border: "1px solid #DADCE0", borderRadius: 14, padding: 16, boxShadow: "0 1px 3px rgba(60,64,67,.15)" }}>
        <Field label="E-mail">
          <Input type="email" value={form.email} onChange={set("email")} placeholder="you@kmitl.ac.th" autoComplete="email" />
        </Field>
        <Field label="รหัสผ่าน">
          <Input type="password" value={form.password} onChange={set("password")} placeholder="••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>

        {mode === "register" ? (
          <>
            <Field label="ชื่อ-นามสกุล">
              <Input value={form.name} onChange={set("name")} placeholder="เช่น อินฟินิตี้ ไอ" autoComplete="name" />
            </Field>
            <InstitutionPicker
              institutions={institutions}
              value={form.institutionId}
              onChange={(id) => setForm((f) => ({ ...f, institutionId: id }))}
            />
          </>
        ) : null}

        {err ? <div style={{ color: "#D93025", fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>{err}</div> : null}

        <Btn onClick={submit} disabled={busy} style={{ width: "100%", padding: 12, fontSize: 14.5 }}>
          {busy ? "กำลังดำเนินการ…" : mode === "login" ? "เข้าสู่ระบบ" : "ลงทะเบียน"}
        </Btn>
      </div>

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#5F6368" }}>
        {mode === "login" ? "ยังไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
        <button
          className="sm-plain"
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "#1A73E8", fontWeight: 800, fontSize: 13 }}>
          {mode === "login" ? "ลงทะเบียนที่นี่" : "เข้าสู่ระบบ"}
        </button>
      </div>
    </div>
  );
}