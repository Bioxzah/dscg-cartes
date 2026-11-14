import { beforeAll, describe, expect, it } from 'vitest';
import { formatDuration, formatInterval } from './format.ts';
import { createScheduler, type Scheduler } from './fsrs.ts';
import { replay } from './replay.ts';
import { countMastery, nextDue, streak } from './stats.ts';
import { min, rev } from './testkit.ts';

let s: Scheduler;
beforeAll(async () => {
  s = await createScheduler();
});

describe('streak', () => {
  const log = (dates: Date[]) => replay(dates.map((d, i) => rev(`c${i}`, 4, d)), s).log;
  it('counts consecutive study days up to today', () => {
    const l = log([new Date(2026, 10, 13, 9), new Date(2026, 10, 14, 9), new Date(2026, 10, 15, 2)]);
    // the 2 h review belongs to the 14th
    expect(streak(l, new Date(2026, 10, 15, 10), 4)).toBe(2);
  });
  it('keeps yesterday’s streak while today is still empty, and breaks after a missed day', () => {
    const l = log([new Date(2026, 10, 13, 9), new Date(2026, 10, 14, 9)]);
    expect(streak(l, new Date(2026, 10, 15, 10), 4)).toBe(2);
    expect(streak(l, new Date(2026, 10, 16, 10), 4)).toBe(0);
  });
});

describe('mastery and next due', () => {
  it('counts new, learning and mastered cards', () => {
    const t0 = new Date(2026, 10, 1, 9);
    const memory = replay([rev('a', 1, t0), rev('b', 4, t0), rev('b', 4, '2027-01-15T09:00:00Z'), rev('b', 4, '2027-06-15T09:00:00Z')], s).cards;
    expect(countMastery(['a', 'b', 'c'], memory)).toEqual({ new: 1, learning: 1, mastered: 1 });
    expect(nextDue(['a', 'b', 'c'], memory)).toEqual(min(t0, 5));
    expect(nextDue(['c'], memory)).toBeNull();
  });
});

describe('format', () => {
  const t = new Date(2026, 10, 15, 8);
  it('labels intervals', () => {
    expect(formatInterval(t, min(t, 5))).toBe('5 min');
    expect(formatInterval(t, min(t, 14 * 60))).toBe('14 h');
    expect(formatInterval(t, min(t, 3 * 1440))).toBe('3 j');
    expect(formatInterval(t, min(t, 70 * 1440))).toBe('2 mois');
    expect(formatInterval(t, min(t, 548 * 1440))).toBe('1,5 an');
    expect(formatInterval(t, min(t, 800 * 1440))).toBe('2,2 ans');
  });
  it('labels durations', () => {
    expect(formatDuration(12 * 60_000)).toBe('12 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05');
  });
});
