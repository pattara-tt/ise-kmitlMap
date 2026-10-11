-- Executive menu: separate "requests" screen from "feedback", add search-statistics placeholder.
-- Data only (no schema change). Safe to re-run.
BEGIN;

-- feedback and requests are different tables: the feedback menu no longer claims to show requests
UPDATE use_cases
SET title = 'ตรวจสอบข้อเสนอแนะจากผู้ใช้งานทั่วไป'
WHERE key = 'feedback'
  AND title = 'ตรวจสอบข้อเสนอแนะและคำขอจากผู้ใช้งานทั่วไป';

-- make room in the executive menu order: overview 0, feedback 1, exec_requests 2, contracts 3, audit 4, search_stats 5
UPDATE use_cases SET sort_order = 3 WHERE key = 'contracts' AND sort_order = 2;
UPDATE use_cases SET sort_order = 4 WHERE key = 'audit'     AND sort_order = 3;

INSERT INTO use_cases (key, title, icon, sort_order) VALUES
  ('exec_requests', 'ตรวจสอบคำร้องจากผู้ใช้งานทั่วไป', '📋', 2),
  ('search_stats',  'สถิติการค้นหาอาคารและจุดสนใจ', 'svg:growth', 5)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_use_cases (role_code, use_case_key) VALUES
  ('exec', 'exec_requests'),
  ('exec', 'search_stats')
ON CONFLICT DO NOTHING;

COMMIT;
