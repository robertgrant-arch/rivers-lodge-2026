#!/usr/bin/env node

/**
 * Seed Roles and Resource Access
 * ==============================
 * Creates default roles and initializes resource_access table.
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedRoles() {
  if (!process.env.DATABASE_URL) {
    console.log('[seed-roles] DATABASE_URL not set — skipping');
    process.exit(0);
  }

  const client = await pool.connect();

  try {
    console.log('[seed-roles] starting...');

    // Create roles table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(100) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create resource_access table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_access (
        id SERIAL PRIMARY KEY,
        resource_type VARCHAR(100) NOT NULL,
        resource_id TEXT NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        can_view_and_book BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(resource_type, resource_id, role_id)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS role_key_idx ON roles(key);
      CREATE INDEX IF NOT EXISTS resource_access_role_idx ON resource_access(role_id);
      CREATE INDEX IF NOT EXISTS resource_access_resource_idx ON resource_access(resource_type, resource_id);
    `);

    // Seed default roles if they don't exist
    const roles = [
      { key: 'admin', label: 'Admin', sortOrder: 0 },
      { key: 'employee', label: 'Employee', sortOrder: 1 },
      { key: 'designated', label: 'Designated Member', sortOrder: 2 },
      { key: 'silver', label: 'Silver Member', sortOrder: 3 },
      { key: 'social', label: 'Social Member', sortOrder: 4 },
    ];

    for (const role of roles) {
      await client.query(
        `INSERT INTO roles (key, label, sort_order) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
        [role.key, role.label, role.sortOrder]
      );
    }

    // Get role IDs
    const rolesResult = await client.query('SELECT id, key FROM roles ORDER BY sort_order');
    const roleMap = {};
    rolesResult.rows.forEach(row => {
      roleMap[row.key] = row.id;
    });

    console.log('[seed-roles] roles created/verified:', Object.keys(roleMap));

    // Seed master_calendar access
    const masterCalendarAccess = [
      { roleKey: 'admin', canAccess: true },
      { roleKey: 'employee', canAccess: true },
      { roleKey: 'designated', canAccess: true },
      { roleKey: 'silver', canAccess: true },
      { roleKey: 'social', canAccess: false },
    ];

    for (const access of masterCalendarAccess) {
      await client.query(
        `INSERT INTO resource_access (resource_type, resource_id, role_id, can_view_and_book)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (resource_type, resource_id, role_id) DO UPDATE SET can_view_and_book = $4`,
        ['master_calendar', 'master', roleMap[access.roleKey], access.canAccess]
      );
    }

    console.log('[seed-roles] master_calendar access initialized');

    console.log('[seed-roles] ✅ completed successfully');
  } catch (error) {
    console.error('[seed-roles] ❌ failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRoles();
