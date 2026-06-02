import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@core/server/router";

export const trpc = createTRPCReact<AppRouter>();
