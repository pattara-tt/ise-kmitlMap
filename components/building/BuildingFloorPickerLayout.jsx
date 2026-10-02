"use client";

export default function BuildingFloorPickerLayout({ view }) {
  const {
    b,
    curFloor,
    elRef,
    floorRecords,
    height,
    mergedFloors,
    onChangeRef,
    search,
    searchOpen,
    searchResults,
    selectSearch,
    resetToCampus,
    setCurFloor,
    setSearchedNodeId,
    setOpenKey,
    setSearch,
    setSearchOpen
  } = view;
  return <div style={{
  position: "relative",
  width: "100%",
  height,
  background: "#F8F9FA"
}}>

      {
    /* ===================================================
        Map
    =================================================== */}
      <div ref={elRef} style={{
    width: "100%",
    height: "100%"
  }} />

      {
    /* ===================================================
        Search
    =================================================== */}

      <div style={{
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 1200,
    width: "min(430px, calc(100% - 24px))"
  }}>

        <div style={{
      background: "#fff",
      border: "1px solid #DADCE0",
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(60,64,67,.28)",
      height: 46,
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 12px"
    }}>

          <div style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: "#1A73E8",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        flexShrink: 0
      }}>
            P
          </div>


          <input value={search} onChange={e => {
        setSearch(e.target.value);
        setSearchOpen(true);
      }} onFocus={() => {
        if (search.trim()) {
          setSearchOpen(true);
        }
      }} placeholder="ค้นหาสถานที่" style={{
        flex: 1,
        minWidth: 0,
        border: "none",
        outline: "none",
        fontSize: 14,
        color: "#202124",
        background: "transparent"
      }} />

          <span style={{
        color: "#5F6368",
        fontSize: 19
      }}>
            🔍
          </span>

        </div>


        {/* Search result */}
        {searchOpen && searchResults.length > 0 && <div style={{
      marginTop: 5,
      background: "#fff",
      border: "1px solid #DADCE0",
      borderRadius: 12,
      boxShadow: "0 4px 14px rgba(0,0,0,.2)",
      overflow: "hidden"
    }}>

              {searchResults.map((item, index) => <button key={`${item.kind}-${item.name}-${index}`} type="button" onMouseDown={e => e.preventDefault()} onClick={() => selectSearch(item)} style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "none",
        borderBottom: index < searchResults.length - 1 ? "1px solid #ECEFF1" : "none",
        background: "#fff",
        cursor: "pointer",
        textAlign: "left"
      }}>

                    <span style={{
          width: 28,
          textAlign: "center",
          fontSize: 18
        }}>
                      {item.icon}
                    </span>


                    <span style={{
          minWidth: 0
        }}>

                      <span style={{
            display: "block",
            fontWeight: 700,
            fontSize: 13,
            color: "#202124"
          }}>
                        {item.name}
                      </span>


                      {item.kind === "room" && <span style={{
            display: "block",
            marginTop: 2,
            fontSize: 11,
            color: "#5F6368"
          }}>
                          {(() => {
              const fr = (floorRecords || []).find(f => f.id === item.room.floorId);
              return `${b?.name || "อาคาร"} · ชั้น ${fr?.floorNo || "-"}`;
            })()}
                        </span>}

                    </span>

                  </button>)}

            </div>}

      </div>


      {/* ===================================================
          Legend
          =================================================== */}

      {b && <div style={{
    position: "absolute",
    left: 12,
    bottom: 12,
    zIndex: 1100,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    maxWidth: "calc(100% - 24px)"
  }}>

          {[["🚪", "ห้องเรียน"], ["🚻", "ห้องน้ำ"], ["🛗", "ลิฟต์"], ["🪜", "บันได"], ["🚪", "ทางเข้า/ออก"]].map(([icon, label]) => <div key={label} style={{
      background: "rgba(255,255,255,.94)",
      border: "1px solid #DADCE0",
      borderRadius: 18,
      padding: "5px 9px",
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 11.5,
      fontWeight: 700,
      color: "#3C4043",
      boxShadow: "0 1px 4px rgba(0,0,0,.15)"
    }}>

                <span>
                  {icon}
                </span>

                <span>
                  {label}
                </span>

              </div>)}

        </div>}


      {/* ===================================================
          Building / Floor selector
          =================================================== */}

      {b ? <div style={{
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1100,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 7
  }}>

          {/* Building name */}

          <div style={{
      background: "#fff",
      border: "1px solid #DADCE0",
      borderRadius: 20,
      padding: "6px 10px 6px 14px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      fontWeight: 800,
      color: "#202124",
      boxShadow: "0 2px 8px rgba(0,0,0,.16)"
    }}>

            <span>
              {b.name}
            </span>


            <button type="button" aria-label="ปิดอาคารและแสดงแผนที่ทั้งคณะ" onClick={resetToCampus} style={{
        width: 22,
        height: 22,
        border: "none",
        borderRadius: "50%",
        background: "#F1F3F4",
        color: "#5F6368",
        cursor: "pointer",
        display: "grid",
        placeItems: "center"
      }}>
              ✕
            </button>

          </div>


          {/* Floors */}

          <div style={{
      background: "#fff",
      border: "1px solid #DADCE0",
      borderRadius: 24,
      padding: 4,
      display: "flex",
      flexDirection: "column",
      gap: 3,
      boxShadow: "0 2px 8px rgba(0,0,0,.16)"
    }}>

            {mergedFloors.slice().reverse().map(f => {
        const active = String(f.id) === String(curFloor);
        return <button key={f.id} type="button" onClick={() => {
          setCurFloor(f.id);
          setSearchedNodeId(null);
          onChangeRef.current?.({
            building: b.name,
            floor: f.id
          });
        }} style={{
          width: 36,
          height: 36,
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          background: active ? "#1A73E8" : "transparent",
          color: active ? "#fff" : "#3C4043",
          fontWeight: 800,
          fontSize: 13
        }}>
                      {String(f.id)}
                    </button>;
      })}

          </div>

        </div> : <div style={{
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1100,
    background: "#fff",
    border: "1px solid #DADCE0",
    borderRadius: 20,
    padding: "7px 13px",
    fontSize: 12,
    fontWeight: 700,
    color: "#3C4043",
    boxShadow: "0 2px 8px rgba(0,0,0,.12)"
  }}>
          🏢 กดเลือกอาคาร
        </div>}

    </div>;
}