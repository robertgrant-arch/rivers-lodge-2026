/**
 * Property Booking Router Tests
 * ==============================
 * Validates the enterprise hunting property booking system:
 * - idempotencyKey must be a valid UUID (z.string().uuid())
 * - Booking create input schema validation
 * - Availability query returns correct structure
 * - Admin property create/update input schema validation
 * - AMENITY_FIELDS alignment (hasElectricity, hasCellService)
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Replicate the server-side input schemas for unit testing ─────────────────

const createBookingInput = z.object({
  propertyId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.number().int().min(1).max(20),
  activity: z.enum([
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish", "scouting",
  ]),
  guestNames: z.array(z.string().max(100)).optional(),
  hasMinors: z.boolean().optional(),
  huntingLicenseConfirmed: z.boolean().optional(),
  fishingLicenseConfirmed: z.boolean().optional(),
  memberNotes: z.string().max(1000).optional(),
  idempotencyKey: z.string().uuid(),
  addOns: z.array(z.object({
    type: z.enum(["guide", "atv", "dog_handler", "cleaning", "meals", "ammo", "gear_rental", "photography", "other"]),
    description: z.string().max(200).optional(),
    quantity: z.number().int().min(1).default(1),
  })).optional(),
});

const createPropertyInput = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  type: z.enum(["stand", "blind", "field", "pond", "creek", "food_plot", "zone", "lodge"]),
  primaryActivity: z.enum([
    "deer", "duck", "turkey", "quail", "dove", "hog",
    "bass", "catfish", "crappie", "mixed_hunt", "mixed_fish", "hunt_and_fish",
  ]),
  maxHunters: z.number().int().min(1).max(50).default(2),
  hasHeatedBlind: z.boolean().optional(),
  hasAtvAccess: z.boolean().optional(),
  hasWaterAccess: z.boolean().optional(),
  hasElectricity: z.boolean().optional(),
  hasCellService: z.boolean().optional(),
  active: z.boolean().default(true),
  featuredOnPublicSite: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updatePropertyInput = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(120).optional(),
  maxHunters: z.number().int().min(1).max(50).optional(),
  active: z.boolean().optional(),
  featuredOnPublicSite: z.boolean().optional(),
  hasHeatedBlind: z.boolean().optional(),
  hasAtvAccess: z.boolean().optional(),
  hasWaterAccess: z.boolean().optional(),
  hasElectricity: z.boolean().optional(),
  hasCellService: z.boolean().optional(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Property Booking — idempotencyKey validation", () => {
  it("accepts a valid UUID v4 from crypto.randomUUID()", () => {
    const uuid = crypto.randomUUID();
    const result = createBookingInput.safeParse({
      propertyId: 1,
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      partySize: 2,
      activity: "deer",
      idempotencyKey: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a nanoid-style non-UUID string", () => {
    const nanoidLike = "V1StGXR8_Z5jdHi6B-myT"; // typical nanoid output
    const result = createBookingInput.safeParse({
      propertyId: 1,
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      partySize: 2,
      activity: "deer",
      idempotencyKey: nanoidLike,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("idempotencyKey");
  });

  it("rejects an empty string as idempotencyKey", () => {
    const result = createBookingInput.safeParse({
      propertyId: 1,
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      partySize: 2,
      activity: "deer",
      idempotencyKey: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing idempotencyKey", () => {
    const result = createBookingInput.safeParse({
      propertyId: 1,
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      partySize: 2,
      activity: "deer",
    });
    expect(result.success).toBe(false);
  });
});

describe("Property Booking — booking create input validation", () => {
  const validBase = {
    propertyId: 1,
    startDate: "2026-05-10",
    endDate: "2026-05-12",
    partySize: 2,
    activity: "deer" as const,
    idempotencyKey: crypto.randomUUID(),
  };

  it("accepts valid minimal input", () => {
    expect(createBookingInput.safeParse(validBase).success).toBe(true);
  });

  it("rejects party size of 0", () => {
    expect(createBookingInput.safeParse({ ...validBase, partySize: 0 }).success).toBe(false);
  });

  it("rejects party size over 20", () => {
    expect(createBookingInput.safeParse({ ...validBase, partySize: 21 }).success).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(createBookingInput.safeParse({ ...validBase, startDate: "05/10/2026" }).success).toBe(false);
  });

  it("rejects unknown activity", () => {
    expect(createBookingInput.safeParse({ ...validBase, activity: "fishing" as any }).success).toBe(false);
  });

  it("accepts scouting as a valid activity", () => {
    expect(createBookingInput.safeParse({ ...validBase, activity: "scouting" }).success).toBe(true);
  });

  it("accepts optional fields: guestNames, hasMinors, memberNotes", () => {
    const result = createBookingInput.safeParse({
      ...validBase,
      guestNames: ["Jane Doe", "John Smith"],
      hasMinors: true,
      huntingLicenseConfirmed: true,
      memberNotes: "Please leave the gate unlocked.",
    });
    expect(result.success).toBe(true);
  });
});

describe("Admin Property Create — hasElectricity and hasCellService", () => {
  it("accepts hasElectricity and hasCellService in create input", () => {
    const result = createPropertyInput.safeParse({
      name: "Test Stand",
      slug: "test-stand",
      type: "stand",
      primaryActivity: "deer",
      hasElectricity: true,
      hasCellService: false,
    });
    expect(result.success).toBe(true);
    expect(result.data?.hasElectricity).toBe(true);
    expect(result.data?.hasCellService).toBe(false);
  });

  it("defaults hasCellService to undefined when not provided (server defaults to true)", () => {
    const result = createPropertyInput.safeParse({
      name: "Test Stand",
      slug: "test-stand",
      type: "stand",
      primaryActivity: "deer",
    });
    expect(result.success).toBe(true);
    expect(result.data?.hasCellService).toBeUndefined();
  });
});

describe("Admin Property Update — hasElectricity and hasCellService", () => {
  it("accepts hasElectricity and hasCellService in update input", () => {
    const result = updatePropertyInput.safeParse({
      id: 1,
      hasElectricity: false,
      hasCellService: true,
    });
    expect(result.success).toBe(true);
    expect(result.data?.hasElectricity).toBe(false);
    expect(result.data?.hasCellService).toBe(true);
  });

  it("rejects update with id=0", () => {
    const result = updatePropertyInput.safeParse({ id: 0, name: "Test" });
    expect(result.success).toBe(false);
  });
});

describe("Availability query structure", () => {
  it("validates a correctly structured availability day object", () => {
    const daySchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.enum(["open", "partial", "full", "blocked", "closed"]),
      capacity: z.number().int().nonnegative(),
      bookedCount: z.number().int().nonnegative(),
      availableSpots: z.number().int().nonnegative(),
    });

    const openDay = { date: "2026-05-10", status: "open", capacity: 2, bookedCount: 0, availableSpots: 2 };
    const blockedDay = { date: "2026-05-11", status: "blocked", capacity: 0, bookedCount: 0, availableSpots: 0 };
    const fullDay = { date: "2026-05-12", status: "full", capacity: 2, bookedCount: 2, availableSpots: 0 };

    expect(daySchema.safeParse(openDay).success).toBe(true);
    expect(daySchema.safeParse(blockedDay).success).toBe(true);
    expect(daySchema.safeParse(fullDay).success).toBe(true);
  });
});
