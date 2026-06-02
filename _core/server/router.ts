import { router } from 'features/_core/server/trpc';
import { authRouter } from 'features/auth/server/router';
import { inquiriesRouter } from 'features/inquiries/server/router';
import { membershipRouter } from 'features/membership/server/router';
import { messagesRouter } from 'features/messages/server/router';
import { waiversRouter } from 'features/waivers/public';
import { cmsRouter } from 'features/cms/server/router';
import { bookingRouter } from 'features/booking-engine/server/router';
import { tripsRouter } from 'features/trips/server/router';
import { propertyBookingRouter } from 'features/property-booking/server/router';
import { reportsRouter } from 'features/reports/server/router';
import { adminRouter as portalRouter } from 'features/admin/server/router';
import { updatesRouter } from 'features/updates/server/router';
import { memberPortalRouter } from 'features/portal/server/router';

export const appRouter = router({
  auth: authRouter,
  inquiries: inquiriesRouter,
  membership: membershipRouter,
  messages: messagesRouter,
  waivers: waiversRouter,
  cms: cmsRouter,
  booking: bookingRouter,
  trips: tripsRouter,
  propertyBooking: propertyBookingRouter,
  reports: reportsRouter,
  portal: portalRouter,
  updates: updatesRouter,
  memberPortal: memberPortalRouter,
});

export type AppRouter = typeof appRouter;
