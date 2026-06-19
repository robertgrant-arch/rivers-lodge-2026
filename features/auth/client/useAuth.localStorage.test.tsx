// @vitest-environment jsdom
/**
 * Basic unit tests for the Clerk-based useAuth hook.
 *
 * NOTE: The previous version of this file tested localStorage persistence of
 * Manus user data. That behaviour was removed when authentication was migrated
 * to Clerk. These tests verify the replacement hook's core contract.
 */

import React from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ─── Clerk mock ───────────────────────────────────────────────────────────────
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockRedirectToSignIn = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({
    signOut: mockSignOut,
    redirectToSignIn: mockRedirectToSignIn,
  }),
}));

// ─── tRPC mock ────────────────────────────────────────────────────────────────
const queryData = { current: undefined as unknown };

vi.mock("@shared/lib/trpc", () => ({
  trpc: {
    auth: {
      me: {
        useQuery: () => ({
          data: queryData.current,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
    },
    useUtils: () => ({
      auth: {
        me: { setData: vi.fn(), invalidate: vi.fn() },
      },
    }),
  },
}));

import { useAuth } from "./useAuth";

describe("useAuth (Clerk)", () => {
  it("returns isAuthenticated=false when there is no DB user", () => {
    queryData.current = undefined;
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("returns isAuthenticated=true with user data when DB user exists", () => {
    const user = { id: 1, name: "Alice", role: "member" as const };
    queryData.current = user;
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
  });

  it("calls Clerk signOut on logout()", async () => {
    queryData.current = { id: 1, name: "Alice", role: "member" as const };
    const { result } = renderHook(() => useAuth());
    await result.current.logout();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
