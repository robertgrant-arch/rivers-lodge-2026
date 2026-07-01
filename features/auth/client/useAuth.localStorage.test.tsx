// @vitest-environment jsdom
import React from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
      logout: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ success: true }),
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

describe("useAuth", () => {
  it("returns isAuthenticated=false when there is no DB user", () => {
    queryData.current = undefined;
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("returns isAuthenticated=true with user data when DB user exists", () => {
    const user = { id: "abc-123", email: "alice@example.com", role: "member" as const };
    queryData.current = user;
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
  });
});
