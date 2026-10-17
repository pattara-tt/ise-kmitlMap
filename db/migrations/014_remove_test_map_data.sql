-- Remove test data that was never real map data:
--   * the "SC9" and "IT building" boundaries (drawn by hand while testing) and the building BLD-B007 (IT)
--   * the edit-log rows that describe those boundaries and the floor-plan placement test
--   * revert the floor-1 plan placement (MA-01 goes back to its plain file path)
-- BLD-B001 (SC9, faculty FAC-05) stays; only its test boundary is removed. Safe to re-run.
BEGIN;

DELETE FROM edit_logs
WHERE id IN ('EL-1791715582421-s4820','EL-1791717369058-v2wt3','EL-1791717371247-6ilat',
             'EL-1791717409296-sap1p','EL-1791717411785-qz40r');

DELETE FROM map_boundaries WHERE id IN ('MB-1791717369015','MB-1791717409228');

UPDATE map_assets
SET file = '/data/floorplans/Sc8/floor1.svg'
WHERE id = 'MA-01' AND file LIKE '\_\_SCIMAP\_ASSET\_V1\_\_:%';

DELETE FROM buildings b
WHERE b.id = 'BLD-B007'
  AND NOT EXISTS (SELECT 1 FROM floors f WHERE f.building_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM map_boundaries m WHERE m.building_id = b.id)
  AND NOT EXISTS (SELECT 1 FROM map_drafts d WHERE d.building_id = b.id);

COMMIT;
