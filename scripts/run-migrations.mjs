#!/usr/bin/env node

/**
 * Run SQL Migrations
 * ==================
 * Executes all .sql files from _core/db/migrations/ directly against the database.
 * Uses raw psql execution instead of drizzle-kit to avoid metadata/journal issues.
 *
 * Usage: node scripts/run-migrations.mjs
 * Exit codes:
 *   0 = success (migrations ran or no migrations found)
 *   1 = error (database unavailable or SQL failed)
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), '_core/db/migrations');

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

for (const file of files) {
  const filepath = join(migrationsDir, file);
  const sql = readFileSync(filepath, 'utf8');

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
    console.error(`[Migrations] ❌ ${file} failed`);
    console.error(error.message);
    failed++;
  }
}

console.log(`[Migrations] Results: ${succeeded} succeeded, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('[Migrations] ✅ All migrations completed successfully');
process.exit(0);
