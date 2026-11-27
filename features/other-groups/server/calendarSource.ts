/**
 * Other groups on the calendars (registered at boot in
 * _core/server/calendarSources.ts). arrivalDate–departureDate, overlap rule;
 * members only ever see "Unavailable" for these dates.
 */
import { and, gte, lte, notInArray, sql } from "drizzle-orm";
import { getPortalDb } from "@core/server/db";
import { EXCLUDED_STATUSES, type CalendarSource, type RawCalendarItem } from "@shared/calendarFeed";
import { otherGroupBookings } from "../schema";
import { OTHER_GROUP_CALENDAR } from "../types";

type Db = { select: (...args: any[]) => any };

export function otherGroupItem(g: {
  id: number; groupName: string | null; guestCount: number | null; arrivalDate: unknown; departureDate: unknown; status: string | null;
}): RawCalendarItem {
  // "Other Group: {groupName} ({guestCount})" — the count is left off when unknown.
  const guests = g.guestCount != null ? ` (${g.guestCount})` : "";
  return {
    id: `other_group-${g.id}`, kind: OTHER_GROUP_CALENDAR.kind, recordId: g.id,
    title: `Other Group: ${g.groupName ?? "Group"}${guests}`,
    startDate: g.arrivalDate, endDate: g.departureDate ?? g.arrivalDate, allDay: true, status: g.status,
    href: `/ops/other-groups/${g.id}`, hiddenFromMembers: true,
  };
}

export function createOtherGroupCalendarSource(getDb: () => Db = getPortalDb): CalendarSource {
  return {
    ...OTHER_GROUP_CALENDAR,
    marksMemberUnavailable: true,
    async listInRange(startDate, endDate) {
      const rows = await getDb().select({
        id: otherGroupBookings.id, groupName: otherGroupBookings.groupName, guestCount: otherGroupBookings.guestCount,
        arrivalDate: otherGroupBookings.arrivalDate, departureDate: otherGroupBookings.departureDate,
        status: otherGroupBookings.status,
      }).from(otherGroupBookings).where(and(
        notInArray(sql`${otherGroupBookings.status}::text`, EXCLUDED_STATUSES as string[]),
        lte(otherGroupBookings.arrivalDate, endDate),
        gte(sql`coalesce(${otherGroupBookings.departureDate}, ${otherGroupBookings.arrivalDate})`, startDate),
      ));
      return (rows as any[]).map(otherGroupItem);
    },
  };
}

export const otherGroupCalendarSource = createOtherGroupCalendarSource();
