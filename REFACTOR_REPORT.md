# SciMap — Refactor Report

วันที่ตรวจ: 22 กันยายน 2026  
สถานะ: **ส่งมอบ working copy สำหรับทดสอบต่อ; ยังไม่ผ่านเกณฑ์ production ทุกข้อ**

> รายงานนี้ตรวจจากไฟล์ที่มีอยู่จริงใน working copy ซึ่งสืบต่อจาก ZIP ที่ส่งมาและงานแก้ไขก่อนหน้าของบทสนทนา ไม่อ้างว่าทุก diff ใน working tree เป็นงาน refactor รอบนี้ ปฏิบัติต่อข้อมูลที่แก้ไว้ก่อนใน ZIP เป็นงานของผู้ใช้ และไม่ `git reset`/ลบทิ้ง

## 1. Phase และรายการ commit

| Phase | ผลงานที่อยู่ใน working copy | Commit ของ refactor |
|---|---|---|
| 0 — Cleanup | ล้าง conflict markers, เอา `.env` ออกจาก tracked files, ลบ route ชน catch-all และ data layer ฝั่ง frontend | **ยังไม่ได้สร้าง** |
| 1 — Schema/Migration | Schema 32 ตาราง, migration แบบ transaction, canonical ID, pre-drop count guard | **ยังไม่ได้สร้าง** |
| 2 — Seed | JSON 32 ชุด, generator bcrypt, canonical mock, static FK/constraint tests | **ยังไม่ได้สร้าง** |
| 3 — Backend | รองรับ normalized tables, composite keys, audit, bcrypt และ endpoint อ้างอิง/map | **ยังไม่ได้สร้าง** |
| 4 — Frontend | ใช้ reference/map API, map cache reload และ GIS Node/Edge tab | **ยังไม่ได้สร้าง** |
| 5 — Code quality | แยก panel/layout/hooks, ESLint/Prettier config, test scripts, เอกสาร | **ยังไม่ได้สร้าง** |

**เหตุผลที่ยังไม่ทำ commit แยก:** working tree ใน ZIP มีการแก้ไฟล์เดิมจำนวนมากค้างอยู่ก่อนงานต่อรอบนี้ จึงไม่สามารถระบุ provenance ของทุก diff ตาม Phase ได้อย่างมั่นใจ การ commit แบบเหมาแล้วอ้างว่าเป็นการเปลี่ยนแปลงใหม่ทั้งหมดจะทำให้ประวัติคลาดเคลื่อน นอกจากนี้ `.env` เคยถูก commit ใน Git history; ZIP ส่งมอบ **ไม่บรรจุ `.git` หรือ `.env`** เพื่อไม่ส่งต่อ credentials เก่า หากนำไป merge เข้า repo จริง ให้ review/commit ทีละ Phase บน branch ใหม่จาก repo ต้นทางหลังสำรองข้อมูล

## 2. ไฟล์ที่เพิ่ม ลบ และแก้

- **เพิ่มหลัก:** `db/migrations/001_normalize.sql`, `db/seed/*.json` (32 ไฟล์), `scripts/build-seed.js`, `scripts/check-seed.js`, `scripts/test-mock.mjs`, `scripts/check-source.js`, `scripts/verify-db.mjs`, `backend/src/constants.js`, `lib/api.js`, `lib/useRefData.js`, `lib/useMapData.js`, `lib/constants.js`, `components/mapConfig.js`, `components/panels/gis/NodeEdgeTab.jsx`, โฟลเดอร์ component ย่อย `components/map/`, `components/building/`, `components/panels/admin/`, `components/panels/gis/`, `components/panels/marketing/`, `.prettierrc.json`, `eslint.config.mjs`, `REFACTOR_REPORT.md`, `FILE_CHANGE_MANIFEST.md`
- **ลบ:** `lib/store.js`, `lib/pg.js`, `lib/usecases.js`, `components/mapConstants.js`, `app/api/stats/route.js`, `app/api/osm/route.js`, `app/api/walknet/route.js`; โฟลเดอร์ `box/` ไม่อยู่แล้ว; `.env` ถูกถอดจาก Git index
- **แก้หลัก:** `db/schema.sql`, `db/seed.sql`, `backend/src/store.js`, `backend/src/pg.js`, `backend/src/server.js`, `backend/src/auth.js`, components ที่โหลด reference/map ใหม่, `.gitignore`, `docker-compose.yml`, `README.md`, `package.json` และไฟล์ package/config ที่เกี่ยวข้อง
- สำหรับรายชื่อเต็มตาม Git working tree ดู `FILE_CHANGE_MANIFEST.md` ซึ่ง **อาจรวมการแก้ที่ผู้ใช้ทำไว้ก่อน** และไม่ใช่ changelog ที่รับรอง attribution ของแต่ละไฟล์

