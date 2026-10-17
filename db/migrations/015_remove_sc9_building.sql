-- Removes the placeholder building SC9 (BLD-B001) and any boundary tied to it.
-- It has no floors, nodes or rooms. Safe to re-run.
BEGIN;
DELETE FROM map_boundaries WHERE building_id = 'BLD-B001';
DELETE FROM buildings WHERE id = 'BLD-B001';
COMMIT;
