"use client";

import { useState } from "react";
import { useMapData } from "../../../lib/useMapData";
import { Btn, Card, Field, Input, Status, Textarea, UCHead, useCollection } from "../../ui";
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
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));
  const draftAssets = assets.filter(a => a.status === "draft");
  const draftBoundaries = boundaries.filter(b => b.status === "draft");
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

      {mapPage === "select" && <>

      <Card>
        <b style={{
        fontSize: 13.5,
        color: "#202124"
      }}>
          รายการฉบับร่าง (Draft)
          ที่รอเผยแพร่ขึ้นระบบจริง
        </b>

        <div style={{
        marginTop: 8,
        marginBottom: 14,
        fontSize: 13,
        color: "#5F6368"
      }}>
          {draftBoundaries.length === 0 && draftAssets.length === 0 ? <div style={{
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
              {draftBoundaries.map(b => <div key={b.id} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "#F8F9FA",
            borderRadius: 6,
            border: "1px solid #DADCE0"
          }}>
                    <span>
                      📍{" "}
                      <b>
                        [ขอบเขตแผนผังอาคาร: ]
                      </b>{" "}
                      {b.name}{" "}
                      ({b.type})
                    </span>

                    <Status value="draft" />
                  </div>)}

              {draftAssets.map(a => <div key={a.id} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "#F8F9FA",
            borderRadius: 6,
            border: "1px solid #DADCE0"
          }}>
                    <span>
                      📁{" "}
                      <b>
                        [แผนผังภายในอาคาร: ]
                      </b>{" "}
                      {a.name}{" "}
                      ({a.kind})
                    </span>

                    <Status value="draft" />
                  </div>)}
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
            {d.savedAt}{" "}
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

export default SaveMap;