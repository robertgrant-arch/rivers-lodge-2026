// Combined waivers router — merges the legacy sign/list procedures with the
// portal waiver management procedures (templates, sending, signing flow) and
// the DocuSign Master/Booking waiver procedures (waivers.docusign.*).
import { router } from "../../_core/server/trpc";
import { legacyWaiversRouter } from "./legacyRouter";
import { waiversPortalRouter } from "./portalRouter";
import { docusignWaiversRouter } from "./docusign/router";

export const waiversRouter = router({
  ...legacyWaiversRouter._def.procedures,
  portal: waiversPortalRouter,
  docusign: docusignWaiversRouter,
});
