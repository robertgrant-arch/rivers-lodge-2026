import { cpSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcDb = path.join(projectRoot, '_core', 'db');
const distDb = path.join(projectRoot, 'dist', 'db');

// Copy _core/db to dist/db so applySqlMigrations() can find migrations at runtime
if (existsSync(srcDb)) {
  try {
    cpSync(srcDb, distDb, { recursive: true, force: true });
    console.log(`✓ Copied _core/db to dist/db`);
  } catch (err) {
    console.error(`✗ Failed to copy _core/db: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log(`ℹ _core/db directory not found; skipping copy`);
}
