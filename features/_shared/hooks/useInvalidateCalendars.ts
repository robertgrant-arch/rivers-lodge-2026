import { useCallback } from "react";
import { trpc } from "@shared/lib/trpc";

/**
 * Call after creating, editing, cancelling or deleting any booking/event that
 * feeds the calendars, so the Ops Calendar, the staff Ops Calendar and My
 * Calendar refetch without a page reload.
 */
export function useInvalidateCalendars() {
  const utils = trpc.useUtils();
  return useCallback(() => {
    void utils.portal.calendar.events.invalidate();
    void utils.memberPortal.opsCalendar.invalidate();
    void utils.memberPortal.unavailableDates.invalidate();
  }, [utils]);
}
