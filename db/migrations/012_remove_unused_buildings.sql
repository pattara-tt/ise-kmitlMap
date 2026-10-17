-- Remove placeholder buildings that are not in faculty FAC-05 and have no map data.
-- BLD-B007 is kept for now: it still owns a map boundary (MB-1791717409228) that was asked to be kept.
-- Guarded: a building is only deleted when it has no floors, boundaries or drafts. Safe to re-run.
BEGIN;

DELETE FROM buildings b
WHERE b.id IN ('BLD-B004','BLD-B005','BLD-B006','BLD-B008','BLD-B009','BLD-B010','BLD-B011')
  AND b.faculty_id IS DISTINCT FROM 'FAC-05'
  AND NOT EXISTS (SELECT 1 FROM floors f WHERE f.building_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM map_boundaries m WHERE m.building_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM map_drafts d WHERE d.building_id = b.id);

COMMIT;
