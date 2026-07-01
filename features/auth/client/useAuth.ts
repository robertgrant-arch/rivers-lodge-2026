import { trpc } from '@shared/lib/trpc';
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
    },
  });

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/sign-in";
  }, [logoutMutation]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.error, meQuery.isLoading]);

  if (
    redirectOnUnauthenticated &&
    !meQuery.isLoading &&
    !state.user &&
    typeof window !== "undefined"
  ) {
    window.location.href = "/sign-in";
  }

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
