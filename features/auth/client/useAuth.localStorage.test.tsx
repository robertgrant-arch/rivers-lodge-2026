// @vitest-environment jsdom
/**
 * Verifies that localStorage.setItem is driven by useEffect (not useMemo),
 * so it fires only when the user value changes — not on every render or
 * on React Strict Mode's extra mount/unmount cycle.
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── tRPC mock ────────────────────────────────────────────────────────────────
// We control what meQuery.data returns via this mutable cell so individual
// tests can change it without re-importing the module.
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
        setData: vi.fn(),
        invalidate: vi.fn(),
      },
      logout: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue(undefined),
          isPending: false,
          error: null,
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

vi.mock("@shared/constants", () => ({
  getLoginUrl: () => "/portal",
}));

// ─── Import hook AFTER mocks are registered ───────────────────────────────────
import { useAuth } from "./useAuth";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StrictWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.StrictMode>{children}</React.StrictMode>
);

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("useAuth — localStorage side-effect", () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryData.current = undefined;
    localStorage.clear();
    setItemSpy = vi.spyOn(Storage.prototype, "setItem");
  });

  afterEach(() => {
    setItemSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("calls setItem exactly once when the hook mounts with a user, even in Strict Mode", () => {
    const user = { id: 1, name: "Alice", role: "member" as const };
    queryData.current = user;

    // React Strict Mode mounts → unmounts → re-mounts in dev.
    // With useMemo the side effect would fire on every call to the factory
    // (potentially 2–3×). With useEffect + ref guard it fires exactly once
    // because the value hasn't changed between the two mount passes.
    renderHook(() => useAuth(), { wrapper: StrictWrapper });

    const calls = setItemSpy.mock.calls.filter(
      ([key]) => key === "manus-runtime-user-info"
    );
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0][1])).toEqual(user);
  });

  it("calls setItem again when user changes, but not on unrelated re-renders", async () => {
    const userA = { id: 1, name: "Alice", role: "member" as const };
    queryData.current = userA;

    const { rerender } = renderHook(() => useAuth(), {
      wrapper: StrictWrapper,
    });

    // Initial mount — one setItem for userA.
    const afterMount = setItemSpy.mock.calls.filter(
      ([k]) => k === "manus-runtime-user-info"
    );
    expect(afterMount).toHaveLength(1);

    // Re-render with the same data — setItem must NOT fire again.
    await act(async () => {
      rerender();
    });

    const afterSameRerender = setItemSpy.mock.calls.filter(
      ([k]) => k === "manus-runtime-user-info"
    );
    expect(afterSameRerender).toHaveLength(1); // still 1

    // Change to a different user — setItem fires once more.
    const userB = { id: 2, name: "Bob", role: "admin" as const };
    await act(async () => {
      queryData.current = userB;
      rerender();
    });

    const afterChange = setItemSpy.mock.calls.filter(
      ([k]) => k === "manus-runtime-user-info"
    );
    expect(afterChange).toHaveLength(2);
    expect(JSON.parse(afterChange[1][1])).toEqual(userB);
  });

  it("writes null to localStorage when user becomes null", async () => {
    const user = { id: 1, name: "Alice", role: "member" as const };
    queryData.current = user;

    const { rerender } = renderHook(() => useAuth(), {
      wrapper: StrictWrapper,
    });

    await act(async () => {
      queryData.current = undefined; // logout
      rerender();
    });

    const calls = setItemSpy.mock.calls.filter(
      ([k]) => k === "manus-runtime-user-info"
    );
    // First call: user, second call: null
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[1][1])).toBeNull();
  });
});
