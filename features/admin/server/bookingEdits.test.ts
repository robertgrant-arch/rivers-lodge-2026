/**
 * Ops booking edits (Weddings + Corporate Groups): input validation, value
 * mapping, and the update procedures writing/auditing only changed fields.
 * No database — drizzle is mocked.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "@core/server/context";
import { changedFields, toBookingValues, updateCorporateInput, updateWeddingInput } from "./bookingEdits";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
let selectRows: unknown[] = [];
const updates: Array<{ set: Record<string, unknown> }> = [];
const inserts: Array<Record<string, unknown>> = [];
function chain(rows: unknown[]) {
  const c: any = { from: () => c, where: () => c, orderBy: () => c, limit: () => c, then: (r: any) => Promise.resolve(rows).then(r) };
  return c;
}
const mockDb = {
  select: vi.fn(() => chain(selectRows)),
  update: vi.fn(() => ({ set: (set: Record<string, unknown>) => { updates.push({ set }); return { where: () => Promise.resolve([]) }; } })),
  insert: vi.fn(() => ({ values: (v: Record<string, unknown>) => { inserts.push(v); return Promise.resolve([]); } })),
};
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => mockDb) }));

import { appRouter } from "../../../_core/server/router";

const adminCtx = {
  user: { id: "admin-1", email: "admin@test.invalid", role: "admin", status: "active", mustChangePassword: false },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => {} },
} as unknown as TrpcContext;
const caller = () => appRouter.createCaller(adminCtx) as any;

const savedWedding = {
  id: 7, status: "inquiry", coupleName: "Smith & Jones", contactEmail: "sj@example.com", contactPhone: null,
  weddingDate: "2027-06-12", guestCountEstimate: 120, guestCountFinal: null, contractValue: "15000.00", notes: null,
};
const savedCorporate = {
  id: 3, status: "contacted", companyName: "Acme", contactName: "Pat", contactEmail: "pat@acme.com", contactPhone: null,
  eventType: "team_retreat", arrivalDate: "2027-03-10", departureDate: "2027-03-12", attendeeCount: 20, contractValue: null, notes: null,
};

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
  updates.length = 0;
  inserts.length = 0;
});

describe("validation", () => {
  it("accepts a full wedding edit and clears optional fields with null/empty", () => {
    const r = updateWeddingInput.safeParse({ id: 1, coupleName: "A & B", contactEmail: "a@b.com", contactPhone: null, weddingDate: "", status: "confirmed", guestCountEstimate: null, contractValue: "", notes: null });
    expect(r.success).toBe(true);
  });

  it("rejects bad wedding input with readable messages", () => {
    const r = updateWeddingInput.safeParse({ id: 1, coupleName: "  ", contactEmail: "nope", weddingDate: "06/12/2027", status: "booked", guestCountEstimate: -1, contractValue: "12k" });
    expect(r.success).toBe(false);
    const msgs = r.error!.issues.map((i) => i.message).join(" | ");
    expect(msgs).toContain("Couple name is required");
    expect(msgs).toContain("Enter a valid email");
    expect(msgs).toContain("Use a date like 2026-06-14");
    expect(msgs).toContain("can't be negative");
    expect(msgs).toContain("Enter an amount like 1500 or 1500.00");
    expect(r.error!.issues.some((i) => i.path[0] === "status")).toBe(true); // only existing statuses
  });

  it("corporate: only existing statuses / event types; departure not before arrival", () => {
    expect(updateCorporateInput.safeParse({ id: 1, status: "site_visit" }).success).toBe(false); // wedding-only status
    expect(updateCorporateInput.safeParse({ id: 1, eventType: "gala" }).success).toBe(false);
    const r = updateCorporateInput.safeParse({ id: 1, arrivalDate: "2027-03-10", departureDate: "2027-03-09" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("Departure can't be before arrival");
  });

  it("maps values: trims, empty → null, money to 2dp, omits unsent keys", () => {
    expect(toBookingValues({ id: 1, coupleName: "  A & B ", contactPhone: "  ", weddingDate: "", contractValue: "1500", notes: " hi " }))
      .toEqual({ coupleName: "A & B", contactPhone: null, weddingDate: null, contractValue: "1500.00", notes: "hi" });
  });

  it("changedFields ignores formatting-only differences", () => {
    expect(changedFields({ contractValue: "15000.00", weddingDate: "2027-06-12", notes: null }, { contractValue: "15000.00", weddingDate: "2027-06-12", notes: null })).toEqual([]);
    expect(changedFields({ guestCountEstimate: 120, notes: null }, { guestCountEstimate: 130, notes: "" })).toEqual(["guestCountEstimate"]);
  });
});

describe("portal.weddings.update", () => {
  it("writes only changed fields and logs a status change", async () => {
    selectRows = [savedWedding];
    const r = await caller().portal.weddings.update({
      id: 7, coupleName: "Smith & Jones", contactEmail: "sj@example.com", contactPhone: null, weddingDate: "2027-06-19",
      status: "confirmed", guestCountEstimate: 120, guestCountFinal: null, contractValue: "15000", notes: null,
    });
    expect(r.changed.sort()).toEqual(["status", "weddingDate"]);
    expect(updates).toEqual([{ set: { weddingDate: "2027-06-19", status: "confirmed" } }]);
    expect(inserts[0]).toMatchObject({ actionType: "status_change", entityType: "WeddingBooking", entityId: "7", oldValue: "inquiry", newValue: "confirmed" });
  });

  it("no-op save writes nothing", async () => {
    selectRows = [savedWedding];
    const r = await caller().portal.weddings.update({ id: 7, coupleName: "Smith & Jones", guestCountEstimate: 120 });
    expect(r.changed).toEqual([]);
    expect(updates).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });

  it("404s for a missing booking", async () => {
    selectRows = [];
    await expect(caller().portal.weddings.update({ id: 999, notes: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("portal.corporate.update", () => {
  it("checks date order against the saved arrival when only departure is sent", async () => {
    selectRows = [savedCorporate];
    await expect(caller().portal.corporate.update({ id: 3, departureDate: "2027-03-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updates).toHaveLength(0);
  });

  it("saves edits and audits as an update when status is unchanged", async () => {
    selectRows = [savedCorporate];
    const r = await caller().portal.corporate.update({ id: 3, attendeeCount: 24, contractValue: "8000.5", status: "contacted" });
    expect(r.changed.sort()).toEqual(["attendeeCount", "contractValue"]);
    expect(updates[0].set).toEqual({ attendeeCount: 24, contractValue: "8000.50" });
    expect(inserts[0]).toMatchObject({ actionType: "update", entityType: "CorporateBooking", fieldChanged: "attendeeCount,contractValue" });
  });
});
