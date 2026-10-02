-- Normalize legacy SciMap schema to 3NF
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Legacy date/time columns are TEXT in some installations.  A regexp check is
-- not sufficient because a string can look like a date but still fail to cast.
CREATE OR REPLACE FUNCTION pg_temp.safe_timestamptz(value TEXT, fallback TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN fallback;
  END IF;
  BEGIN
    RETURN value::timestamptz;
  EXCEPTION WHEN others THEN
    RETURN fallback;
  END;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['account_history','requests','request_quota','notifications','feedback','map_edits','contracts','institution_access','broadcasts','access_history','map_boundaries','map_assets','map_drafts','categories','news','events','event_interest','event_stats','floors','rooms','usage','users']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND to_regclass('public.legacy_' || t) IS NULL THEN
      EXECUTE format('ALTER TABLE %I RENAME TO %I', t, 'legacy_' || t);
    END IF;
  END LOOP;
END $$;

-- Compatibility for older live volumes that predate account_history/access_history
-- and a few columns added by later legacy schema revisions. These legacy_* tables
-- are temporary staging tables only; they are removed at the end of this same
-- transaction after row-count checks pass.
CREATE TABLE IF NOT EXISTS legacy_account_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT
);

CREATE TABLE IF NOT EXISTS legacy_access_history (
  id TEXT PRIMARY KEY,
  institution TEXT NOT NULL,
  institution_access_id TEXT,
  before_status TEXT,
  after_status TEXT NOT NULL,
  before_status_label TEXT,
  after_status_label TEXT,
  actor_id TEXT,
  actor_name TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE legacy_notifications
  ADD COLUMN IF NOT EXISTS broadcast_id TEXT;

ALTER TABLE legacy_institution_access
  ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'active';

-- Fail early with a useful message if this is not the legacy schema this
-- migration was written for. Doing this before any DROP keeps the operation safe.
DO $$
DECLARE missing text[] := ARRAY[]::text[];
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'legacy_users','legacy_requests','legacy_request_quota','legacy_notifications',
    'legacy_feedback','legacy_map_edits','legacy_contracts','legacy_institution_access',
    'legacy_broadcasts','legacy_map_boundaries','legacy_map_assets','legacy_map_drafts',
    'legacy_categories','legacy_news','legacy_events','legacy_event_interest',
    'legacy_event_stats','legacy_floors','legacy_rooms','legacy_usage'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      missing := array_append(missing,t);
    END IF;
  END LOOP;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Unsupported legacy DB: missing required tables: %', array_to_string(missing, ', ');
  END IF;
END $$;

-- ===== ผู้ใช้และสิทธิ์ =====
CREATE TABLE institutions (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  short_name    TEXT,
  contact_email TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE use_cases (
  key        TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE role_use_cases (
  role_code    TEXT NOT NULL REFERENCES roles(code) ON UPDATE CASCADE ON DELETE CASCADE,
  use_case_key TEXT NOT NULL REFERENCES use_cases(key) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (role_code, use_case_key)
);

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  username       TEXT UNIQUE,
  role_code      TEXT NOT NULL DEFAULT 'user' REFERENCES roles(code) ON UPDATE CASCADE,
  institution_id TEXT REFERENCES institutions(id),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL CHECK (action IN ('SUSPENDED','RESTORED','ROLE_CHANGED')),
  old_value  TEXT,
  new_value  TEXT,
  reason     TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== อาคาร / แผนที่ =====
CREATE TABLE faculties (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE buildings (
  id         TEXT PRIMARY KEY,
  faculty_id TEXT REFERENCES faculties(id),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  outline    JSONB,
  bounds     JSONB
);

CREATE TABLE floors (
  id          TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_no    TEXT NOT NULL,
  name        TEXT,
  svg         TEXT,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  UNIQUE (building_id, floor_no)
);

CREATE TABLE nodes (
  id       TEXT PRIMARY KEY,
  node_key TEXT NOT NULL UNIQUE,
  floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name     TEXT,
  type     TEXT NOT NULL,
  x        DOUBLE PRECISION NOT NULL,
  y        DOUBLE PRECISION NOT NULL
);

CREATE TABLE edges (
  id           TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  distance     DOUBLE PRECISION,
  edge_type    TEXT NOT NULL DEFAULT 'walk' CHECK (edge_type IN ('walk','stairs','elevator','ramp','exterior')),
  accessible   BOOLEAN NOT NULL DEFAULT true,
  CHECK (from_node_id <> to_node_id)
);

CREATE TABLE categories (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  kind  TEXT NOT NULL,
  color TEXT,
  "desc" TEXT
);

CREATE TABLE rooms (
  id          TEXT PRIMARY KEY,
  floor_id    TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  node_id     TEXT UNIQUE REFERENCES nodes(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES categories(id),
  code        TEXT NOT NULL,
  name        TEXT,
  type        TEXT,
  capacity    INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  teacher     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (floor_id, code)
);

CREATE TABLE map_boundaries (
  id          TEXT PRIMARY KEY,
  building_id TEXT REFERENCES buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT,
  geometry    JSONB,
  status      TEXT NOT NULL DEFAULT 'draft',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE map_assets (
  id         TEXT PRIMARY KEY,
  floor_id   TEXT REFERENCES floors(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  kind       TEXT,
  file       TEXT,
  status     TEXT NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE map_drafts (
  id          TEXT PRIMARY KEY,
  building_id TEXT REFERENCES buildings(id) ON DELETE CASCADE,
  saved_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== คำร้อง / แจ้งเตือน / feedback =====
CREATE TABLE requests (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id     TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  node_id     TEXT REFERENCES nodes(id) ON DELETE SET NULL,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  detail      TEXT,
  before      TEXT,
  after       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  note        TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_quota (
  id                 TEXT PRIMARY KEY,
  updated_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  per_user_per_day   INTEGER NOT NULL DEFAULT 3  CHECK (per_user_per_day   > 0),
  per_user_per_month INTEGER NOT NULL DEFAULT 20 CHECK (per_user_per_month > 0),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE broadcasts (
  id         TEXT PRIMARY KEY,
  sent_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  audience   TEXT NOT NULL DEFAULT 'all',
  send_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broadcast_id TEXT REFERENCES broadcasts(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  read         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  topic      TEXT NOT NULL,
  detail     TEXT,
  status     TEXT NOT NULL DEFAULT 'open',
  reply      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== ข่าว / กิจกรรม =====
CREATE TABLE news (
  id            TEXT PRIMARY KEY,
  author_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  replaced_from TEXT REFERENCES news(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  publish_at    TIMESTAMPTZ,
  expire_at     TIMESTAMPTZ,
  published     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expire_at IS NULL OR publish_at IS NULL OR expire_at > publish_at)
);

CREATE TABLE events (
  id                     TEXT PRIMARY KEY,
  author_id              TEXT REFERENCES users(id) ON DELETE SET NULL,
  category_id            TEXT REFERENCES categories(id),
  temp_place_category_id TEXT REFERENCES categories(id),
  replaced_from          TEXT REFERENCES events(id) ON DELETE SET NULL,
  name                   TEXT NOT NULL,
  detail                 TEXT,
  start_at               TIMESTAMPTZ,
  end_at                 TIMESTAMPTZ,
  place_name             TEXT,
  lat                    DOUBLE PRECISION,
  lon                    DOUBLE PRECISION,
  published              BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

CREATE TABLE event_interest (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE event_stats (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  searched INTEGER NOT NULL DEFAULT 0
);

CREATE VIEW event_stats_view AS
SELECT e.id AS event_id,
       COALESCE(s.searched, 0) AS searched,
       (SELECT count(*) FROM event_interest i WHERE i.event_id = e.id) AS interested
FROM events e
LEFT JOIN event_stats s ON s.event_id = e.id;

-- ===== ฝ่ายการตลาด =====
CREATE TABLE contracts (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  plan           TEXT,
  start_date     DATE,
  end_date       DATE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired')),
  contact        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE modules (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE institution_access (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE CASCADE,
  level          TEXT NOT NULL DEFAULT 'standard' CHECK (level IN ('full','standard','readonly')),
  seats          INTEGER NOT NULL DEFAULT 0 CHECK (seats >= 0),
  access_status  TEXT NOT NULL DEFAULT 'active',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE institution_access_modules (
  access_id   TEXT NOT NULL REFERENCES institution_access(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES modules(code) ON UPDATE CASCADE,
  PRIMARY KEY (access_id, module_code)
);

CREATE TABLE access_history (
  id            TEXT PRIMARY KEY,
  access_id     TEXT NOT NULL REFERENCES institution_access(id) ON DELETE CASCADE,
  actor_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  before_status TEXT,
  after_status  TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== log การแก้ไข (ทุกฝ่ายยกเว้นการตลาด) =====
CREATE TABLE edit_logs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  action           TEXT NOT NULL,
  before           TEXT,
  after            TEXT,
  edited_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  node_id          TEXT REFERENCES nodes(id)          ON DELETE SET NULL,
  edge_id          TEXT REFERENCES edges(id)          ON DELETE SET NULL,
  floor_id         TEXT REFERENCES floors(id)         ON DELETE SET NULL,
  room_id          TEXT REFERENCES rooms(id)          ON DELETE SET NULL,
  map_boundary_id  TEXT REFERENCES map_boundaries(id) ON DELETE SET NULL,
  map_asset_id     TEXT REFERENCES map_assets(id)     ON DELETE SET NULL,
  news_id          TEXT REFERENCES news(id)           ON DELETE SET NULL,
  event_id         TEXT REFERENCES events(id)         ON DELETE SET NULL,
  category_id      TEXT REFERENCES categories(id)     ON DELETE SET NULL,
  broadcast_id     TEXT REFERENCES broadcasts(id)     ON DELETE SET NULL,
  request_quota_id TEXT REFERENCES request_quota(id)  ON DELETE SET NULL,
  request_id       TEXT REFERENCES requests(id)       ON DELETE SET NULL,
  feedback_id      TEXT REFERENCES feedback(id)       ON DELETE SET NULL,
  target_label     TEXT,
  CHECK (num_nonnulls(node_id, edge_id, floor_id, room_id, map_boundary_id, map_asset_id,
                      news_id, event_id, category_id, broadcast_id, request_quota_id,
                      request_id, feedback_id) <= 1)
);
CREATE INDEX idx_edit_logs_edited_at ON edit_logs(edited_at DESC);

-- ===== สถิติ =====
CREATE TABLE usage (
  month        TEXT PRIMARY KEY CHECK (month ~ '^\d{4}-\d{2}$'),
  active_users INTEGER NOT NULL DEFAULT 0,
  searches     INTEGER NOT NULL DEFAULT 0,
  routes       INTEGER NOT NULL DEFAULT 0
);

-- static reference data
INSERT INTO roles(code,name) VALUES
('exec','บริหาร'),('marketing','ฝ่ายการตลาด'),('gis','ผู้ดูแลข้อมูลสถานที่และอาคาร'),('admin','ฝ่ายดูแลระบบ'),('pr','ฝ่ายประชาสัมพันธ์'),('registrar','ฝ่ายทะเบียน'),('user','ผู้ใช้งานทั่วไป') ON CONFLICT DO NOTHING;

INSERT INTO use_cases(key,title,icon,sort_order) VALUES
('overview','ดูรายงานและสถิติภาพรวมระบบ','svg:growth_graph',0),('feedback','ตรวจสอบข้อเสนอแนะและคำขอจากผู้ใช้งานทั่วไป','svg:Chat_search_light',1),('contracts','ตรวจสอบสัญญาที่ฝ่ายการตลาดทำกับฝ่ายการตลาด','svg:Folder_search_light',2),('audit','ตรวจสอบบันทึกประวัติการแก้ไขข้อมูลแผนที่','svg:Map_light',3),
('broadcast','ส่งข้อความแจ้งเตือนระบบถึงมหาวิทยาลัยในระบบ','svg:bullhorn',4),('access','จัดการสิทธิ์การเข้าถึงระดับสถาบัน','svg:dataflow',5),('boundary','จัดการขอบเขตแผนผัง','🗺️',6),('assets','จัดการข้อมูลประกอบแผนผัง','🧩',7),('save','บันทึกข้อมูลแผนที่','💾',8),
('users','ข้อมูลผู้ใช้งาน','👥',9),('requests','คำร้อง','🔎',10),('roles','สิทธิ์ผู้ใช้งาน','🔑',11),('status','สถานะบัญชีผู้ใช้งาน','🚦',12),('news','ข้อมูลข่าวสาร','svg:news',13),('events','ข้อมูลกิจกรรม','svg:bullhorn',14),('interest','ตรวจสอบสถิติความสนใจของกิจกรรม','svg:growth',15),('categories','เพิ่ม / แก้ไข / ลบหมวดหมู่กิจกรรมและสถานที่','svg:folder',16),('rooms','จัดการรายละเอียดข้อมูลบนแผนที่','🗺️',17),('search','ค้นหาห้องเรียน อาคาร หรือชื่ออาจารย์','🔍',18),('route','ค้นหาวิธีไปยังจุดหมาย','svg:compass',19),('common_1','ลงทะเบียนเข้าใช้ระบบ',NULL,20),('common_2','เข้าสู่ระบบด้วย E-mail',NULL,21)
ON CONFLICT DO NOTHING;

INSERT INTO role_use_cases(role_code,use_case_key)
SELECT r.code,u.key FROM roles r JOIN use_cases u ON (
 (r.code='exec' AND u.key IN ('overview','feedback','contracts','audit')) OR
 (r.code='marketing' AND u.key IN ('contracts','broadcast','access')) OR
 (r.code='gis' AND u.key IN ('boundary','assets','save')) OR
 (r.code='admin' AND u.key IN ('users','requests','roles','status')) OR
 (r.code='pr' AND u.key IN ('news','events','interest','categories')) OR
 (r.code='registrar' AND u.key='rooms') OR
 (r.code='user' AND u.key IN ('search','route','feedback','events')) OR u.key IN ('common_1','common_2')
) ON CONFLICT DO NOTHING;

INSERT INTO modules(code,name) VALUES ('map','แผนที่'),('events','กิจกรรม'),('rooms','ข้อมูลห้อง'),('reports','รายงาน') ON CONFLICT DO NOTHING;

-- Canonical reference/map data generated from db/seed/*.json.
-- This keeps migrated installations on the same building/floor/node/edge IDs as clean installs.

INSERT INTO faculties(id,name) VALUES
('FAC-01','คณะวิศวกรรมศาสตร์'),
('FAC-02','คณะสถาปัตยกรรม ศิลปะและการออกแบบ'),
('FAC-03','คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี'),
('FAC-04','คณะเทคโนโลยีการเกษตร'),
('FAC-05','คณะวิทยาศาสตร์'),
('FAC-06','คณะเทคโนโลยีสารสนเทศ'),
('FAC-07','คณะอุตสาหกรรมอาหาร'),
('FAC-08','คณะบริหารธุรกิจ'),
('FAC-09','วิทยาลัยนวัตกรรมการผลิตขั้นสูง'),
('FAC-10','อื่น ๆ')
ON CONFLICT DO NOTHING;

INSERT INTO buildings(id,faculty_id,code,name,outline,bounds) VALUES
('BLD-SC8','FAC-05','SC8','Sc8','[[13.729617,100.779691],[13.729617,100.780308],[13.728375,100.780315],[13.728375,100.780029],[13.728858,100.780029],[13.728858,100.779797],[13.729272,100.779797],[13.729272,100.779691]]'::jsonb,'[[13.728306,100.779664],[13.729686,100.780328]]'::jsonb),
('BLD-B001','FAC-05','B001','SC9',NULL,NULL),
('BLD-B002','FAC-05','B002','อาคารจุฬาภรณวลัยลักษณ์ 1',NULL,NULL),
('BLD-B003','FAC-05','B003','อาคารจุฬาภรณวลัยลักษณ์ 2',NULL,NULL),
('BLD-B004','FAC-01','B004','อาคาร 12 ชั้น',NULL,NULL),
('BLD-B005','FAC-01','B005','อาคารเรียนรวม',NULL,NULL),
('BLD-B006','FAC-01','B006','อาคารปฏิบัติการวิศวกรรม',NULL,NULL),
('BLD-B007','FAC-06','B007','อาคารคณะเทคโนโลยีสารสนเทศ',NULL,NULL),
('BLD-B008','FAC-10','B008','อาคารส่วนกลาง',NULL,NULL),
('BLD-B009','FAC-10','B009','พื้นที่ภายนอกอาคาร',NULL,NULL),
('BLD-B010','FAC-10','B010','อาคารสำนักงาน',NULL,NULL),
('BLD-B011','FAC-10','B011','อาคารกิจกรรมนักศึกษา',NULL,NULL)
ON CONFLICT DO NOTHING;

INSERT INTO floors(id,building_id,floor_no,name,svg,note,status) VALUES
('FL-SC8-8','BLD-SC8','8','ชั้น 8',NULL,NULL,'published'),
('FL-SC8-7','BLD-SC8','7','ชั้น 7',NULL,NULL,'published'),
('FL-SC8-6','BLD-SC8','6','ชั้น 6','/data/floorplans/Sc8/floor6.svg',NULL,'published'),
('FL-SC8-5','BLD-SC8','5','ชั้น 5','/data/floorplans/Sc8/floor5.svg',NULL,'published'),
('FL-SC8-4','BLD-SC8','4','ชั้น 4','/data/floorplans/Sc8/floor4.svg',NULL,'published'),
('FL-SC8-3','BLD-SC8','3','ชั้น 3','/data/floorplans/Sc8/floor3.svg',NULL,'published'),
('FL-SC8-2','BLD-SC8','2','ชั้น 2','/data/floorplans/Sc8/floor2.svg',NULL,'published'),
('FL-SC8-1','BLD-SC8','1','ชั้น 1','/data/floorplans/Sc8/floor1.svg',NULL,'published')
ON CONFLICT DO NOTHING;

INSERT INTO nodes(id,node_key,floor_id,name,type,x,y) VALUES
('ND-0001','Sc8Lift1F1','FL-SC8-1','ลิฟต์ ชั้น1','lift',100.7802095,13.7291256),
('ND-0002','Sc8Toilet1F1','FL-SC8-1','ห้องน้ำชั้น 1','Toilet',100.7800143,13.7291665),
('ND-0003','Sc8FireExit1F1','FL-SC8-1','ทางหนึไฟชั้น 1','Fire_Exit',100.7799855,13.7288873),
('ND-0004','Sc8Entrance1F1','FL-SC8-1','ทางเข้าอาคารพระจอมชั้น 1','Entrance',100.7799219,13.7290372),
('ND-0005','Sc8Stair1F1','FL-SC8-1','ทางหนึไฟข้างลิฟต์ชั้น 1','Stair',100.7801042,13.7291831),
('ND-0006','Sc8Stair2F1','FL-SC8-1','บันไดกลางโถงชั้น 1','Stair',100.7801518,13.7290097),
('ND-0007','Sc8CoWork1F1','FL-SC8-1','coworking space KDAI','Co_Work',100.7800338,13.7288521),
('ND-0008','Sc8StudyRoom1F1','FL-SC8-1','ห้อง 108 ตึกพระจอมฯ','Study_Room',100.7802591,13.7291126),
('ND-0009','Sc8StudyRoom2F1','FL-SC8-1','ห้อง 107 ตึกพระจอมฯ','Study_Room',100.7802711,13.7289785),
('ND-0010','Sc8StudyRoom3F1','FL-SC8-1','ห้อง 106 ตึกพระจอมฯ','Study_Room',100.7802738,13.7288756),
('ND-0011','Sc8PC1','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800217,13.7290345),
('ND-0012','Sc8PC2','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800928,13.7290358),
('ND-0013','Sc8PC3','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7801504,13.7290358),
('ND-0014','Sc8PC4','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.780023,13.7290866),
('ND-0015','Sc8PC5','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800968,13.7290879),
('ND-0016','Sc8PC6','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7801518,13.7290853),
('ND-0017','Sc8PC7','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7801518,13.7291296),
('ND-0018','Sc8PC8','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7801303,13.7291556),
('ND-0019','Sc8PC9','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800131,13.7291544),
('ND-0020','Sc8PC9_5','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800801,13.729157),
('ND-0021','Sc8PC10','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800788,13.7291818),
('ND-0022','Sc8PC11','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7802229,13.7290853),
('ND-0023','Sc8PC12','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7802242,13.7290345),
('ND-0024','Sc8PC13','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7802255,13.7289798),
('ND-0025','Sc8PC14','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7802282,13.7289212),
('ND-0026','Sc8PC15','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7802269,13.7288769),
('ND-0027','Sc8PC16','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800847,13.7288769),
('ND-0028','Sc8PC17','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800888,13.7289811),
('ND-0029','Sc8PC18','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800834,13.7289303),
('ND-0030','Sc8PC19','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800552,13.7289016),
('ND-0031','Sc8PC20','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800123,13.7288899),
('ND-0032','Sc8PC21','FL-SC8-1','ทางเดินอาคารพระจอมชั้น 1','path',100.7800364,13.728873),
('ND-0033','Sc8StudyRoom1CenterF1','FL-SC8-1','ห้อง 108 ตึกพระจอมฯ','path',100.7802781,13.7291617),
('ND-0034','Sc8StudyRoom2CenterF1','FL-SC8-1','ห้อง 107 ตึกพระจอมฯ','path',100.7802956,13.7289767),
('ND-0035','Sc8StudyRoom3CenterF1','FL-SC8-1','ห้อง 106 ตึกพระจอมฯ','path',100.7803023,13.728862),
('ND-0036','Sc8CoWork1F1Center','FL-SC8-1','coworking space KDAI','path',100.7800917,13.7288373),
('ND-0037','Sc8Ext0','FL-SC8-1','ทางเข้า Sc8','exterior',100.7799681,13.7290371)
ON CONFLICT DO NOTHING;

INSERT INTO edges(id,from_node_id,to_node_id,distance,edge_type,accessible) VALUES
('ED-0001','ND-0004','ND-0011',10.8,'walk',TRUE),
('ED-0002','ND-0011','ND-0012',7.69,'walk',TRUE),
('ED-0003','ND-0011','ND-0014',5.76,'walk',TRUE),
('ED-0004','ND-0014','ND-0015',7.98,'walk',TRUE),
('ED-0005','ND-0016','ND-0015',5.95,'walk',TRUE),
('ED-0006','ND-0012','ND-0013',6.23,'walk',TRUE),
('ED-0007','ND-0011','ND-0028',9.35,'walk',TRUE),
('ED-0008','ND-0012','ND-0015',5.78,'walk',TRUE),
('ED-0009','ND-0022','ND-0023',5.62,'walk',TRUE),
('ED-0010','ND-0013','ND-0016',5.47,'walk',TRUE),
('ED-0011','ND-0004','ND-0014',12.22,'walk',TRUE),
('ED-0012','ND-0016','ND-0017',4.9,'walk',TRUE),
('ED-0013','ND-0017','ND-0018',3.7,'walk',TRUE),
('ED-0014','ND-0018','ND-0019',12.67,'walk',TRUE),
('ED-0015','ND-0020','ND-0019',7.25,'walk',TRUE),
('ED-0016','ND-0019','ND-0002',1.34,'walk',TRUE),
('ED-0017','ND-0020','ND-0021',2.74,'walk',TRUE),
('ED-0018','ND-0021','ND-0005',2.75,'walk',TRUE),
('ED-0019','ND-0013','ND-0006',2.89,'walk',TRUE),
('ED-0020','ND-0016','ND-0001',7.67,'walk',TRUE),
('ED-0021','ND-0016','ND-0022',7.69,'walk',TRUE),
('ED-0022','ND-0022','ND-0008',4.94,'walk',TRUE),
('ED-0023','ND-0013','ND-0023',7.98,'walk',TRUE),
('ED-0024','ND-0023','ND-0024',6.05,'walk',TRUE),
('ED-0025','ND-0024','ND-0009',4.93,'walk',TRUE),
('ED-0026','ND-0024','ND-0025',6.48,'walk',TRUE),
('ED-0027','ND-0025','ND-0026',4.9,'walk',TRUE),
('ED-0028','ND-0026','ND-0010',5.07,'walk',TRUE),
('ED-0029','ND-0026','ND-0027',15.38,'walk',TRUE),
('ED-0030','ND-0027','ND-0032',5.24,'walk',TRUE),
('ED-0031','ND-0032','ND-0007',2.33,'walk',TRUE),
('ED-0032','ND-0032','ND-0031',3.21,'walk',TRUE),
('ED-0033','ND-0031','ND-0003',2.91,'walk',TRUE),
('ED-0034','ND-0012','ND-0028',6.06,'walk',TRUE),
('ED-0035','ND-0028','ND-0029',5.65,'walk',TRUE),
('ED-0036','ND-0029','ND-0030',4.4,'walk',TRUE),
('ED-0037','ND-0030','ND-0031',4.82,'walk',TRUE),
('ED-0038','ND-0030','ND-0032',3.76,'walk',TRUE),
('ED-0039','ND-0030','ND-0027',4.2,'walk',TRUE),
('ED-0040','ND-0004','ND-0037',5.0,'exterior',TRUE)
ON CONFLICT DO NOTHING;

-- Keep IDs identical between migrated DBs and db/seed/institutions.json.
INSERT INTO institutions(id,name,short_name) VALUES
('INST-01','สจล. (KMITL)','KMITL'),
('INST-02','มหาวิทยาลัย A',NULL),
('INST-03','มหาวิทยาลัย B',NULL),
('INST-04','มหาวิทยาลัย C',NULL)
ON CONFLICT DO NOTHING;
-- Preserve arbitrary institution names from real legacy installations too.
WITH names AS (
  SELECT institution AS n FROM legacy_users WHERE institution IS NOT NULL
  UNION SELECT institution FROM legacy_contracts WHERE institution IS NOT NULL
  UNION SELECT institution FROM legacy_institution_access WHERE institution IS NOT NULL
  UNION SELECT institution FROM legacy_access_history WHERE institution IS NOT NULL
), norm AS (
  SELECT DISTINCT CASE WHEN n IN ('KMITL','สจล. (KMITL)') THEN 'สจล. (KMITL)'
                       ELSE btrim(n) END AS name FROM names
)
INSERT INTO institutions(id,name)
SELECT 'INST-MIG-'||upper(substr(md5(name),1,12)),name FROM norm
WHERE name IS NOT NULL AND name <> ''
  AND NOT EXISTS (SELECT 1 FROM institutions i WHERE i.name=norm.name)
ON CONFLICT DO NOTHING;

INSERT INTO users(id,email,password_hash,name,username,role_code,institution_id,status,created_at)
SELECT u.id,u.email,crypt(u.password,gen_salt('bf',10)),u.name,u.username,u.role,
       i.id,u.status,u.created_at::timestamptz
FROM legacy_users u LEFT JOIN institutions i ON i.name=CASE WHEN u.institution IN ('KMITL','สจล. (KMITL)') THEN 'สจล. (KMITL)' ELSE u.institution END;

-- account history existing + legacy suspension/restoration columns
INSERT INTO account_history(id,user_id,changed_by,action,old_value,new_value,reason,changed_at)
SELECT id,user_id,changed_by,action,old_value,new_value,reason,changed_at::timestamptz FROM legacy_account_history ON CONFLICT DO NOTHING;
INSERT INTO account_history(id,user_id,changed_by,action,old_value,new_value,reason,changed_at)
SELECT 'MIG-SUSP-'||u.id,u.id,CASE WHEN EXISTS(SELECT 1 FROM users x WHERE x.id=u.suspended_by) THEN u.suspended_by END,'SUSPENDED','active','suspended',u.suspend_reason,COALESCE(u.suspended_at::timestamptz,u.created_at::timestamptz,now())
FROM legacy_users u WHERE u.suspend_reason IS NOT NULL OR u.suspended_at IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO account_history(id,user_id,changed_by,action,old_value,new_value,reason,changed_at)
SELECT 'MIG-REST-'||u.id,u.id,CASE WHEN EXISTS(SELECT 1 FROM users x WHERE x.id=u.restored_by) THEN u.restored_by END,'RESTORED','suspended','active',u.restore_reason,COALESCE(u.restored_at::timestamptz,u.created_at::timestamptz,now())
FROM legacy_users u WHERE u.restore_reason IS NOT NULL OR u.restored_at IS NOT NULL ON CONFLICT DO NOTHING;

-- The generated reference data above already contains FAC-10 ("อื่น ๆ") and
-- canonical SC8 floor IDs. Reuse both instead of introducing a duplicate faculty
-- or silently dropping the registrar's SVG/note on floor-key conflict.
WITH b AS (SELECT DISTINCT btrim(building) AS building FROM legacy_floors
           UNION SELECT DISTINCT btrim(building) FROM legacy_rooms)
INSERT INTO buildings(id,faculty_id,code,name)
SELECT 'BLD-'||upper(substr(md5(building),1,10)),'FAC-10',building,building
FROM b WHERE building IS NOT NULL AND building <> ''
AND NOT EXISTS (SELECT 1 FROM buildings x WHERE upper(x.code)=upper(b.building))
ON CONFLICT DO NOTHING;
INSERT INTO floors(id,building_id,floor_no,name,svg,note,status)
SELECT f.id,b.id,f.floor,f.name,f.svg,f.note,
       CASE WHEN f.status='active' THEN 'published' ELSE 'draft' END
FROM legacy_floors f JOIN buildings b ON upper(b.code)=upper(btrim(f.building))
ON CONFLICT (building_id,floor_no) DO UPDATE SET
  name = COALESCE(EXCLUDED.name,floors.name),
  svg = COALESCE(EXCLUDED.svg,floors.svg),
  note = COALESCE(EXCLUDED.note,floors.note),
  status = EXCLUDED.status;

-- Legacy installations may have rooms on floors that are not present in their
-- old floors table. Materialize those floors before linking the rooms.
WITH rf AS (SELECT DISTINCT b.id AS building_id, r.floor AS floor_no
            FROM legacy_rooms r JOIN buildings b ON upper(b.code)=upper(btrim(r.building))
            WHERE r.floor IS NOT NULL)
INSERT INTO floors(id,building_id,floor_no,name,status)
SELECT 'FL-MIG-' || upper(substr(md5(building_id || ':' || floor_no),1,12)),
       building_id,floor_no,'ชั้น ' || floor_no,'published'
FROM rf WHERE NOT EXISTS (SELECT 1 FROM floors f
                          WHERE f.building_id=rf.building_id AND f.floor_no=rf.floor_no)
ON CONFLICT DO NOTHING;

-- Preserve the location of unknown legacy node keys using the room's actual
-- building/floor when available; do not place every unknown key on floor 1.
WITH refs AS (
 SELECT node_id,building,floor FROM legacy_rooms WHERE node_id IS NOT NULL
 UNION ALL
 SELECT q.node_id,r.building,r.floor FROM legacy_requests q
 LEFT JOIN legacy_rooms r ON r.id=q.room_id WHERE q.node_id IS NOT NULL
), nk AS (
 SELECT DISTINCT ON (node_id) node_id,building,floor FROM refs
 ORDER BY node_id,(building IS NULL) ASC
)
INSERT INTO nodes(id,node_key,floor_id,name,type,x,y)
SELECT 'ND-MIG-'||upper(substr(md5(nk.node_id),1,12)),nk.node_id,
       COALESCE((SELECT f.id FROM floors f JOIN buildings b ON b.id=f.building_id
                 WHERE upper(b.code)=upper(btrim(nk.building)) AND f.floor_no=nk.floor
                 LIMIT 1), (SELECT id FROM floors ORDER BY id LIMIT 1)),
       nk.node_id,'node',0,0
FROM nk WHERE NOT EXISTS (SELECT 1 FROM nodes existing WHERE existing.node_key=nk.node_id)
ON CONFLICT DO NOTHING;

INSERT INTO categories(id,name,kind,color,"desc") SELECT id,name,kind,color,"desc" FROM legacy_categories ON CONFLICT DO NOTHING;
INSERT INTO rooms(id,floor_id,node_id,category_id,code,name,type,capacity,teacher,created_at)
SELECT r.id,f.id,n.id,r.category_id,r.code,r.name,r.type,r.capacity,r.teacher,r.created_at::timestamptz
FROM legacy_rooms r JOIN floors f ON f.floor_no=r.floor JOIN buildings b ON b.id=f.building_id AND upper(b.code)=upper(r.building)
LEFT JOIN nodes n ON n.node_key=r.node_id ON CONFLICT DO NOTHING;

INSERT INTO map_boundaries(id,building_id,name,type,geometry,status,updated_at)
SELECT m.id, (SELECT b.id FROM buildings b WHERE m.type='building'
              AND m.name ILIKE '%' || b.code || '%' ORDER BY length(b.code) DESC LIMIT 1),
       m.name,m.type,m.geometry,m.status,m.updated_at::timestamptz
FROM legacy_map_boundaries m ON CONFLICT DO NOTHING;
INSERT INTO map_assets(id,floor_id,name,kind,file,status,updated_at)
SELECT a.id,f.id,a.name,a.kind,a.file,a.status,a.updated_at::timestamptz FROM legacy_map_assets a
LEFT JOIN buildings b ON upper(b.code)=upper(a.building) LEFT JOIN floors f ON f.building_id=b.id AND f.floor_no=a.floor ON CONFLICT DO NOTHING;
INSERT INTO map_drafts(id,building_id,saved_by,name,note,status,saved_at)
SELECT d.id,(SELECT b.id FROM buildings b WHERE d.name ILIKE '%' || b.code || '%'
              ORDER BY length(b.code) DESC LIMIT 1),
       (SELECT u.id FROM users u WHERE u.id=d.saved_by OR u.name=d.saved_by LIMIT 1),
       d.name,d.note,d.status,
       pg_temp.safe_timestamptz(d.saved_at, d.created_at::timestamptz)
FROM legacy_map_drafts d ON CONFLICT DO NOTHING;

INSERT INTO requests(id,user_id,room_id,node_id,reviewed_by,subject,detail,before,after,status,note,reviewed_at,created_at)
SELECT r.id,r.user_id,r.room_id,n.id,(SELECT u.id FROM users u WHERE u.id=r.reviewed_by OR u.name=r.reviewed_by LIMIT 1),r.subject,r.detail,r.before::text,r.after::text,r.status,r.note,r.reviewed_at::timestamptz,r.created_at::timestamptz
FROM legacy_requests r LEFT JOIN nodes n ON n.node_key=r.node_id ON CONFLICT DO NOTHING;
INSERT INTO request_quota(id,updated_by,per_user_per_day,per_user_per_month,updated_at)
SELECT q.id,(SELECT u.id FROM users u WHERE u.id=q.updated_by OR u.name=q.updated_by LIMIT 1),q.per_user_per_day,q.per_user_per_month,q.updated_at::timestamptz FROM legacy_request_quota q ON CONFLICT DO NOTHING;

INSERT INTO broadcasts(id,sent_by,title,body,audience,send_at,created_at)
SELECT b.id,COALESCE((SELECT id FROM users u WHERE u.id=b.sent_by OR u.name=b.sent_by LIMIT 1),NULL),b.title,b.body,COALESCE(b.audience,'all'),b.send_at::timestamptz,b.created_at::timestamptz FROM legacy_broadcasts b ON CONFLICT DO NOTHING;
INSERT INTO notifications(id,user_id,broadcast_id,kind,title,body,read,created_at)
SELECT id,user_id,CASE WHEN EXISTS(SELECT 1 FROM broadcasts b WHERE b.id=n.broadcast_id) THEN n.broadcast_id END,kind,title,body,read,created_at::timestamptz FROM legacy_notifications n ON CONFLICT DO NOTHING;
INSERT INTO feedback(id,user_id,topic,detail,status,reply,created_at)
SELECT id,user_id,topic,detail,status,reply,created_at::timestamptz FROM legacy_feedback ON CONFLICT DO NOTHING;

INSERT INTO news(id,author_id,replaced_from,title,body,publish_at,expire_at,published,created_at)
SELECT n.id,(SELECT id FROM users u WHERE u.id=n.author OR u.name=n.author LIMIT 1),CASE WHEN EXISTS(SELECT 1 FROM legacy_news x WHERE x.id=n.replaced_from) THEN n.replaced_from END,n.title,n.body,n.publish_at::timestamptz,n.expire_at::timestamptz,n.published,n.created_at::timestamptz FROM legacy_news n ON CONFLICT DO NOTHING;
INSERT INTO events(id,author_id,category_id,temp_place_category_id,replaced_from,name,detail,start_at,end_at,place_name,lat,lon,published,created_at)
SELECT e.id,(SELECT id FROM users u WHERE u.id=e.author OR u.name=e.author LIMIT 1),e.category_id,e.temp_place_category_id,CASE WHEN EXISTS(SELECT 1 FROM legacy_events x WHERE x.id=e.replaced_from) THEN e.replaced_from END,e.name,e.detail,e.start_at::timestamptz,e.end_at::timestamptz,e.place_name,e.lat,e.lon,e.published,e.created_at::timestamptz FROM legacy_events e ON CONFLICT DO NOTHING;
INSERT INTO event_interest(user_id,event_id,created_at) SELECT user_id,event_id,created_at::timestamptz FROM legacy_event_interest ON CONFLICT DO NOTHING;
INSERT INTO event_stats(event_id,searched) SELECT event_id,searched FROM legacy_event_stats ON CONFLICT DO NOTHING;

INSERT INTO contracts(id,institution_id,plan,start_date,end_date,status,contact,created_at)
SELECT c.id,i.id,c.plan,c.start_date,c.end_date,c.status,c.contact,c.created_at::timestamptz FROM legacy_contracts c JOIN institutions i ON i.name=CASE WHEN c.institution IN ('KMITL','สจล. (KMITL)') THEN 'สจล. (KMITL)' ELSE c.institution END ON CONFLICT DO NOTHING;
INSERT INTO institution_access(id,institution_id,level,seats,access_status,updated_at)
SELECT a.id,i.id,a.level,COALESCE(a.seats,0),COALESCE(a.access_status,'active'),a.updated_at::timestamptz FROM legacy_institution_access a JOIN institutions i ON i.name=CASE WHEN a.institution IN ('KMITL','สจล. (KMITL)') THEN 'สจล. (KMITL)' ELSE a.institution END ON CONFLICT DO NOTHING;
-- Retain custom legacy module codes as well as the four predefined modules.
INSERT INTO modules(code,name)
SELECT DISTINCT mod.code, mod.code FROM legacy_institution_access a
CROSS JOIN LATERAL unnest(a.modules) AS mod(code)
WHERE mod.code IS NOT NULL AND mod.code <> ''
ON CONFLICT DO NOTHING;
INSERT INTO institution_access_modules(access_id,module_code)
SELECT a.id,mod.code FROM legacy_institution_access a
CROSS JOIN LATERAL unnest(a.modules) AS mod(code)
WHERE mod.code IS NOT NULL AND mod.code <> '' ON CONFLICT DO NOTHING;
INSERT INTO access_history(id,access_id,actor_id,before_status,after_status,changed_at)
SELECT h.id,COALESCE(h.institution_access_id,(SELECT a.id FROM institution_access a JOIN institutions i ON i.id=a.institution_id WHERE i.name=CASE WHEN h.institution IN ('KMITL','สจล. (KMITL)') THEN 'สจล. (KMITL)' ELSE h.institution END LIMIT 1)),
       (SELECT id FROM users u WHERE u.id=h.actor_id OR u.name=h.actor_name LIMIT 1),h.before_status,h.after_status,h.changed_at::timestamptz FROM legacy_access_history h
WHERE COALESCE(h.institution_access_id,(SELECT a.id FROM institution_access a JOIN institutions i ON i.id=a.institution_id WHERE i.name=CASE WHEN h.institution IN ('KMITL','สจล. (KMITL)') THEN 'สจล. (KMITL)' ELSE h.institution END LIMIT 1)) IS NOT NULL ON CONFLICT DO NOTHING;

INSERT INTO edit_logs(id,user_id,action,before,after,edited_at,target_label)
SELECT m.id,CASE WHEN EXISTS(SELECT 1 FROM users u WHERE u.id=m.actor_id) THEN m.actor_id END,
       m.action,m.before,m.after,
       pg_temp.safe_timestamptz(m.at, m.created_at::timestamptz),m.target
FROM legacy_map_edits m ON CONFLICT DO NOTHING;
-- Assign one FK for legacy targets that can be matched without ambiguity;
-- otherwise keep target_label rather than guessing a relationship.
UPDATE edit_logs l SET map_boundary_id=b.id FROM map_boundaries b
WHERE l.map_boundary_id IS NULL AND l.target_label=b.name
  AND (SELECT count(*) FROM map_boundaries t WHERE t.name=b.name)=1;
UPDATE edit_logs l SET event_id=e.id FROM events e
WHERE l.map_boundary_id IS NULL AND l.event_id IS NULL
  AND l.target_label=e.name
  AND (SELECT count(*) FROM events t WHERE t.name=e.name)=1;
UPDATE edit_logs l SET room_id=r.id FROM rooms r JOIN floors f ON f.id=r.floor_id
WHERE l.map_boundary_id IS NULL AND l.event_id IS NULL AND l.room_id IS NULL
  AND l.target_label LIKE '%' || r.code || '%'
  AND l.target_label LIKE '%ชั้น ' || f.floor_no || '%'
  AND (SELECT count(*) FROM rooms rr JOIN floors ff ON ff.id=rr.floor_id
       WHERE l.target_label LIKE '%' || rr.code || '%'
         AND l.target_label LIKE '%ชั้น ' || ff.floor_no || '%')=1;
INSERT INTO usage(month,active_users,searches,routes) SELECT month,COALESCE(active_users,0),COALESCE(searches,0),COALESCE(routes,0) FROM legacy_usage ON CONFLICT DO NOTHING;

-- A rejected row must abort the *whole transaction* before any legacy table
-- is dropped. Some unique-key normalization is intentionally many-to-one
-- (e.g. SC8 floors), but these business/history entities must never shrink.
DO $$
DECLARE old_count bigint; new_count bigint; t text; dest text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','requests','news','events','map_edits',
                            'rooms','map_boundaries','map_assets','map_drafts',
                            'broadcasts','notifications','feedback','access_history',
                            'account_history','contracts','institution_access','event_interest',
                            'event_stats','categories','request_quota','usage'] LOOP
    dest := CASE WHEN t='map_edits' THEN 'edit_logs' ELSE t END;
    EXECUTE format('SELECT count(*) FROM %I', 'legacy_' || t) INTO old_count;
    EXECUTE format('SELECT count(*) FROM %I', dest) INTO new_count;
    IF new_count < old_count THEN
      RAISE EXCEPTION 'Migration data loss: % has % legacy rows but % normalized rows',
                      t,old_count,new_count;
    END IF;
  END LOOP;
END $$;

-- all target data has been copied; remove legacy tables in FK-safe order
DROP TABLE IF EXISTS legacy_notifications,legacy_event_interest,legacy_event_stats,legacy_requests,legacy_rooms,legacy_floors,
 legacy_access_history,legacy_institution_access,legacy_contracts,legacy_map_edits,legacy_feedback,legacy_broadcasts,legacy_map_assets,
 legacy_map_boundaries,legacy_map_drafts,legacy_news,legacy_events,legacy_categories,legacy_request_quota,legacy_account_history,legacy_usage,legacy_users CASCADE;

COMMIT;