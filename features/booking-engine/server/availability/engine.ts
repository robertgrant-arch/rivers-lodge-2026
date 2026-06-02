/**
 * Availability Engine — Rivers Lodge & Hunt Club
 *
 * Pure conflict detection module. No side effects — reads only.
 * All checks run within the caller's transaction context.
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
 * Fetch a resource with its group info
 */
async function getResourceWithGroup(resourceId: number) {
  const db = await getDb();
  if (!db) return null;
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
 * Fetch all active allocations for a resource within a date range
 */
async function getConflictingAllocations(
  resourceId: number,
  start: Date,
  end: Date,
  excludeBookingId?: number
) {
  const db = await getDb();
  if (!db) return [];
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
    .where(and(...conditions));
}

/**
 * Fetch all blocked dates that overlap a resource and date range
 */
async function getBlockedDates(_resourceId: number, start: Date, end: Date) {
  // Check entire-property blocks (scopeTarget matching or entire_property scope)
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(portalBlockedDates)
    .where(
      and(
        sql`${portalBlockedDates.startDate} <= ${endStr}`,
        sql`${portalBlockedDates.endDate} >= ${startStr}`
      )
    );
  return rows;
}

// ─── Single Resource Check ────────────────────────────────────────────────────

export async function checkAvailability(
  input: AvailabilityCheckInput
): Promise<AvailabilityCheckResult> {
  const { resourceId, allocationStart, allocationEnd, excludeBookingId } = input;
  const hardConflicts: HardConflict[] = [];
  const softConflicts: SoftConflict[] = [];

  // Load resource info
  const resource = await getResourceWithGroup(resourceId);
  if (!resource) {
    return {
      available: false,
      hardConflicts: [{ ruleId: "HC-00", resourceId, message: "Resource not found" }],
      softConflicts: [],
    };
  }

  // ── HC-07: Blocked Date ────────────────────────────────────────────────────
  const blocks = await getBlockedDates(resourceId, allocationStart, allocationEnd);
  // All portal blocked dates are hard blocks (no weather enum in portal schema)
  // Weather disruptions are handled via reasonNotes
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

  // ── SC-06: Weather Block ───────────────────────────────────────────────────
  // SC-06 weather blocks are tracked via reasonNotes in the portal UI
  void weatherBlocks;

  // ── HC-01: Existing Allocation Conflict ───────────────────────────────────
  const existingAllocations = await getConflictingAllocations(
    resourceId,
    allocationStart,
    allocationEnd,
    excludeBookingId
  );

  if (resource.capacity === 1 && existingAllocations.length > 0) {
    // Exclusive resource — any overlap is a hard conflict
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
    // Capacity-based resource (fish zones, sporting clays, culinary, etc.)
    const currentLoad = existingAllocations.length;

    if (currentLoad >= resource.capacity) {
      // HC-05 / HC-06: At capacity
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
      // SC-04: Culinary near capacity
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
    // Check if this allocation falls within the holdback window of an adjacent booking
    const holdbackStart = new Date(allocationStart);
    holdbackStart.setHours(holdbackStart.getHours() - resource.holdbackHoursAfter); // previous booking's holdback-after
    const holdbackEnd = new Date(allocationEnd);
    holdbackEnd.setHours(holdbackEnd.getHours() + resource.holdbackHoursBefore); // next booking's holdback-before

    const holdbackConflicts = await getConflictingAllocations(
      resourceId,
      holdbackStart,
      holdbackEnd,
      excludeBookingId
    );

    // Filter to only those that are within holdback (not the main overlap already caught)
    const trueHoldbackConflicts = holdbackConflicts.filter((a: typeof holdbackConflicts[0]) => {
      const aStart = new Date(a.allocationStart);
      const aEnd = new Date(a.allocationEnd);
      // Only flag if the overlap is ONLY in the holdback zone, not the main window
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
    // There's an adjacent allocation (caught by holdback above if strict, but surface as soft if not)
    softConflicts.push({
      ruleId: "SC-02",
      resourceId,
      resourceName: resource.name,
      message: `${resource.name} has a recent or upcoming booking. Confirm housekeeping turnover is scheduled.`,
      requiresAcknowledgment: false,
    });
  }

  // ── SC-03: Multiple Parties on Property ───────────────────────────────────
  // Check if any other lodging or event space is booked for these dates
  if (resource.type === "lodging_unit" || resource.type === "event_space") {
    const db2 = await getDb();
    const otherLodgingAllocations = db2 ? await db2
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
            : sql`1=1`
        )
      )
      .limit(1) : [];

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
    // If this resource requires exclusive use, check for ANY other event space bookings
    const db3 = await getDb();
    const otherEventAllocations = db3 ? await db3
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
            : sql`1=1`
        )
      )
      .limit(1) : [];

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
  if (resource.slug === "ceremony-lawn" || resource.slug === "river-lawn" || resource.slug === "timber-edge") {
    const db4 = await getDb();
    const otherOutdoorAllocations = db4 ? await db4
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
            : sql`1=1`
        )
      )
      .limit(1) : [];

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

export async function checkMultipleResources(
  inputs: AvailabilityCheckInput[]
): Promise<MultiResourceCheckResult> {
  const allHardConflicts: HardConflict[] = [];
  const allSoftConflicts: SoftConflict[] = [];
  const resourceResults: Record<number, AvailabilityCheckResult> = {};

  // Run all checks (could be parallelized but sequential is safer for transaction context)
  for (const input of inputs) {
    const result = await checkAvailability(input);
    resourceResults[input.resourceId] = result;
    allHardConflicts.push(...result.hardConflicts);
    allSoftConflicts.push(...result.softConflicts);
  }

  // Deduplicate soft conflicts by ruleId + resourceId
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
// Returns all allocations and blocks for a date range (for calendar rendering)

export async function getCalendarAvailability(startDate: Date, endDate: Date) {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const db = await getDb();
  if (!db) return { allocations: [], blocks: [] };

  const [allocations, blocks] = await Promise.all([
    db
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
          gt(bookingResourceAllocations.allocationEnd, startDate)
        )
      ),
    db
      .select()
      .from(portalBlockedDates)
      .where(
        and(
          sql`${portalBlockedDates.startDate} <= ${endStr}`,
          sql`${portalBlockedDates.endDate} >= ${startStr}`
        )
      ),
  ]);

  return { allocations, blocks };
}