## 3. Seed กับ mock เดิมที่ไม่ตรงกัน

ใช้ `db/seed.sql` **จากไฟล์ต้นทางเดิมใน Git** เป็นหลัก แล้วแปลงเป็น `db/seed/*.json` หลัง normalize FK:

| ID | ชื่อใน legacy `db/seed.sql` ที่ยึดเป็นหลัก | ชื่อใน legacy `lib/store.js` ที่ต่างออกไป |
|---|---|---|
| U001 | จินยอง ปาร์ค | ผศ.ดร. วราภรณ์ ศรีบุญ |
| U002 | อาฮยาน จาง | ชนิดา พงษ์ทวี |
| U003 | ธานอส ซัง | ธนกฤต อินทโชติ |
| U004 | แตงโม จัง | ปิยะพงษ์ แก้วมณี |
| U005 | อาสะ คิม | ณัฐริกา สุขเกษม |
| U006 | ฮง ไลเคน | อรพรรณ ทองดี |
| U007 | อินฟินิตี้ ไอ | กิตติพัฒน์ ใจงาม |

เพิ่มเติม:

- U008: ใช้ `active` ตาม legacy `db/seed.sql` แทน `suspended` จาก mock เดิม
- RQ-1001: ใช้ `Sc8StudyRoom3F1` (normalized เป็น `ND-0010`) แทน `Sc8StudyRoom1F1` จาก mock
- RQ-1003: ใช้ `Sc8CoWork1F1` (normalized เป็น `ND-0007`) แทน `Sc8StudyRoom3F1` จาก mock
- Legacy seed มี `notifications.NT-001` ที่แจ้งว่าบัญชี U008 ถูกระงับ แต่สถานะ U008 ใน seed เดียวกันเป็น `active`; เก็บ notification เดิมไว้โดยไม่เปลี่ยนข้อความ UI หรือแอบลบประวัติ
- `event_stats.interested` เดิมเป็นข้อมูลสะสม (EV-01: 176) แต่ `event_interest` ของ seed มี EV-01 อยู่หนึ่งแถว; ตาม Target Schema เปลี่ยนเป็น `event_stats_view.interested` ที่นับจริงจากตารางสัมพันธ์ ผลลัพธ์ของ seed จึงเป็น **1** ไม่ใช่ 176 ซึ่งเป็นความต่างเชิงความหมายที่ควรยืนยันกับเจ้าของข้อมูลหากมีข้อมูลจริงเพิ่มเติม

## 4. จุดที่เบี่ยง/ต้องตัดสินใจและเหตุผล

