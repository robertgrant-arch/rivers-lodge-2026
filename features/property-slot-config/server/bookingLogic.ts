/**
 * Booking Logic — Property Slot Config
 * ====================================
 * Auto-approve logic, overnight conflict guards, and slot-based booking rules.
 */

import { and, eq } from "drizzle-orm";
import { getPortalDb } from "@core/server/db";
import { properties, propertySlots, slotTemplates } from "../schema";

export interface BookingRequest {
  propertyId: number;
  slotTemplateId: number;
  date: string;
  partySize: number;
}

export interface BookingResult {
  autoApproved: boolean;
  requiresApproval: boolean;
  reason?: string;
}

/**
 * Determine if a booking should be auto-approved based on property and slot settings.
 * Checks for overnight exclusive conflicts and respects auto-approve overrides.
 */
export async function shouldAutoApproveBiking(req: BookingRequest): Promise<BookingResult> {
  const db = getPortalDb();

  // Get property
  const property = await db
    .select()
    .from(properties)
    .where(eq(properties.id, req.propertyId))
    .limit(1);

  if (!property || property.length === 0) {
    return { autoApproved: false, requiresApproval: true, reason: "Property not found" };
  }

  const prop = property[0];

  // Get slot template
  const slot = await db
    .select()
    .from(slotTemplates)
    .where(eq(slotTemplates.id, req.slotTemplateId))
    .limit(1);

  if (!slot || slot.length === 0) {
    return { autoApproved: false, requiresApproval: true, reason: "Slot template not found" };
  }

  const slotTemplate = slot[0];

  // Get property slot configuration
  const propSlot = await db
    .select()
    .from(propertySlots)
    .where(
      and(
        eq(propertySlots.propertyId, req.propertyId),
        eq(propertySlots.slotTemplateId, req.slotTemplateId),
      ),
    )
    .limit(1);

  const propSlotConfig = propSlot && propSlot.length > 0 ? propSlot[0] : null;

  // Check if slot is enabled for this property
  if (propSlotConfig && !propSlotConfig.enabled) {
    return { autoApproved: false, requiresApproval: true, reason: "Slot not available at this property" };
  }

  // Determine auto-approve setting (slot override or property default)
  const shouldAutoApprove = Boolean(
    propSlotConfig?.autoApprove !== undefined ? propSlotConfig.autoApprove : prop.autoApprove,
  );

  // Check overnight exclusive conflict
  if (slotTemplate.spansMultipleDays === 1 && prop.overnightExclusive) {
    // Overnight slot booked at an overnight-exclusive property
    // This should block same-day PM and next-day AM (handled elsewhere)
    return {
      autoApproved: shouldAutoApprove,
      requiresApproval: !shouldAutoApprove,
      reason: shouldAutoApprove ? undefined : "Requires approval for overnight exclusive property",
    };
  }

  // Check party size vs max capacity
  const maxParty = propSlotConfig?.maxParty ?? prop.maxHunters ?? 0;
  if (req.partySize > maxParty) {
    return { autoApproved: false, requiresApproval: true, reason: `Exceeds max party size of ${maxParty}` };
  }

  return {
    autoApproved: shouldAutoApprove,
    requiresApproval: !shouldAutoApprove,
  };
}

/**
 * Check for overnight slot conflicts.
 * If booking an overnight slot on a date, blocks:
 * - Same day PM slots
 * - Next day AM slots
 */
export async function checkOvernightConflicts(
  propertyId: number,
  date: string,
  slotTemplateId: number,
): Promise<{ hasConflict: boolean; conflictingSlotIds?: number[] }> {
  const db = getPortalDb();

  // Get the slot template to check if it's an overnight slot
  const slot = await db
    .select()
    .from(slotTemplates)
    .where(eq(slotTemplates.id, slotTemplateId))
    .limit(1);

  if (!slot || slot.length === 0) {
    return { hasConflict: false };
  }

  const slotTemplate = slot[0];

  // If this is NOT an overnight slot, no conflicts to check
  if (slotTemplate.spansMultipleDays !== 1) {
    return { hasConflict: false };
  }

  // This is an overnight slot. Check for bookings on same day or next day
  // that would conflict with the overnight exclusive period.
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split("T")[0];

  // Get all PM slots (assuming they are slots that end after 12:00)
  const allSlots = await db.select().from(slotTemplates);
  const pmAndAMSlots = allSlots
    .filter((s) => {
      // PM: starts at 12:00 or later, same-day only
      const isPM = s.startTime >= "12:00" && s.spansMultipleDays === 0;
      // AM: ends before 12:00, single day
      const isAM = s.endTime <= "12:00" && s.spansMultipleDays === 0;
      return isPM || isAM;
    })
    .map((s) => s.id);

  // In a real booking system, you'd check trip_requests table for conflicts
  // For now, just return the slot IDs that would conflict
  return {
    hasConflict: pmAndAMSlots.length > 0,
    conflictingSlotIds: pmAndAMSlots,
  };
}
