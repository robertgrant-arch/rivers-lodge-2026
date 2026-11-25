import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendInviteEmail } from "./mailer";

const reply = (status: number, body: string) => new Response(body, { status, headers: { "content-type": "application/json" } });

describe("transactional mailer (Resend)", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_unit_test_key_9z9z";
    process.env.MAIL_FROM = "Rivers Lodge <info@riverslodgehunt.com>";
    delete process.env.RESEND_API_BASE;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("reports sent only when Resend returns an email ID, and logs the ID with the key ending only", async () => {
    const f = vi.fn(async () => reply(200, JSON.stringify({ id: "em_123" })));
    vi.stubGlobal("fetch", f);
    expect(await sendInviteEmail("new@x.com", "https://riverslodgehunt.com/accept?t=1", "admin@x.com")).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init.body)).from).toBe("Rivers Lodge <info@riverslodgehunt.com>");
    const logged = (console.log as any).mock.calls.flat().join(" ");
    expect(logged).toContain("resend_id=em_123");
    expect(logged).toContain("key=…9z9z");
    expect(logged).not.toContain("re_unit_test_key");
  });

  it("returns false for a 2xx without an ID", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, "{}")));
    expect(await sendInviteEmail("new@x.com", "https://x/accept", "admin@x.com")).toBe(false);
  });

  it("returns false and logs Resend's error for a rejected send", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(403, JSON.stringify({ message: "domain is not verified" }))));
    expect(await sendInviteEmail("new@x.com", "https://x/accept", "admin@x.com")).toBe(false);
    expect((console.error as any).mock.calls.flat().join(" ")).toContain("domain is not verified");
  });
});

import { sendAccountCreatedEmail, sendTemporaryPasswordResetEmail } from "./mailer";

describe("temporary-password emails", () => {
  const saved = { ...process.env };
  const PW = "Kx7&mP<q2!Tz9wRe"; // includes HTML-special characters
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_unit_test_key_9z9z";
    process.env.MAIL_FROM = "Rivers Lodge <info@riverslodgehunt.com>";
    delete process.env.RESEND_API_BASE;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { process.env = { ...saved }; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  const allLogs = () => [...(console.log as any).mock.calls, ...(console.error as any).mock.calls].flat().map(String).join(" ");

  it("account-ready email includes the sign-in link, email and temporary password, and drops the old lines", async () => {
    const f = vi.fn(async () => reply(200, JSON.stringify({ id: "em_1" })));
    vi.stubGlobal("fetch", f);
    const r = await sendAccountCreatedEmail("new@x.com", "https://riverslodgehunt.com/sign-in", "admin@x.com", PW);
    expect(r).toEqual({ ok: true, id: "em_1" });
    const body = JSON.parse(String((f.mock.calls[0] as any)[1].body));
    expect(body.subject).toBe("Your Rivers Lodge & Hunt Club account is ready");
    expect(body.text).toBe([
      "admin@x.com has created a Rivers Lodge & Hunt Club account for you.",
      "",
      "Sign in here: https://riverslodgehunt.com/sign-in",
      "Email: new@x.com",
      `Temporary password: ${PW}`,
      "",
      "You'll be asked to choose your own password the first time you sign in.",
    ].join("\n"));
    expect(body.html).toContain("Kx7&amp;mP&lt;q2!Tz9wRe"); // escaped in HTML
    expect(body.html + body.text).not.toMatch(/never sent by email|gives you/);
    expect(allLogs()).not.toContain(PW);
  });

  it("reset email has the new subject and body", async () => {
    const f = vi.fn(async () => reply(200, JSON.stringify({ id: "em_2" })));
    vi.stubGlobal("fetch", f);
    const r = await sendTemporaryPasswordResetEmail("m@x.com", "https://riverslodgehunt.com/sign-in", "admin@x.com", PW);
    expect(r.ok).toBe(true);
    const body = JSON.parse(String((f.mock.calls[0] as any)[1].body));
    expect(body.subject).toBe("Your Rivers Lodge & Hunt Club temporary password");
    expect(body.text).toContain("admin@x.com has reset your Rivers Lodge & Hunt Club password.");
    expect(body.text).toContain(`Temporary password: ${PW}`);
    expect(body.text).toContain("You'll be asked to choose a new password when you sign in.");
    expect(allLogs()).not.toContain(PW);
  });

  it("returns Resend's real error and never logs the password", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(403, JSON.stringify({ message: "The riverslodgehunt.com domain is not verified." }))));
    const r = await sendTemporaryPasswordResetEmail("m@x.com", "https://x/sign-in", "admin@x.com", PW);
    expect(r).toEqual({ ok: false, error: "Resend 403: The riverslodgehunt.com domain is not verified." });
    expect(allLogs()).not.toContain(PW);
  });

  it("reports a clear error when no email provider is configured", async () => {
    delete process.env.RESEND_API_KEY; delete process.env.SMTP_HOST;
    const r = await sendAccountCreatedEmail("new@x.com", "https://x/sign-in", "admin@x.com", PW);
    expect(r.ok).toBe(false);
    expect((r as any).error).toMatch(/RESEND_API_KEY/);
    expect(allLogs()).not.toContain(PW);
  });
});
