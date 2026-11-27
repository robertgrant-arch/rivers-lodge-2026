import { describe, it, expect } from "vitest";
import { trpcErrorMessage } from "./trpcErrorMessage";

describe("trpcErrorMessage", () => {
  it("joins zod issue messages", () => {
    const message = JSON.stringify([{ message: "Couple name is required", path: ["coupleName"] }, { message: "Enter a valid email" }]);
    expect(trpcErrorMessage({ message })).toBe("Couple name is required · Enter a valid email");
  });
  it("passes plain messages through and falls back when empty", () => {
    expect(trpcErrorMessage({ message: "Wedding booking not found" })).toBe("Wedding booking not found");
    expect(trpcErrorMessage(null, "fallback")).toBe("fallback");
  });
});
