import { cpSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcDb = path.join(projectRoot, 'db');
const distDb = path.join(projectRoot, 'dist', 'db');

// Only copy if db/ exists
if (existsSync(srcDb)) {
  try {
    cpSync(srcDb, distDb, { recursive: true, force: true });
    console.log(`✓ Copied db/ to dist/db`);
  } catch (err) {
    console.error(`✗ Failed to copy db/: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log(`ℹ db/ directory not found; skipping copy`);
}
