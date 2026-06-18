/**
 * OAuth state tests — removed.
 *
 * The Manus OAuth CSRF state nonce logic (encodeOAuthState, decodeOAuthState,
 * validateOAuthState) has been removed as part of the migration to Clerk.
 * Clerk manages CSRF protection and OAuth state internally.
 */

import { describe, expect, it } from "vitest";

describe("OAuth state (removed)", () => {
  it("placeholder — Clerk handles OAuth state management", () => {
    expect(true).toBe(true);
  });
});
