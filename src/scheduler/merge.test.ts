import { describe, expect, it } from 'vitest';
import { mergeReviews, pickSettings } from './merge.ts';
import { rev } from './testkit.ts';
import { DEFAULT_SETTINGS } from './types.ts';

describe('mergeReviews', () => {
  const a = rev('c1', 3, '2026-11-15T08:00:00Z');
  const b = rev('c2', 1, '2026-11-15T08:01:00Z');
  const c = rev('c1', 4, '2026-11-20T08:00:00Z');

  it('adds unknown reviews and skips known ones', () => {
    expect(mergeReviews([a, b], [b, c])).toEqual({ toAdd: [c], toCancel: [] });
  });

  it('is idempotent: merging the same file twice adds nothing the second time', () => {
    const first = mergeReviews([a], [b, c]);
    expect(mergeReviews([a, ...first.toAdd], [b, c])).toEqual({ toAdd: [], toCancel: [] });
  });

  it('carries a cancellation over, and never undoes one', () => {
    expect(mergeReviews([a, b], [{ ...b, annulee: true }]).toCancel).toEqual([b.id]);
    expect(mergeReviews([{ ...b, annulee: true }], [b])).toEqual({ toAdd: [], toCancel: [] });
  });

  it('ignores duplicates inside the incoming file', () => {
    expect(mergeReviews([], [c, c]).toAdd).toEqual([c]);
  });
});

describe('pickSettings', () => {
  const older = { data: { ...DEFAULT_SETTINGS, newPerDay: 10 }, updated_at: '2026-11-01T00:00:00Z' };
  const newer = { data: { ...DEFAULT_SETTINGS, newPerDay: 25 }, updated_at: '2026-11-10T00:00:00Z' };
  it('keeps the most recent', () => {
    expect(pickSettings(older, newer)).toBe(newer);
    expect(pickSettings(newer, older)).toBe(newer);
    expect(pickSettings(null, older)).toBe(older);
    expect(pickSettings(older, null)).toBe(older);
  });
});
