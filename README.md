# SciMap

ระบบแผนที่และนำทางภายในมหาวิทยาลัย (KMITL) แบ่งเป็น 3 ส่วน: Next.js frontend, Express backend และ PostgreSQL 16

```
Browser → Next.js (:3000) → app/api/[...path]/route.js → Express (:4000) → PostgreSQL
                                                                         └→ หรือ mock in-memory (ไม่ตั้ง DATABASE_URL)
```

Frontend ไม่ต่อฐานข้อมูลโดยตรง ทุก `/api/*` ถูกส่งต่อไป backend โดย `app/api/[...path]/route.js` ซึ่งอ่าน `BACKEND_URL` ตอน request (ค่าเริ่มต้น `http://localhost:4000`)

## โครงสร้างโปรเจกต์

| Path | หน้าที่ |
|---|---|
| `app/` | `page.jsx` (login → เลือก panel ตาม role), `layout.jsx`, `api/[...path]/route.js` (proxy) |
| `components/UserApp.jsx` | แอปผู้ใช้ทั่วไป: แผนที่ · กิจกรรม · แจ้งเตือน · แจ้งปัญหา |
| `components/MapView.jsx`, `components/map/` | แผนที่หลัก: `layout/*Panel.jsx` (UI), `hooks/useMapEffect*.js` (effect ของแผนที่), `use*Actions.js` (ตรรกะนำทาง/สถานที่/รายงาน) |
| `components/Buildingfloorpicker.jsx`, `components/building/` | แผนที่ภายในอาคารและเลือกชั้น |
| `components/mapConfig.js`, `mapGeo.js`, `mapBaseLayer.js` | config การแสดงผล, คำนวณเรขาคณิต/เส้นทาง, base layer (อาคาร/ชั้น/node/edge โหลดจาก backend) |
| `components/panels/` | panel ของแต่ละ role: `Exec`, `Marketing`, `Gis`, `Admin`, `Pr`, `Registrar` (โฟลเดอร์ย่อย `admin/ gis/ marketing/ registrar/` เก็บแท็บ) |
| `components/ui.jsx` | UI kit, ไอคอน และ hook `useCollection` (เรียก `/api/data/:name`) |
| `lib/` | `api.js` (fetch wrapper), `useRefData.js`, `useMapData.js`, `datetime.js`, `schedule.js`, `constants.js` |
| `backend/src/server.js` | routes, ตรวจ session/role, audit log |
| `backend/src/store.js` | data layer แบบ mock in-memory (โหลดจาก `db/seed/*.json`) |
| `backend/src/pg.js` | data layer PostgreSQL ใช้ interface เดียวกับ `store.js` และแปลง `snake_case` ↔ `camelCase` |
| `backend/src/auth.js`, `account.js`, `overpass.js`, `constants.js` | session/idle timeout · ผลข้างเคียงของบัญชี · proxy OSM/walknet · enum ของ role และสถานะ |
| `db/schema.sql`, `db/SCHEMA.md` | schema ปัจจุบัน (34 ตาราง + view `event_stats_view`) และเอกสารอธิบายทุกตาราง/FK/ER diagram |
| `db/seed/*.json` | ข้อมูล seed ต้นทาง (หนึ่งไฟล์ต่อตาราง) |
| `db/seed-base.sql` | **สร้างอัตโนมัติ** ข้อมูลเริ่มต้น: roles/เมนู/modules/โควตา, สถาบัน/คณะ/หมวดหมู่/ประเภทห้อง และแผนที่ Sc8 ครบ (ตึก, ชั้น, โหนด, เส้นทาง, ห้อง, ขอบเขต, ผังชั้น) ไม่มีผู้ใช้ |
| `db/seed-demo.sql` | **สร้างอัตโนมัติ** ข้อมูลสาธิต (ผู้ใช้ `1234`, คำร้อง, กิจกรรม ฯลฯ) ต้องโหลดหลัง base |
| `db/seed.sql` | **สร้างอัตโนมัติ** base + demo รวมไฟล์เดียว |
(ทั้งสามไฟล์สร้างจาก JSON ด้วย `scripts/build-seed.js` อย่าแก้ด้วยมือ)
| `db/migrations/` | migration สำหรับ DB ที่มีอยู่แล้ว (ดูหัวข้อ Migration) |
| `scripts/` | seed builder, test/verify scripts, สคริปต์สำรวจข้อมูล GIS |
| `public/data/` | dataset GIS แบบ static (ร่มเงา, น้ำท่วม, ไฟถนน ฯลฯ) |
| `deploy/` | คู่มือและสคริปต์ deploy (ดู `deploy/DEPLOY.md`) |

