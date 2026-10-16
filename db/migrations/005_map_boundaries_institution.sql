BEGIN;

ALTER TABLE map_boundaries
  ADD COLUMN IF NOT EXISTS institution_id TEXT
  REFERENCES institutions(id) ON DELETE SET NULL;

UPDATE map_boundaries
SET institution_id = 'INST-01'
WHERE institution_id IS NULL
  AND id IN ('MB-01', 'MB-02')
  AND EXISTS (
    SELECT 1 FROM institutions WHERE id = 'INST-01'
  );

UPDATE map_boundaries
SET building_id = NULL
WHERE id = 'MB-01'
  AND type = 'campus';

COMMIT;