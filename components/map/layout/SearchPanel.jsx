"use client";

export default function SearchPanel({ view }) {
  const {
    PlaceInput,
    SearchPlaceInput,
    ctx,
    doSearch,
    events,
    indoorSearchNodes,
    nav,
    openEventCard,
    openPlaceCard,
    resolveLandmark,
    rooms,
    routeFormOpen,
    sFrom,
    sTo,
    searchOpen,
    searchQuery,
    setRouteFormOpen,
    setSFrom,
    setSTo,
    setSearchOpen,
    setSearchQuery
  } = view;
  return !nav?.active ? <div className="wb-card wb-search">
          {!searchOpen ? <div className="gm-search-collapsed" onClick={() => {
    setRouteFormOpen(false);
    setSearchOpen(true);
  }}>
              <span className="gm-avatar">P</span>
              <span className="gm-search-text">{searchQuery || "ค้นหาสถานที่"}</span>
              <span className="gm-menu">⌕</span>
            </div> : routeFormOpen ? <div className="gm-search-open">
              <div className="gm-search-head">
                <button className="gm-back" onClick={() => {
        setRouteFormOpen(false);
        setSearchOpen(false);
      }} aria-label="ย้อนกลับ">←</button>
                <div style={{
        fontSize: 16,
        fontWeight: 600
      }}>เส้นทางไป {sTo}</div>
              </div>
              <div className="gm-route-inputs">
                <span className="gm-origin-dot" />
                <span className="gm-dest-pin" />
                <PlaceInput value={sFrom} onChange={setSFrom} onEnter={doSearch} onPick={async sg => {
        let coord = sg.coord;
        if (sg.src === "landmark" && sg.lm) {
          try {
            const r = await resolveLandmark(sg.lm);
            if (r?.coord) coord = r.coord;
          } catch (e) {}
        }
        setSFrom(sg.name);
        ctx.current.placeCache[sg.name] = {
          coord,
          name: sg.name
        };
      }} placeholder="ตำแหน่งของคุณ" />
                <PlaceInput value={sTo} onChange={setSTo} onEnter={doSearch} onPick={async sg => {
        let coord = sg.coord;
        if (sg.src === "landmark" && sg.lm) {
          try {
            const r = await resolveLandmark(sg.lm);
            if (r?.coord) coord = r.coord;
          } catch (e) {}
        }
        setSTo(sg.name);
        ctx.current.placeCache[sg.name] = {
          coord,
          name: sg.name
        };
      }} placeholder="ปลายทาง" />
              </div>
              <button className="bdi-btn gm-search-action" onClick={doSearch}>ค้นหาเส้นทาง</button>
            </div> : <div className="gm-search-open">
              <div className="gm-search-head">
                <button className="gm-back" onClick={() => setSearchOpen(false)} aria-label="ย้อนกลับ">←</button>
                <div style={{
        fontSize: 16,
        fontWeight: 600
      }}>ค้นหาสถานที่</div>
              </div>
              <SearchPlaceInput value={searchQuery} onChange={setSearchQuery} events={events} rooms={rooms} searchNodes={indoorSearchNodes} placeholder="ค้นหาตึก ห้อง กิจกรรม ลิฟต์ หรือห้องน้ำ" onPick={async sg => {
      if (sg.src === "event" && sg.event) {
        openEventCard(sg.event);
        return;
      }
      let coord = sg.coord;
      if (sg.src === "landmark" && sg.lm) {
        try {
          const r = await resolveLandmark(sg.lm);
          if (r?.coord) coord = r.coord;
        } catch (e) {}
      }
      openPlaceCard(sg.name, coord, sg);
    }} />
            </div>}
        </div> : null;
}
