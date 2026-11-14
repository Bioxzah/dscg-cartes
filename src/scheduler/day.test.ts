import { describe, expect, it } from 'vitest';
import { daysUntil, previousDayKey, studyDayBounds, studyDayKey } from './day.ts';

describe('study day (starts at 4 h, Europe/Paris)', () => {
  it('puts 3:59 in the previous day and 4:00 in the new one', () => {
    expect(studyDayKey(new Date(2026, 10, 15, 3, 59), 4)).toBe('2026-11-14');
    expect(studyDayKey(new Date(2026, 10, 15, 4, 0), 4)).toBe('2026-11-15');
    expect(studyDayKey(new Date(2026, 10, 15, 23, 30), 4)).toBe('2026-11-15');
  });
  it('gives the bounds of the day', () => {
    const { start, end } = studyDayBounds(new Date(2026, 10, 15, 2, 0), 4);
    expect(start).toEqual(new Date(2026, 10, 14, 4));
    expect(end).toEqual(new Date(2026, 10, 15, 4));
  });
  it('handles a daylight saving change (clocks jump at 2 h on 28 March 2027, inside the study day of the 27th)', () => {
    const { start, end } = studyDayBounds(new Date(2027, 2, 27, 12), 4);
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
    expect(previousDayKey('2027-03-29')).toBe('2027-03-28');
    expect(previousDayKey('2027-01-01')).toBe('2026-12-31');
  });
  it('counts calendar days to the exam', () => {
    expect(daysUntil(new Date(2027, 9, 1), new Date(2027, 8, 30, 23, 59))).toBe(1);
    expect(daysUntil(new Date(2027, 9, 1), new Date(2027, 9, 3))).toBe(-2);
    expect(daysUntil(new Date(2027, 2, 29), new Date(2027, 2, 27))).toBe(2);
  });
});
