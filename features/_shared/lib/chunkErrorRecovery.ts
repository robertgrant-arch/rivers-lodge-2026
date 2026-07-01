/**
 * Stale-chunk recovery for Vite SPA deployments.
 *
 * After a new deploy the hashed chunk filenames change. A tab that was open
 * before the deploy will try to lazy-import the old filenames, which 404.
 * The browser surfaces this as a dynamic-import TypeError. We detect those
 * errors and do a ONE-TIME hard reload so the tab picks up the fresh build.
 *
 * A sessionStorage guard (timestamp-based) ensures we never enter an infinite
 * reload loop: if a reload was already attempted in the last 30 seconds we
 * bail out and let the error surface normally so the user sees the UI.
 */

const STORAGE_KEY = "rl_chunk_reload_at";
const COOLDOWN_MS = 30_000; // 30 s — enough to survive a full reload cycle

/** Patterns that identify a Vite/browser chunk-load failure. */
const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Unable to preload CSS for",
  "ChunkLoadError",
];

export function isChunkLoadError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message + (error.name ?? "")
      : String(error ?? "");
  return CHUNK_ERROR_PATTERNS.some((p) =>
    msg.toLowerCase().includes(p.toLowerCase())
  );
}

const BFCACHE_KEY = "rl_bfcache_reload_at";
const BFCACHE_COOLDOWN_MS = 10_000; // 10 s — bfcache restores are near-instant

/**
 * Called on `pageshow` when `event.persisted === true` (bfcache restore).
 * The page was frozen after a full-page navigation (e.g. Clerk auth redirect)
 * and the JS module graph may be stale. Reload once to pick up the fresh build.
 */
export function handleBfcacheRestore(): boolean {
  try {
    const last = sessionStorage.getItem(BFCACHE_KEY);
    const now = Date.now();
    if (last && now - parseInt(last, 10) < BFCACHE_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(BFCACHE_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt a one-time page reload to recover from a stale-chunk error.
 * Returns `true` if a reload was initiated, `false` if the cooldown is active
 * (caller should fall through to the normal error UI in that case).
 */
export function tryRecoverFromChunkError(): boolean {
  try {
    const lastReload = sessionStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (lastReload && now - parseInt(lastReload, 10) < COOLDOWN_MS) {
      // Already reloaded recently — do not loop.
      return false;
    }

    sessionStorage.setItem(STORAGE_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    // sessionStorage unavailable (private browsing edge case) — don't reload.
    return false;
  }
}
