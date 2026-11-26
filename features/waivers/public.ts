export { waiversRouter } from "./server/router";
export type { Waiver, WaiverTemplate } from "./schema";
export { waivers } from "./schema";
// Server utility — for admin feature consumption only
export { generateAndStoreWaiverPdf } from "./server/waiverPdf";
// DocuSign Master/Booking waivers — server hooks for other features
export {
  getWaiverService,
  registerBookingLifecycle,
  startWaiverScheduler,
} from "./server/docusign/runtime";
export { registerDocuSignRoutes } from "./server/docusign/routes";
export { WaiverGateError, WaiverActionError } from "./server/docusign/service";
export { isWaiversDocuSignEnabled } from "./server/docusign/config";
export type { BookingLifecycle } from "./server/docusign/types";
