import { rateLimit } from "express-rate-limit";

/**
 * submitLimiter — public form submissions
 *
 * Applied to tRPC procedures that accept unauthenticated user-generated
 * content: inquiries.submit, membership.submitApplication, messages.send,
 * waivers.sign.  5 req/min/IP is enough for legitimate use (a human filling
 * out a form) while cutting off automated floods.
 */
export const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: "draft-6", // RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset
  legacyHeaders: false,
  message: { error: "Too many submissions — please wait a minute and try again." },
  skipSuccessfulRequests: false,
});

/**
 * authLimiter — OAuth start + callback
 *
 * Applied to /api/oauth/* to slow down credential-stuffing and login
 * automation.  10 req/min/IP is generous for real users (a person rarely
 * clicks "log in" more than once or twice in a row) but still throttles bots.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts — please wait a minute and try again." },
  skipSuccessfulRequests: false,
});
