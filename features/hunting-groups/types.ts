// ─── Hunting Groups — shared constants (client + server) ──────────────────────

export const HUNTING_GROUP_STATUSES = [
  "inquiry", "contacted", "proposal_sent", "contract_out",
  "confirmed", "completed", "cancelled", "lost",
] as const;
export type HuntingGroupStatus = typeof HUNTING_GROUP_STATUSES[number];

export const HUNTING_GROUP_STATUS_LABELS: Record<HuntingGroupStatus, string> = {
  inquiry: "Inquiry",
  contacted: "Contacted",
  proposal_sent: "Proposal Sent",
  contract_out: "Contract Out",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  lost: "Lost",
};

export const HUNTING_GROUP_SPECIES = ["waterfowl", "upland", "whitetail", "turkey", "fishing", "other"] as const;
export type HuntingGroupSpecies = typeof HUNTING_GROUP_SPECIES[number];

export const HUNTING_GROUP_SPECIES_LABELS: Record<HuntingGroupSpecies, string> = {
  waterfowl: "Waterfowl",
  upland: "Upland",
  whitetail: "Whitetail",
  turkey: "Turkey",
  fishing: "Fishing",
  other: "Other",
};

export const HUNTING_GROUP_SOURCES = ["website", "referral", "direct", "repeat", "member"] as const;
export type HuntingGroupSource = typeof HUNTING_GROUP_SOURCES[number];

/** Calendar colour + label for hunting groups (Ops calendars, legend, filters). */
export const HUNTING_GROUP_CALENDAR = { kind: "hunting_group", label: "Hunting Group", color: "#6FA3A0" } as const;