- Migration ใช้ ID สถาบันเดียวกับ canonical seed (`INST-01`–`INST-04`) แทนสร้าง ID hash คนละชุด; รวมชื่อ `KMITL` กับ `สจล. (KMITL)` ให้เป็นสถาบันเดียวกัน
- ใช้ `FAC-10` ของ seed เป็นคณะสำหรับอาคารเก่าที่ไม่มีคณะ ไม่สร้าง `FAC-MIG` ชื่อ `อื่น ๆ` ซ้ำ ซึ่งชน UNIQUE constraint
- อาคาร `Sc8` จาก registrar แมปกับ canonical code `SC8` แบบ case-insensitive; ชั้นที่ซ้ำแมปเข้าชั้น canonical แล้วเก็บ `svg`, `note` และสถานะเดิมเมื่อมีข้อมูล; สำหรับห้องที่ชั้นไม่มีใน legacy floors จะสร้างชั้นประกอบเพิ่ม
- Legacy node keys ที่ไม่มีใน graph canonical จะถูกสร้างเป็น placeholder โดยผูกชั้นของห้องที่เกี่ยวข้องเท่าที่หาได้; ถ้าหาที่มาไม่ได้จะ fallback ไปยังชั้นแรก **ต้องตรวจพิกัด placeholder ของข้อมูล production ก่อนใช้นำทาง**
- แปลงชื่อของ draft/boundary ไปยัง building FK เฉพาะเมื่อ match ชื่อ/รหัสอาคารได้; log เก่าพยายามจับ FK เฉพาะเมื่อ match เป้าหมายได้หนึ่งรายการ มิฉะนั้นเก็บ `target_label` โดยไม่เดา
- เพิ่มโมดูลที่เคยอยู่ใน `institution_access.modules` และไม่มีใน master `modules` ขึ้นทะเบียนด้วย code/name เดิม เพื่อไม่ทำข้อมูลสิทธิ์ของสถาบันหาย
- ตรวจจำนวนแถวของข้อมูลธุรกิจและ log สำคัญก่อน DROP legacy tables; เมื่อจำนวนลดจะ raise exception และ rollback transaction ทั้งหมด แทนการ `ON CONFLICT DO NOTHING` แล้วลบต้นทางโดยไม่แจ้ง
- Migration ของ DB เก่าที่ใช้ schema แตกต่างจาก snapshot เดิม, สถาบันที่ชื่อกำกวม, duplicate หลัง normalize หรือมี custom triggers/views **ยังต้องทดลองจาก backup ก่อน production**

## 5. เช็กลิสต์ส่วนที่ 8 — หลักฐาน

### ฐานข้อมูล

| รายการ | ผล | หลักฐาน / ข้อจำกัด |
|---|---|---|
| DB เปล่า → schema → seed ผ่าน | **ยังไม่ยืนยัน** | environment นี้ไม่มี PostgreSQL server/`psql` |
| DB เก่า → migration; จำนวน users/requests/news/events/log ไม่หาย | **ยังไม่ยืนยัน** | SQL มี transaction และ pre-drop row-count guard แต่ยังไม่ได้ execute กับ PostgreSQL 16 |
| `CREATE TABLE` = 32 ไม่มีชื่อซ้ำ | **ผ่าน (static)** | `grep -c '^CREATE TABLE' db/schema.sql` = 32; `scripts/check-seed.js` ตรวจ unique table names |
| ไม่มี plaintext password column | **ผ่าน (static/mock)** | schema มี `password_hash` อย่างเดียว, seed builder ใช้ bcrypt, mock verify hash; ต้องรัน `test:pg` ยืนยัน DB จริง |

### โค้ด

| รายการ | ผล | หลักฐาน / ข้อจำกัด |
|---|---|---|
| ไม่มี conflict markers, `box/`, tracked `.env` | **ผ่าน (working copy)** | recursive grep ไม่พบ markers; โฟลเดอร์ `box/` ไม่มี; `git ls-files .env` ว่าง |
| ไม่มี frontend data layer/routes ที่ระบุให้ลบ | **ผ่าน (static)** | ตรวจ path แล้วไม่พบ |
| ไม่เหลือ hard-code token ที่ระบุและ `mapEdits`/`logMapEdit` | **ผ่าน (static ใน source ที่เกี่ยวข้อง)** | grep ไม่พบใน `app`, `components`, `lib`, `backend/src`; migration มีชื่อ legacy ตามเจตนา |
| JS/JSX syntax และ local import paths | **ผ่าน (static)** | `npm run test:source`: parse 107 ไฟล์, resolve 177 imports |
| `npm run lint` | **ตรวจไม่ได้** | `eslint: not found` ใน dependency ของ environment นี้; ต้อง `npm ci` บนเครื่องที่ติดตั้ง package ครบ |
| Frontend `npm run build` | **ตรวจไม่ได้** | Next 16.3.2 โหลด SWC binary สำหรับ linux/x64 ไม่ได้; ไม่ใช่หลักฐานว่า compile โค้ดผ่าน |
| Backend start ทั้งสองโหมด | **ตรวจไม่ได้** | ติดตั้ง `express`/dependencies ไม่ครบ; `npm install` ทำงานไม่สำเร็จเพราะ registry DNS `EAI_AGAIN` |
| Data layer mock ทดสอบได้ | **ผ่าน** | `npm run test:mock`: bcrypt, composite keys, cascade node/edge, audit `SET NULL`, derived interested, quota |
| Seed JSON ครบ/FK ถูกต้อง | **ผ่าน** | `npm run test:seed`: 32 ตาราง, 252 แถว, 311 FK references; rebuild SQL สำเร็จ |

