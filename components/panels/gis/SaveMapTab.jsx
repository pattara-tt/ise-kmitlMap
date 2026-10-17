"use client";

import { useState } from "react";
import { useMapData } from "../../../lib/useMapData";
import { Btn, Card, Field, Input, Select, Status, Textarea, UCHead, useCollection } from "../../ui";
import { formatDateTime } from "../../../lib/datetime";
import NodeEdgeTab from "./NodeEdgeTab";
import { todayStr } from "./shared";

/* =========================================================
   UC9 : บันทึกข้อมูลแผนที่
========================================================= */

function SaveMap({
  user
}) {
  const {
    data: mapData
  } = useMapData();
  const {
    items,
    create,
    patch
  } = useCollection("mapDrafts");
  const {
    items: assets = [],
    patch: patchAsset
  } = useCollection("mapAssets");
  const {
    items: boundaries = [],
    patch: patchBoundary
  } = useCollection("mapBoundaries");
  const [form, setForm] = useState({
    name: "",
    note: ""
  });

  const [mapPage, setMapPage] = useState("select");

  // ตัวกรองหมวดของรายการรอเผยแพร่ (UC7 ขอบเขต / UC8 แผนผังภายในอาคาร)
  const [selectedCategory, setSelectedCategory] = useState("all");

  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));

  /* -----------------------------------------
     ตัวช่วยกรอง / เรียง
  ----------------------------------------- */

  const statusOf = row => row.status || "draft";
  const newestFirst = (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);

  // floorId → { ...floor, building }  (asset ผูกกับอาคารผ่าน floor เท่านั้น)
  const floorById = new Map(
    (mapData?.buildings || []).flatMap(b =>
      (b.floors || []).map(f => [f.id, { ...f, building: b }])
    )
  );

  // รายการรอเผยแพร่ = เฉพาะ draft (กดเผยแพร่แล้วจะกลายเป็น published และหายจากรายการนี้)
  // ส่วนรายการให้เลือกอาคาร/ชั้น/พื้นที่ใน NodeEdgeTab แสดงทุกสถานะอยู่แล้ว
  const draftAssets = assets.filter(a => statusOf(a) === "draft");
  const draftBoundaries = boundaries.filter(b => statusOf(b) === "draft");

  // ขอบเขตจาก UC7 : เฉพาะ draft ตามหมวดที่เลือก
  const filteredBoundaries = draftBoundaries
    .filter(b => selectedCategory === "all" || b.type === selectedCategory)
    .sort(newestFirst);

  // แผนผังภายในอาคารจาก UC8 : นับเป็นหมวด "อาคาร" เสมอ
  const filteredAssets = (selectedCategory === "all" || selectedCategory === "building")
    ? [...draftAssets].sort(newestFirst)
    : [];

  const handlePublish = async draftId => {
    if (!confirm("ยืนยันการเผยแพร่ข้อมูลแผนที่ ขอบเขต และไฟล์ประกอบทั้งหมดขึ้นระบบจริง?")) return;
    try {
      await patch(draftId, {
        status: "published"
      }, user);
      for (const asset of draftAssets) {
        try {
          await patchAsset(asset.id, {
            status: "published",
            updatedAt: todayStr()
          }, user);
        } catch (e) {
          console.warn(`Publish asset ${asset.id} failed:`, e);
        }
      }
      for (const boundary of draftBoundaries) {
        try {
          await patchBoundary(boundary.id, {
            status: "published",
            updatedAt: todayStr()
          }, user);
        } catch (e) {
          console.warn(`Publish boundary ${boundary.id} failed:`, e);
        }
      }
      alert("เผยแพร่ข้อมูลขึ้นระบบจริงเรียบร้อยแล้ว!");
    } catch (error) {
      console.error("Publish failed:", error);
      alert("เกิดข้อผิดพลาดในการเผยแพร่ กรุณาลองใหม่อีกครั้ง");
    }
  };
  return <>
      <UCHead title="บันทึกข้อมูลแผนที่" desc="บันทึกการเปลี่ยนแปลงเป็นฉบับร่างก่อน แล้วจึงยืนยันเผยแพร่ขึ้นระบบจริง" />

      <NodeEdgeTab user={user} mapData={mapData} onPageChange={setMapPage} />
      
      {mapPage === "select" && (
        <Card>
          <Field label="เลือกหมวดข้อมูล">
            <Select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="campus">วิทยาเขต</option>
              <option value="building">อาคาร</option>
              <option value="zone">โซน/พื้นที่ย่อย</option>
            </Select>
          </Field>
        </Card>
      )}

      {mapPage === "select" && <>

      <Card>
        <b style={{
        fontSize: 13.5,
        color: "#202124"
      }}>
          รายการฉบับร่างที่รอเผยแพร่
        </b>

        <div style={{
        marginTop: 8,
        marginBottom: 6,
        fontSize: 12,
        color: "#5F6368"
      }}>
          รอเผยแพร่: ขอบเขต {draftBoundaries.length} รายการ · แผนผัง {draftAssets.length} รายการ
        </div>

        <div style={{
        marginBottom: 14,
        fontSize: 13,
        color: "#5F6368"
      }}>
          {filteredBoundaries.length === 0 && filteredAssets.length === 0 ? <div style={{
          padding: "10px",
          background: "#F8F9FA",
          borderRadius: 6,
          border: "1px dashed #DADCE0",
          textAlign: "center"
        }}>
              ไม่มีรายการฉบับร่างค้างอยู่
              (ข้อมูลเป็นระบบจริงทั้งหมดแล้ว
              หรือยังไม่ได้สร้างข้อมูลใน
              UC7/UC8)
            </div> : <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}>
              {filteredBoundaries.map(b => <div key={b.id} style={rowStyle}>
                    <span>
                      📍{" "}
                      <b>
                        [ขอบเขต{TYPE_LABEL[b.type] || ""}]
                      </b>{" "}
                      {b.name || "ไม่ระบุชื่อ"}
                    </span>

                    <Status value={statusOf(b)} />
                  </div>)}

              {filteredAssets.map(a => {
                const fl = floorById.get(a.floorId);
                const buildingName = fl?.building?.name || "อาคาร";
                const floorLabel = fl ? (fl.name || `ชั้น ${fl.floorNo}`) : "";

                return (
                  <div key={a.id} style={rowStyle}>
                    <span>
                      📁 <b>[แผนผังภายในอาคาร]</b>{" "}
                      {buildingName}
                      {floorLabel ? ` · ${floorLabel}` : ""}
                      {" — "}
                      {a.name}
                      {a.kind ? ` (${a.kind})` : ""}
                    </span>
                    <Status value={statusOf(a)} />
                  </div>
                );
              })}
            </div>}
        </div>

        <hr style={{
        border: "none",
        borderTop: "1px solid #E8EAED",
        margin: "14px 0"
      }} />

        <Field label="ชื่อรายการที่บันทึก">
          <Input value={form.name} onChange={set("name")} placeholder="เช่น ปรับพิกัดทางเข้าอาคาร" />
        </Field>

        <Field label="บันทึกช่วยจำ / รายละเอียดการแก้ไข">
          <Textarea value={form.note} onChange={set("note")} />
        </Field>

        <Btn onClick={async () => {
        if (!form.name.trim()) {
          return alert("กรุณาระบุชื่อรายการ");
        }
        await create({
          ...form,
          buildingId: mapData?.building?.id || null,
          savedAt: new Date().toISOString(),
          savedBy: user.id,
          status: "draft"
        }, user);
        setForm({
          name: "",
          note: ""
        });
      }}>
          บันทึกเป็นฉบับร่าง
        </Btn>
      </Card>

      {items.map(d => <Card key={d.id}>
          <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8
      }}>
            <b style={{
          fontSize: 14,
          color: "#202124"
        }}>
              {d.name}
            </b>

            <Status value={d.status} />
          </div>

          <div style={{
        fontSize: 13,
        color: "#3C4043",
        marginTop: 4
      }}>
            {d.note}
          </div>

          <div style={{
        fontSize: 11.5,
        color: "#5F6368",
        marginTop: 7
      }}>
            บันทึกเมื่อ{" "}
            {formatDateTime(d.savedAt)}{" "}
            โดย{" "}
            {d.savedByName || d.savedBy || "-"}
          </div>

          <div style={{
        marginTop: 9
      }}>
            {d.status === "draft" ? <Btn kind="ok" onClick={() => handlePublish(d.id)}>
                ยืนยันเผยแพร่ขึ้นระบบจริง
              </Btn> : <Btn kind="ghost" disabled>
                เผยแพร่แล้ว
              </Btn>}
          </div>
        </Card>)}
        </>}
    </>;
}

/* =========================================================
   Small Components / Styles
========================================================= */

const TYPE_LABEL = {
  campus: "วิทยาเขต",
  building: "อาคาร",
  zone: "โซน"
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  background: "#F8F9FA",
  borderRadius: 6,
  border: "1px solid #DADCE0"
};

export default SaveMap;