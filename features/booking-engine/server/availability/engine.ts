/**
 * Availability Engine — Rivers Lodge & Hunt Club
 *
 * Pure conflict detection module. No side effects — reads only.
 * All public functions require the caller to supply a db handle (or
 * transaction handle `tx`).  Mutations MUST call these within an open
 * db.transaction() so that the FOR UPDATE locks serialise concurrent
 * requests.
 *
 * Hard Conflict Rules (HC): block the allocation entirely
 *   HC-01: Resource already allocated for overlapping dates
 *   HC-02: Exclusive event space conflict (Barn booked = no other event spaces)
 *   HC-03: Lodging unit already occupied
 *   HC-04: Guide slot already booked
 *   HC-05: Hunt zone at capacity
 *   HC-06: Culinary team at capacity
 *   HC-07: Resource blocked by BlockedDate
 *   HC-08: Allocation falls within holdback window of adjacent booking
 *
 * Soft Conflict Rules (SC): warn staff, require acknowledgment
 *   SC-01: Ceremony Lawn requested while another outdoor event is active
 *   SC-02: Lodging unit turnover window overlap
 *   SC-03: Multiple parties on property simultaneously
 *   SC-04: Culinary team near capacity
 *   SC-05: Guide assigned to back-to-back bookings same day
 *   SC-06: Hunt zone blocked by weather (BlockedDate with reason=weather)
 */

import { getDb } from '@core/server/db';
import {
  bookingResourceAllocations,
  resources,
  resourceGroups,
} from '@core/db/booking-schema';
import { portalBlockedDates } from '@core/db/portal-schema';
import type { PortalBlockedDate } from '@core/db/portal-schema';
import { and, eq, lt, gt, ne, sql, inArray } from "drizzle-orm";

// ─── DB handle type ────────────────────────────────────────────────────────────
//
// Drizzle transaction handles (MySqlTransaction) are structurally compatible
// with the main db client (MySql2Database) — they expose the same query API —
// but TypeScript doesn't model this through the type hierarchy.  Callers that
// pass a transaction use `tx as unknown as Db` to paper over the structural
// mismatch; the cast is safe because Drizzle guarantees the same interface.

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilityCheckInput {
  resourceId: number;
  allocationStart: Date;
  allocationEnd: Date;
  excludeBookingId?: number;
}

export interface HardConflict {
  ruleId: string;
  resourceId: number;
  resourceName?: string;
  conflictingBookingId?: number;
  message: string;
}

export interface SoftConflict {
  ruleId: string;
  resourceId: number;
  resourceName?: string;
  relatedBookingId?: number;
  message: string;
  requiresAcknowledgment: boolean;
}

export interface AvailabilityCheckResult {
  available: boolean;
  hardConflicts: HardConflict[];
  softConflicts: SoftConflict[];
}

