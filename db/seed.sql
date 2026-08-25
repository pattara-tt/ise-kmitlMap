-- ============================================================
-- ข้อมูลตัวอย่างสำหรับ SciMap (ตรงกับ mock ใน lib/store.js)
-- รันหลัง schema.sql:  psql "$DATABASE_URL" -f db/seed.sql
-- ============================================================

BEGIN;

INSERT INTO users (id, email, password, name, username, role, institution, status, created_at) VALUES
  ('U001','exec@kmitl.ac.th','1234','ผศ.ดร. วราภรณ์ ศรีบุญ','exec','exec','KMITL','active','2026-01-12'),
  ('U002','marketing@kmitl.ac.th','1234','ชนิดา พงษ์ทวี','marketing','marketing','KMITL','active','2026-01-12'),
  ('U003','gis@kmitl.ac.th','1234','ธนกฤต อินทโชติ','gis','gis','KMITL','active','2026-01-15'),
  ('U004','admin@kmitl.ac.th','1234','ปิยะพงษ์ แก้วมณี','admin','admin','KMITL','active','2026-01-10'),
  ('U005','pr@kmitl.ac.th','1234','ณัฐริกา สุขเกษม','pr','pr','KMITL','active','2026-02-02'),
  ('U006','registrar@kmitl.ac.th','1234','อรพรรณ ทองดี','registrar','registrar','KMITL','active','2026-02-02'),
  ('U007','student@kmitl.ac.th','1234','กิตติพัฒน์ ใจงาม','student','user','KMITL','active','2026-03-01'),
  ('U008','somchai@kmitl.ac.th','1234','สมชาย ตั้งมั่น','somchai','user','KMITL','suspended','2026-03-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO request_quota (id, per_user_per_day, per_user_per_month, updated_by) VALUES
  ('RQ-CONF', 3, 20, 'U004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO requests (id, user_id, user_name, type, detail, status, note, created_at) VALUES
  ('RQ-1001','U007','กิตติพัฒน์ ใจงาม','ขอแก้ไขข้อมูลห้อง','ห้อง 106 เปลี่ยนเป็นห้องปฏิบัติการคอมพิวเตอร์','pending','','2026-08-18'),
  ('RQ-1002','U007','กิตติพัฒน์ ใจงาม','ขอเพิ่มสถานที่','เพิ่มจุดจอดจักรยานหน้าตึกพระจอมเกล้าฯ','approved','ส่งต่อผู้ดูแลข้อมูลสถานที่แล้ว','2026-08-10'),
  ('RQ-1003','U008','สมชาย ตั้งมั่น','ขอสิทธิ์เข้าถึงข้อมูล','ขอสิทธิ์แก้ไขข้อมูลชั้นอาคาร','rejected','ไม่อยู่ในขอบเขตหน้าที่','2026-08-05'),
  ('RQ-1004','U007','กิตติพัฒน์ ใจงาม','แจ้งข้อมูลผิด','ชื่ออาจารย์ประจำห้อง 107 ไม่ตรงกับความเป็นจริง','pending','','2026-08-21')
ON CONFLICT (id) DO NOTHING;

INSERT INTO feedback (id, user_id, user_name, topic, detail, status, reply, created_at) VALUES
  ('FB-2001','U007','กิตติพัฒน์ ใจงาม','การใช้งานแผนที่','อยากให้ค้นหาด้วยรหัสวิชาได้','new','','2026-08-19'),
  ('FB-2002','U008','สมชาย ตั้งมั่น','ปัญหาการใช้ระบบ','กดค้นหาห้องน้ำแล้วหมุดไม่ขึ้น','reviewed','แก้ไขแล้วในเวอร์ชัน 1.2.3','2026-08-12')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contracts (id, institution, plan, start_date, end_date, status, contact) VALUES
  ('CT-01','สจล. (KMITL)','Campus Pro','2025-09-01','2026-08-31','active','ict@kmitl.ac.th'),
  ('CT-02','มหาวิทยาลัย A','Campus Basic','2025-06-01','2026-09-15','active','it@univ-a.ac.th'),
  ('CT-03','มหาวิทยาลัย B','Campus Pro','2024-10-01','2026-08-26','active','admin@univ-b.ac.th'),
  ('CT-04','มหาวิทยาลัย C','Trial','2026-05-01','2026-07-31','expired','office@univ-c.ac.th')
ON CONFLICT (id) DO NOTHING;

INSERT INTO institution_access (id, institution, level, modules, seats, updated_at) VALUES
  ('IA-01','สจล. (KMITL)','full', ARRAY['map','events','rooms','reports'], 5000,'2026-07-01'),
  ('IA-02','มหาวิทยาลัย A','standard', ARRAY['map','events'], 2000,'2026-06-11'),
  ('IA-03','มหาวิทยาลัย B','full', ARRAY['map','events','rooms'], 3500,'2026-05-20'),
  ('IA-04','มหาวิทยาลัย C','readonly', ARRAY['map'], 300,'2026-05-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, kind, color, "desc") VALUES
  ('CAT-01','วิชาการ','event','#1A73E8','สัมมนา บรรยาย อบรม'),
  ('CAT-02','กีฬา/นันทนาการ','event','#188038','กิจกรรมกีฬาและสันทนาการ'),
  ('CAT-03','อาคารเรียน','place','#E37400','อาคารสำหรับการเรียนการสอน'),
  ('CAT-04','โรงอาหาร','place','#D93025','จุดจำหน่ายอาหารและเครื่องดื่ม'),
  ('CAT-05','ลานกิจกรรม','place','#8430CE','พื้นที่โล่งสำหรับจัดกิจกรรม')
ON CONFLICT (id) DO NOTHING;

INSERT INTO news (id, title, body, publish_at, expire_at, published, author, created_at) VALUES
  ('NW-01','ประกาศตารางสอบกลางภาค 1/2569','นักศึกษาสามารถตรวจสอบตารางสอบกลางภาคได้ที่ระบบทะเบียน','2026-08-20','2026-09-30',TRUE,'ณัฐริกา สุขเกษม','2026-08-18'),
  ('NW-02','เปิดรับสมัครทุนการศึกษา ประจำปี 2569','เปิดรับสมัครทุนสำหรับนักศึกษาชั้นปีที่ 2 ขึ้นไป','2026-09-01','2026-10-15',TRUE,'ณัฐริกา สุขเกษม','2026-08-22'),
  ('NW-03','แจ้งปิดปรับปรุงลิฟต์อาคาร Sc8','ลิฟต์ฝั่งทิศเหนือปิดปรับปรุงชั่วคราว','2026-07-01','2026-07-31',TRUE,'ณัฐริกา สุขเกษม','2026-06-28'),
  ('NW-04','ร่าง: กำหนดการปฐมนิเทศนักศึกษาใหม่','อยู่ระหว่างรอยืนยันกำหนดการจากคณะ',NULL,NULL,FALSE,'ณัฐริกา สุขเกษม','2026-08-23')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, name, detail, category_id, start_at, end_at, place_name, lat, lon, temp_place_category_id, published, author, created_at) VALUES
  ('EV-01','ISE Open House 2026','เปิดบ้านคณะวิศวกรรมศาสตร์นานาชาติ','CAT-01','2026-09-05 09:00','2026-09-05 16:00','ลานหน้าอาคารพระจอมเกล้าฯ (Sc8)',13.729721,100.780099,'CAT-05',TRUE,'ณัฐริกา สุขเกษม','2026-08-10'),
  ('EV-02','กีฬาสีภาควิชา','แข่งขันกีฬาสีประจำปี','CAT-02','2026-09-18 08:00','2026-09-19 17:00','สนามกีฬากลาง สจล.',13.7275,100.7772,NULL,TRUE,'ณัฐริกา สุขเกษม','2026-08-12'),
  ('EV-03','อบรมการใช้งาน SciMap','อบรมสำหรับเจ้าหน้าที่ภาควิชา','CAT-01','2026-08-01 13:00','2026-08-01 16:00','Coworking Space KDAI',13.729,100.7799,NULL,TRUE,'ณัฐริกา สุขเกษม','2026-07-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_interest (id, event_id, user_id, created_at) VALUES
  ('EI-01','EV-01','U007','2026-08-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_stats (event_id, interested, searched) VALUES
  ('EV-01',176,402), ('EV-02',41,88), ('EV-03',33,51)
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO floors (id, building, floor, name, svg, note, status) VALUES
  ('FL-01','Sc8','1','ชั้น 1','/data/floorplans/Sc8/floor1.svg','โถงต้อนรับ / Coworking','active'),
  ('FL-02','Sc8','2','ชั้น 2','/data/floorplans/Sc8/floor2.svg','ห้องเรียนรวม','active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, building, floor, code, name, type, capacity, teacher, node_id, category_id) VALUES
  ('RM-01','Sc8','1','106','ห้อง 106','ห้องเรียน',45,'อ.ดร. ปรีชา วงศ์ทอง','Sc8StudyRoom1F1','CAT-03'),
  ('RM-02','Sc8','1','107','ห้อง 107','ห้องปฏิบัติการ',40,'อ.ดร. สุนิสา ภูผา','Sc8StudyRoom2F1','CAT-03'),
  ('RM-03','Sc8','1','KDAI','Coworking Space KDAI','พื้นที่ทำงานร่วม',60,'-','Sc8StudyRoom3F1','CAT-03')
ON CONFLICT (id) DO NOTHING;

INSERT INTO map_boundaries (id, name, type, points, status, updated_at) VALUES
  ('MB-01','ขอบเขตวิทยาเขตลาดกระบัง','campus',42,'published','2026-08-01'),
  ('MB-02','ขอบเขตอาคารพระจอมเกล้าฯ (Sc8)','building',8,'published','2026-08-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO map_assets (id, name, kind, file, updated_at) VALUES
  ('MA-01','ผังชั้น 1 อาคาร Sc8','floorplan','/data/floorplans/Sc8/floor1.svg','2026-08-06'),
  ('MA-02','ผังชั้น 2 อาคาร Sc8','floorplan','/data/floorplans/Sc8/floor2.svg','2026-08-06'),
  ('MA-03','ภาพอาคาร Sc8','image','/data/places/sc8.png','2026-07-28')
ON CONFLICT (id) DO NOTHING;

INSERT INTO usage (month, active_users, searches, routes) VALUES
  ('2026-03',1820,9120,4310), ('2026-04',2110,10480,5020), ('2026-05',2450,12240,6110),
  ('2026-06',1980,8830,3990), ('2026-07',2680,13910,6840), ('2026-08',3120,16240,7930)
ON CONFLICT (month) DO NOTHING;

COMMIT;
