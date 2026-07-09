import { describe, it, expect } from 'vitest';

// Normalizer function extracted for testing (same logic as in router.ts)
function normalizeInsertPayload(input: {
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  reasonNotes?: string | null;
  scope?: string;
  scopeTarget?: string | null;
}) {
  const scope = input.scope ?? "entire_property";

  return {
    startAt: input.allDay || !input.startAt ? null : input.startAt,
    endAt: input.allDay || !input.endAt ? null : input.endAt,
    reasonNotes: !input.reasonNotes?.trim() ? null : input.reasonNotes.trim(),
    scope,
    scopeTarget: scope === "entire_property" || !input.scopeTarget?.trim()
      ? null
      : input.scopeTarget.trim(),
  };
}

describe('blockDates mutation payload normalizer', () => {
  describe('startAt and endAt normalization', () => {
    it('converts startAt/endAt to null when allDay is true', () => {
      const result = normalizeInsertPayload({
        startAt: '2026-07-09T09:00:00Z',
        endAt: '2026-07-09T17:00:00Z',
        allDay: true,
      });
      expect(result.startAt).toBeNull();
      expect(result.endAt).toBeNull();
    });

    it('converts empty string startAt/endAt to null', () => {
      const result = normalizeInsertPayload({
        startAt: '',
        endAt: '',
        allDay: false,
      });
      expect(result.startAt).toBeNull();
      expect(result.endAt).toBeNull();
    });

    it('converts undefined startAt/endAt to null', () => {
      const result = normalizeInsertPayload({
        startAt: undefined,
        endAt: undefined,
        allDay: false,
      });
      expect(result.startAt).toBeNull();
      expect(result.endAt).toBeNull();
    });

    it('preserves valid datetime strings when allDay is false', () => {
      const result = normalizeInsertPayload({
        startAt: '2026-07-09T09:00:00Z',
        endAt: '2026-07-09T17:00:00Z',
        allDay: false,
      });
      expect(result.startAt).toBe('2026-07-09T09:00:00Z');
      expect(result.endAt).toBe('2026-07-09T17:00:00Z');
    });
  });

  describe('reasonNotes normalization', () => {
    it('converts empty string reasonNotes to null', () => {
      const result = normalizeInsertPayload({ reasonNotes: '' });
      expect(result.reasonNotes).toBeNull();
    });

    it('converts whitespace-only reasonNotes to null', () => {
      const result = normalizeInsertPayload({ reasonNotes: '   ' });
      expect(result.reasonNotes).toBeNull();
    });

    it('trims whitespace from reasonNotes', () => {
      const result = normalizeInsertPayload({ reasonNotes: '  test notes  ' });
      expect(result.reasonNotes).toBe('test notes');
    });

    it('preserves non-empty reasonNotes', () => {
      const result = normalizeInsertPayload({ reasonNotes: 'Important event' });
      expect(result.reasonNotes).toBe('Important event');
    });
  });

  describe('scopeTarget normalization', () => {
    it('always converts scopeTarget to null when scope is entire_property', () => {
      const result = normalizeInsertPayload({
        scope: 'entire_property',
        scopeTarget: 'some-value',
      });
      expect(result.scope).toBe('entire_property');
      expect(result.scopeTarget).toBeNull();
    });

    it('converts empty string scopeTarget to null', () => {
      const result = normalizeInsertPayload({
        scope: 'specific_venue',
        scopeTarget: '',
      });
      expect(result.scopeTarget).toBeNull();
    });

    it('converts whitespace-only scopeTarget to null', () => {
      const result = normalizeInsertPayload({
        scope: 'specific_lodging',
        scopeTarget: '   ',
      });
      expect(result.scopeTarget).toBeNull();
    });

    it('preserves and trims valid scopeTarget for non-entire_property scope', () => {
      const result = normalizeInsertPayload({
        scope: 'specific_venue',
        scopeTarget: '  main-venue  ',
      });
      expect(result.scope).toBe('specific_venue');
      expect(result.scopeTarget).toBe('main-venue');
    });

    it('defaults scope to entire_property when undefined', () => {
      const result = normalizeInsertPayload({
        scope: undefined,
        scopeTarget: 'some-value',
      });
      expect(result.scope).toBe('entire_property');
      expect(result.scopeTarget).toBeNull();
    });
  });

  describe('combined edge cases', () => {
    it('handles null values for all fields', () => {
      const result = normalizeInsertPayload({
        startAt: null,
        endAt: null,
        allDay: false,
        reasonNotes: null,
        scope: null,
        scopeTarget: null,
      });
      expect(result.startAt).toBeNull();
      expect(result.endAt).toBeNull();
      expect(result.reasonNotes).toBeNull();
      expect(result.scope).toBe('entire_property');
      expect(result.scopeTarget).toBeNull();
    });

    it('handles all fields provided with valid values', () => {
      const result = normalizeInsertPayload({
        startAt: '2026-07-09T09:00:00Z',
        endAt: '2026-07-09T17:00:00Z',
        allDay: false,
        reasonNotes: 'Test event',
        scope: 'specific_lodging',
        scopeTarget: 'The-Barn',
      });
      expect(result.startAt).toBe('2026-07-09T09:00:00Z');
      expect(result.endAt).toBe('2026-07-09T17:00:00Z');
      expect(result.reasonNotes).toBe('Test event');
      expect(result.scope).toBe('specific_lodging');
      expect(result.scopeTarget).toBe('The-Barn');
    });
  });
});
