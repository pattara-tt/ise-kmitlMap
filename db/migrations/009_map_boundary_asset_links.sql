BEGIN;

ALTER TABLE map_boundaries
    ADD COLUMN IF NOT EXISTS selecteable_for_assets BOOLEAN NOT NULL DEFAULT false;

UPDATE map_boundaries
SET selectable_for_assets = true
WHERE type = 'building';

ALTER TABLE map_assets
    ADD COLUMN IF NOT EXISTS boundary_id TEXT
        REFERENCES map_boundaries(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS building_name TEXT,
    ADD COLUMN IF NOT EXISTS custom_floor TEXT;

COMMIT;