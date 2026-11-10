/**
 * Who may see access-sensitive property details.
 *
 * Gate codes, exact coordinates, location notes, maps and directions help
 * someone physically reach or enter a property, so:
 *   - signed-out callers never receive any of them;
 *   - signed-in members (active member record) receive location details, and
 *     the gate code only on the detail of an active property they can view;
 *   - staff (admins, or employee-role users with an active employees row)
 *     receive everything.
 *
 * (Member logins also carry the "employee" role, so staff are identified by an
 * active employees row — the same rule the Member File uses.)
 */
import { and, eq } from "drizzle-orm";
import { members, employees } from "@core/db/schema";

export type PropertyViewer = "anonymous" | "member" | "staff";

/** Fields never sent to signed-out callers. */
export const ACCESS_SENSITIVE_PROPERTY_FIELDS = [
  "gateCode",
  "gpsLat",
  "gpsLng",
  "locationNotes",
  "mapUrl",
  "mapImageUrl",
  "directionsUrl",
  "maps",
] as const;

type Db = { select: (...args: any[]) => any };
type User = { id: string; role?: string | null } | null | undefined;

/** Classify the caller. Unknown or inactive accounts count as anonymous. */
export async function propertyViewer(db: Db, user: User): Promise<PropertyViewer> {
  if (!user?.id) return "anonymous";
  if (user.role === "admin") return "staff";
  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.userId, user.id), eq(employees.active, true)))
    .limit(1);
  if (emp) return "staff";
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, user.id), eq(members.active, true)))
    .limit(1);
  return member ? "member" : "anonymous";
}

/** May this viewer see the gate code for this property? */
export function canSeeGateCode(viewer: PropertyViewer, property: { active?: boolean | null }): boolean {
  return viewer === "staff" || (viewer === "member" && property.active !== false);
}

/**
 * Copy of a property with fields removed according to the viewer.
 * `includeGateCode` additionally gates the gate code (e.g. false for lists).
 */
export function propertyForViewer<T extends Record<string, any>>(
  property: T,
  viewer: PropertyViewer,
  opts: { includeGateCode: boolean },
): T {
  const out: Record<string, any> = { ...property };
  if (viewer === "anonymous") {
    for (const f of ACCESS_SENSITIVE_PROPERTY_FIELDS) delete out[f];
  }
  if (!opts.includeGateCode || !canSeeGateCode(viewer, property)) delete out.gateCode;
  return out as T;
}
