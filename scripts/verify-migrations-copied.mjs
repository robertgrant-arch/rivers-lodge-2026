/**
 * Post-build verification: ensure migrations were copied to dist/db/migrations/
 * This catches build failures early rather than waiting for deploy errors.
 */
import { readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distMigrationsDir = path.join(projectRoot, 'dist', 'db', 'migrations');
const sourceMigrationsDir = path.join(projectRoot, '_core', 'db', 'migrations');

console.log('[verify-migrations-copied] checking dist/db/migrations...');

if (!existsSync(distMigrationsDir)) {
  console.error(`✗ FATAL: dist/db/migrations does not exist at ${distMigrationsDir}`);
  process.exit(1);
}

try {
  const files = readdirSync(distMigrationsDir).filter((f) => f.endsWith('.sql'));
  if (files.length === 0) {
    console.error(`✗ FATAL: no .sql files in dist/db/migrations`);
    process.exit(1);
  }

  const sourceFiles = readdirSync(sourceMigrationsDir).filter((f) => f.endsWith('.sql'));
  if (files.length !== sourceFiles.length) {
    console.warn(
      `⚠ WARNING: copied ${files.length} .sql files but source has ${sourceFiles.length}. ` +
      `Missing: ${sourceFiles.filter((f) => !files.includes(f)).join(', ')}`
    );
  }

  console.log(`✓ Verified: dist/db/migrations contains ${files.length} migration files`);
  console.log(`  Files: ${files.join(', ')}`);
} catch (err) {
  console.error(`✗ FATAL: could not read dist/db/migrations: ${err.message}`);
  process.exit(1);
}
