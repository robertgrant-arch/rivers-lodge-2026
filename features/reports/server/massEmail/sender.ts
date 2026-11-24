/**
 * Resend delivery for bulk email: batches of up to 100 via POST /emails/batch,
 * paced under Resend's rate limit, retrying 429 / 5xx / network errors with
 * backoff (honouring Retry-After). If Resend rejects a whole batch (e.g. one
 * malformed address), the batch is re-sent one email at a time so only the
 * bad addresses fail.
 */
import { resendApiBase } from "./config";
import { resendEmailId } from "@core/server/resend";

export type OutMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
};

/** ok only when Resend returned an email ID for this message. */
export type SendResult = { to: string; ok: true; id: string } | { to: string; ok: false; error: string };

export const NO_ID_ERROR = "Resend accepted the request but returned no email ID, so delivery can't be confirmed";

export const BATCH_SIZE = 100;
/** Resend's default limit is 2 requests/second; stay under it. */
export const MIN_INTERVAL_MS = 600;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function payload(m: OutMessage) {
  return {
    from: m.from,
    to: [m.to],
    subject: m.subject,
    html: m.html,
    text: m.text,
    ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    ...(m.headers ? { headers: m.headers } : {}),
  };
}

type Attempt = { ok: true; json: any } | { ok: false; retryable: boolean; status: number; error: string; retryAfterMs?: number };

async function post(path: string, body: unknown, apiKey: string): Promise<Attempt> {
  try {
    const res = await fetch(`${resendApiBase()}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const textBody = await res.text();
    if (res.ok) {
      try { return { ok: true, json: JSON.parse(textBody) }; } catch { return { ok: true, json: {} }; }
    }
    const ra = Number(res.headers.get("retry-after"));
    return {
      ok: false,
      retryable: res.status === 429 || res.status >= 500,
      status: res.status,
      error: `Resend ${res.status}: ${textBody.slice(0, 300)}`,
      retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined,
    };
  } catch (err) {
    return { ok: false, retryable: true, status: 0, error: `Network error: ${(err as Error).message}` };
  }
}

async function postWithRetry(path: string, body: unknown, apiKey: string, wait: (ms: number) => Promise<void>): Promise<Attempt> {
  let last: Attempt = { ok: false, retryable: true, status: 0, error: "not attempted" };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    last = await post(path, body, apiKey);
    if (last.ok || !last.retryable || attempt === MAX_ATTEMPTS) return last;
    await wait(last.retryAfterMs ?? 1000 * 2 ** (attempt - 1)); // 1s, 2s, 4s
  }
  return last;
}

/** Send one email (used for "Send test to me"). */
export async function sendOne(m: OutMessage, apiKey: string, wait = sleep): Promise<SendResult> {
  const r = await postWithRetry("/emails", payload(m), apiKey, wait);
  if (!r.ok) return { to: m.to, ok: false, error: r.error };
  const id = resendEmailId(r.json);
  return id ? { to: m.to, ok: true, id } : { to: m.to, ok: false, error: NO_ID_ERROR };
}

/** Send up to BATCH_SIZE emails in one request; falls back to one-by-one if the batch is rejected. */
export async function sendBatch(messages: OutMessage[], apiKey: string, wait = sleep): Promise<SendResult[]> {
  if (messages.length === 0) return [];
  if (messages.length > BATCH_SIZE) throw new Error(`Batch too large (${messages.length} > ${BATCH_SIZE})`);
  const r = await postWithRetry("/emails/batch", messages.map(payload), apiKey, wait);
  if (r.ok) {
    const ids: unknown[] = Array.isArray(r.json?.data) ? r.json.data : [];
    return messages.map((m, i): SendResult => {
      const id = resendEmailId(ids[i]);
      return id ? { to: m.to, ok: true, id } : { to: m.to, ok: false, error: NO_ID_ERROR };
    });
  }
  if (r.retryable) return messages.map((m) => ({ to: m.to, ok: false as const, error: r.error }));
  // Whole batch rejected (validation): isolate the bad ones.
  const out: SendResult[] = [];
  for (const m of messages) {
    out.push(await sendOne(m, apiKey, wait));
    await wait(MIN_INTERVAL_MS);
  }
  return out;
}
