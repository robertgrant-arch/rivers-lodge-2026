# Image Filename Manifest — `client/public/img/`

Upload images here via the GitHub web UI (Add file → Upload files) or by replacing the file locally and committing.
Files must match the exact filenames listed below (case-sensitive, spaces preserved).
After upload, the Sharp build script auto-generates AVIF/WebP variants at 480/768/1200/1920w.

**Limits:** 25 MB per file · 100 files per commit · JPEG or PNG preferred for photos.

---

## How to Upload

1. Go to `https://github.com/robertgrant-arch/rivers-lodge-2026/upload/main/client/public/img`
2. Drag and drop your file(s).
3. Name or rename the file to match the canonical filename in the table below.
4. Commit directly to `main` with message: `add: [filename]`

The image will appear on the site after the next deploy (usually < 2 min on Render).

---

## Hero / Full-bleed Images

| Filename | Used On | Dimensions | Status |
|---|---|---|---|
| `Ohana Aerial.jpg` | Homepage hero, The Ohana detail, Estate section | 1920×1080 | ✅ Exists |
| `Clubhouse Home.jpg` | Homepage "Stay & Gather" section | 1920×1080 | ✅ Exists |
| `hero 3.jpg` | Homepage hero slide 3 | 1920×1080 | ✅ Exists |
| `hero-4.jpg` | Homepage hero slide 4 | 1920×1080 | ⬜ Upload needed |
| `hero-5.jpg` | Homepage hero slide 5 | 1920×1080 | ⬜ Upload needed |
| `wedding hero.JPG` | Weddings & Events hub hero, Weddings category card | 1920×1080 | ✅ Exists |
| `Clubhouse Hero.jpg` | Corporate Events card, Weddings & Events hub, The Clubhouse detail | 1920×1080 | ✅ Exists |

---

## Outdoor Pursuits

| Filename | Used On | Dimensions | Status |
|---|---|---|---|
| `3C0A0165.jpg` | Whitetail hero, Upland Birds hero, Membership section | 1920×1080 | ✅ Exists |
| `waterfowl.jpg` | Waterfowl pursuit hero | 1920×1080 | ✅ Exists |
| `waterfowl 6.JPEG` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `waterfowl 7.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `waterfowl 9.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `turkey-hero.jpg` | Turkey pursuit hero | 1920×1080 | ⬜ Upload needed |
| `fishing-hero.jpg` | Fishing pursuit hero | 1920×1080 | ⬜ Upload needed |
| `Fishing but cut in center.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `Fishing net.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `fishing 2.JPG` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `Pike.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `MHR53675.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |

---

## Lodging — Stay Properties

| Filename | Used On | Dimensions | Status |
|---|---|---|---|
| `Main Lodge.jpg` | The Lodge hero | 1920×1080 | ✅ Exists |
| `main lodge inside.jpg` | The Lodge secondary image | 1200×900 | ✅ Exists |
| `Riverhouse Suite.jpg` | Riverhouse Suites hero | 1920×1080 | ✅ Exists |
| `Riverhouse Suite 1.jpg` | Riverhouse Suites secondary image | 1200×900 | ✅ Exists |
| `annex-hero.jpg` | The Annex hero | 1920×1080 | ⬜ Upload needed |
| `Ohana Aerial.jpg` | The Ohana hero | 1920×1080 | ✅ Exists |
| `Ohana Firepit.jpg` | The Ohana secondary image | 1200×900 | ✅ Exists |
| `Ohana House Dining.jpg` | Gallery / reserve | 1200×900 | ✅ Exists |
| `Ohana Kitchen.jpg` | Gallery / reserve | 1200×900 | ✅ Exists |
| `Ohana Master.jpg` | Gallery / reserve | 1200×900 | ✅ Exists |
| `farmhouse-hero.jpg` | The Farmhouse hero | 1920×1080 | ⬜ Upload needed |
| `trego-road-hero.jpg` | Trego Road hero | 1920×1080 | ⬜ Upload needed |

---

## Lodging — Gather / Event Venues

| Filename | Used On | Dimensions | Status |
|---|---|---|---|
| `barn shot.jpg` | The Barn hero | 1920×1080 | ✅ Exists |
| `green-drake-hero.jpg` | The Green Drake hero | 1920×1080 | ⬜ Upload needed |
| `Clubhouse Hero.jpg` | The Clubhouse hero | 1920×1080 | ✅ Exists |

---

## Weddings & Events

| Filename | Used On | Dimensions | Status |
|---|---|---|---|
| `wedding hero.JPG` | Weddings hero, hub card | 1920×1080 | ✅ Exists |
| `wedding 4.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `Wedding 5.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |
| `wedding photo 1.jpg` | Gallery / reserve | 1920×1080 | ✅ Exists |

---

## Food & Dining

| Filename | Used On | Dimensions | Status |
|---|---|---|---|
| `Cool Food 2.JPG` | Food & Wine hub card | 1200×900 | ✅ Exists |
| `food 2.jpg` | Gallery / reserve | 1200×900 | ✅ Exists |
| `ChefSwethaSelect30617.jpg` | Gallery / reserve | 1200×900 | ✅ Exists |
| `chef casey.jpg` | Gallery / reserve | 1200×900 | ✅ Exists |

---

## Notes

- Filenames are **case-sensitive** on Linux servers. `Main Lodge.jpg` ≠ `main lodge.jpg`.
- Spaces in filenames are fine — the build script and `<Picture>` component handle URL-encoding automatically.
- Files marked ⬜ show a dark placeholder (`#2B2823`) until uploaded. No code changes required after upload.
- Do **not** rename existing files — it will break references. Add a redirect in `_core/server/app.ts` if a rename is unavoidable.
