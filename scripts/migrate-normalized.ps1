$ErrorActionPreference = 'Stop'

$DbContainer = 'scimap-db'
$Migration = 'db/migrations/001_normalize.sql'
$BackupDir = 'backups'

if (-not (Test-Path $Migration)) { throw "Migration file not found: $Migration. Run this script from the project root." }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'docker was not found in PATH.' }

$running = docker inspect -f '{{.State.Running}}' $DbContainer 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne 'true') { throw "$DbContainer is not running." }

$dbUser = (docker exec $DbContainer printenv POSTGRES_USER).Trim()
$dbName = (docker exec $DbContainer printenv POSTGRES_DB).Trim()
if (-not $dbUser) { $dbUser = 'kmitlmap' }
if (-not $dbName) { $dbName = 'kmitlmap' }

# This migration is intended for the 20-table legacy schema shown during the refactor.
$existingCount = docker exec $DbContainer psql -X -v ON_ERROR_STOP=1 -U $dbUser -d $dbName -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
if ($LASTEXITCODE -ne 0) { throw 'Failed to count existing public tables.' }
$existingCount = [int]($existingCount | Select-Object -Last 1)

if ($existingCount -eq 32) {
  Write-Host 'Database already has 32 public tables. Migration will not be run again.'
  exit 0
}

if ($existingCount -ne 20) {
  throw "Expected 20 legacy public tables, but found $existingCount. Migration stopped for safety."
}

$hasMapEdits = docker exec $DbContainer psql -X -v ON_ERROR_STOP=1 -U $dbUser -d $dbName -Atc "SELECT to_regclass('public.map_edits') IS NOT NULL;"
if ($LASTEXITCODE -ne 0 -or $hasMapEdits.Trim() -ne 't') {
  throw 'Legacy schema check failed: public.map_edits was not found.'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force $BackupDir | Out-Null
$containerBackup = "/tmp/scimap-pre-normalize-$stamp.dump"
$hostBackup = Join-Path $BackupDir "scimap-pre-normalize-$stamp.dump"

Write-Host "[1/7] Creating database backup: $hostBackup"
docker exec $DbContainer pg_dump -U $dbUser -d $dbName -Fc -f $containerBackup
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed. Migration has not started.' }

docker cp "${DbContainer}:$containerBackup" $hostBackup
if ($LASTEXITCODE -ne 0) { throw 'docker cp failed while copying backup. Migration has not started.' }
docker exec $DbContainer rm -f $containerBackup | Out-Null

Write-Host '[2/7] Recording important row counts before migration'
$beforeSql = @"
SELECT 'users='||count(*) FROM users;
SELECT 'requests='||count(*) FROM requests;
SELECT 'news='||count(*) FROM news;
SELECT 'events='||count(*) FROM events;
SELECT 'map_edits='||count(*) FROM map_edits;
"@
$beforeSql | docker exec -i $DbContainer psql -X -v ON_ERROR_STOP=1 -U $dbUser -d $dbName -At
if ($LASTEXITCODE -ne 0) { throw 'Failed to read pre-migration row counts.' }

$migrationCommitted = $false
Write-Host '[3/7] Stopping frontend and backend only. Database remains running.'
docker compose stop frontend backend | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to stop frontend/backend containers.' }

try {
  Write-Host '[4/7] Copying and running transactional migration'
  docker cp $Migration "${DbContainer}:/tmp/001_normalize.sql"
  if ($LASTEXITCODE -ne 0) { throw 'Failed to copy migration file into the database container.' }

  docker exec $DbContainer psql -X -v ON_ERROR_STOP=1 -U $dbUser -d $dbName -f /tmp/001_normalize.sql
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed. The SQL transaction should roll back.' }
  $migrationCommitted = $true

  Write-Host '[5/7] Verifying 32 target tables and event_stats_view'
  $verifySql = @"
WITH required(name) AS (VALUES
 ('institutions'),('roles'),('use_cases'),('role_use_cases'),('users'),('account_history'),
 ('faculties'),('buildings'),('floors'),('nodes'),('edges'),('categories'),('rooms'),
 ('map_boundaries'),('map_assets'),('map_drafts'),('requests'),('request_quota'),
 ('broadcasts'),('notifications'),('feedback'),('news'),('events'),('event_interest'),
 ('event_stats'),('contracts'),('modules'),('institution_access'),
 ('institution_access_modules'),('access_history'),('edit_logs'),('usage')
), missing AS (
 SELECT r.name FROM required r
 LEFT JOIN pg_tables t ON t.schemaname='public' AND t.tablename=r.name
 WHERE t.tablename IS NULL
)
SELECT CASE WHEN count(*)=0 THEN 'TARGET_TABLES_OK' ELSE 'MISSING='||string_agg(name,',') END FROM missing;
SELECT 'TABLE_COUNT='||count(*) FROM pg_tables WHERE schemaname='public';
SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='event_stats_view') THEN 'EVENT_STATS_VIEW_OK' ELSE 'EVENT_STATS_VIEW_MISSING' END;
SELECT CASE WHEN to_regclass('public.map_edits') IS NULL THEN 'LEGACY_MAP_EDITS_REMOVED' ELSE 'LEGACY_MAP_EDITS_STILL_EXISTS' END;
SELECT 'users='||count(*) FROM users;
SELECT 'requests='||count(*) FROM requests;
SELECT 'news='||count(*) FROM news;
SELECT 'events='||count(*) FROM events;
SELECT 'edit_logs='||count(*) FROM edit_logs;
"@

  $verifyOut = $verifySql | docker exec -i $DbContainer psql -X -v ON_ERROR_STOP=1 -U $dbUser -d $dbName -At
  if ($LASTEXITCODE -ne 0) { throw 'Database verification query failed.' }

  $verifyOut | ForEach-Object { Write-Host $_ }

  if (($verifyOut -notcontains 'TARGET_TABLES_OK') -or
      ($verifyOut -notcontains 'TABLE_COUNT=32') -or
      ($verifyOut -notcontains 'EVENT_STATS_VIEW_OK') -or
      ($verifyOut -notcontains 'LEGACY_MAP_EDITS_REMOVED')) {
    throw 'Verification failed after migration. Do not continue using the application until the database is checked.'
  }

  Write-Host '[6/7] Starting backend and frontend'
  docker compose up -d backend frontend | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Migration succeeded, but frontend/backend failed to start.' }
  Start-Sleep -Seconds 3
  docker compose ps

  Write-Host '[7/7] Migration completed successfully.'
  Write-Host "Backup file: $hostBackup"
  Write-Host 'Keep the backup until all application flows have been tested.'
}
catch {
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Backup file: $hostBackup" -ForegroundColor Yellow

  if (-not $migrationCommitted) {
    Write-Host 'Migration did not commit. Starting frontend/backend again.'
    docker compose up -d backend frontend | Out-Null
  } else {
    Write-Host 'Migration committed but verification/startup failed. Check the database before continuing.' -ForegroundColor Red
  }
  throw
}