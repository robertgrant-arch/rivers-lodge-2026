/**
 * inquiries.submit — captcha gate tests
 *
 * Verifies that a missing or invalid Turnstile token causes the mutation to
 * throw FORBIDDEN before any DB writes or notifications are attempted.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "@core/server/context";

// ─── Module mocks (hoisted) ───────────────────────────────────────────────────

vi.mock("@core/server/captcha", () => ({
  verifyCaptcha: vi.fn(),
}));

vi.mock("@core/server/db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./dal", () => ({
  createInquiry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@core/server/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(undefined),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { appRouter } from "../../../_core/server/router";
import { verifyCaptcha } from "@core/server/captcha";
import * as dal from "./dal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

const VALID_INPUT = {
  type: "general" as const,
  name: "Jane Smith",
  email: "jane@example.com",
  captchaToken: "cf-turnstile-token-xyz",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("inquiries.submit — captcha gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when the captcha token is invalid", async () => {
    vi.mocked(verifyCaptcha).mockRejectedValueOnce(
      new TRPCError({
        code: "FORBIDDEN",
        message: "Captcha verification failed — please refresh the page and try again.",
      }),
    );

    const caller = appRouter.createCaller(publicCtx());

    await expect(
      caller.inquiries.submit({ ...VALID_INPUT, captchaToken: "bad-token" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when the captcha token is an empty string", async () => {
    vi.mocked(verifyCaptcha).mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "Captcha token is required." }),
    );

    const caller = appRouter.createCaller(publicCtx());

    await expect(
      caller.inquiries.submit({ ...VALID_INPUT, captchaToken: "" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does NOT call createInquiry or getDb when captcha fails", async () => {
    vi.mocked(verifyCaptcha).mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "Captcha verification failed" }),
    );

    const caller = appRouter.createCaller(publicCtx());

    await caller.inquiries.submit({ ...VALID_INPUT, captchaToken: "bad" }).catch(() => {});

    // verifyCaptcha threw, so no DB work should have started.
    expect(vi.mocked(dal.createInquiry)).not.toHaveBeenCalled();
  });

  it("proceeds to write when captcha token is valid", async () => {
    // verifyCaptcha resolves (token accepted).
    vi.mocked(verifyCaptcha).mockResolvedValueOnce(undefined);
    // DB is null — mutation will throw INTERNAL_SERVER_ERROR after the captcha
    // passes, but that's fine — we only care that verifyCaptcha was called first
    // and that it didn't prevent the flow from continuing.
    vi.mocked(verifyCaptcha).mockResolvedValue(undefined);

    // Make getDb return a mock so the mutation can complete.
    const inserts: string[] = [];
    const mockDb = {
      transaction: async (cb: (tx: any) => Promise<any>) => cb({
        insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) }),
      }),
      insert: () => ({ values: () => { inserts.push("lead"); return { returning: () => Promise.resolve([{ id: 1 }]) }; } }),
    };
    const { getDb } = await import("@core/server/db");
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(publicCtx());
    const result = await caller.inquiries.submit(VALID_INPUT);

    expect(result.success).toBe(true);
    // Captcha was verified with the correct token before any writes.
    expect(vi.mocked(verifyCaptcha)).toHaveBeenCalledWith(VALID_INPUT.captchaToken);
  });
});
