// ─── Other Groups — shared constants (client + server) ────────────────────────

export const OTHER_GROUP_STATUSES = [
  "inquiry", "contacted", "proposal_sent", "contract_out",
  "confirmed", "completed", "cancelled", "lost",
] as const;
export type OtherGroupStatus = typeof OTHER_GROUP_STATUSES[number];

export const OTHER_GROUP_STATUS_LABELS: Record<OtherGroupStatus, string> = {
  inquiry: "Inquiry",
  contacted: "Contacted",
  proposal_sent: "Proposal Sent",
  contract_out: "Contract Out",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  lost: "Lost",
};

export const OTHER_GROUP_EVENT_TYPES = [
  "family_reunion", "birthday_anniversary", "holiday_party", "church_nonprofit", "school_youth", "other",
] as const;
export type OtherGroupEventType = typeof OTHER_GROUP_EVENT_TYPES[number];

export const OTHER_GROUP_EVENT_TYPE_LABELS: Record<OtherGroupEventType, string> = {
  family_reunion: "Family Reunion",
  birthday_anniversary: "Birthday / Anniversary",
  holiday_party: "Holiday Party",
  church_nonprofit: "Church / Nonprofit",
  school_youth: "School / Youth",
  other: "Other",
};

/** Table/label text for an event type ("Other: Graduation" when eventTypeOther is set). */
export function otherGroupEventTypeLabel(eventType: string | null | undefined, eventTypeOther?: string | null): string {
  if (!eventType) return "—";
  if (eventType === "other" && eventTypeOther?.trim()) return `Other: ${eventTypeOther.trim()}`;
  return OTHER_GROUP_EVENT_TYPE_LABELS[eventType as OtherGroupEventType] ?? eventType;
}

export const OTHER_GROUP_SOURCES = ["website", "referral", "direct", "repeat", "member"] as const;
export type OtherGroupSource = typeof OTHER_GROUP_SOURCES[number];

/** Calendar colour + label for other groups (Ops calendars, legend, filters). */
export const OTHER_GROUP_CALENDAR = { kind: "other_group", label: "Other Group", color: "#A68BB8" } as const;
