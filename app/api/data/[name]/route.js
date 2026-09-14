import { list, insert, update, remove, logMapEdit } from "../../../../lib/store";

// CRUD กลางของทุก collection — ใช้ร่วมกันทุก UC ที่เป็นงานจัดการข้อมูล
const ALLOWED = new Set([
  "users", "requests", "feedback", "mapEdits", "contracts", "institutionAccess", "broadcasts",
  "mapBoundaries", "mapAssets", "mapDrafts", "categories", "news", "events",
  "eventInterest", "eventStats", "floors", "rooms", "usage", "requestQuota",
]);
// collection ที่ถือว่าเป็น "ข้อมูลแผนที่" → ต้องบันทึกประวัติการแก้ไขให้ผู้บริหารตรวจสอบ (UC3)
const MAP_COLLECTIONS = { mapBoundaries: "ขอบเขตแผนผัง", mapAssets: "ข้อมูลประกอบแผนผัง", mapDrafts: "ข้อมูลแผนที่", rooms: "ข้อมูลห้อง", floors: "ข้อมูลชั้นอาคาร", events: "ข้อมูลกิจกรรม" };

function guard(name) {
  return ALLOWED.has(name);
}

export async function GET(_req, { params }) {
  const { name } = await params;
  if (!guard(name)) return Response.json({ ok: false, error: "ไม่พบชุดข้อมูล" }, { status: 404 });
  return Response.json({ ok: true, items: await list(name) });
}

export async function POST(req, { params }) {
  const { name } = await params;
  if (!guard(name)) return Response.json({ ok: false, error: "ไม่พบชุดข้อมูล" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { _actor, ...item } = body;
  const row = await insert(name, item);
  if (MAP_COLLECTIONS[name]) await logMapEdit({ actorName: _actor?.name, actorId: _actor?.id, action: "เพิ่ม" + MAP_COLLECTIONS[name], target: row.name || row.label || row.code || row.id, after: "สร้างใหม่" });
  return Response.json({ ok: true, item: row });
}

export async function PATCH(req, { params }) {
  const { name } = await params;
  if (!guard(name)) return Response.json({ ok: false, error: "ไม่พบชุดข้อมูล" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const { id, _actor, ...patch } = body;
  const row = await update(name, id, patch);
  if (!row) return Response.json({ ok: false, error: "ไม่พบรายการ" }, { status: 404 });
  if (MAP_COLLECTIONS[name]) await logMapEdit({ actorName: _actor?.name, actorId: _actor?.id, action: "แก้ไข" + MAP_COLLECTIONS[name], target: row.name || row.label || row.code || row.id, after: JSON.stringify(patch).slice(0, 80) });
  return Response.json({ ok: true, item: row });
}

export async function DELETE(req, { params }) {
  const { name } = await params;
  if (!guard(name)) return Response.json({ ok: false, error: "ไม่พบชุดข้อมูล" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const actor = searchParams.get("actor") || "";
  const before = ((await list(name)).find((r) => r.id === id) || {});
  const ok = await remove(name, id);
  if (ok && MAP_COLLECTIONS[name]) await logMapEdit({ actorName: actor, action: "ลบ" + MAP_COLLECTIONS[name], target: before.name || before.label || before.code || id, before: "มีอยู่", after: "ถูกลบ" });
  return Response.json({ ok });
}
