"use client";

import { useEffect } from "react";

// Leaflet ใช้ preventDefault กับ mousedown ทำให้ช่องพิมพ์ค้าง focus เมื่อคลิกแผนที่
// ที่นี่ blur ให้เองเมื่อแตะพื้นที่ว่าง ยกเว้นของที่ต้องรักษา focus ไว้
const KEEP_FOCUS =
  'input, textarea, select, button, a, label, summary, [contenteditable="true"], [role="option"], [role="listbox"], ' +
  '[role="menuitem"], .sm-combo-list, .sm-suggest-item, .leaflet-control, [data-keep-focus]';

export default function InteractionFx() {
  useEffect(() => {
    const onPointerDown = (e) => {
      const el = document.activeElement;
      if (!el || el === document.body) return;
      if (!el.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (e.target instanceof Element && e.target.closest(KEEP_FOCUS)) return;
      el.blur();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);
  return null;
}