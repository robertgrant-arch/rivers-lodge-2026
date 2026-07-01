import { trpc } from '@shared/lib/trpc';
import { UNAUTHED_ERR_MSG } from '@shared/constants';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { isChunkLoadError, tryRecoverFromChunkError, handleBfcacheRestore } from '@shared/lib/chunkErrorRecovery';

// Global safety net for stale-chunk errors that escape the React error boundary
// (e.g. unhandledrejection from a lazy import() called outside of Suspense).
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) {
    tryRecoverFromChunkError();
  }
});
window.addEventListener("error", (event) => {
  if (isChunkLoadError(event.error ?? event.message)) {
    tryRecoverFromChunkError();
  }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) handleBfcacheRestore();
});

const queryClient = new QueryClient();

const redirectToSignInIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message === UNAUTHED_ERR_MSG) {
    window.location.href = "/sign-in";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToSignInIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToSignInIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
