import { beforeAll, describe, expect, it } from 'vitest';
import { formatDuration, formatInterval } from './format.ts';
import { createScheduler, type Scheduler } from './fsrs.ts';
import { replay } from './replay.ts';
import { countMastery, nextDue, weekProgress } from './stats.ts';
import { min, rev } from './testkit.ts';

let s: Scheduler;
beforeAll(async () => {
  s = await createScheduler();
});

describe('weekProgress', () => {
  const log = (dates: Date[]) => replay(dates.map((d, i) => rev(`c${i}`, 4, d)), s).log;
  // 15 Nov 2026 is a Sunday; the week runs Monday 9 to Sunday 15.
  const week = (from: number, days: number[]) => days.map((d) => new Date(2026, 10, from + d, 9));

  it('counts study days of the current week, Monday first', () => {
    const p = weekProgress(log(week(9, [0, 1, 3, 4])), new Date(2026, 10, 14, 10), 4, 6);
    expect(p.days.map((d) => d.key)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
    expect(p.days.map((d) => (d.active ? 1 : 0))).toEqual([1, 1, 0, 1, 1, 0, 0]);
    expect(p.days[5]).toMatchObject({ today: true, future: false });
    expect(p.days[6]).toMatchObject({ today: false, future: true });
    expect(p.activeDays).toBe(4);
    expect(p.weeksInARow).toBe(0);
  });

  it('a rest day never breaks anything: weeks with the goal reached are counted in a row', () => {
    const dates = [...week(2, [0, 1, 2, 3, 4, 5]), ...week(9, [0, 2, 3, 4, 5, 6])]; // a different rest day each week
    const p = weekProgress(log(dates), new Date(2026, 10, 16, 10), 4, 6); // Monday of the next week, nothing yet
    expect(p.activeDays).toBe(0);
    expect(p.weeksInARow).toBe(2);
    expect(weekProgress(log(dates), new Date(2026, 10, 15, 10), 4, 6).weeksInARow).toBe(2);
  });

  it('a review at 2 h counts for the previous day', () => {
    const p = weekProgress(log([new Date(2026, 10, 10, 2)]), new Date(2026, 10, 14, 10), 4, 6);
    expect(p.days[0]?.active).toBe(true);
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
