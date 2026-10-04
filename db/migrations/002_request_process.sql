BEGIN;

ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
  ADD CONSTRAINT requests_status_check
  CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'cancelled'));

COMMIT;