### Flow ทั้ง PostgreSQL และ mock

| Flow ที่กำหนด | Mock | Postgres |
|---|---|---|
| สมัคร / login ถูก-ผิด / logout / timeout | **บางส่วน** — hash compare ผ่าน, HTTP/session ยังไม่ทดสอบ | ยังไม่ทดสอบ |
| Login 7 roles และเมนูถูก | **บางส่วน** — roles/role_use_cases seed และ data API มี; ยังไม่ทดสอบ UI | ยังไม่ทดสอบ |
| Admin suspend / restore / change role / account history | ยังไม่ทดสอบ end-to-end | ยังไม่ทดสอบ |
| ส่งคำร้อง quota / Registrar ตรวจ / log FK | **บางส่วน** — quota และ JSON request ผ่าน data layer | ยังไม่ทดสอบ |
| GIS CRUD nodes/edges → route เปลี่ยน / log | **บางส่วน** — mock insert/delete/cascade/audit ผ่าน; route UI ไม่ทดสอบ | ยังไม่ทดสอบ |
| GIS room/floor/boundary/asset logs | ยังไม่ทดสอบ end-to-end | ยังไม่ทดสอบ |
| PR news/events replace และ log | ยังไม่ทดสอบ end-to-end | ยังไม่ทดสอบ |
| Event interest → `event_stats_view` เพิ่ม | **บางส่วน** — mock derived count ถูก | ยังไม่ทดสอบ |
| Marketing modules / access_history; ไม่ลง edit_logs | **บางส่วน** — static backend flow และ FK seed; HTTP ยังไม่ทดสอบ | ยังไม่ทดสอบ |
| Dashboard stats ผ่าน backend | **บางส่วน** — route/proxy static check; UI ยังไม่ทดสอบ | ยังไม่ทดสอบ |

## 6. สิ่งที่ยังไม่เสร็จ/ต้องตรวจเพิ่มเติม

1. ทดสอบ `db/schema.sql` → `db/seed.sql` กับ PostgreSQL 16 จริงบน DB เปล่า แล้วรัน `npm run test:pg` กับ DB ทดสอบ
2. Restore backup ของ DB รุ่นเดิมลง DB ทดสอบ รัน `001_normalize.sql`; เปรียบเทียบจำนวนแถวก่อน/หลังทุกกลุ่มธุรกิจ รวมถึงตรวจการแมปโหนดและห้องของอาคารที่เพิ่มเอง
3. `npm ci` ทั้ง root และ `backend/` บน Linux/Windows ที่มี registry ใช้งานได้ จากนั้น `npm run lint`, `npm run build`, เปิด backend สองโหมด แล้วทดสอบ HTTP/UI ตาม Flow checklist
4. แบ่งไฟล์ที่ยังเกินแนวทาง ~400 บรรทัดเพิ่มเติม (ตัว wrapper หลัก `MapView.jsx` ~471, `Buildingfloorpicker.jsx` ~461; แท็บย่อยบางไฟล์และ `RegistrarPanel.jsx` ยังใหญ่) โดยทดสอบ visual regression ควบคู่ไปด้วย
5. จัดการ authorization ของ generic endpoints และสิทธิ์สมัครสมาชิกของระบบ production แยกจาก demo (เช่น API ปัจจุบันให้ client ส่ง role ตอน register); เป็นการเปลี่ยนพฤติกรรมด้านสิทธิ์ที่ต้องอนุมัติการออกแบบก่อนเปิดใช้งานจริง
6. ตรวจ/สร้าง commit แยก Phase ใน repo ที่เก็บประวัติจริง หลังแยก pre-existing changes ของผู้ใช้ออกจาก refactor; **อย่าส่ง `.git` เดิมต่อก่อนตรวจประวัติ secret**

## 7. Security และขั้นตอนผู้ใช้ต้องทำ

- **เปลี่ยนรหัสผ่าน PostgreSQL ที่เคยอยู่ใน Git history ทันที**; `.gitignore` และการถอด `.env` จาก index ไม่สามารถถอน secret จากประวัติ commit เก่าหรือ backups ได้
- เก็บไฟล์ `.env` ของ production ไว้นอก ZIP/แหล่งเผยแพร่ สร้างใหม่จาก `.env.example` และใช้ credentials ใหม่
- เปลี่ยนรหัสผ่านบัญชี demo หลัง deploy; รหัส seed `1234` ใช้เพื่อทดสอบเท่านั้น
- อย่ารัน migration บน DB production โดยตรงก่อนทดสอบกับ backup และตรวจ row counts/relationships

