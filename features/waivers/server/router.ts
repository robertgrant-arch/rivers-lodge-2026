// Combined waivers router — merges the legacy sign/list procedures with the
// portal waiver management procedures (templates, sending, signing flow).
import { router } from "../../_core/server/trpc";
import { legacyWaiversRouter } from "./legacyRouter";
import { waiversPortalRouter } from "./portalRouter";

export const waiversRouter = router({
  ...legacyWaiversRouter._def.procedures,
  portal: waiversPortalRouter,
});
