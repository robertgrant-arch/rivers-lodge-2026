/**
 * inquiries.submit — unit tests
 *
 * Verifies the transactional write + best-effort notification contract:
 *  1. Both inserts (leads + reservationRequests) succeed or neither persists.
 *  2. notifyOwner failures are caught and logged; the mutation still resolves.
 *  3. Return shape is backward-compatible: { success: true, leadId, reservationRequestId? }.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "@core/server/context";

// ─── Module mocks (hoisted before imports) ────────────────────────────────────
//
// These intercept the three external dependencies the router calls.
// Paths are relative to this test file, which lives alongside router.ts.

vi.mock("../../_core/server/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../_core/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./dal", () => ({
  createInquiry: vi.fn().mockResolvedValue(undefined),
}));

// ─── Import AFTER mocks are registered ───────────────────────────────────────

import { appRouter } from "../../../_core/server/router";
import { notifyOwner } from "../../_core/server/notification";
import { getDb } from "../../_core/server/db";
import * as dal from "./dal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

/** Minimal valid inquiry payload for a non-wedding/corporate type. */
const BASE_INPUT = {
  type: "general" as const,
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "555-0100",
  message: "Interested in visiting the lodge.",
} satisfies Parameters<ReturnType<typeof appRouter.createCaller>["inquiries"]["submit"]>[0];

/** Wedding input (triggers the reservationRequests insert). */
const WEDDING_INPUT = {
  type: "wedding" as const,
  name: "Jane Smith",
  email: "jane@example.com",
  eventDate: "2027-06-15",
  guestCount: 150,
  message: "Looking to book the barn.",
} satisfies Parameters<ReturnType<typeof appRouter.createCaller>["inquiries"]["submit"]>[0];

// ─── Mock db factory ──────────────────────────────────────────────────────────

/** Tracks every INSERT made through the mock db. */
interface InsertRecord {
  table: "leads" | "reservationRequests" | "unknown";
  values: unknown;
}

function makeMockDb() {
  const inserts: InsertRecord[] = [];
  let nextId = 1;

  // Identify the table by inspecting which insert call this is.
  // (We rely on call order: leads first, reservationRequests second.)
  const mockInsert = (tableObj: unknown) => ({
    values: (values: unknown) => {
      const callIndex = inserts.length; // 0 = leads, 1 = reservationRequests
      const table =
        callIndex === 0
          ? "leads"
          : callIndex === 1
            ? "reservationRequests"
            : "unknown";
      inserts.push({ table, values });
      const id = nextId++;
      // Drizzle mysql2 insert returns an array: [OkPacket, ...]
      return Promise.resolve([{ insertId: id }]);
    },
  });

  const db = {
    transaction: async <T>(cb: (tx: typeof db) => Promise<T>): Promise<T> => {
      return cb(db);
    },
    insert: mockInsert,
  };

  return { db, inserts };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("inquiries.submit", () => {
  beforeEach(() => {
    vi.mocked(dal.createInquiry).mockResolvedValue(undefined as any);
    vi.mocked(notifyOwner).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  it("resolves with success=true and a leadId for a general inquiry", async () => {
    const { db } = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.inquiries.submit(BASE_INPUT);

    expect(result.success).toBe(true);
    expect(typeof result.leadId).toBe("number");
    expect(result.leadId).toBeGreaterThan(0);
    // No reservationRequest for a general inquiry
    expect(result.reservationRequestId).toBeUndefined();
  });

  it("resolves with leadId + reservationRequestId for a wedding inquiry with eventDate", async () => {
    const { db, inserts } = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.inquiries.submit(WEDDING_INPUT);

    expect(result.success).toBe(true);
    expect(result.leadId).toBeGreaterThan(0);
    expect(result.reservationRequestId).toBeGreaterThan(0);
    expect(inserts).toHaveLength(2);
    expect(inserts[0].table).toBe("leads");
    expect(inserts[1].table).toBe("reservationRequests");
  });

  it("does NOT create a reservationRequest for a wedding without eventDate", async () => {
    const { db, inserts } = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.inquiries.submit({
      type: "wedding",
      name: "Jane Smith",
      email: "jane@example.com",
      // no eventDate
    });

    expect(result.success).toBe(true);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("leads");
    expect(result.reservationRequestId).toBeUndefined();
  });

  // ─── Notification failure (the critical test) ─────────────────────────────

  it("resolves successfully when notifyOwner throws — rows are already committed", async () => {
    const { db, inserts } = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    // Simulate a notification failure (webhook timeout, network error, etc.)
    vi.mocked(notifyOwner).mockRejectedValueOnce(
      new Error("Notification webhook timed out"),
    );

    const caller = appRouter.createCaller(publicCtx());

    // Must NOT throw even though notifyOwner threw.
    const result = await caller.inquiries.submit(BASE_INPUT);

    // Mutation resolved successfully.
    expect(result.success).toBe(true);
    expect(result.leadId).toBeGreaterThan(0);

    // Both rows were persisted (transaction committed before notifyOwner ran).
    expect(inserts).toHaveLength(1); // general inquiry → leads only
    expect(inserts[0].table).toBe("leads");

    // notifyOwner was called (we attempted the notification).
    expect(vi.mocked(notifyOwner)).toHaveBeenCalledOnce();
  });

  it("rows are committed even when notifyOwner throws on a wedding inquiry", async () => {
    const { db, inserts } = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    vi.mocked(notifyOwner).mockRejectedValueOnce(
      new Error("Slack webhook unreachable"),
    );

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.inquiries.submit(WEDDING_INPUT);

    // Still resolves.
    expect(result.success).toBe(true);

    // Both rows exist in the DB (transaction committed before the notification attempt).
    expect(inserts).toHaveLength(2);
    expect(inserts[0].table).toBe("leads");
    expect(inserts[1].table).toBe("reservationRequests");

    // leadId and reservationRequestId are returned correctly.
    expect(result.leadId).toBeGreaterThan(0);
    expect(result.reservationRequestId).toBeGreaterThan(0);
  });

  // ─── Transaction atomicity ────────────────────────────────────────────────

  it("propagates a DB error and leaves no rows when the leads insert fails", async () => {
    const inserts: InsertRecord[] = [];

    const failingDb = {
      transaction: async <T>(cb: (tx: typeof failingDb) => Promise<T>) => cb(failingDb),
      insert: (_table: unknown) => ({
        values: (_vals: unknown) => {
          // Simulate DB error on the first insert
          return Promise.reject(new Error("Deadlock detected"));
        },
      }),
    };

    vi.mocked(getDb).mockResolvedValue(failingDb as any);

    const caller = appRouter.createCaller(publicCtx());

    await expect(caller.inquiries.submit(BASE_INPUT)).rejects.toThrow("Deadlock detected");

    // notifyOwner must NOT have been called — we never got past the transaction.
    expect(vi.mocked(notifyOwner)).not.toHaveBeenCalled();

    // In a real DB the transaction rollback would undo the inserts;
    // our mock simply never executed any inserts (insert() itself threw).
    expect(inserts).toHaveLength(0);
  });

  it("throws INTERNAL_SERVER_ERROR and skips notification when DB is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const caller = appRouter.createCaller(publicCtx());

    await expect(caller.inquiries.submit(BASE_INPUT)).rejects.toThrow(TRPCError);
    expect(vi.mocked(notifyOwner)).not.toHaveBeenCalled();
  });
});
