# Brand Asset Manifest — `client/public/brand/`

Upload brand assets here. Files must match the exact filenames listed below (case-sensitive).
After upload, the Sharp build script auto-generates AVIF/WebP variants at 480/768/1200/1920w.

**Limits:** 25 MB per file · 100 files per commit · PNG preferred for logos (transparency support).

---

## How to Upload

1. Go to `https://github.com/robertgrant-arch/rivers-lodge-2026/upload/main/client/public/brand`
2. Drag and drop your file(s).
3. Name or rename the file to match the canonical filename in the table below.
4. Commit directly to `main` with message: `add: brand/[filename]`

---

## Current Brand Assets

Files are currently numbered `1.png` through `13.png` with AVIF/WebP variants generated for each.

| Filename | Purpose / Notes | Status |
|---|---|---|
| `1.png` | Brand asset | ✅ Exists |
| `2.png` | Brand asset | ✅ Exists |
| `3.png` | Brand asset | ✅ Exists |
| `4.png` | Brand asset | ✅ Exists |
| `5.png` | Brand asset | ✅ Exists |
| `6.png` | Brand asset | ✅ Exists |
| `7.png` | Brand asset | ✅ Exists |
| `8.png` | Brand asset | ✅ Exists |
| `9.png` | Brand asset | ✅ Exists |
| `10.png` | Brand asset | ✅ Exists |
| `11.png` | Brand asset | ✅ Exists |
| `12.png` | Brand asset | ✅ Exists |
| `13.png` | Brand asset | ✅ Exists |

---

## Recommended Canonical Filenames

When adding new brand assets, use descriptive names so the purpose is clear:

| Canonical Filename | Purpose |
|---|---|
| `logo-primary.png` | Primary wordmark (dark background) |
| `logo-reversed.png` | Reversed wordmark (light background) |
| `logo-icon.png` | Icon / mark only (no text) |
| `logo-horizontal.png` | Horizontal lockup |
| `logo-stacked.png` | Stacked / vertical lockup |
| `crest.png` | Estate crest or seal |

To use a renamed or new asset, update the `src` prop in the component that references it (e.g. `PublicNav.tsx` for the nav wordmark).

---

## Notes

- PNG is preferred for logos — preserves transparency and crisp edges.
- SVG files can be placed here but will **not** get AVIF/WebP variants (Sharp only processes raster formats).
- The `<Picture>` component handles AVIF→WebP→original fallback automatically for any `/brand/` path.
