"use client";

export default function ChipsPanel({ view }) {
  const {
    CHIP_DEFS,
    chips,
    nav,
    routeFormOpen,
    searchOpen,
    toggleChip
  } = view;
  return !nav?.active ? <div className="bdi-chips" style={{
  top: `calc(${searchOpen ? routeFormOpen ? 286 : 190 : 114}px + env(safe-area-inset-top))`
}}>
          {CHIP_DEFS.map(c => <button type="button" key={c.k} className={"bdi-chip" + (chips[c.k] ? " on" : "")} onClick={() => toggleChip(c.k)}><c.icon />{c.label}</button>)}
        </div> : null;
}
