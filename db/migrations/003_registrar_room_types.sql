-- Run once (safe to rerun) on existing PostgreSQL. Does NOT reset any data.
BEGIN;
CREATE TABLE IF NOT EXISTS room_types (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL UNIQUE,
 icon TEXT NOT NULL DEFAULT '🏫',
 color TEXT NOT NULL DEFAULT '#1A73E8',
 description TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO room_types(id,name,icon,color,description) VALUES
 ('RT-DEFAULT-CLASSROOM','ห้องเรียน','🏫','#1A73E8',''),
 ('RT-DEFAULT-TOILET','ห้องน้ำ','🚻','#1A73E8',''),
 ('RT-DEFAULT-COWORK','co-working','💻','#1A73E8',''),
 ('RT-DEFAULT-LIFT','ลิฟต์','🛗','#1A73E8',''),
 ('RT-DEFAULT-STAIRS','บันได','🪜','#1A73E8',''),
 ('RT-DEFAULT-TEACHER','ห้องพักอาจารย์','👨‍🏫','#1A73E8','')
ON CONFLICT DO NOTHING;
INSERT INTO use_cases(key,title,icon,sort_order)
VALUES ('room_types','จัดการประเภทห้องและไอคอน','🧩',18)
ON CONFLICT (key) DO UPDATE SET title=EXCLUDED.title, icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order;
INSERT INTO role_use_cases(role_code,use_case_key) VALUES
 ('registrar','room_types'),('registrar','requests')
ON CONFLICT DO NOTHING;
COMMIT;