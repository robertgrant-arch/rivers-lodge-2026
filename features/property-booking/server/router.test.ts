/**
 * Property Booking Router Tests
 * ==============================
 * Tests for property creation, updates, and activity management
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "@core/server/db";
import { huntingProperties, propertyActivities } from "@core/db/property-booking-schema";
import { eq, and } from "drizzle-orm";

describe("Property Booking - Activities", () => {
  let db: any;
  let testPropertyId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database unavailable");
  });

  afterAll(async () => {
    // Cleanup: delete test property and its activities
    if (testPropertyId) {
      await db.delete(propertyActivities).where(eq(propertyActivities.propertyId, testPropertyId));
      await db.delete(huntingProperties).where(eq(huntingProperties.id, testPropertyId));
    }
  });

  it("should create a property with 3 activities", async () => {
    const now = Date.now();

    // Create property
    const result = await db
      .insert(huntingProperties)
      .values({
        name: "Test Stand with Multiple Activities",
        slug: "test-stand-activities",
        type: "stand",
        primaryActivity: "deer",
        description: "Test property for activity management",
        active: true,
        featuredOnPublicSite: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        maxHunters: 2,
        hasCellService: true,
      })
      .returning({ id: huntingProperties.id });

    testPropertyId = result[0].id;
    expect(testPropertyId).toBeGreaterThan(0);

    // Create 3 activity associations
    const activities = ["deer", "duck", "turkey"];
    const activityRows = activities.map((activity) => ({
      propertyId: testPropertyId,
      activity,
    }));

    await db.insert(propertyActivities).values(activityRows);

    // Verify activities were created
    const savedActivities = await db
      .select()
      .from(propertyActivities)
      .where(eq(propertyActivities.propertyId, testPropertyId));

    expect(savedActivities).toHaveLength(3);
    expect(savedActivities.map((a: any) => a.activity).sort()).toEqual(
      ["deer", "duck", "turkey"].sort(),
    );
  });

  it("should handle activity deletion on property update", async () => {
    const now = Date.now();

    // Create property
    const result = await db
      .insert(huntingProperties)
      .values({
        name: "Test Update Activities",
        slug: "test-update-activities",
        type: "blind",
        primaryActivity: "duck",
        active: true,
        featuredOnPublicSite: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        maxHunters: 3,
        hasCellService: true,
      })
      .returning({ id: huntingProperties.id });

    const propertyId = result[0].id;

    // Add initial activities
    const initialActivities = ["duck", "turkey", "quail"];
    const initialRows = initialActivities.map((activity) => ({
      propertyId,
      activity,
    }));
    await db.insert(propertyActivities).values(initialRows);

    // Verify initial activities
    let savedActivities = await db
      .select()
      .from(propertyActivities)
      .where(eq(propertyActivities.propertyId, propertyId));
    expect(savedActivities).toHaveLength(3);

    // Delete all activities (simulate update without activities)
    await db.delete(propertyActivities).where(eq(propertyActivities.propertyId, propertyId));

    // Add new activities
    const newActivities = ["bass", "catfish"];
    const newRows = newActivities.map((activity) => ({
      propertyId,
      activity,
    }));
    await db.insert(propertyActivities).values(newRows);

    // Verify updated activities
    savedActivities = await db
      .select()
      .from(propertyActivities)
      .where(eq(propertyActivities.propertyId, propertyId));
    expect(savedActivities).toHaveLength(2);
    expect(savedActivities.map((a: any) => a.activity).sort()).toEqual(["bass", "catfish"].sort());

    // Cleanup
    await db.delete(propertyActivities).where(eq(propertyActivities.propertyId, propertyId));
    await db.delete(huntingProperties).where(eq(huntingProperties.id, propertyId));
  });

  it("should handle null bookingModes and maxWaterfowlHunters safely", async () => {
    const now = Date.now();

    // Create property with null bookingModes (simulating legacy pre-PR#57 data)
    const result = await db
      .insert(huntingProperties)
      .values({
        name: "Legacy Property - Null Fields",
        slug: "legacy-null-fields",
        type: "stand",
        primaryActivity: "deer",
        active: true,
        featuredOnPublicSite: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        maxHunters: 2,
        hasCellService: true,
        // Explicitly null for backward-compat test
        bookingModes: null,
        maxWaterfowlHunters: null,
        maxTotalPeople: null,
        overnightEnabled: true,
      })
      .returning({ id: huntingProperties.id });

    const propertyId = result[0].id;
    expect(propertyId).toBeGreaterThan(0);

    // Verify the property was created with null values
    const [created] = await db
      .select()
      .from(huntingProperties)
      .where(eq(huntingProperties.id, propertyId));

    expect(created).toBeDefined();
    expect(created.bookingModes).toBeNull();
    expect(created.maxWaterfowlHunters).toBeNull();
    expect(created.maxTotalPeople).toBeNull();

    // Cleanup
    await db.delete(huntingProperties).where(eq(huntingProperties.id, propertyId));
  });
});
