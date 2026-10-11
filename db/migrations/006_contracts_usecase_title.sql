-- Fix wording of the Exec "contracts" menu title (was: marketing contracting with marketing).
BEGIN;
UPDATE use_cases
SET title = 'ตรวจสอบสัญญา'
WHERE key = 'contracts'
  AND title = 'ตรวจสอบสัญญาที่ฝ่ายการตลาดทำกับฝ่ายการตลาด';
COMMIT;
