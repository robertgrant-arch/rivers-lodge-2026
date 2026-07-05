/**
 * Smoke Tests: Root-level Properties Endpoints
 * =============================================
 * Verify that /trpc/properties.list and /trpc/adminProperties.list
 * work correctly after tRPC router refactoring (fix for PR #57).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./router";
import { createCallerFactory } from "@trpc/server";
import { getDb } from "./db";
import { huntingProperties } from "@core/db/property-booking-schema";
import { eq } from "drizzle-orm";

const createCaller = createCallerFactory(appRouter);

describe("Root-level Properties Endpoints", () => {
  let db: any;
  let testPropertyId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a test property with null bookingModes to verify null-safety
    const now = Date.now();
    const result = await db
      .insert(huntingProperties)
      .values({
        name: "Test Root Properties Endpoint",
        slug: "test-root-properties",
        type: "stand",
        primaryActivity: "deer",
        active: true,
        featuredOnPublicSite: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        maxHunters: 2,
        hasCellService: true,
        // Null fields to test backward compat
        bookingModes: null,
        overnightEnabled: null,
      })
      .returning({ id: huntingProperties.id });

    testPropertyId = result[0].id;
  });

  afterAll(async () => {
    // Cleanup
    if (testPropertyId && db) {
      await db.delete(huntingProperties).where(eq(huntingProperties.id, testPropertyId));
    }
  });

  it("GET /trpc/properties.list should return 200 with array (public endpoint)", async () => {
    const caller = createCaller({ user: null } as any);

    // Call the public properties.list endpoint
    const result = await caller.properties.list({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Should include at least our test property
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Verify null-safety: properties should have safe defaults
    const testProp = result.find((p: any) => p.id === testPropertyId);
    if (testProp) {
      expect(testProp.bookingModes).toEqual(["AM", "PM"]);
      expect(testProp.overnightEnabled).toBe(true);
    }
  });

  it("GET /trpc/adminProperties.list should return 200 with array (admin-only)", async () => {
    const caller = createCaller({ user: { role: "admin", id: "test-admin" } } as any);

    // Call the admin adminProperties.list endpoint
    const result = await caller.adminProperties.list({ includeInactive: true });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Should include at least our test property
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Verify null-safety: properties should have safe defaults
    const testProp = result.find((p: any) => p.id === testPropertyId);
    if (testProp) {
      expect(testProp.bookingModes).toEqual(["AM", "PM"]);
      expect(testProp.overnightEnabled).toBe(true);
    }
  });

  it("GET /trpc/adminProperties.list should reject non-admin users", async () => {
    const caller = createCaller({ user: { role: "member", id: "test-member" } } as any);

    try {
      await caller.adminProperties.list({});
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
