import { beforeAll, describe, expect, it } from 'vitest';
import { activityGrid, averageAnswerMs, loadForecast, project, successRate, weakCards, weakCardsText } from './dashboard.ts';
import { createScheduler, type Scheduler } from './fsrs.ts';
import { replay } from './replay.ts';
import { min, pc, rev } from './testkit.ts';
import { DEFAULT_SETTINGS, type Review } from './types.ts';

let s: Scheduler;
beforeAll(async () => {
  s = await createScheduler();
});

const t0 = new Date(2026, 10, 15, 9);

describe('loadForecast', () => {
  it('counts due cards per study day, overdue ones today, new cards never', () => {
    const journal = [
      rev('a', 4, new Date(2026, 6, 1, 9)), // Easy in July: overdue by mid-November
      rev('b', 1, min(t0, -1)), // learning, due in minutes
      rev('c', 3, t0), rev('c', 3, min(t0, 6)), // graduated: due in a few days
    ];
    const memory = replay(journal, s).cards;
    const load = loadForecast(['a', 'b', 'c', 'd'], memory, t0, 4, 14);
    expect(load).toHaveLength(14);
    expect(load[0]?.cards).toBe(2);
    expect(load.reduce((n, d) => n + d.cards, 0)).toBe(3);
    expect(load[1]?.key).toBe('2026-11-16');
  });
});

describe('successRate and averageAnswerMs', () => {
  it('only counts reviews of cards already learned, over 30 days', () => {
    const journal: Review[] = [
      rev('a', 4, new Date(2026, 10, 1, 9)),
      rev('a', 1, new Date(2026, 11, 20, 9)), // review state: fail
      rev('a', 3, new Date(2026, 11, 20, 9, 6)), // relearning: not counted
      rev('b', 4, new Date(2026, 10, 1, 9)),
      rev('b', 3, new Date(2026, 11, 21, 9)), // review state: success
      rev('c', 1, new Date(2026, 11, 21, 9)), // new: not counted
    ];
    const { log } = replay(journal, s);
    expect(successRate(log, new Date(2026, 11, 22))).toEqual({ rate: 0.5, count: 2 });
    expect(successRate(log, new Date(2027, 3, 1))).toEqual({ rate: null, count: 0 });
    expect(averageAnswerMs(log, new Date(2026, 11, 22))).toBe(10_000);
  });
});

describe('activityGrid', () => {
  it('lays out 12 weeks, Monday first, with today in the last column', () => {
    const { log } = replay([rev('a', 3, t0), rev('b', 3, t0), rev('c', 3, new Date(2026, 10, 10, 9))], s);
    const grid = activityGrid(log, t0, 4); // 15 Nov 2026 is a Sunday
    expect(grid).toHaveLength(12);
    expect(grid.every((w) => w.length === 7 && w[0]!.date.getDay() === 1)).toBe(true);
    const last = grid[11]!;
    expect(last[6]).toMatchObject({ key: '2026-11-15', answers: 2, level: 4, future: false });
    expect(last[1]).toMatchObject({ key: '2026-11-10', answers: 1, level: 2 });
  });
});

describe('weakCards', () => {
  it('keeps cards failed twice or at their last review, most failures first', () => {
    const memory = replay([
      rev('a', 1, '2026-11-01T09:00:00Z'), rev('a', 3, '2026-11-01T09:06:00Z'), rev('a', 1, '2026-11-05T09:00:00Z'), rev('a', 3, '2026-11-05T09:06:00Z'),
      rev('b', 3, '2026-11-01T09:00:00Z'), rev('b', 1, '2026-11-02T09:00:00Z'),
      rev('c', 1, '2026-11-01T09:00:00Z'), rev('c', 3, '2026-11-01T09:06:00Z'),
      rev('d', 4, '2026-11-01T09:00:00Z'),
    ], s).cards;
    expect(weakCards(['a', 'b', 'c', 'd'], memory)).toEqual([
      { id: 'a', failures: 2, lastFailed: false },
      { id: 'b', failures: 1, lastFailed: true },
    ]);
  });

  it('writes a text ready to paste, grouped by theme', () => {
    const text = weakCardsText(
      [
        { chapter: 'Droit des contrats', theme: 'Formation', question: 'Q1 ?', failures: 3, id: 'x1' },
        { chapter: 'Droit des contrats', theme: 'Formation', question: 'Q2 ?', failures: 1, id: 'x2' },
      ],
      t0,
    );
    expect(text).toContain('## Droit des contrats · Formation');
    expect(text).toContain('- Q1 ? (3 échecs, x1)');
    expect(text).toContain('- Q2 ? (1 échec, x2)');
    expect(weakCardsText([], t0)).toBe('Aucune carte faible pour le moment.');
  });
});