> `db/components/` เป็นสำเนาเก่าของ component ไม่ถูกใช้งานโดยแอป

## ติดตั้ง

```bash
npm install
cd backend && npm install
```

ถ้าได้โปรเจกต์เป็น ZIP ให้ลบ `node_modules` และ `.next` แล้วติดตั้งใหม่ เพราะ native package ของ Next.js ผูกกับ OS

## รันแบบพัฒนา

### โหมด mock (ไม่ต้องมีฐานข้อมูล)

ไม่ตั้ง `DATABASE_URL` ข้อมูลโหลดจาก `db/seed/*.json` และรีเซ็ตทุกครั้งที่ backend restart

```bash
# เทอร์มินัล 1
cd backend && npm run dev     # http://localhost:4000
# เทอร์มินัล 2
npm run dev                   # http://localhost:3000
curl http://localhost:4000/health   # {"ok":true,"backend":"scimap","storage":"memory"}
```

### โหมด PostgreSQL ผ่าน Docker Compose

```bash
cp .env.example .env          # เปลี่ยน POSTGRES_PASSWORD
node scripts/build-seed.js
docker compose up -d --build  # เปิด http://localhost
```

`db/schema.sql` และ `db/seed-base.sql` ถูกรันอัตโนมัติ **เฉพาะตอนสร้าง volume ครั้งแรก** (ค่าเริ่มต้นคือ base ไม่มีผู้ใช้ ต้องสมัครเอง หรือโหลด demo เพิ่ม)

| ต้องการ | คำสั่ง |
|---|---|
| เริ่มใหม่แบบ base (ค่าเริ่มต้น) | `docker compose down -v && docker compose up -d --build` |
| เริ่มใหม่แบบครบ base+demo | `docker compose down -v && SEED_FILE=seed.sql docker compose up -d --build` (หรือใส่ `SEED_FILE=seed.sql` ใน `.env`) |
| เพิ่ม demo ให้ฐานที่รันอยู่ (ไม่ลบข้อมูล) | `docker compose exec -T db psql -U kmitlmap -d kmitlmap < db/seed-demo.sql` |
| เติม base ซ้ำ (ไม่ทับของเดิม) | `docker compose exec -T db psql -U kmitlmap -d kmitlmap < db/seed-base.sql` |
| VM (`setup-vm.sh`) | `sudo ./deploy/setup-vm.sh` (base) หรือ `sudo SEED_FILE=seed.sql ./deploy/setup-vm.sh` |
| mock (ไม่มี DB) | โหลด `db/seed/*.json` ครบทุกตารางเสมอ ไม่เกี่ยวกับ base/demo |

ทุกไฟล์ใช้ `ON CONFLICT DO NOTHING` จึงรันซ้ำได้ ข้อมูลของเดิมไม่ถูกทับ ถ้าแก้ schema/seed แล้วต้องการเริ่มใหม่ใช้ `docker compose down -v` (ลบข้อมูลใน volume ทั้งหมด)

### PostgreSQL ที่ติดตั้งเอง

```bash
export DATABASE_URL='postgresql://user:password@localhost:5432/kmitlmap'
export SESSION_MAX_DAYS=7
cd backend && npm start
```

## Workflow การใช้งานของระบบ

1. ผู้ใช้ login/สมัครที่ `AuthPage` → `POST /api/auth` ได้ `sessionId` ส่งใน header `x-session-id` ทุกครั้ง
2. `lib/useRefData.js` โหลด role และเมนู (`/api/ref/roles`, `/api/ref/use-cases`) ตามสิทธิ์ของ role
3. `app/page.jsx` เลือก panel ตาม role ผู้ใช้ทั่วไปเข้า `UserApp`
4. ข้อมูลทั่วไปอ่าน/เขียนผ่าน `/api/data/:name` (`useCollection`); ข้อมูลแผนที่ผ่าน `/api/map/*`
5. การแก้ข้อมูลถูกบันทึก audit: `edit_logs` (แผนที่/ข่าว/กิจกรรม/คำร้อง ฯลฯ), `access_history` (ฝ่ายการตลาด), `account_history` (บัญชีผู้ใช้)

