import { describe, it, expect } from 'vitest';

// Normalizer function extracted for testing
function normalizeScopeTarget(scope: string | undefined, scopeTarget: string | undefined): { scope: string; scopeTarget: string | null } {
  const normalizedScope = scope ?? "entire_property";
  const normalizedScopeTarget = normalizedScope === "entire_property" || !scopeTarget?.trim()
    ? null
    : scopeTarget.trim();

  return {
    scope: normalizedScope,
    scopeTarget: normalizedScopeTarget,
  };
}

describe('blockDates mutation scopeTarget normalization', () => {
  it('converts empty string to null when scope is entire_property', () => {
    const result = normalizeScopeTarget("entire_property", "");
    expect(result.scopeTarget).toBeNull();
  });

  it('converts empty string to null when scope is undefined (defaults to entire_property)', () => {
    const result = normalizeScopeTarget(undefined, "");
    expect(result.scope).toBe("entire_property");
    expect(result.scopeTarget).toBeNull();
  });

  it('always sets scopeTarget to null when scope is entire_property, even if value provided', () => {
    const result = normalizeScopeTarget("entire_property", "venue-123");
    expect(result.scope).toBe("entire_property");
    expect(result.scopeTarget).toBeNull();
  });

  it('preserves scopeTarget when scope is specific_venue and value is provided', () => {
    const result = normalizeScopeTarget("specific_venue", "main-venue");
    expect(result.scope).toBe("specific_venue");
    expect(result.scopeTarget).toBe("main-venue");
  });

  it('trims whitespace from scopeTarget', () => {
    const result = normalizeScopeTarget("specific_lodging", "  lodge-name  ");
    expect(result.scope).toBe("specific_lodging");
    expect(result.scopeTarget).toBe("lodge-name");
  });

  it('converts whitespace-only string to null', () => {
    const result = normalizeScopeTarget("specific_venue", "   ");
    expect(result.scopeTarget).toBeNull();
  });

  it('handles undefined scopeTarget as null', () => {
    const result = normalizeScopeTarget("specific_venue", undefined);
    expect(result.scopeTarget).toBeNull();
  });

  it('does not modify scopeTarget for specific_lodging scope with valid value', () => {
    const result = normalizeScopeTarget("specific_lodging", "The-Barn");
    expect(result.scope).toBe("specific_lodging");
    expect(result.scopeTarget).toBe("The-Barn");
  });
});
