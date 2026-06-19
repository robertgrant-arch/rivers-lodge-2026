import { useClerk } from "@clerk/clerk-react";
import { trpc } from '@shared/lib/trpc';
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  /** Ignored — Clerk controls the post-sign-in destination via its own props. */
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const { signOut, redirectToSignIn } = useClerk();
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    await signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [signOut, utils]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.error, meQuery.isLoading]);

  // Redirect unauthenticated users to Clerk sign-in when the query settles.
  if (
    redirectOnUnauthenticated &&
    !meQuery.isLoading &&
    !state.user &&
    typeof window !== "undefined"
  ) {
    redirectToSignIn({ redirectUrl: window.location.href });
  }

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
