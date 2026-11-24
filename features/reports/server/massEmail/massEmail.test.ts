import { afterEach, describe, expect, it, vi } from "vitest";
import { absolutizeUrls, htmlToPlainText, MAILING_ADDRESS, renderEmail, sanitizeBodyHtml } from "./content";
import { emailFromAddress, fromHeader, publicSiteUrl } from "./config";
import { makeUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "./unsubscribe";
import { sendBatch, type OutMessage } from "./sender";

const env = { DATABASE_URL: "postgresql://u:p@db/x" } as NodeJS.ProcessEnv;

describe("content", () => {
  it("keeps simple formatting and strips anything dangerous", () => {
    const out = sanitizeBodyHtml(`<h2>Hi</h2><p onclick="x()"><strong>Bold</strong> <a href="javascript:alert(1)">bad</a> <a href="https://x.com">ok</a></p><script>alert(1)</script><style>p{}</style><iframe src="https://e.com"></iframe><img src="https://x.com/a.jpg" onerror="x()">`);
    expect(out).toContain("<h2>Hi</h2>");
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain('<a href="https://x.com">ok</a>');
    expect(out).toContain('<img src="https://x.com/a.jpg" />');
    for (const bad of ["script", "onclick", "onerror", "javascript:", "<style", "iframe"]) expect(out).not.toContain(bad);
  });

  it("makes site-relative image and link URLs absolute", () => {
    expect(absolutizeUrls('<img src="/manus-storage/email/a.jpg"><a href="/membership">x</a><a href="https://y.com">y</a>', "https://riverslodgehunt.com/"))
      .toBe('<img src="https://riverslodgehunt.com/manus-storage/email/a.jpg"><a href="https://riverslodgehunt.com/membership">x</a><a href="https://y.com">y</a>');
  });

  it("generates a readable plain-text version", () => {
    const t = htmlToPlainText('<h2>Opening Day</h2><p>Season opens <strong>Nov 1</strong>. <a href="https://riverslodgehunt.com/hunt">Book now</a></p>');
    expect(t).toContain("Opening Day");
    expect(t).toContain("Season opens Nov 1.");
    expect(t).toContain("Book now [https://riverslodgehunt.com/hunt]");
  });

  it("every email has the unsubscribe link and mailing address in both versions", () => {
    const { html, text } = renderEmail({ bodyHtml: "<p>Hello</p>", siteUrl: "https://riverslodgehunt.com", unsubscribeUrl: "https://riverslodgehunt.com/api/email/unsubscribe?t=abc" });
    expect(html).toContain('href="https://riverslodgehunt.com/api/email/unsubscribe?t=abc"');
    expect(html).toContain("18103 E 2300 Ln, La Cygne, KS 66040");
    expect(text).toContain("Unsubscribe: https://riverslodgehunt.com/api/email/unsubscribe?t=abc");
    expect(text).toContain(MAILING_ADDRESS);
  });
});

describe("config", () => {
  it("From uses the employee's name and the central address", () => {
    expect(fromHeader("Jane Smith", { EMAIL_FROM: "Rivers Lodge <info@riverslodgehunt.com>" } as any)).toBe("Jane Smith at Rivers Lodge <info@riverslodgehunt.com>");
    expect(fromHeader('Bad "Name" <x>', { EMAIL_FROM: "info@riverslodgehunt.com" } as any)).toBe("Bad Name x at Rivers Lodge <info@riverslodgehunt.com>");
    expect(emailFromAddress({ MAIL_FROM: "Old <old@riverslodgehunt.com>" } as any)).toBe("old@riverslodgehunt.com");
    expect(emailFromAddress({} as any)).toBe("info@riverslodgehunt.com");
  });
  it("links never point at localhost in production", () => {
    expect(publicSiteUrl({ NODE_ENV: "production", APP_BASE_URL: "http://localhost:5173" } as any)).toBe("https://riverslodgehunt.com");
    expect(publicSiteUrl({ APP_BASE_URL: "https://riverslodgehunt.com/" } as any)).toBe("https://riverslodgehunt.com");
    expect(publicSiteUrl({} as any)).toBe("https://riverslodgehunt.com");
  });
});

describe("unsubscribe tokens", () => {
  it("round-trips, normalised to lower case", () => {
    expect(verifyUnsubscribeToken(makeUnsubscribeToken("Jane@Example.com", env), env)).toBe("jane@example.com");
    expect(unsubscribeUrl("jane@example.com", env)).toMatch(/^https:\/\/riverslodgehunt\.com\/api\/email\/unsubscribe\?t=/);
  });
  it("rejects tampered tokens, swapped emails and other secrets", () => {
    const t = makeUnsubscribeToken("jane@example.com", env);
    const [, sig] = t.split(".");
    expect(verifyUnsubscribeToken(`${Buffer.from("bob@example.com").toString("base64url")}.${sig}`, env)).toBeNull();
    expect(verifyUnsubscribeToken(t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"), env)).toBeNull();
    expect(verifyUnsubscribeToken(t, { DATABASE_URL: "postgresql://other" } as any)).toBeNull();
    expect(verifyUnsubscribeToken("garbage", env)).toBeNull();
  });
});

describe("sender", () => {
  const msg = (to: string): OutMessage => ({ to, subject: "S", html: "<p>x</p>", text: "x", from: "A at Rivers Lodge <info@riverslodgehunt.com>" });
  const noWait = async () => {};
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  it("maps batch ids to recipients", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, { data: [{ id: "m1" }, { id: "m2" }] })));
    expect(await sendBatch([msg("a@x.com"), msg("b@x.com")], "k", noWait)).toEqual([{ to: "a@x.com", ok: true, id: "m1" }, { to: "b@x.com", ok: true, id: "m2" }]);
  });

  it("retries a rate-limited batch, then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(429, { message: "slow down" }, { "retry-after": "1" })).mockResolvedValueOnce(reply(200, { data: [{ id: "m1" }] }));
    vi.stubGlobal("fetch", f);
    expect((await sendBatch([msg("a@x.com")], "k", noWait))[0]).toEqual({ to: "a@x.com", ok: true, id: "m1" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("gives up after repeated server errors and reports each recipient as failed", async () => {
    const f = vi.fn(async () => reply(503, { message: "down" }));
    vi.stubGlobal("fetch", f);
    const out = await sendBatch([msg("a@x.com"), msg("b@x.com")], "k", noWait);
    expect(out.every((r) => !r.ok)).toBe(true);
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("isolates a bad address when Resend rejects the whole batch", async () => {
    const f = vi.fn(async (url: string, init: any) => {
      if (url.endsWith("/emails/batch")) return reply(422, { message: "invalid to" });
      const to = JSON.parse(init.body).to[0];
      return to === "bad@" ? reply(422, { message: "invalid to" }) : reply(200, { id: `id-${to}` });
    });
    vi.stubGlobal("fetch", f);
    const out = await sendBatch([msg("a@x.com"), msg("bad@"), msg("c@x.com")], "k", noWait);
    expect(out.map((r) => r.ok)).toEqual([true, false, true]);
  });
});

// ── Resend webhook signature (Svix) ─────────────────────────────────────────
import { createHmac as _hmac } from "node:crypto";
import { verifySvixSignature } from "./routes";
import { staffInfo } from "./access";

describe("verifySvixSignature", () => {
  const key = Buffer.from("test-secret-key-0123456789");
  const secret = `whsec_${key.toString("base64")}`;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "abc" } });
  const sign = (id: string, ts: string, b: string) => `v1,${_hmac("sha256", key).update(`${id}.${ts}.${b}`).digest("base64")}`;
  const now = 1_700_000_000;

  it("accepts a correctly signed, fresh event", () => {
    expect(verifySvixSignature(secret, { id: "msg_1", timestamp: String(now), signature: sign("msg_1", String(now), body) }, body, now)).toBe(true);
  });
  it("accepts when one of several signatures matches", () => {
    const sig = `v1,AAAA ${sign("msg_1", String(now), body)}`;
    expect(verifySvixSignature(secret, { id: "msg_1", timestamp: String(now), signature: sig }, body, now)).toBe(true);
  });
  it("rejects a tampered body, wrong secret, missing headers and stale timestamps", () => {
    const sig = sign("msg_1", String(now), body);
    expect(verifySvixSignature(secret, { id: "msg_1", timestamp: String(now), signature: sig }, body + " ", now)).toBe(false);
    expect(verifySvixSignature("whsec_" + Buffer.from("other").toString("base64"), { id: "msg_1", timestamp: String(now), signature: sig }, body, now)).toBe(false);
    expect(verifySvixSignature(secret, { id: "msg_1", timestamp: String(now) }, body, now)).toBe(false);
    expect(verifySvixSignature(secret, { id: "msg_1", timestamp: String(now), signature: sig }, body, now + 600)).toBe(false);
  });
});

// ── Who may use mass email ──────────────────────────────────────────────────
describe("staffInfo (server permission rule)", () => {
  const dbWith = (emp: { firstName?: string; lastName?: string; active: boolean } | null) => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (emp ? [emp] : []) }) }) }),
  });
  it("allows admins, with or without an employees record", async () => {
    expect(await staffInfo(dbWith(null), { id: "u1", role: "admin", email: "boss@x.com" })).toMatchObject({ isAdmin: true, name: "Boss", email: "boss@x.com" });
  });
  it("allows employee-role users with an ACTIVE employees record, using their name", async () => {
    expect(await staffInfo(dbWith({ firstName: "Jane", lastName: "Doe", active: true }), { id: "u2", role: "employee", email: "jane@x.com" }))
      .toMatchObject({ isAdmin: false, name: "Jane Doe" });
  });
  it("refuses members (employee role but no employees record), inactive staff, and anonymous users", async () => {
    expect(await staffInfo(dbWith(null), { id: "u3", role: "employee", email: "member@x.com" })).toBeNull();
    expect(await staffInfo(dbWith({ firstName: "Old", active: false }), { id: "u4", role: "employee" })).toBeNull();
    expect(await staffInfo(dbWith({ firstName: "Odd", active: true }), { id: "u5", role: "member" })).toBeNull();
    expect(await staffInfo(dbWith(null), null)).toBeNull();
  });
});

