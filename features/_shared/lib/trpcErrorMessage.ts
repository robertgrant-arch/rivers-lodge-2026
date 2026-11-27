/**
 * Readable message from a tRPC client error. Zod input errors arrive as a JSON
 * array in `message` (no custom errorFormatter on the server), so turn those
 * into "Field: problem" lines.
 */
export function trpcErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const msg = (err as { message?: unknown })?.message;
  if (typeof msg !== "string" || !msg.trim()) return fallback;
  try {
    const issues = JSON.parse(msg);
    if (Array.isArray(issues) && issues.length) {
      return issues.map((i: { message?: string }) => i?.message).filter(Boolean).join(" · ") || fallback;
    }
  } catch { /* plain message */ }
  return msg;
}
