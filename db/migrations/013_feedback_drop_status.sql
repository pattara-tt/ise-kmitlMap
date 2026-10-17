-- Feedback is a simple inbox (who suggested what). Nobody reviews or replies, so the
-- review status and reply columns are removed. Safe to re-run.
BEGIN;
ALTER TABLE feedback DROP COLUMN IF EXISTS status;
ALTER TABLE feedback DROP COLUMN IF EXISTS reply;
COMMIT;
