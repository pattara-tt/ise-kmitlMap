
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui";

const INSTITUTION_ALIASES = {
  kmitl: [
    "KMITL",
    "Kmitl",
    "kmitl",
    "สจล.",
    "สจล",
    "ลาดกระบัง",
    "สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง",
    "King Mongkut's Institute of Technology Ladkrabang",
  ],
};

export function normalizeKeyword(text) {
  return String(text || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s.\-_'’"“”()\u200b]/g, "");
}

function keywordsOf(inst) {
  const alias =
    INSTITUTION_ALIASES[normalizeKeyword(inst.shortName)] || [];

  return [inst.name, inst.shortName, ...alias]
    .filter(Boolean)
    .map(normalizeKeyword);
}

function matchInstitutions(institutions, text) {
  const query = normalizeKeyword(text);

  if (!query) return [];

  return institutions.filter((inst) =>
    keywordsOf(inst).some((keyword) => keyword.includes(query))
  );
}

export default function InstitutionPicker({
  institutions = [],
  value,
  onChange,
  label = "สถาบัน",
  placeholder = "พิมพ์ชื่อสถาบันของท่าน",
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const comboRef = useRef(null);
  const listRef = useRef(null);
  const [openUp, setOpenUp] = useState(false);
  const [listMaxHeight, setListMaxHeight] = useState(240);

  const matches = useMemo(
    () => matchInstitutions(institutions, text),
    [institutions, text]
  );

  const showResults = focused && text.trim().length > 0;

  useEffect(() => {
    if (!showResults) return;

    function updateDropdownPosition() {
      const rect = comboRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap;

      // อยู่ใต้ช่องค้นหาเสมอ ไม่ย้ายขึ้นไปทับฟอร์ม
      setOpenUp(false);

      // คำนวณความสูงตามพื้นที่ด้านล่างที่เหลือ
      setListMaxHeight(
        Math.max(100, Math.min(360, spaceBelow))
      );
    }

    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [showResults, matches.length]);

  function pick(inst) {
    setText(inst.name);
    onChange(inst.id);
    setFocused(false);
  }

  function move(next) {
    setActive(next);
    requestAnimationFrame(() =>
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" })
    );
  }

  function onInput(e) {
    setText(e.target.value);
    setFocused(true);
    setActive(-1);

    // เมื่อแก้ keyword ต้องเลือกผลลัพธ์ใหม่เอง
    if (value) onChange("");
  }

  function onKeyDown(e) {
        if (e.key === "ArrowDown" && matches.length > 0) {
      e.preventDefault();
      move(active < 0 ? 0 : (active + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length > 0) {
      e.preventDefault();
      move(active < 0 ? matches.length - 1 : (active - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && showResults && matches.length > 0) {
      e.preventDefault();
      // ยังไม่ได้เลือกแถวไหน → เลือกให้เฉพาะตอนมีผลลัพธ์เดียว (ไม่เลือกแถวที่ผู้ใช้มองไม่เห็นว่าถูกเลือก)
      const target = matches[active] ?? (matches.length === 1 ? matches[0] : null);
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div style={{ marginBottom: 9 }}>
      <label
        htmlFor="sm-institution"
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#5F6368",
          marginBottom: 4,
        }}
      >
        {label}
      </label>

      <div className="sm-combo" ref={comboRef}> 
        <Input
          id="sm-institution"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { onInput(e); }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls="sm-institution-results"
          style={{ paddingRight: 11 }}
        />

        {showResults && (
          <ul
            id="sm-institution-results"
            ref={listRef}
            className={`sm-combo-list${openUp ? " sm-combo-list-up" : ""}`}
            role="listbox"
            style={{ maxHeight: `${listMaxHeight}px` }}
            onMouseLeave={() => setActive(-1)}
          >
            {matches.length > 0 ? (
              matches.map((inst, i) => (
                <li
                  key={inst.id}
                  className={`sm-combo-item${i === active ? " active" : ""}`}
                  role="option"
                  aria-selected={inst.id === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(inst)}
                >
                  <span>{inst.name}</span>
                </li>
              ))
            ) : (
              <li className="sm-combo-empty">
                ไม่พบสถาบันที่ตรงกับคำค้นหา
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}