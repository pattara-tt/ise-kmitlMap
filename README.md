# SciMap

SciMap เป็นระบบแผนที่และนำทางภายในมหาวิทยาลัย แยกเป็น Next.js frontend, Express backend และ PostgreSQL 16 โดย frontend ไม่ต่อฐานข้อมูลโดยตรง ทุก `/api/*` จะผ่าน `app/api/[...path]/route.js` ไป backend

## โครงสร้างหลัก

- `app/`, `components/`, `lib/` — frontend Next.js
- `backend/src/server.js` — API หลัก
- `backend/src/store.js` — data layer แบบ mock in-memory
- `backend/src/pg.js` — data layer PostgreSQL ด้วย interface เดียวกับ mock
- `db/schema.sql` — normalized schema (32 tables)
- `db/seed/*.json` — แหล่งข้อมูล seed ชุดเดียว
- `scripts/build-seed.js` — สร้าง `db/seed.sql` จาก JSON และ hash รหัสผ่านเริ่มต้นด้วย bcrypt
- `db/migrations/001_normalize.sql` — migration จาก schema เดิมเป็น schema normalized
- `components/mapConfig.js` — config การแสดงผลแผนที่; อาคาร/ชั้น/node/edge ถูกโหลดจาก backend

## ติดตั้ง dependency

ต้องติดตั้งทั้ง frontend และ backend:

```bash
npm install
cd backend
npm install
cd ..
```

ถ้าได้รับโปรเจกต์เป็น ZIP ไม่ควรใช้ `node_modules` ที่ติดมาจากเครื่องอื่น เพราะ native package ของ Next.js อาจไม่ตรง OS ให้ลบแล้ว `npm install` ใหม่

## สร้าง seed

แก้ข้อมูลต้นทางใน `db/seed/*.json` แล้ว generate SQL ใหม่ด้วย:

```bash
node scripts/build-seed.js
```

`backend/src/store.js` อ่าน JSON ชุดเดียวกันโดยตรง จึงไม่ต้องแก้ mock ซ้ำอีกชุด รหัสผ่านของบัญชี seed คือ `1234` แต่ `db/seed.sql` และ mock เก็บ/ใช้งานเป็น bcrypt hash ไม่ใช่ plaintext column

ตรวจความสอดคล้องของ seed และทดสอบ data layer แบบ mock โดยไม่ต้องเปิดฐานข้อมูล:

```bash
npm run test:seed       # 32 ตาราง, uniqueness, 311 FK references ของ seed ปัจจุบัน
npm run test:mock       # hash / composite key / audit log / cascade / quota
npm run test:source     # parse JS/JSX และตรวจ path ของ local imports
```

`test:source` ต้องติดตั้ง Next.js dependency ก่อน ส่วน `test:mock` ต้องติดตั้ง `bcryptjs` ที่ `backend/` ก่อน ทดสอบนี้ไม่ใช่การยืนยันว่า PostgreSQL migration หรือทุก browser flow ผ่าน

## โหมด 1: Mock in-memory

ไม่ต้องตั้ง `DATABASE_URL` ข้อมูลจะโหลดจาก `db/seed/*.json` และรีเซ็ตเมื่อ backend restart

เทอร์มินัล 1:

```bash
cd backend
npm run dev
```

เทอร์มินัล 2:

```bash
npm run dev
```

เปิด `http://localhost:3000` และตรวจ backend ได้ที่:

```bash
curl http://localhost:4000/health
# {"ok":true,"backend":"scimap","storage":"memory"}
```

## โหมด 2: PostgreSQL

### Docker Compose

```bash
cp .env.example .env
# เปลี่ยน POSTGRES_PASSWORD ก่อนใช้งาน
node scripts/build-seed.js
docker compose up -d --build
```

เปิด `http://localhost` ฐานข้อมูลใหม่จะรัน `db/schema.sql` และ `db/seed.sql` อัตโนมัติในครั้งแรกที่สร้าง volume

> ถ้าแก้ schema/seed แล้วต้องการสร้าง DB ใหม่ ให้ใช้ `docker compose down -v` ก่อน `docker compose up -d --build` ซึ่งจะลบข้อมูลใน volume เดิมทั้งหมด

### PostgreSQL ที่ติดตั้งเอง

ตั้ง `DATABASE_URL` ให้ backend เช่น:

```bash
export DATABASE_URL='postgresql://user:password@localhost:5432/kmitlmap'
export SESSION_IDLE_MINUTES=30
cd backend && npm start
```

## Migration จาก DB เดิม