describe('project', () => {
  const cards = Array.from({ length: 200 }, (_, i) => pc(`k${String(i).padStart(3, '0')}`, 'd1', i < 100 ? 't1' : 't2'));
  const settings = { ...DEFAULT_SETTINGS, examDate: '2027-10-01' };

  it('without history, uses the daily setting and sees every card well before the exam', () => {
    const p = project({ cards, memory: new Map(), log: [], settings, scheduler: s, now: t0 });
    expect(p.paceFromHistory).toBe(false);
    expect(p.pace).toBe(15);
    expect(p.seenAtExam).toBe(200);
    expect(p.masteredAtExam).toBeGreaterThan(180);
    expect(p.introDeadline).toEqual(new Date(2027, 7, 2));
    expect(p.neededPace).toBeCloseTo(200 / (260 * 6 / 7), 2);
    expect(p.settingIsEnough).toBe(true);
  });

  it('with a slow observed pace, does not see every card', () => {
    const journal = [0, 2, 4, 6].flatMap((d) => [rev(cards[d]!.id, 3, new Date(2026, 10, 9 + d, 9)), rev(cards[d]!.id, 3, new Date(2026, 10, 9 + d, 9, 6))]);
    const { cards: memory, log } = replay(journal, s);
    const p = project({ cards, memory, log, settings: { ...settings, examDate: '2027-01-10' }, scheduler: s, now: t0 });
    expect(p.paceFromHistory).toBe(true);
    expect(p.pace).toBeCloseTo(4 / 12, 5); // 4 cards over 14 days at 6 study days a week
    expect(p.seenAtExam).toBeLessThan(40);
    expect(p.neededPace).toBeNull(); // deadline (exam - 60 days) already past
  });

  it('rests one day a week: fewer cards seen than at 7 days a week, same pace per study day', () => {
    const short = { ...settings, examDate: '2026-12-15', newPerDay: 2 };
    const six = project({ cards, memory: new Map(), log: [], settings: short, scheduler: s, now: t0 });
    const seven = project({ cards, memory: new Map(), log: [], settings: { ...short, daysPerWeek: 7 }, scheduler: s, now: t0 });
    expect(seven.seenAtExam).toBe(60);
    expect(six.seenAtExam).toBeLessThan(seven.seenAtExam);
    expect(six.seenAtExam).toBeGreaterThanOrEqual(50);
  });

  it('says when the daily setting is not enough', () => {
    const p = project({ cards, memory: new Map(), log: [], settings: { ...settings, examDate: '2027-02-15', newPerDay: 1 }, scheduler: s, now: t0 });
    expect(p.settingIsEnough).toBe(false);
    expect(p.neededPace).toBeGreaterThan(1);
  });

  it('skips paused themes for new cards and is deterministic', () => {
    const paused = { ...settings, pausedThemes: ['d1/t2'] };
    const a = project({ cards, memory: new Map(), log: [], settings: paused, scheduler: s, now: t0 });
    const b = project({ cards, memory: new Map(), log: [], settings: paused, scheduler: s, now: t0 });
    expect(a.unseenActive).toBe(100);
    expect(a.seenAtExam).toBe(100);
    expect(a).toEqual(b);
  });

  it('runs fast enough on a full program (3000 cards)', () => {
    const big = Array.from({ length: 3000 }, (_, i) => pc(`b${i}`));
    const start = performance.now();
    project({ cards: big, memory: new Map(), log: [], settings, scheduler: s, now: t0 });
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
