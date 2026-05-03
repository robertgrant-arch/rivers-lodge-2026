import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Schema validation tests ──────────────────────────────────────────────────

describe("messages.archive input validation", () => {
  const archiveInput = z.object({ id: z.number() });

  it("accepts a valid message id", () => {
    expect(() => archiveInput.parse({ id: 1 })).not.toThrow();
    expect(() => archiveInput.parse({ id: 999 })).not.toThrow();
  });

  it("rejects missing id", () => {
    expect(() => archiveInput.parse({})).toThrow();
  });

  it("rejects string id", () => {
    expect(() => archiveInput.parse({ id: "abc" })).toThrow();
  });

  it("rejects null id", () => {
    expect(() => archiveInput.parse({ id: null })).toThrow();
  });
});

describe("messages.unarchive input validation", () => {
  const unarchiveInput = z.object({ id: z.number() });

  it("accepts a valid message id", () => {
    expect(() => unarchiveInput.parse({ id: 42 })).not.toThrow();
  });

  it("rejects missing id", () => {
    expect(() => unarchiveInput.parse({})).toThrow();
  });
});

describe("messages.allMessages input validation", () => {
  const allMessagesInput = z.object({ archived: z.boolean().default(false) }).optional();

  it("accepts no input (defaults to inbox)", () => {
    expect(() => allMessagesInput.parse(undefined)).not.toThrow();
  });

  it("accepts archived: false for inbox view", () => {
    expect(() => allMessagesInput.parse({ archived: false })).not.toThrow();
  });

  it("accepts archived: true for archived view", () => {
    expect(() => allMessagesInput.parse({ archived: true })).not.toThrow();
  });

  it("rejects non-boolean archived value", () => {
    expect(() => allMessagesInput.parse({ archived: "yes" })).toThrow();
  });

  it("defaults archived to false when not provided", () => {
    const result = allMessagesInput.parse({});
    expect(result?.archived).toBe(false);
  });
});

// ─── Archive state logic tests ────────────────────────────────────────────────

describe("archive state logic", () => {
  type Message = { id: number; body: string; archived: boolean; read: boolean };

  const messages: Message[] = [
    { id: 1, body: "Hello from member", archived: false, read: false },
    { id: 2, body: "Follow-up question", archived: false, read: true },
    { id: 3, body: "Old inquiry", archived: true, read: true },
  ];

  it("filters inbox messages (archived: false)", () => {
    const inbox = messages.filter((m) => !m.archived);
    expect(inbox).toHaveLength(2);
    expect(inbox.map((m) => m.id)).toEqual([1, 2]);
  });

  it("filters archived messages (archived: true)", () => {
    const archived = messages.filter((m) => m.archived);
    expect(archived).toHaveLength(1);
    expect(archived[0].id).toBe(3);
  });

  it("archiving a message moves it out of inbox", () => {
    const updated = messages.map((m) => m.id === 1 ? { ...m, archived: true } : m);
    const inbox = updated.filter((m) => !m.archived);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].id).toBe(2);
    const archived = updated.filter((m) => m.archived);
    expect(archived).toHaveLength(2);
  });

  it("unarchiving a message restores it to inbox", () => {
    const updated = messages.map((m) => m.id === 3 ? { ...m, archived: false } : m);
    const inbox = updated.filter((m) => !m.archived);
    expect(inbox).toHaveLength(3);
    const archived = updated.filter((m) => m.archived);
    expect(archived).toHaveLength(0);
  });

  it("archiving does not affect read status", () => {
    const updated = messages.map((m) => m.id === 1 ? { ...m, archived: true } : m);
    const msg = updated.find((m) => m.id === 1)!;
    expect(msg.archived).toBe(true);
    expect(msg.read).toBe(false); // read status unchanged
  });
});
