/**
 * Property activities — the single approved list members see.
 *
 * Stored data (property_activities.activity) still contains legacy species
 * values (bass, catfish, duck, deer, …) for existing properties. Until the
 * owner approves rewriting that data, every member-facing page maps stored
 * values through toDisplayActivities() so only these seven labels appear.
 * Legacy values with no approved equivalent (deer, turkey, hog, …) are
 * flagged and never shown.
 *
 * Pure module — safe for client and server.
 */

export const PROPERTY_ACTIVITIES = [
  { value: "waterfowl", label: "Waterfowl Hunting" },
  { value: "fishing", label: "Fishing" },
  { value: "camping", label: "Camping" },
  { value: "hiking", label: "Hiking" },
  { value: "shooting_permitted", label: "Shooting Permitted" },
  { value: "upland_hunting", label: "Upland Hunting" },
  { value: "side_by_side_permitted", label: "Side by Side Permitted" },
] as const;

export type PropertyActivityKey = (typeof PROPERTY_ACTIVITIES)[number]["value"];

export const PROPERTY_ACTIVITY_KEYS = PROPERTY_ACTIVITIES.map((a) => a.value) as unknown as readonly [
  PropertyActivityKey,
  ...PropertyActivityKey[],
];

/** Legacy stored values, as accepted by the old forms/enums. */
export const LEGACY_ACTIVITY_VALUES = [
  "deer", "duck", "turkey", "quail", "dove", "hog",
  "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish", "scouting",
] as const;

/**
 * Proposed legacy → approved mapping (pending owner approval before any stored
 * data is rewritten). `null` = no approved equivalent: flagged, not shown.
 */
export const LEGACY_ACTIVITY_MAP: Record<string, PropertyActivityKey | null> = {
  duck: "waterfowl",
  goose: "waterfowl",
  waterfowl_hunting: "waterfowl",
  bass: "fishing",
  catfish: "fishing",
  crappie: "fishing",
  mixed_fish: "fishing",
  fish: "fishing",
  quail: "upland_hunting",
  dove: "upland_hunting",
  pheasant: "upland_hunting",
  // Fishing part maps; the hunting part has no single approved equivalent and is flagged.
  hunt_and_fish: "fishing",
  deer: null,
  turkey: null,
  hog: null,
  mixed_hunt: null,
  scouting: null,
};

/** Legacy values whose mapping only partly carries over (the rest is flagged). */
const PARTIAL_LEGACY = new Set(["hunt_and_fish"]);

const LABELS: Record<string, string> = Object.fromEntries(PROPERTY_ACTIVITIES.map((a) => [a.value, a.label]));
const ORDER: Record<string, number> = Object.fromEntries(PROPERTY_ACTIVITIES.map((a, i) => [a.value, i]));

export function isPropertyActivityKey(v: unknown): v is PropertyActivityKey {
  return typeof v === "string" && v in LABELS;
}

/** Map one stored value to an approved key, or null if it has no equivalent. */
export function mapActivity(stored: string): PropertyActivityKey | null {
  const v = String(stored ?? "").trim().toLowerCase();
  if (isPropertyActivityKey(v)) return v;
  return LEGACY_ACTIVITY_MAP[v] ?? null;
}

export type DisplayActivities = {
  /** Approved keys, deduplicated, in the canonical order. */
  keys: PropertyActivityKey[];
  /** Stored values that are not shown (no approved equivalent, or only partly mapped). */
  flagged: string[];
};

export function toDisplayActivities(stored: readonly unknown[] | null | undefined): DisplayActivities {
  const keys = new Set<PropertyActivityKey>();
  const flagged: string[] = [];
  for (const raw of stored ?? []) {
    const v = typeof raw === "string" ? raw : (raw as any)?.activity ?? (raw as any)?.value;
    if (!v) continue;
    const mapped = mapActivity(v);
    if (mapped) keys.add(mapped);
    if (!mapped || PARTIAL_LEGACY.has(String(v).toLowerCase())) flagged.push(String(v));
  }
  return { keys: [...keys].sort((a, b) => ORDER[a] - ORDER[b]), flagged };
}

/** Label for an approved key or a legacy value (legacy values show their mapped label). */
export function activityLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const mapped = mapActivity(value);
  return mapped ? LABELS[mapped] : null;
}

/** Activities a booking treats as hunting (licence prompt). */
export function isHuntingActivity(value: string): boolean {
  const k = mapActivity(value);
  return k === "waterfowl" || k === "upland_hunting" || ["deer", "turkey", "hog", "mixed_hunt", "hunt_and_fish"].includes(value);
}

/** Activities a booking treats as fishing (licence prompt). */
export function isFishingActivity(value: string): boolean {
  return mapActivity(value) === "fishing";
}
