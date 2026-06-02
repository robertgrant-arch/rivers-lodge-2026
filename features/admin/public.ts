// Admin feature public API
// Admin is a consumer-only feature — it does not expose tables or components
// to other features. Only the router is exported for wiring into the app router.

export { adminRouter } from "./server/router";
