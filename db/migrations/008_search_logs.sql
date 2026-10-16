-- Search/navigation log used for the Executive search statistics. Safe to re-run.
BEGIN;

CREATE TABLE IF NOT EXISTS search_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('search','route','navigate')),
  query       TEXT,
  building_id TEXT REFERENCES buildings(id) ON DELETE SET NULL,
  room_id     TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  place_label TEXT NOT NULL,
  from_label  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_place ON search_logs(place_label);

COMMIT;
