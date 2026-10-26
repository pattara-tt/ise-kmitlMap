#!/usr/bin/env bash
# deploy เวอร์ชันล่าสุดบน VM โดยไม่ต้อง docker compose down (ข้อมูลใน volume ไม่ถูกแตะ)
#   ./deploy/deploy.sh
# ลำดับ: pull → สำรองฐาน → build image ใหม่ → migrate → เปลี่ยน container → ตรวจ health
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f .env ] && set -a && . ./.env && set +a
DB_USER="${POSTGRES_USER:-kmitlmap}"; DB_NAME="${POSTGRES_DB:-kmitlmap}"

echo "▶ 1/6 ดึงโค้ดล่าสุด"
before=$(git rev-parse --short HEAD)
git pull --ff-only
after=$(git rev-parse --short HEAD)
echo "   $before → $after"

echo "▶ 2/6 สำรองฐานข้อมูล"
mkdir -p backups
dump="backups/${DB_NAME}-$(date +%F-%H%M)-${before}.dump"
docker compose exec -T db pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$dump"
[ -s "$dump" ] || { echo "สำรองไม่สำเร็จ หยุด deploy" >&2; exit 1; }
echo "   $dump"
ls -1t backups/*.dump | tail -n +15 | xargs -r rm -f   # เก็บ 14 ไฟล์ล่าสุด

echo "▶ 3/6 build image ใหม่ (container เดิมยังทำงานอยู่)"
docker compose build

echo "▶ 4/6 migrate"
./deploy/migrate.sh

echo "▶ 5/6 เปลี่ยน container เฉพาะส่วนที่เปลี่ยน"
docker compose up -d

echo "▶ 6/6 ตรวจ health"
for i in $(seq 30); do
  if curl -fsS -o /dev/null http://localhost/ && [ "$(docker compose ps --format '{{.Health}}' backend)" = "healthy" ]; then
    echo "✅ deploy สำเร็จ ($after)"; exit 0
  fi
  sleep 2
done
echo "❌ health check ไม่ผ่าน ดู: docker compose logs --tail=50 backend frontend" >&2
echo "   ย้อนโค้ด: git checkout $before && docker compose up -d --build" >&2
echo "   ย้อนฐาน (ถ้าจำเป็น): docker compose exec -T db pg_restore -U $DB_USER -d $DB_NAME --clean --if-exists < $dump" >&2
exit 1
