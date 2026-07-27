#!/usr/bin/env node

/**
 * Run SQL Migrations
 * ==================
 * Executes all .sql files from _core/db/migrations/ directly against the database.
 * Uses raw psql execution instead of drizzle-kit to avoid metadata/journal issues.
 *
 * CRITICAL: Fails hard on unexpected migration errors to prevent silent deployment failures.
 * Known-superseded migrations (0027, 0028) are allowed to fail and logged separately,
 * as they are fixed by 0029.
 *
 * Usage: node scripts/run-migrations.mjs
 * Exit codes:
 *   0 = success (migrations ran or no migrations found)
 *   1 = error (database unavailable or SQL failed, including unexpected migration errors)
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), '_core/db/migrations');

// Migrations known to be superseded by later fixes
// These are allowed to fail during execution without blocking the deploy
// 0027: has reserved keyword 'current_date' bug - fixed by 0029
// 0028: missing ::inventory_status ENUM casts - fixed by 0029
const KNOWN_SUPERSEDED_MIGRATIONS = new Set(['0027_add_slot_tracking_to_inventory.sql', '0028_fix_slot_tracking_backfill.sql']);

console.log('[Migrations] Starting migration runner...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('[Migrations] DATABASE_URL not set — skipping migrations');
  process.exit(0);
}

console.log('[Migrations] DATABASE_URL is available');

// Check if migrations directory exists
if (!existsSync(migrationsDir)) {
  console.log('[Migrations] No migrations directory found');
  process.exit(0);
}

// List migration files
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('[Migrations] No .sql migration files found');
  process.exit(0);
}

console.log(`[Migrations] Found ${files.length} migration file(s):`);
files.forEach(f => console.log(`  - ${f}`));

// Execute each SQL file directly with psql
let succeeded = 0;
let failed = 0;
let superseded = 0;

for (const file of files) {
  const filepath = join(migrationsDir, file);
  const sql = readFileSync(filepath, 'utf8');
  const isSuperseded = KNOWN_SUPERSEDED_MIGRATIONS.has(file);

  console.log(`[Migrations] Executing ${file}...`);

  try {
    execSync(`psql "$DATABASE_URL" -v ON_ERROR_STOP=1`, {
      input: sql,
      stdio: 'inherit',
      env: process.env,
    });
    console.log(`[Migrations] ✅ ${file} completed`);
    succeeded++;
  } catch (error) {
    if (isSuperseded) {
      console.warn(`[Migrations] ⚠️  ${file} failed (known to be superseded, continuing)`);
      console.warn(`[Migrations]    Error: ${error.message.split('\n')[0]}`);
      superseded++;
    } else {
      console.error(`[Migrations] ❌ ${file} failed with unexpected error`);
      console.error(error.message);
      failed++;
    }
  }
}

console.log(`[Migrations] Results: ${succeeded} succeeded, ${superseded} superseded, ${failed} failed`);

if (failed > 0) {
  console.error(`[Migrations] FAIL: ${failed} unexpected migration error(s) — aborting deploy`);
  process.exit(1);
}

if (superseded > 0) {
  console.warn(`[Migrations] ⚠️  ${superseded} superseded migration(s) skipped — proceeding with caution`);
}

console.log('[Migrations] ✅ All migrations completed successfully');
process.exit(0);