export interface MultiResourceCheckResult {
  available: boolean;
  hardConflicts: HardConflict[];
  softConflicts: SoftConflict[];
  resourceResults: Record<number, AvailabilityCheckResult>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if two date ranges overlap (inclusive)
 */
function dateRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Fetch a resource with its group info.
 * Uses the caller-supplied db/tx — no internal getDb() call.
 */
async function getResourceWithGroup(db: Db, resourceId: number) {
  const result = await db
    .select({
      id: resources.id,
      name: resources.name,
      slug: resources.slug,
      type: resources.type,
      capacity: resources.capacity,
      holdbackHoursBefore: resources.holdbackHoursBefore,
      holdbackHoursAfter: resources.holdbackHoursAfter,
      exclusiveUse: resources.exclusiveUse,
      groupId: resources.groupId,
      groupType: resourceGroups.type,
      groupSlug: resourceGroups.slug,
    })
    .from(resources)
    .leftJoin(resourceGroups, eq(resources.groupId, resourceGroups.id))
    .where(eq(resources.id, resourceId))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Fetch all active allocations for a resource within a date range.
 *
 * Appends FOR UPDATE so that, when called within a transaction, concurrent
 * transactions block on this row-set instead of racing past it.  This is the
 * primary serialisation point that prevents double-booking.
 */
async function getConflictingAllocations(
  db: Db,
  resourceId: number,
  start: Date,
  end: Date,
  excludeBookingId?: number,
) {
  const conditions = [
    eq(bookingResourceAllocations.resourceId, resourceId),
    ne(bookingResourceAllocations.status, "cancelled"),
    lt(bookingResourceAllocations.allocationStart, end),
    gt(bookingResourceAllocations.allocationEnd, start),
  ];
  if (excludeBookingId) {
    conditions.push(ne(bookingResourceAllocations.bookingId, excludeBookingId));
  }
  return await db
    .select()
    .from(bookingResourceAllocations)
    .where(and(...conditions))
    // FOR UPDATE: locks matching rows so concurrent transactions serialise
    // here rather than both seeing 0 conflicts and both proceeding to insert.
    .for("update");
}

/**
 * Fetch all blocked dates that overlap a resource and date range.
 * Uses the caller-supplied db/tx.
 */
async function getBlockedDates(db: Db, _resourceId: number, start: Date, end: Date) {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(portalBlockedDates)
    .where(
      and(
        sql`${portalBlockedDates.startDate} <= ${endStr}`,
        sql`${portalBlockedDates.endDate} >= ${startStr}`,
      ),
    );
  return rows;
}

// ─── Single Resource Check ────────────────────────────────────────────────────

/**
 * Check availability for a single resource.
 *
 * @param input  - The resource and date range to check.
 * @param db     - A Drizzle db client or transaction handle.
 *                 Mutations MUST pass their open `tx` so the FOR UPDATE lock
 *                 inside `getConflictingAllocations` is part of their transaction.
 */
export async function checkAvailability(
  input: AvailabilityCheckInput,
  db: Db,
): Promise<AvailabilityCheckResult> {
  const { resourceId, allocationStart, allocationEnd, excludeBookingId } = input;
  const hardConflicts: HardConflict[] = [];
  const softConflicts: SoftConflict[] = [];

  // Load resource info
  const resource = await getResourceWithGroup(db, resourceId);
  if (!resource) {
    return {
      available: false,
      hardConflicts: [{ ruleId: "HC-00", resourceId, message: "Resource not found" }],
      softConflicts: [],
    };
  }

  // ── HC-07: Blocked Date ────────────────────────────────────────────────────
  const blocks = await getBlockedDates(db, resourceId, allocationStart, allocationEnd);
  const hardBlocks = blocks as PortalBlockedDate[];
  const weatherBlocks: PortalBlockedDate[] = [];

  if (hardBlocks.length > 0) {
    const b = hardBlocks[0];
    hardConflicts.push({
      ruleId: "HC-07",
      resourceId,
      resourceName: resource.name,
      message: `${resource.name} is administratively blocked (${b.reason ?? "maintenance"}) from ${b.startDate} to ${b.endDate}.`,
    });
    return { available: false, hardConflicts, softConflicts };
  }

  void weatherBlocks;

  // ── HC-01: Existing Allocation Conflict ───────────────────────────────────
  // FOR UPDATE lock acquired here — see getConflictingAllocations.
  const existingAllocations = await getConflictingAllocations(
    db,
    resourceId,
    allocationStart,
    allocationEnd,
    excludeBookingId,
  );

  if (resource.capacity === 1 && existingAllocations.length > 0) {
    hardConflicts.push({
      ruleId: "HC-01",
      resourceId,
      resourceName: resource.name,
      conflictingBookingId: existingAllocations[0].bookingId,
      message: `${resource.name} is already allocated for these dates (Booking #${existingAllocations[0].bookingId}).`,
    });
    return { available: false, hardConflicts, softConflicts };
  }

  if (resource.capacity > 1) {
    const currentLoad = existingAllocations.length;

    if (currentLoad >= resource.capacity) {
      const ruleId = resource.type === "culinary" ? "HC-06" : "HC-05";
      hardConflicts.push({
        ruleId,
        resourceId,
        resourceName: resource.name,
        message: `${resource.name} is at full capacity (${resource.capacity}) for these dates.`,
      });
      return { available: false, hardConflicts, softConflicts };
    }

    if (currentLoad >= resource.capacity - 1 && resource.type === "culinary") {
      softConflicts.push({
        ruleId: "SC-04",
        resourceId,
        resourceName: resource.name,
        message: `Culinary team will be at full capacity with this booking. Confirm staffing is sufficient.`,
        requiresAcknowledgment: true,
      });
    }
  }

  // ── HC-08: Holdback Window Conflict ───────────────────────────────────────
  if (resource.holdbackHoursBefore > 0 || resource.holdbackHoursAfter > 0) {
    const holdbackStart = new Date(allocationStart);
    holdbackStart.setHours(holdbackStart.getHours() - resource.holdbackHoursAfter);
    const holdbackEnd = new Date(allocationEnd);
    holdbackEnd.setHours(holdbackEnd.getHours() + resource.holdbackHoursBefore);

    const holdbackConflicts = await getConflictingAllocations(
      db,
      resourceId,
      holdbackStart,
      holdbackEnd,
      excludeBookingId,
    );

    const trueHoldbackConflicts = holdbackConflicts.filter((a) => {
      const aStart = new Date(a.allocationStart);
      const aEnd = new Date(a.allocationEnd);
      return !dateRangesOverlap(allocationStart, allocationEnd, aStart, aEnd);
    });

    if (trueHoldbackConflicts.length > 0) {
      hardConflicts.push({
        ruleId: "HC-08",
        resourceId,
        resourceName: resource.name,
        conflictingBookingId: trueHoldbackConflicts[0].bookingId,
        message: `${resource.name} requires ${resource.holdbackHoursBefore}h setup / ${resource.holdbackHoursAfter}h breakdown time. This allocation conflicts with an adjacent booking's holdback window.`,
      });
      return { available: false, hardConflicts, softConflicts };
    }
  }

  // ── SC-02: Lodging Turnover Window ────────────────────────────────────────
  if (resource.type === "lodging_unit" && existingAllocations.length > 0) {
    softConflicts.push({
      ruleId: "SC-02",
      resourceId,
      resourceName: resource.name,
      message: `${resource.name} has a recent or upcoming booking. Confirm housekeeping turnover is scheduled.`,
      requiresAcknowledgment: false,
    });
  }

  // ── SC-03: Multiple Parties on Property ───────────────────────────────────
  if (resource.type === "lodging_unit" || resource.type === "event_space") {
    const otherLodgingAllocations = await db
      .select({
        bookingId: bookingResourceAllocations.bookingId,
        resourceId: bookingResourceAllocations.resourceId,
      })
      .from(bookingResourceAllocations)
      .innerJoin(resources, eq(bookingResourceAllocations.resourceId, resources.id))
      .where(
        and(
          ne(bookingResourceAllocations.resourceId, resourceId),
          ne(bookingResourceAllocations.status, "cancelled"),
          lt(bookingResourceAllocations.allocationStart, allocationEnd),
          gt(bookingResourceAllocations.allocationEnd, allocationStart),
          excludeBookingId
            ? ne(bookingResourceAllocations.bookingId, excludeBookingId)
            : sql`1=1`,
        ),
      )
      .limit(1);

    if (otherLodgingAllocations.length > 0) {
      softConflicts.push({
        ruleId: "SC-03",
        resourceId,
        resourceName: resource.name,
        relatedBookingId: otherLodgingAllocations[0].bookingId,
        message: `Multiple parties will be on property simultaneously. Confirm guest separation plan and coordinate with all booking managers.`,
        requiresAcknowledgment: true,
      });
    }
  }

  // ── HC-02: Exclusive Event Space Conflict ─────────────────────────────────
  if (resource.exclusiveUse) {
    const otherEventAllocations = await db
      .select({ bookingId: bookingResourceAllocations.bookingId })
      .from(bookingResourceAllocations)
      .innerJoin(resources, eq(bookingResourceAllocations.resourceId, resources.id))
      .where(
        and(
          ne(bookingResourceAllocations.resourceId, resourceId),
          eq(resources.type, "event_space"),
          ne(bookingResourceAllocations.status, "cancelled"),
          lt(bookingResourceAllocations.allocationStart, allocationEnd),
          gt(bookingResourceAllocations.allocationEnd, allocationStart),
          excludeBookingId
            ? ne(bookingResourceAllocations.bookingId, excludeBookingId)
            : sql`1=1`,
        ),
      )
      .limit(1);

    if (otherEventAllocations.length > 0) {
      hardConflicts.push({
        ruleId: "HC-02",
        resourceId,
        resourceName: resource.name,
        conflictingBookingId: otherEventAllocations[0].bookingId,
        message: `${resource.name} requires exclusive use of all event spaces. Another event space is already booked for these dates.`,
      });
      return { available: false, hardConflicts, softConflicts };
    }
  }

  // ── SC-01: Ceremony Lawn Overlap ──────────────────────────────────────────
  if (
    resource.slug === "ceremony-lawn" ||
    resource.slug === "river-lawn" ||
    resource.slug === "timber-edge"
  ) {
    const otherOutdoorAllocations = await db
      .select({ bookingId: bookingResourceAllocations.bookingId })
      .from(bookingResourceAllocations)
      .innerJoin(resources, eq(bookingResourceAllocations.resourceId, resources.id))
      .where(
        and(
          ne(bookingResourceAllocations.resourceId, resourceId),
          inArray(resources.slug, ["ceremony-lawn", "river-lawn", "timber-edge", "pavilion"]),
          ne(bookingResourceAllocations.status, "cancelled"),
          lt(bookingResourceAllocations.allocationStart, allocationEnd),
          gt(bookingResourceAllocations.allocationEnd, allocationStart),
          excludeBookingId
            ? ne(bookingResourceAllocations.bookingId, excludeBookingId)
            : sql`1=1`,
        ),
      )
      .limit(1);

    if (otherOutdoorAllocations.length > 0) {
      softConflicts.push({
        ruleId: "SC-01",
        resourceId,
        resourceName: resource.name,
        relatedBookingId: otherOutdoorAllocations[0].bookingId,
        message: `Another outdoor event space is in use during this time. Confirm guest visibility and noise separation between events.`,
        requiresAcknowledgment: true,
      });
    }
  }

  // ── SC-05: Guide Back-to-Back ─────────────────────────────────────────────
  if (resource.type === "guide_slot" && existingAllocations.length > 0) {
    softConflicts.push({
      ruleId: "SC-05",
      resourceId,
      resourceName: resource.name,
      message: `This guide slot has adjacent bookings on the same day. Confirm the guide has adequate rest and travel time between activities.`,
      requiresAcknowledgment: false,
    });
  }

  const available = hardConflicts.length === 0;
  return { available, hardConflicts, softConflicts };
}

// ─── Multi-Resource Check ─────────────────────────────────────────────────────

/**
 * Check availability for multiple resources in sequence.
 * Sequential (not parallel) so all checks share the same FOR UPDATE lock set.
 *
 * @param inputs - Array of resource + date-range inputs.
 * @param db     - Drizzle db client or transaction handle.
 */
export async function checkMultipleResources(
  inputs: AvailabilityCheckInput[],
  db: Db,
): Promise<MultiResourceCheckResult> {
  const allHardConflicts: HardConflict[] = [];
  const allSoftConflicts: SoftConflict[] = [];
  const resourceResults: Record<number, AvailabilityCheckResult> = {};

  for (const input of inputs) {
    const result = await checkAvailability(input, db);
    resourceResults[input.resourceId] = result;
    allHardConflicts.push(...result.hardConflicts);
    allSoftConflicts.push(...result.softConflicts);
  }

  const seenSoft = new Set<string>();
  const dedupedSoft = allSoftConflicts.filter((sc) => {
    const key = `${sc.ruleId}-${sc.resourceId}`;
    if (seenSoft.has(key)) return false;
    seenSoft.add(key);
    return true;
  });

  return {
    available: allHardConflicts.length === 0,
    hardConflicts: allHardConflicts,
    softConflicts: dedupedSoft,
    resourceResults,
  };
}

// ─── Calendar Availability Query ──────────────────────────────────────────────
// Read-only — no transaction needed. Accepts db for consistency with other exports.

export async function getCalendarAvailability(startDate: Date, endDate: Date, db?: Db) {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const resolvedDb = db ?? (await getDb());
  if (!resolvedDb) return { allocations: [], blocks: [] };

  const [allocations, blocks] = await Promise.all([
    resolvedDb
      .select({
        id: bookingResourceAllocations.id,
        bookingId: bookingResourceAllocations.bookingId,
        resourceId: bookingResourceAllocations.resourceId,
        resourceName: resources.name,
        resourceType: resources.type,
        allocationStart: bookingResourceAllocations.allocationStart,
        allocationEnd: bookingResourceAllocations.allocationEnd,
        status: bookingResourceAllocations.status,
      })
      .from(bookingResourceAllocations)
      .innerJoin(resources, eq(bookingResourceAllocations.resourceId, resources.id))
      .where(
        and(
          ne(bookingResourceAllocations.status, "cancelled"),
          lt(bookingResourceAllocations.allocationStart, endDate),
          gt(bookingResourceAllocations.allocationEnd, startDate),
        ),
      ),
    resolvedDb
      .select()
      .from(portalBlockedDates)
      .where(
        and(
          sql`${portalBlockedDates.startDate} <= ${endStr}`,
          sql`${portalBlockedDates.endDate} >= ${startStr}`,
        ),
      ),
  ]);

  return { allocations, blocks };
}