## 8. คำสั่งทดสอบที่ทำซ้ำได้

```bash
npm ci
(cd backend && npm ci)
node scripts/build-seed.js
npm run test:seed
npm run test:mock
npm run test:source
npm run lint
npm run build

# เท่านั้นเมื่อ DATABASE_URL ชี้ไป DB ทดสอบที่รัน schema + seed/migration แล้ว
DATABASE_URL='postgresql://...' npm run test:pg
```

## 9. Docker frontend build-fix addendum (22 September 2026)

หลังได้รับ Docker log จากผู้ใช้ พบว่า frontend Turbopack รายงาน 29 errors จาก
`default export` ที่หายไปในไฟล์ย่อยหลัง split component และ named exports 3 จุดใน
`mapViewHelpers.js` จึงเพิ่ม export ให้ครบ และเพิ่ม `scripts/check-exports.js`
เพื่อให้ `npm run test:source` ตรวจชื่อ export จริง ไม่ใช่แค่มีไฟล์ import อยู่

ทดสอบ static/import checks **ผ่าน** (108 files, 177 local paths, 474 bindings),
seed **ผ่าน** (32 tables, 252 rows, 311 FK), mock data layer **ผ่าน**.
ยัง **ไม่ยืนยันว่า Docker/Next build ผ่าน** ใน environment นี้ เพราะไม่มี Linux/x64
SWC binaries; ผู้ใช้ต้องทดสอบ Docker build อีกครั้งบนเครื่องที่ติดตั้ง dependencies ครบ.

รายละเอียดไฟล์/คำสั่งอ
# SciMap — Docker / Next.js import-export build fix

Date: 2026-09-22

## Cause from the Docker log

The user's Docker build completed the backend image, but frontend `next build`
failed with 29 reported Turbopack errors. The first failure was an absent
`EVENT_PIN_ICON` named export from `components/map/mapViewHelpers.js`.
Additional failures came from default imports of split Admin, GIS and Marketing
components whose modules declared a component function but had no `export default`.

## Changes

- Add `export default` to 12 split components: the seven Admin files
  (UsersTab, RequestsTab, RequestReportTab, QuotaTab, RolesTab,
  AccountStatusTab, RequestDetail), four GIS files (BoundaryTab,
  FloorplanEditor, OSMMap, SaveMapTab), and Marketing/BroadcastTab.
- Export `EVENT_PIN_ICON`, `isEventVisible`, and `fetchPlaceInfo` from
  `components/map/mapViewHelpers.js`.
- Add `scripts/check-exports.js` and include it in `npm run test:source`;
  static checks now verify that named/default imports are actually exported,
  not only that the source files exist.

## Verification in this environment

- `npm run test:source`: PASS, 108 JS/JSX files parsed, 177 local paths
  resolved, 474 local named/default import/re-export bindings validated.
- `npm run test:seed`: PASS, 32 schema tables, 252 rows, 311 FK references.
- `npm run test:mock`: PASS, hash, composite-key, audit, cascade, quota tests.
- Full `npm run build`: NOT VERIFIED in this environment because its pre-existing
  Next.js install lacks the Linux/x64 SWC native and WASM binaries. The user's
  Docker builder did install Next successfully, so rerunning on that Docker
  host is the appropriate final compile check.
- PostgreSQL migration and end-to-end UI/API flows remain unverified, as noted
  in `REFACTOR_REPORT.md`. This is a frontend build fix, not a claim that the
  whole refactor is production ready.

## Re-test safely

Use a new extraction folder, or apply the patch-only ZIP over the earlier
refactor ZIP. Keep your local `.env` secret outside distributable archives.
From the project root:

```bash
docker compose build --no-cache frontend
docker compose up -d
```

Do **not** use `docker compose down -v` just to fix the frontend, as that
would remove the database volume. A database volume created before the
normalized schema was introduced must be migrated from a backup separately;
Postgres only runs `docker-entrypoint-initdb.d` SQL on first initialization.
