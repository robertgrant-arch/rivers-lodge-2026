/**
 * Calendar feed registration (composition root)
 * =============================================
 * Every event feature exports a CalendarSource from its server public.ts;
 * this file registers them once at boot. The Ops Calendar
 * (portal.calendar.events), the staff Ops Calendar (memberPortal.opsCalendar)
 * and members' My Calendar unavailable dates all read the registry
 * (@shared/calendarFeed), so a new event type appears everywhere just by
 * adding one line here.
 *
 * Order = legend order.
 */
import { registerCalendarSource } from "@shared/calendarFeed";
import {
  weddingCalendarSource,
  corporateCalendarSource,
  huntFishCalendarSource,
  opsEventCalendarSource,
  memberEventCalendarSource,
  blockedCalendarSource,
} from "@features/portal/server/public";
import { huntingGroupCalendarSource } from "@features/hunting-groups/server/public";

let registered = false;

export function registerCalendarSources(): void {
  if (registered) return;
  registered = true;
  registerCalendarSource(opsEventCalendarSource);
  registerCalendarSource(memberEventCalendarSource);
  registerCalendarSource(weddingCalendarSource);
  registerCalendarSource(corporateCalendarSource);
  registerCalendarSource(huntingGroupCalendarSource);
  registerCalendarSource(huntFishCalendarSource);
  registerCalendarSource(blockedCalendarSource);
}

registerCalendarSources();
