// OAuth routes removed — authentication is now handled by Clerk.
// Keeping this module so existing imports compile.

import type { Express } from "express";

/** No-op: Clerk handles authentication; no custom OAuth routes needed. */
export function registerOAuthRoutes(_app: Express): void {}
