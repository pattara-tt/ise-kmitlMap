# SciMap: Upgrade existing 20-table DB to 32 tables

**This patch does not modify your live PostgreSQL database by itself.** Run the migration script on the machine where your Docker Compose project is located, after reviewing a backup. Do not run `db/schema.sql` against the existing 20-table DB; use `db/migrations/001_normalize.sql` to convert columns and preserve legacy rows.

Expected result: **32 public tables**, `event_stats_view` (view, not counted as a table), and **no legacy `map_edits` table** (`edit_logs` replaces it).

1. Extract the ZIP into the **project root** alongside `docker-compose.yml`, allowing it to replace files under `db/` and `scripts/`.
2. From **PowerShell** in that root directory, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\migrate-normalized.ps1
   ```

3. The script verifies the DB starts with 20 tables, saves a timestamped `pg_dump` under `backups/`, stops frontend and backend (never the DB), runs the SQL migration, checks the 32-table target and starts the app back up. If the migration itself fails, its SQL transaction rolls back. If post-migration validation fails, the new script **keeps apps stopped** and prints the backup location for recovery.
4. Inspect the current table list independently:

   ```powershell
   docker exec -it scimap-db psql -U kmitlmap -d kmitlmap -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
   ```

   Use your actual DB user/name if different. Check there are 32 rows, and separately check the view:

   ```powershell
   docker exec -it scimap-db psql -U kmitlmap -d kmitlmap -c "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname='event_stats_view';"
   ```

**Safety:** Test against a clone of production data first. Keep the backup. If your live DB contains custom schema modifications, migration may fail; send the first SQL `ERROR` and do not run an ad-hoc `CREATE TABLE` series. The migration has been statically checked against the repository but **has not been executed against your live PostgreSQL volume**.
