/**
 * Password rules shared by every screen that sets a password and by the
 * server, so what the form checks is exactly what the server enforces.
 * Pure — safe in the browser and on the server.
 */
export const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 12, label: "At least 12 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
] as const;

export const PASSWORD_MAX_LENGTH = 128;

/** Labels of the rules a password breaks (empty = acceptable). */
export function passwordProblems(p: string): string[] {
  const out: string[] = PASSWORD_RULES.filter((r) => !r.test(p)).map((r) => r.label);
  if (p.length > PASSWORD_MAX_LENGTH) out.push(`At most ${PASSWORD_MAX_LENGTH} characters`);
  return out;
}

// No look-alike characters (0/O, 1/l/I) so a temporary password is easy to read out.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const SYMBOL = "!@#$%&*?-+=";

/** A random temporary password that meets every rule (16 characters). */
export function generateTemporaryPassword(length = 16): string {
  const all = UPPER + LOWER + DIGIT + SYMBOL;
  const rand = (n: number) => {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  const pick = (set: string) => set[rand(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) { const j = rand(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}
