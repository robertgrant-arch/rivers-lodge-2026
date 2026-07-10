import { rateLimit, ipKeyGenerator } from "express-rate-limit";

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
 * loginLimiter — auth.login tRPC procedure
 *
 * 10 attempts per 15 minutes per IP. Tight enough to block credential
 * stuffing; loose enough that a human mistyping their password won't be
 * immediately locked out. Successful requests count toward the limit so
 * an attacker can't probe then succeed without hitting the cap.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-6",
  legacyHeaders: false,
  message: { error: "Too many login attempts — please wait 15 minutes and try again." },
  keyGenerator: (req) => {
    // Key on IP + email body so per-account brute force is also limited
    const ip = ipKeyGenerator(req);
    try {
      const body = req.body;
      // tRPC batch: body is array; single call: object
      const email = Array.isArray(body)
        ? (body[0]?.json?.email ?? "")
        : (body?.json?.email ?? body?.email ?? "");
      return `login:${ip}:${String(email).toLowerCase().slice(0, 100)}`;
    } catch {
      return `login:${ip}`;
    }
  },
});

/**
 * acceptInviteLimiter — auth.acceptInvite tRPC procedure
 *
 * Token is 32 random bytes so brute force is infeasible, but rate-limiting
 * prevents excessive DB lookups and token scanning.
 */
export const acceptInviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-6",
  legacyHeaders: false,
  message: { error: "Too many invite attempts — please wait 15 minutes and try again." },
});

/**
 * changePasswordLimiter — auth.changePassword tRPC procedure
 *
 * Authenticated endpoint. Key on IP to block external credential stuffing
 * against the current-password field.
 */
export const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-6",
  legacyHeaders: false,
  message: { error: "Too many password change attempts — please wait 15 minutes and try again." },
});