สำรองฐานข้อมูลก่อนทุกครั้ง และ **ทดลองกับสำเนา DB ก่อน production** โดยต้องมี PostgreSQL 16 และ extension `pgcrypto` migration จะ rollback เมื่อข้อมูลสำคัญลดจำนวนลง ไม่ควรรัน migration ซ้ำหลังสำเร็จแล้ว:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_normalize.sql
```

migration ทำงานใน transaction เดียว และย้ายข้อมูลจาก schema เดิมเข้าสู่ตาราง normalized รวมถึง `map_edits -> edit_logs`, module array -> `institution_access_modules`, ประวัติ suspend/restore -> `account_history` และ plaintext password เดิม -> bcrypt hash

หลัง migration ควรตรวจจำนวนข้อมูลสำคัญ:

```sql
SELECT count(*) FROM users;
SELECT count(*) FROM requests;
SELECT count(*) FROM news;
SELECT count(*) FROM events;
SELECT count(*) FROM edit_logs;
```

รันการตรวจโครงสร้างและ bcrypt / role / FK ของ audit / สถิติกิจกรรมในฐานข้อมูลทดสอบ:

```bash
DATABASE_URL='postgresql://...' npm run test:pg
```

คำสั่งนี้ไม่ได้ทดแทนการเปรียบเทียบจำนวนแถวก่อน–หลัง migration ที่ต้องบันทึกจาก DB เดิมก่อนรันจริง

## Schema overview

ตารางแบ่งเป็นกลุ่มดังนี้:

- ผู้ใช้/สิทธิ์: `institutions`, `roles`, `use_cases`, `role_use_cases`, `users`, `account_history`
- แผนที่: `faculties`, `buildings`, `floors`, `nodes`, `edges`, `categories`, `rooms`, `map_boundaries`, `map_assets`, `map_drafts`
- คำร้อง/แจ้งเตือน: `requests`, `request_quota`, `broadcasts`, `notifications`, `feedback`
- ข่าว/กิจกรรม: `news`, `events`, `event_interest`, `event_stats` และ view `event_stats_view`
- การตลาด: `contracts`, `modules`, `institution_access`, `institution_access_modules`, `access_history`
- Audit/statistics: `edit_logs`, `usage`

ชื่อฝั่ง DB ใช้ `snake_case`; data layer แปลงเป็น `camelCase` ที่ `backend/src/pg.js`

## API สำคัญ

API ที่ต้องมี session จะส่ง session id ใน header `x-session-id`

| Method | Path | หน้าที่ |
|---|---|---|
| `POST` | `/api/auth` | register / login |
| `GET` | `/api/auth/session` | ตรวจ session |
| `GET` | `/api/ref/roles` | role reference |
| `GET` | `/api/ref/use-cases` | เมนูตาม role ปัจจุบัน |
| `GET` | `/api/ref/modules` | module reference |
| `GET` | `/api/ref/faculties` | faculty reference |
| `GET` | `/api/map/buildings` | อาคารพร้อมชั้น |
| `GET` | `/api/map/floors/:floorId/graph` | node/edge ของชั้น |
| `GET` | `/api/map/graph?building=<id>` | graph ทั้งอาคารรวม edge ข้ามชั้น |
| `GET/POST/PATCH/DELETE` | `/api/data/:name` | generic collection API |
| `GET` | `/api/stats` | dashboard statistics จาก backend |
| `GET` | `/api/osm`, `/api/walknet` | map proxy |

การแก้ `nodes`, `edges`, ห้อง/ชั้น/ขอบเขต/asset, ข่าว, event, category, broadcast, request และ feedback จะเขียน `edit_logs` ตามชนิดข้อมูล ส่วนข้อมูลฝ่ายการตลาดใช้ `access_history` และการแก้บัญชีใช้ `account_history`

## บัญชี seed

บัญชี role หลักมี `exec@kmitl.ac.th`, `marketing@kmitl.ac.th`, `gis@kmitl.ac.th`, `admin@kmitl.ac.th`, `pr@kmitl.ac.th`, `registrar@kmitl.ac.th`, `student@kmitl.ac.th` และ `somchai@kmitl.ac.th` โดยรหัสผ่านเริ่มต้นคือ `1234` สถานะและชื่อจริงให้ยึด `db/seed/users.json` เป็นแหล่งข้อมูลหลัก

## Build / lint

```bash
npm run lint
npm run build
cd backend && npm start
```

ถ้าเจอ `next: Permission denied` หรือ SWC binary ไม่ตรง platform หลังแตก ZIP ให้ลบ `node_modules`/`.next` แล้วติดตั้ง dependency ใหม่บนเครื่องปลายทาง

## Security / environment

- `.env` ถูก ignore และต้องไม่ commit
- `.env.example` ใช้ placeholder เท่านั้น
- `SESSION_IDLE_MINUTES` ค่าเริ่มต้น 30 นาที
- หากรหัสผ่าน PostgreSQL เคยถูก commit ในประวัติ Git ให้เปลี่ยนรหัสผ่านจริง (rotate credential) แม้ไฟล์ `.env` จะถูกถอดออกจาก tracking แล้ว

ดูรายละเอียดการ refactor และผลตรวจสอบล่าสุดที่ `REFACTOR_REPORT.md`