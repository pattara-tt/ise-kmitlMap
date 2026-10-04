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
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','approved','rejected','cancelled')),
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