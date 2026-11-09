// Option lists for the staff Member File (/ops/membership/:id).
// Shared by the server validation (features/admin/server/memberFile.ts) and the
// page (features/admin/client/pages/PortalMemberFile.tsx). No server imports here.

export const CONTACT_METHODS = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number]["value"];

export const ACTIVITIES = [
  "Waterfowl Hunting",
  "Fishing",
  "Camping",
  "Hiking",
  "Shooting",
  "Upland Hunting",
  "Side by Side",
] as const;

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Experienced"] as const;

export const TRIP_STYLES = ["Family outing", "Guided", "Independent", "Entertaining guests"] as const;

export const CHILD_AGE_GROUPS = ["Infant", "Toddler", "Child", "Teen", "Young adult"] as const;

export const MEMBERSHIP_TYPES = ["Designated", "Silver", "Social"] as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Member photo upload limits (the page downsizes to MAX_PHOTO_EDGE before upload). */
// Kept under the API's 1 MB JSON body limit once base64-encoded (express.json limit in _core/server/app.ts).
export const PHOTO_MAX_BYTES = 700 * 1024;
export const PHOTO_MAX_EDGE = 800;
export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
