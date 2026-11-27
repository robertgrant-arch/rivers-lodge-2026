// Other Groups — public API (SERVER barrel: router, calendar source, inquiry
// helper, table). Client code inside this feature imports ./types directly;
// other features' client code must not import this barrel (it pulls in the DB).
export { otherGroupsRouter, OTHER_GROUP_AUDIT_ENTITY } from "./server/router";
export { otherGroupCalendarSource } from "./server/calendarSource";
export { createOtherGroupInquiryBooking } from "./server/inquiry";
export { otherGroupBookings, type OtherGroupBooking } from "./schema";
export * from "./types";
