#!/usr/bin/env node
/**
 * Build-time image variant generator.
 * Produces AVIF and WebP versions of every image in client/public/img/ and
 * client/public/brand/ at 480/768/1200/1920w.  Originals are never modified.
 * Output files live beside originals; already-generated files are skipped.
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

// Extensions we process
const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"]);
// Extensions we never overwrite (don't re-process generated variants)
const VARIANT_RE = /-\d+w\.(avif|webp)$/i;

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
          .catch(async () => {
            const s = sharp(filePath).resize(w, null, { withoutEnlargement: true });
            if (fmt === "avif") {
              s.avif({ quality: 72, effort: 4 });
            } else {
              s.webp({ quality: 82 });
            }
            await s.toFile(outPath);
            return outPath;
          })
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

console.log("Generating image variants…");
await Promise.all(DIRS.map(processDir));
console.log("Done.");
