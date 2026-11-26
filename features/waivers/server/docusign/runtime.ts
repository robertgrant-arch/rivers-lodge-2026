/**
 * Process-wide waiver service: Drizzle repo + DocuSign HTTP client + mailer +
 * file storage. The property-booking feature registers its BookingLifecycle
 * (status changes + inventory) at module load via registerBookingLifecycle.
 */
import { sendNoticeEmail } from "@core/server/mailer";
import { storagePut } from "@core/server/storage";
import { HttpDocuSignApi, type DocuSignApi } from "./api";
import { connectHmacSecret, getDocuSignConfig, isWaiversDocuSignEnabled } from "./config";
import { DrizzleWaiverRepo } from "./repo";
import { WaiverService } from "./service";
import type { BookingLifecycle } from "./types";

let lifecycle: BookingLifecycle | null = null;

/** Called by features/property-booking when its router module loads. */
export function registerBookingLifecycle(l: BookingLifecycle): void {
  lifecycle = l;
}

const lifecycleProxy: BookingLifecycle = {
  confirmAfterMemberSigned: async (id, at) => {
    if (!lifecycle) throw new Error("Booking lifecycle not registered");
    return lifecycle.confirmAfterMemberSigned(id, at);
  },
  expireForUnsignedWaiver: async (id) => {
    if (!lifecycle) throw new Error("Booking lifecycle not registered");
    return lifecycle.expireForUnsignedWaiver(id);
  },
};

let api: DocuSignApi | null = null;
let apiKey = "";

function currentApi(): DocuSignApi | null {
  const cfg = getDocuSignConfig();
  if (!cfg) return null;
  const key = `${cfg.integrationKey}|${cfg.userId}|${cfg.accountId}|${cfg.basePath}|${cfg.oauthHost}`;
  if (!api || key !== apiKey) {
    api = new HttpDocuSignApi(cfg);
    apiKey = key;
  }
  return api;
}

let service: WaiverService | null = null;

export function getWaiverService(): WaiverService {
  if (!service) {
    service = new WaiverService({
      repo: new DrizzleWaiverRepo(),
      api: currentApi,
      lifecycle: lifecycleProxy,
      enabled: isWaiversDocuSignEnabled,
      connectConfigured: () => !!connectHmacSecret(),
      notifier: {
        email: async (to, subject, paragraphs) => (await sendNoticeEmail(to, subject, paragraphs)).ok,
        opsEmail: () => process.env.WAIVERS_OPS_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || null,
      },
      storage: {
        putPdf: async (key, data) => {
          try {
            return (await storagePut(key, data, "application/pdf")).key;
          } catch (err) {
            console.warn(`[waivers] PDF storage failed: ${(err as Error)?.message ?? err}`);
            return null;
          }
        },
      },
    });
  }
  return service;
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Every minute: retry queued sends, poll (if no Connect), expire holds, reminders. */
export function startWaiverScheduler(intervalMs = 60_000): void {
  if (timer) return;
  const run = () => { getWaiverService().tick().catch((err) => console.error("[waivers] scheduler error:", (err as Error)?.message ?? err)); };
  timer = setInterval(run, intervalMs);
  timer.unref?.();
  setTimeout(run, 10_000).unref?.();
}
