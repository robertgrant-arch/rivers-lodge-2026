#!/usr/bin/env node
/**
 * Build-time image variant generator.
 * Produces AVIF and WebP versions of every image in client/public/img/ and
 * client/public/brand/ at 480/768/1200/1920w.  Originals are never modified.
 * Output files live beside originals; already-generated files are skipped.
 *
 * Concurrency is capped at MAX_CONCURRENT Sharp jobs to prevent OOM on
 * memory-constrained CI/build hosts (e.g. Render Starter at 512 MB).
 *
 * Graceful degradation: if variant generation fails, build continues without variants.
 * Fallback mechanism in Picture.tsx ensures original images still load.
 */

import { createRequire } from "module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = [
  path.join(ROOT, "client", "public", "img"),
  path.join(ROOT, "client", "public", "brand"),
];

const WIDTHS = [480, 768, 1200, 1920];
const FORMATS = ["avif", "webp"];
// Reduce concurrency further on constrained environments (e.g., Render Starter Plan)
const MAX_CONCURRENT = parseInt(process.env.IMAGE_VARIANT_CONCURRENCY || "2");

// Extensions we process
const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"]);
// Extensions we never overwrite (don't re-process generated variants)
const VARIANT_RE = /-\d+w\.(avif|webp)$/i;

// Simple semaphore: at most MAX_CONCURRENT thunks run at once.
function makeSemaphore(limit) {
  let active = 0;
  const queue = [];
  function next() {
    if (active >= limit || queue.length === 0) return;
    active++;
    const { thunk, resolve, reject } = queue.shift();
    thunk().then(resolve, reject).finally(() => { active--; next(); });
  }
  return function run(thunk) {
    return new Promise((resolve, reject) => {
      queue.push({ thunk, resolve, reject });
      next();
    });
  };
}

const sem = makeSemaphore(MAX_CONCURRENT);

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SOURCE_EXTS.has(ext)) return;
  if (VARIANT_RE.test(filePath)) return; // skip already-generated variants

  const dir = path.dirname(filePath);
  const name = path.basename(filePath, path.extname(filePath));

  let meta;
  try {
    meta = await sharp(filePath).metadata();
  } catch (err) {
    console.warn(`  skip (unreadable): ${filePath} — ${err.message}`);
    return;
  }

  const originalWidth = meta.width ?? 1920;

  const tasks = [];
  for (const w of WIDTHS) {
    if (w > originalWidth * 1.1) continue; // don't upscale beyond 10%
    for (const fmt of FORMATS) {
      const outName = `${name}-${w}w.${fmt}`;
      const outPath = path.join(dir, outName);

      tasks.push(
        fs.access(outPath)
          .then(() => null) // already exists, skip
          .catch(() =>
            sem(async () => {
              const s = sharp(filePath).resize(w, null, { withoutEnlargement: true });
              if (fmt === "avif") {
                s.avif({ quality: 68, effort: 2 });
              } else {
                s.webp({ quality: 82 });
              }
              await s.toFile(outPath);
              return outPath;
            }).catch((err) => {
              console.warn(`  ⚠ failed: ${path.basename(outPath)} — ${err.message}`);
              return null;
            })
          )
      );
    }
  }

  const results = await Promise.all(tasks);
  const generated = results.filter(Boolean);
  if (generated.length) {
    console.log(`  ✓ ${path.basename(filePath)} → ${generated.length} variants`);
  }
}

async function processDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return; // directory may not exist
  }

  const tasks = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      tasks.push(processDir(path.join(dir, entry.name)));
    } else {
      tasks.push(processFile(path.join(dir, entry.name)));
    }
  }
  await Promise.all(tasks);
}

console.log(`Generating image variants (concurrency: ${MAX_CONCURRENT})…`);

try {
  await Promise.all(DIRS.map(processDir));
  console.log("✓ Image variant generation complete.");
} catch (err) {
  // Log error but don't fail the build—Picture.tsx fallback ensures images still load
  console.error(`⚠ Image variant generation failed: ${err.message}`);
  console.log("  (falling back to original images; variant loading gracefully degraded)");
}
