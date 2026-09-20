# การ Deploy แอปพลิเคชันลงสู่ระบบ

เนื่องจากเราใช้โฮสต์ของภาค (ที่เข้าที่ [https://init-d.cskmitl.com]()) จากที่ลองใช้มา พบว่า 

### <mark>ใครสมัคร</mark>ใช้เซิฟ คนนั้นเป็น<mark>คนเดียว</mark>ที่<mark>สามารถเข้าไป config ได้ </mark>

การ ssh เข้าไปจากภายนอกไม่สามารถทำได้จากที่ลองผ่าน public ip address และเราต้องถาม staff ว่าสามารถ ssh จาก cli ที่ไม่ผ่าน web browser เข้าไปได้อย่างไร หรือไม่สามารถทำได้เลย จึงจำเป็นต้องให้ผู้สมัครใช้งานคนเดียวในกลุ่มเข้าไป deploy งานลงบนเซิร์ฟภาคฯ

# init-d คืออะไร ทำงานอย่างไร

init-d คือระบบจัดสรร Virtual Machine (VM) และ LXC Container ส่วนกลางของภาควิชาวิทยาการคอมพิวเตอร์ (CS KMITL) ซึ่งหน้าเพจข้างต้นเป็นแค่หน้ารับคำร้องสร้าง infra ไม่ใช่ server/host ของ resource ที่เรานำไปฝากไว้ 
ในโปรเจกต์นี้ URL ของระบบที่โฮสต์ไว้ในเบื้องต้นคือ https://kmitl-map.cskmitl.com/ ซึ่งเป็น public network (สามารถเข้าถึงได้จากทั่วโลก ตราบใดที่เชื่อมต่ออินเตอร์เน็ต)

เมื่อเราไปจดทะเบียนการใช้งาน VM ของภาควิชา เราจะต้องกรอกรายละเอียด ซึ่งมี

1. Hostname

2. OS Template (โดยปกติเป็น ubuntu-24.04)

3. CPU Cores

4. Memory (RAM)

5. Storage (Disk)

6. Network Access (Local IP / Public IP)

7. DNS Request (เช่น `api-gateway-prod.cskmitl.com`)

8. Ports ที่เปิด (เช่น 8080, 3000 {React, Next.js, Remix, Vite})

9. Start Date, End Date

ซึ่งนอกจากนี้ เมื่อเราได้รับ VM แล้ว เราจะได้รับ URL ซึ่งไว้เปิดใช้งาน web application ของเราที่นำไปฝากไว้ ดังที่นำเสนอไว้ในเอกสารฉบับนี้

# วิธีติดตั้ง (deploy)

1. เข้าไป pull GitHub Repository https://github.com/pattara-tt/ise-kmitlMap

2. เลือก branch `update/latest-and-fixed`

3. รันคำสั่งต่อไปนี้
   
   1. `cd <path-to-repo>/ise-kmitlMap`
   
   2. `docker compose up -d --build`

# วิธีถอนการติดตั้ง (undeploy)

    รันคำสั่งต่อไปนี้

    `docker compose down`

# กฎเหล็กสำหรับการพัฒนาโปรแกรมเพิ่มเติม

### 🚨 ห้ามใช้คำสั่ง git push --force โดยเด็ดขาด!!! 🚨