## แก้ไขระบบอย่างไร

| งาน | ทำที่ไหน |
|---|---|
| แก้ข้อมูล seed | แก้ `db/seed/*.json` → `node scripts/build-seed.js` → `npm run test:seed` |
| เพิ่ม/เปลี่ยน schema | เพิ่ม `db/migrations/00N_*.sql`, แก้ `db/schema.sql` ให้ตรงกัน, แก้ทั้ง `store.js` และ `pg.js` |
| เพิ่ม API/collection | `backend/src/server.js` + data layer ทั้งสอง + เรียกผ่าน `useCollection` / `lib/api.js` |
| เพิ่ม role หรือเมนู | `db/seed/roles.json`, `use_cases.json`, `role_use_cases.json` + `PANELS` ใน `app/page.jsx` |
| แก้พฤติกรรมแผนที่ | `components/map/hooks/`, `components/map/layout/` |

`store.js` และ `pg.js` ต้องทำงานเหมือนกัน ทุกครั้งที่แก้ data layer ให้รันทั้ง `test:mock` และ `test:pg`

## ทดสอบและตรวจคุณภาพ

```bash
npm run lint          # ESLint (app components lib)
npm run test:seed     # ตรวจ seed: ตาราง, unique, FK
npm run test:mock     # data layer แบบ mock (ต้องติดตั้ง backend deps ก่อน)
npm run test:source   # parse JS/JSX, ตรวจ import/export
npm run test:basemap  # base layer ของแผนที่
npm run build         # production build ของ Next.js

DATABASE_URL='postgresql://...' npm run test:pg   # ตรวจ DB ทดสอบที่รัน schema+seed แล้ว
```

`scripts/test-registrar.mjs` ทดสอบส่วนของ registrar/room types (ยังไม่มี npm script)

## Migration

`db/migrations/` เป็นไฟล์สำหรับ DB ที่สร้างไปแล้ว (DB ใหม่ใช้ `schema.sql` อย่างเดียว) สำรองข้อมูลและลองกับสำเนาก่อนเสมอ:

| ไฟล์ | เนื้อหา |
|---|---|
| `001_normalize.sql` | แปลง schema 20 ตารางเดิมเป็น normalized (รันครั้งเดียว ใน transaction; มี row-count guard ก่อน drop ตารางเก่า) |
| `002_event_room_type_override.sql` | `events.room_id`, `events.temporary_room_type` |
| `002_request_process.sql` | เพิ่มสถานะ `processing` ให้ `requests` |
| `003_registrar_room_types.sql`, `004_registrar_room_types_df.sql` | ตาราง `room_types` และค่าเริ่มต้น (รันซ้ำได้) |
| `005_map_boundaries_institution.sql` | `map_boundaries.institution_id` |
| `006_contracts_usecase_title.sql` | แก้ชื่อเมนู `contracts` (ข้อมูลเท่านั้น) |
| `007_exec_requests_and_search_stats.sql` | เมนูผู้บริหาร: แยกคำร้องออกจากข้อเสนอแนะ และเพิ่มสถิติการค้นหา (ข้อมูลเท่านั้น) |
| `008_search_logs.sql` | ตาราง `search_logs` เก็บประวัติการค้นหา/นำทาง (รันซ้ำได้) |
| `012_remove_unused_buildings.sql` | ลบตึกชั่วคราวนอก `FAC-05` ที่ไม่มีข้อมูลแผนที่ (เก็บ `BLD-B007` ไว้ก่อน) |
| `013_feedback_drop_status.sql` | ลบคอลัมน์ `status` และ `reply` ของ `feedback` |
| `014_remove_test_map_data.sql` | ลบข้อมูลแผนที่ที่ใช้ทดสอบ (ขอบเขต SC9/IT, ตึก IT, log ที่เกี่ยวข้อง) และคืนตำแหน่งผังชั้น 1 |
| `015_remove_sc9_building.sql` | ลบตึก SC9 (`BLD-B001`) และขอบเขตที่ผูกกับตึกนี้ |

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/00N_name.sql
```

บน Windows มี `scripts/migrate-normalized.ps1` สำหรับ 001 กับ container `scimap-db` (ตรวจ → สำรอง `pg_dump` ไว้ที่ `backups/` → migrate) และ `scripts/verify-normalized-db.sql` สำหรับตรวจผล

## Schema

กลุ่มตาราง:

- ผู้ใช้/สิทธิ์: `institutions`, `roles`, `use_cases`, `role_use_cases`, `users`, `account_history`
- แผนที่: `faculties`, `buildings`, `floors`, `nodes`, `edges`, `categories`, `rooms`, `room_types`, `map_boundaries`, `map_assets`, `map_drafts`
- คำร้อง/แจ้งเตือน: `requests`, `request_quota`, `broadcasts`, `notifications`, `feedback`
- ข่าว/กิจกรรม: `news`, `events`, `event_interest`, `event_stats` และ view `event_stats_view`
- การตลาด: `contracts`, `modules`, `institution_access`, `institution_access_modules`, `access_history`
- Audit/สถิติ: `edit_logs`, `usage`, `search_logs`

## API หลัก

| Method | Path | หน้าที่ |
|---|---|---|
| `GET` | `/health` | สถานะ backend และ storage (`memory`/`postgres`) |
| `GET` | `/api/auth/roles`, `/api/auth/institutions` | ข้อมูลสำหรับหน้าสมัคร (ไม่ต้อง login) |
| `POST` | `/api/auth` | register / login |
| `GET` | `/api/auth/session` | ตรวจ session |
| `GET` | `/api/ref/roles`, `/modules`, `/faculties`, `/use-cases` | reference data (`use-cases` ตาม role ปัจจุบัน) |
| `GET` | `/api/map/buildings` | อาคารพร้อมชั้น |
| `GET` | `/api/map/floors/:floorId/graph` | node/edge ของชั้น |
| `GET` | `/api/map/graph?building=<id>` | graph ทั้งอาคารรวม edge ข้ามชั้น |
| `GET/POST/PATCH/DELETE` | `/api/data/:name` | generic collection API (จำกัดสิทธิ์บาง collection ตาม role) |
| `POST` | `/api/report` | ส่งรายงานปัญหา |
| `GET` | `/api/stats` | สถิติ dashboard |
| `POST` | `/api/search-log` | บันทึกการค้นหา/นำทางของผู้ใช้ (`kind` = `search` / `route` / `navigate`) |
| `GET` | `/api/stats/searches?days=N` | อันดับสถานที่ที่ถูกค้นหามากที่สุด (เฉพาะผู้บริหาร) |
| `GET` | `/api/osm`, `/api/walknet` | proxy ข้อมูลแผนที่ |

ยกเว้น `/health`, `/api/auth/roles`, `/api/auth/institutions`, `POST /api/auth`, `/api/osm` และ `/api/walknet` ทุก endpoint ต้องมี header `x-session-id`

## บัญชี seed

`exec@`, `marketing@`, `gis@`, `admin@`, `pr@`, `registrar@`, `student@` และ `somchai@kmitl.ac.th` รหัสผ่านเริ่มต้นคือ `1234` (เก็บเป็น bcrypt hash) สถานะและชื่อจริงดูที่ `db/seed/users.json` **ใช้เพื่อพัฒนา/ทดสอบเท่านั้น ห้ามใช้ seed นี้ใน production**

## Deploy

ดู [deploy/DEPLOY.md](deploy/DEPLOY.md) (Docker Compose บน VM, backup, HTTPS)

## ข้อควรระวังด้านความปลอดภัย

- `.env` ถูก ignore ห้าม commit; `.env.example` มีแต่ placeholder
- ถ้ารหัสผ่าน PostgreSQL เคยอยู่ใน Git history ให้เปลี่ยนรหัสจริงทันที (การถอดไฟล์ออกจาก tracking ไม่ลบจากประวัติ)
- `POST /api/auth` ยอมรับ `role` จาก client ตอนสมัคร และ generic `/api/data/:name` มีการจำกัดสิทธิ์เพียงบาง collection จึงต้องออกแบบสิทธิ์ใหม่ก่อนใช้งานจริง
- `SESSION_MAX_DAYS` (ค่าเริ่มต้น 7) อายุ session นับจากเวลา login ไม่มี idle timeout เปิดค้างไว้ได้จนครบอายุ; session เก็บในตาราง `auth_sessions` (สร้างอัตโนมัติ) จึงไม่หลุดเมื่อ restart backend
