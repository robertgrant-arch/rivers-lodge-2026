// Combined waivers router — merges the legacy sign/list procedures with any
// future waiver procedures added in later batches.
import { router } from "../../_core/server/trpc";
import { legacyWaiversRouter } from "./legacyRouter";

export const waiversRouter = router({
  ...legacyWaiversRouter._def.procedures,
});
