import { describe, expect, it } from 'vitest';
import { daysUntil } from './dates.ts';

describe('daysUntil', () => {
  it('counts calendar days, ignoring the time of day', () => {
    expect(daysUntil(new Date(2027, 9, 1), new Date(2027, 8, 30, 23, 59))).toBe(1);
    expect(daysUntil(new Date(2027, 9, 1), new Date(2027, 9, 1, 8))).toBe(0);
    expect(daysUntil(new Date(2027, 9, 1), new Date(2027, 9, 3))).toBe(-2);
  });
  it('is not shifted by a daylight saving change', () => {
    expect(daysUntil(new Date(2027, 2, 29), new Date(2027, 2, 27))).toBe(2);
  });
});
