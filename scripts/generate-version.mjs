import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const generatedDir = '_core/generated';
mkdirSync(generatedDir, { recursive: true });

try {
  // Get the commit SHA from env var (set by Render or CI) or from git
  const commit = process.env.RENDER_GIT_COMMIT ||
                 process.env.GIT_COMMIT ||
                 execSync('git rev-parse HEAD').toString().trim();

  const builtAt = new Date().toISOString();

  const versionContent = `// Auto-generated at build time
export const VERSION = {
  commit: '${commit}',
  builtAt: '${builtAt}',
  node: '${process.version}',
} as const;
`;

  writeFileSync(`${generatedDir}/version.ts`, versionContent);
  console.log(`✓ Generated ${generatedDir}/version.ts (commit: ${commit.slice(0, 7)})`);
} catch (err) {
  console.error('Failed to generate version:', err.message);
  // Write a fallback version if git is not available
  const fallbackContent = `// Fallback version (git not available at build time)
export const VERSION = {
  commit: 'unknown',
  builtAt: '${new Date().toISOString()}',
  node: '${process.version}',
} as const;
`;
  writeFileSync(`${generatedDir}/version.ts`, fallbackContent);
  console.log(`⚠ Generated fallback version (git not available)`);
}
