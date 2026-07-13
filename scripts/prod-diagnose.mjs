#!/usr/bin/env node

/**
 * Production Database Diagnosis
 * =============================
 * Connects to production database and reports:
 * - Applied migrations
 * - Table existence and structure
 * - Foreign key constraints
 * - Column presence/absence
 */

import { execSync } from 'child_process';

if (!process.env.DATABASE_URL) {
  console.error('[Diagnose] ERROR: DATABASE_URL not set');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('PRODUCTION DATABASE DIAGNOSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

function runSQL(sql, description) {
  console.log(`\n▶ ${description}`);
  console.log('─'.repeat(60));
  try {
    const result = execSync(`psql "$DATABASE_URL" -t -A -F'|'`, {
      input: sql,
      encoding: 'utf8',
      env: process.env,
    });
    console.log(result.trim() || '(no results)');
    return result.trim();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

// 1. APPLIED MIGRATIONS
runSQL(`
  SELECT version, installed_on, success
  FROM schema_migrations
  ORDER BY version;
`, '1. Applied Migrations (schema_migrations)');

// 2. TABLE EXISTENCE CHECK
const tables = ['roles', 'skill_groups', 'property_skill_groups', 'role_skill_group_access', 'role_property_skill_group_access', 'members'];
console.log('\n▶ 2. Table Existence Check');
console.log('─'.repeat(60));
for (const tableName of tables) {
  const exists = runSQL(`
    SELECT EXISTS(
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${tableName}'
    ) as exists;
  `, `  Checking: ${tableName}`);

  if (exists && exists.includes('t')) {
    // Table exists, get row count
    const count = runSQL(`SELECT COUNT(*) FROM ${tableName};`, `  Row count: ${tableName}`);

    // Get columns
    const cols = runSQL(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `, `  Columns: ${tableName}`);
  }
}

// 3. FK CONSTRAINTS REFERENCING ROLES TABLE
runSQL(`
  SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND ccu.table_name = 'roles'
  ORDER BY tc.table_name, tc.constraint_name;
`, '3. Foreign Key Constraints Referencing roles Table');

// 4. MEMBERS TABLE ROLE_ID COLUMN CHECK
runSQL(`
  SELECT
    EXISTS(
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'roleId'
    ) as roleId_exists,
    EXISTS(
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'role_id'
    ) as role_id_exists;
`, '4. Members Table - roleId Column Check');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('END OF DIAGNOSIS');
console.log('═══════════════════════════════════════════════════════════════\n');
