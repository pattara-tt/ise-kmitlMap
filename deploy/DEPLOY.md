# การติดตั้ง SciMap บน Compute Engine (VM เดียว)

รวมทั้งเว็บแอปและฐานข้อมูล PostgreSQL ไว้บนเครื่องเดียว ไม่ต้องใช้ Cloud SQL

## 1. สร้าง VM

Console → Compute Engine → **Create instance**

| หัวข้อ | ค่าที่แนะนำ |
|---|---|
| Region | `asia-southeast1` (สิงคโปร์) |
| Machine type | `e2-small` (2 GB RAM) — ต่ำกว่านี้ `npm run build` อาจไม่พอ |
| Boot disk | Ubuntu 24.04 LTS, 20 GB |
| Firewall | ติ๊ก **Allow HTTP traffic** (และ HTTPS ถ้าจะใช้โดเมน) |

> ถ้าเลือก `e2-micro` (1 GB) ให้เพิ่ม swap ก่อน build:
> ```bash
> sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
> sudo mkswap /swapfile && sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

## 2. อัปโหลดโค้ดขึ้น VM

กดปุ่ม **SSH** ในหน้า VM instances (เปิดเทอร์มินัลในเบราว์เซอร์ ไม่ต้องตั้ง key เอง) แล้วเลือกวิธีใดวิธีหนึ่ง:

```bash
# วิธีที่ 1 — ผ่าน Git
sudo apt-get update && sudo apt-get install -y git
git clone YOUR_REPO_URL kmitlmap && cd kmitlmap

# วิธีที่ 2 — อัปโหลด zip ผ่านปุ่ม ⚙️ → Upload file ในหน้าต่าง SSH
sudo apt-get install -y unzip
unzip ise-kmitlMap.zip && cd ise-kmitlMap
```

## 3. รันสคริปต์ติดตั้ง

```bash
sudo DB_PASS='ตั้งรหัสผ่านที่นี่' bash deploy/setup-vm.sh
```

สคริปต์จะทำให้ทั้งหมดนี้อัตโนมัติ:

1. ติดตั้ง PostgreSQL 16, Node.js 22, Nginx
2. สร้าง database `kmitlmap` + user และรัน `db/schema.sql` กับ `db/seed.sql`
3. คัดลอกโค้ดไป `/opt/kmitlmap`, สร้าง `.env.local`, `npm install` และ `npm run build`
4. ตั้ง systemd service ให้รันเองเมื่อบูตเครื่อง
5. ตั้ง Nginx reverse proxy พอร์ต 80 → 3000

เสร็จแล้วเปิดที่ `http://EXTERNAL_IP` ได้เลย

## 4. คำสั่งที่ใช้บ่อย

```bash
sudo systemctl status kmitlmap      # ดูสถานะ
sudo systemctl restart kmitlmap     # รีสตาร์ท
sudo journalctl -u kmitlmap -f      # ดู log สด
sudo -u postgres psql kmitlmap      # เข้า database
```

## 5. อัปเดตโค้ดใหม่

```bash
cd ~/ise-kmitlMap && git pull        # หรืออัปโหลด zip ใหม่แล้ว unzip ทับ
sudo rsync -a --delete --exclude node_modules --exclude .next --exclude .env.local \
  ./ /opt/kmitlmap/
cd /opt/kmitlmap
sudo -u kmitlmap npm install --omit=dev
sudo -u kmitlmap npm run build
sudo systemctl restart kmitlmap
```

## 6. สำรองข้อมูล (สำคัญ)

การรวมทุกอย่างไว้ VM เดียวแลกมากับการที่ไม่มี automated backup แบบ Cloud SQL — ต้องตั้งเอง

```bash
sudo crontab -e
# เพิ่มบรรทัดนี้ (สำรองตี 2 ทุกวัน เก็บย้อนหลัง 14 วัน)
0 2 * * * /opt/kmitlmap/deploy/backup-db.sh >> /var/log/kmitlmap-backup.log 2>&1
```

แนะนำให้เปิดคอมเมนต์บรรทัด `gsutil cp` ใน `deploy/backup-db.sh` ให้ส่งไฟล์ขึ้น Cloud Storage ด้วย เพราะถ้า disk ของ VM เสียหาย ไฟล์ backup ที่อยู่บน VM เดียวกันก็หายไปพร้อมกัน

อีกทางคือเปิด **snapshot schedule** ของ disk ใน Console (Compute Engine → Snapshots) ซึ่งกู้ทั้งเครื่องคืนได้

## 7. ใส่โดเมนและ HTTPS (ถ้ามีโดเมน)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/kmitlmap    # แก้ server_name จาก _ เป็นโดเมนจริง
sudo certbot --nginx -d map.example.ac.th
```

Certbot ต่ออายุใบรับรองให้เองอัตโนมัติ

## ความปลอดภัยที่ตั้งไว้ให้แล้ว

- PostgreSQL ฟังเฉพาะ `127.0.0.1` ไม่เปิดออกอินเทอร์เน็ต — เข้าถึงได้จากแอปบนเครื่องเดียวกันเท่านั้น
- Next.js ผูกกับ `127.0.0.1:3000` ให้ Nginx เป็นตัวรับจากภายนอกฝ่ายเดียว
- service รันด้วย user `kmitlmap` ที่ไม่มีสิทธิ์ login พร้อม systemd hardening (`ProtectSystem`, `NoNewPrivileges`)
- `.env.local` ตั้ง permission `600` เจ้าของอ่านได้คนเดียว

**ยังต้องทำก่อนใช้จริง:** `users.password` ยังเก็บเป็น plaintext ตาม mock เดิม ควรเปลี่ยนเป็น bcrypt hash ใน `app/api/auth/route.js`

## ข้อแลกเปลี่ยนที่ควรรู้

รวมไว้ VM เดียวจัดการง่ายและถูกกว่าจริง (ประหยัดค่า Cloud SQL ~$10–25/เดือน) แต่แลกกับ:

- ต้องดูแล backup, patch OS, และ tuning PostgreSQL เอง
- VM ดับ = ทั้งเว็บและฐานข้อมูลดับพร้อมกัน ไม่มี automatic failover
- ตอน `npm run build` จะกิน RAM/CPU แข่งกับฐานข้อมูล — เว็บอาจช้าชั่วขณะ

สำหรับโปรเจกต์เรียนและ demo ถือว่าคุ้มมาก ถ้าวันหนึ่งมีผู้ใช้จริงจำนวนมากค่อยแยก database ออกไป Cloud SQL ทีหลังได้ โดยแก้แค่ `DATABASE_URL` ใน `.env.local` บรรทัดเดียว โค้ดไม่ต้องแตะ
