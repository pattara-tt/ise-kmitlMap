#!/usr/bin/env bash
# รัน migration ที่ยังไม่เคยรัน (db/migrations/*.sql) ตามลำดับชื่อไฟล์ และจดชื่อไฟล์ไว้ในตาราง schema_migrations
#   ./deploy/migrate.sh            รัน migration ที่ค้าง
#   ./deploy/migrate.sh --status   ดูว่าอะไรรันแล้ว/ค้างอยู่ (ไม่แก้ฐานข้อมูล)
# เลือกวิธีเรียก psql ด้วย PSQL (ค่าเริ่มต้น: psql ใน container db ของ docker compose)
#   PSQL="psql -h localhost -U postgres -d test" ./deploy/migrate.sh
# กติกา: ทุกไฟล์ต้องรันซ้ำได้ (IF NOT EXISTS ฯลฯ) และห้ามแก้ไฟล์ที่ push ไปแล้ว ถ้าผิดให้เขียนไฟล์ใหม่แก้
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -f .env ] && set -a && . ./.env && set +a
PSQL="${PSQL:-docker compose exec -T db psql -U ${POSTGRES_USER:-kmitlmap} -d ${POSTGRES_DB:-kmitlmap}}"
q() { $PSQL -v ON_ERROR_STOP=1 -qtA "$@"; }

shopt -s nullglob
files=(db/migrations/*.sql)
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort)); unset IFS
names=(); for f in "${files[@]}"; do names+=("$(basename "$f")"); done

q -c "SET client_min_messages=warning; CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"

# ครั้งแรก (ตารางว่าง): ฐานเดิมยังไม่เคยจดว่ารันอะไรไปแล้ว → ตรวจสภาพฐานแล้วจดให้
if [ "$(q -c 'SELECT count(*) FROM schema_migrations')" = "0" ]; then
  has_col() { [ "$(q -c "SELECT count(*) FROM information_schema.columns WHERE table_name='$1' AND column_name='$2'")" != "0" ]; }
  has_tbl() { [ "$(q -c "SELECT count(*) FROM information_schema.tables WHERE table_name='$1'")" != "0" ]; }
  if has_col map_boundaries selectable_for_assets && ! has_col feedback status; then
    upto="9999"; why="ฐานสร้างจาก schema.sql ล่าสุด (มีครบทุก migration แล้ว)"
  elif has_tbl search_logs; then
    upto="008"; why="ฐานเดิมที่รัน migration ถึง 008"
  else
    echo "ไม่รู้จักสภาพฐานข้อมูล (ไม่มี search_logs) — ตรวจเองก่อนแล้วจด baseline ด้วยมือ" >&2; exit 1
  fi
  echo "baseline: $why → จดไฟล์ถึงเลข ${upto} ว่ารันแล้ว"
  for n in "${names[@]}"; do
    [ "${n%%_*}" \> "$upto" ] && continue
    q -c "INSERT INTO schema_migrations(name) VALUES ('$n') ON CONFLICT DO NOTHING"
  done
fi

pending=()
for n in "${names[@]}"; do
  [ "$(q -c "SELECT count(*) FROM schema_migrations WHERE name='$n'")" = "0" ] && pending+=("$n")
done

if [ "${1:-}" = "--status" ]; then
  echo "รันแล้ว: $(( ${#names[@]} - ${#pending[@]} )) ไฟล์ · ค้าง: ${#pending[@]} ไฟล์"
  for n in "${pending[@]}"; do echo "  ค้าง  $n"; done
  exit 0
fi

[ ${#pending[@]} -eq 0 ] && { echo "ไม่มี migration ค้าง"; exit 0; }
for n in "${pending[@]}"; do
  echo "▶ รัน $n"
  $PSQL -v ON_ERROR_STOP=1 -q < "db/migrations/$n"
  q -c "INSERT INTO schema_migrations(name) VALUES ('$n')"
done
echo "เสร็จ: รัน ${#pending[@]} ไฟล์"
