/**
 * Hunting groups on the calendars (registered at boot in
 * _core/server/calendarSources.ts). arrivalDate–departureDate, overlap rule;
 * members only ever see "Unavailable" for these dates.
 */
import { and, gte, lte, notInArray, sql } from "drizzle-orm";
import { getPortalDb } from "@core/server/db";
import { EXCLUDED_STATUSES, type CalendarSource, type RawCalendarItem } from "@shared/calendarFeed";
import { huntingGroupBookings } from "../schema";
import { HUNTING_GROUP_CALENDAR } from "../types";

type Db = { select: (...args: any[]) => any };

export function huntingGroupItem(g: {
  id: number; groupName: string | null; partySize: number | null; arrivalDate: unknown; departureDate: unknown; status: string | null;
}): RawCalendarItem {
  const party = (g.partySize ?? 0) > 1 ? ` (${g.partySize})` : "";
  return {
    id: `hunting_group-${g.id}`, kind: HUNTING_GROUP_CALENDAR.kind, recordId: g.id,
    title: `Hunting Group: ${g.groupName ?? "Group"}${party}`,
    startDate: g.arrivalDate, endDate: g.departureDate ?? g.arrivalDate, allDay: true, status: g.status,
    href: `/ops/hunting-groups/${g.id}`, hiddenFromMembers: true,
  };
}

export function createHuntingGroupCalendarSource(getDb: () => Db = getPortalDb): CalendarSource {
  return {
    ...HUNTING_GROUP_CALENDAR,
    marksMemberUnavailable: true,
    async listInRange(startDate, endDate) {
      const rows = await getDb().select({
        id: huntingGroupBookings.id, groupName: huntingGroupBookings.groupName, partySize: huntingGroupBookings.partySize,
        arrivalDate: huntingGroupBookings.arrivalDate, departureDate: huntingGroupBookings.departureDate,
        status: huntingGroupBookings.status,
      }).from(huntingGroupBookings).where(and(
        notInArray(sql`${huntingGroupBookings.status}::text`, EXCLUDED_STATUSES as string[]),
        lte(huntingGroupBookings.arrivalDate, endDate),
        gte(sql`coalesce(${huntingGroupBookings.departureDate}, ${huntingGroupBookings.arrivalDate})`, startDate),
      ));
      return (rows as any[]).map(huntingGroupItem);
    },
  };
}

export const huntingGroupCalendarSource = createHuntingGroupCalendarSource();
