#!/usr/bin/env node

/**
 * Run Drizzle Migrations
 * ======================
 * Guaranteed migration runner for Render deploy.
 * Executes all pending SQL migrations from _core/db/migrations/
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
  console.warn('[Migrations] DATABASE_URL not set — skipping migrations (database unavailable)');
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

// Run drizzle-kit migrate
console.log('[Migrations] Running: pnpm drizzle-kit migrate');

try {
  const output = execSync('pnpm drizzle-kit migrate', {
    stdio: 'inherit',
    env: process.env,
  });

  console.log('[Migrations] ✅ Migrations completed successfully');
  process.exit(0);
} catch (error) {
  console.error('[Migrations] ❌ Migration failed');
  console.error(error.message);
  process.exit(1);
}
