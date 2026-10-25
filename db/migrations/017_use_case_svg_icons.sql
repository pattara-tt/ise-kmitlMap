-- ปรับไอคอนเมนู sidebar จากอีโมจิเป็น SVG (ไฟล์อยู่ที่ public/data/icon/ui)
UPDATE use_cases SET icon = 'svg:boundary' WHERE key = 'boundary';
UPDATE use_cases SET icon = 'svg:puzzle' WHERE key = 'assets';
UPDATE use_cases SET icon = 'svg:save' WHERE key = 'save';
UPDATE use_cases SET icon = 'svg:users' WHERE key = 'users';
UPDATE use_cases SET icon = 'svg:clipboard' WHERE key = 'requests';
UPDATE use_cases SET icon = 'svg:key' WHERE key = 'roles';
UPDATE use_cases SET icon = 'svg:user_check' WHERE key = 'status';
UPDATE use_cases SET icon = 'svg:pin' WHERE key = 'rooms';
UPDATE use_cases SET icon = 'svg:category' WHERE key = 'room_types';
UPDATE use_cases SET icon = 'svg:clipboard' WHERE key = 'exec_requests';