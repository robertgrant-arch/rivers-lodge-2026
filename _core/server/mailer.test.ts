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
