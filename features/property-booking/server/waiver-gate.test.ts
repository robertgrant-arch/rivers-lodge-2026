/**
 * Server-side enforcement in propertyBooking.bookings.create while DocuSign
 * waivers are on: Master waiver gate, required guest list and the exact
 * acceptance text. No database — drizzle and the waiver service are mocked.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "@core/server/context";
import { BOOKING_WAIVER_ACCEPTANCE_TEXT } from "@shared/waiverParty";

vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => mockDb) }));

const memberRow = { id: 5, userId: "u1", active: true };
function chain(rows: unknown[]) {
  const c: Record<string, unknown> = {
    from: () => c, where: () => c, orderBy: () => c, limit: () => c, offset: () => c, for: () => c, leftJoin: () => c,
    then: (resolve: (v: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  return c;
}
const transaction = vi.fn();
const mockDb = { select: vi.fn(() => chain([memberRow])), transaction };

const gate = vi.fn();
const startBookingWaivers = vi.fn();
vi.mock("@features/waivers/server/docusign/runtime", () => ({
  getWaiverService: () => ({
    assertMasterWaiverForBooking: gate,
    currentTemplate: async () => ({ id: 2, version: 3, templateName: "Release", bodyText: "x", waiverKind: "booking" }),
    startBookingWaivers,
    onBookingCancelled: vi.fn(),
  }),
  registerBookingLifecycle: vi.fn(),
  startWaiverScheduler: vi.fn(),
}));

import { appRouter } from "../../../_core/server/router";
import { WaiverGateError } from "@features/waivers/public";

const ctx: TrpcContext = {
  user: { id: "u1", email: "member@example.com", role: "employee", mustChangePassword: false } as any,
  req: { protocol: "https", headers: {}, ip: "203.0.113.9" } as any,
  res: { clearCookie: () => {} } as any,
};

const validInput = () => ({
  propertyId: 7,
  startDate: "2026-12-20",
  endDate: "2026-12-20",
  partySize: 3,
  activity: "fishing",
  idempotencyKey: "4b1c6f1e-3f2a-4d8e-9a77-0c1d2e3f4a5b",
  party: {
    member: { fullName: "Pat Member", email: "member@example.com", phone: "816-555-0100" },
    guests: [
      { type: "adult" as const, fullName: "Sam Guest", email: "sam@example.com", phone: "(913) 555-0101" },
      { type: "minor" as const, fullName: "Kid Guest", dateOfBirth: "2016-05-05", guardian: 0 },
    ],
  },
  waiverAcceptance: { accepted: true as const, text: BOOKING_WAIVER_ACCEPTANCE_TEXT },
});

describe("bookings.create — DocuSign waiver enforcement", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
    vi.stubEnv("WAIVERS_DOCUSIGN_ENABLED", "true");
    vi.clearAllMocks();
    transaction.mockRejectedValue(new Error("stop: reached the transaction"));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects when the member has no valid Master waiver (server-side, not just UI)", async () => {
    gate.mockRejectedValue(new WaiverGateError("Sign your master waiver to book.", "MASTER_WAIVER_REQUIRED"));
    await expect(appRouter.createCaller(ctx).propertyBooking.bookings.create(validInput() as any))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringMatching(/master waiver/i) });
    expect(gate).toHaveBeenCalledWith(5);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("passes the gate once the Master waiver is on file (reaches the booking transaction)", async () => {
    gate.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(ctx).propertyBooking.bookings.create(validInput() as any)).rejects.toThrow(/reached the transaction/);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("requires the guest list", async () => {
    const { party: _p, ...input } = validInput();
    await expect(appRouter.createCaller(ctx).propertyBooking.bookings.create(input as any)).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/who's coming/i) });
  });

  it("requires the exact acceptance text", async () => {
    const input = { ...validInput(), waiverAcceptance: { accepted: true as const, text: "I agree" } };
    await expect(appRouter.createCaller(ctx).propertyBooking.bookings.create(input as any)).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/Release & Liability Waiver/) });
  });

  it("rejects a minor without a guardian in the party", async () => {
    const input = validInput();
    (input.party.guests[1] as any).guardian = 1; // points at the minor itself, not an adult
    await expect(appRouter.createCaller(ctx).propertyBooking.bookings.create(input as any)).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/guardian/i) });
  });

  it("rejects duplicate emails", async () => {
    const input = validInput();
    (input.party.guests[0] as any).email = "MEMBER@example.com";
    await expect(appRouter.createCaller(ctx).propertyBooking.bookings.create(input as any)).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/already used/i) });
  });
});