// ── Success only with a Resend email ID ─────────────────────────────────────
import { sendOne, NO_ID_ERROR } from "./sender";
import { resendApiBase, resendKeyHint, resendEmailId } from "@core/server/resend";

describe("Resend confirmation", () => {
  const m: OutMessage = { to: "a@x.com", subject: "S", html: "<p>x</p>", text: "x", from: "A at Rivers Lodge <info@riverslodgehunt.com>" };
  const noWait = async () => {};
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, body: string) => new Response(body, { status, headers: { "content-type": "application/json" } });

  it("returns Resend's email ID on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, JSON.stringify({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }))));
    expect(await sendOne(m, "re_test_key_1234", noWait)).toEqual({ to: "a@x.com", ok: true, id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });
  });
  it("treats a 2xx with no ID, or a non-JSON 2xx, as NOT sent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, "{}")));
    expect(await sendOne(m, "k", noWait)).toEqual({ to: "a@x.com", ok: false, error: NO_ID_ERROR });
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, "<html>ok</html>")));
    expect((await sendOne(m, "k", noWait)).ok).toBe(false);
  });
  it("marks batch items without an ID as failed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, JSON.stringify({ data: [{ id: "m1" }] }))));
    const out = await sendBatch([m, { ...m, to: "b@x.com" }], "k", noWait);
    expect(out).toEqual([{ to: "a@x.com", ok: true, id: "m1" }, { to: "b@x.com", ok: false, error: NO_ID_ERROR }]);
  });
  it("surfaces Resend's error response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(403, JSON.stringify({ message: "The riverslodgehunt.com domain is not verified" }))));
    const r = await sendOne(m, "k", noWait);
    expect(r.ok).toBe(false);
    expect((r as any).error).toContain("Resend 403");
    expect((r as any).error).toContain("not verified");
  });
  it("resendEmailId only accepts a non-empty string id", () => {
    expect(resendEmailId({ id: "abc" })).toBe("abc");
    for (const v of [{}, { id: "" }, { id: 5 }, null, undefined, "x"]) expect(resendEmailId(v)).toBeNull();
  });
  it("key hint shows only the last 4 characters", () => {
    expect(resendKeyHint("re_ABCDEFGH_wxyz")).toBe("…wxyz");
    expect(resendKeyHint("")).toBe("");
    expect(resendKeyHint("abc")).toBe("…(short key)");
  });
  it("ignores RESEND_API_BASE in production unless it is localhost", () => {
    expect(resendApiBase({} as any)).toBe("https://api.resend.com");
    expect(resendApiBase({ NODE_ENV: "production", RESEND_API_BASE: "https://evil.example.com" } as any)).toBe("https://api.resend.com");
    expect(resendApiBase({ NODE_ENV: "production", RESEND_API_BASE: "http://localhost:5198" } as any)).toBe("http://localhost:5198");
    expect(resendApiBase({ NODE_ENV: "development", RESEND_API_BASE: "https://staging.example.com/" } as any)).toBe("https://staging.example.com");
  });
});
