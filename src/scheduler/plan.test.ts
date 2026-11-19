import { beforeAll, describe, expect, it } from 'vitest';
import { createScheduler, type Scheduler } from './fsrs.ts';
import { buildDailyPlan, buildFreePlan, dayUsage, interleave, newCardsUe, shuffle } from './plan.ts';
import { replay } from './replay.ts';
import { min, pc, rev } from './testkit.ts';
import { DEFAULT_SETTINGS, type Review, type Settings } from './types.ts';

let s: Scheduler;
beforeAll(async () => {
  s = await createScheduler();
});

const settings = (o: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...o });
const catalog = [
  ...Array.from({ length: 30 }, (_, i) => pc(`a${String(i).padStart(2, '0')}`, 'd1', 't1')),
  ...Array.from({ length: 30 }, (_, i) => pc(`b${String(i).padStart(2, '0')}`, 'd1', 't2')),
  ...Array.from({ length: 10 }, (_, i) => pc(`c${i}`, 'd2', 't1')),
];

function plan(journal: Review[], now: Date, o: Partial<Settings> = {}) {
  const { cards, log } = replay(journal, s);
  const st = settings(o);
  return buildDailyPlan({ cards: catalog, memory: cards, settings: st, usage: dayUsage(log, now, st.dayStartHour), now, seed: 'x' });
}

describe('buildDailyPlan', () => {
  it('on day one, takes the first new cards in catalog order', () => {
    const p = plan([], new Date(2026, 10, 15, 8));
    expect(p.queue).toEqual(catalog.slice(0, 15).map((c) => c.id));
    expect(p.counts).toEqual({ learning: 0, due: 0, new: 15 });
  });

  it('subtracts new cards already started today, but not those of a free session', () => {
    const now = new Date(2026, 10, 15, 20);
    const journal = [rev('a00', 4, new Date(2026, 10, 15, 9)), rev('b05', 4, new Date(2026, 10, 15, 9), { libre: true })];
    const p = plan(journal, now);
    expect(p.counts.new).toBe(14);
    expect(p.queue).not.toContain('a00');
    expect(p.queue).not.toContain('b05');
  });

  it('resets the quota at 4 h, not at midnight', () => {
    const journal = catalog.slice(0, 15).map((c) => rev(c.id, 4, new Date(2026, 10, 15, 23)));
    expect(plan(journal, new Date(2026, 10, 16, 3, 30)).counts.new).toBe(0);
    expect(plan(journal, new Date(2026, 10, 16, 4, 0)).counts.new).toBe(15);
  });

  it('takes no new cards from a paused theme or chapter', () => {
    const now = new Date(2026, 10, 15, 8);
    expect(plan([], now, { pausedThemes: ['d1/t1'] }).queue[0]).toBe('b00');
    const p = plan([], now, { pausedDecks: ['d1'], newPerDay: 50 });
    expect(p.queue).toEqual(catalog.filter((c) => c.deckId === 'd2').map((c) => c.id));
  });

  it('puts due learning cards first, then reviews mixed with new cards', () => {
    const day1 = new Date(2026, 10, 15, 8);
    const journal = [
      ...catalog.slice(0, 20).map((c) => rev(c.id, 4, day1)), // graduated: reviews later
      rev('b00', 4, day1),
      rev('b00', 1, new Date(2026, 10, 25, 8)), // forgotten earlier today: relearning
    ];
    const now = new Date(2026, 10, 25, 9);
    const p = plan(journal, now, { reviewCap: 1000 });
    expect(p.queue[0]).toBe('b00');
    const dueIds = p.queue.filter((id) => journal.some((r) => r.card_id === id && id !== 'b00'));
    expect(dueIds.length).toBe(p.counts.due);
    expect(p.counts.new).toBe(15);
    // new cards are spread, not all at the end
    const newPositions = p.queue.map((id, i) => (journal.some((r) => r.card_id === id) ? -1 : i)).filter((i) => i >= 0);
    expect(newPositions[0]).toBeLessThan(p.queue.length / 2);
  });

  it('caps reviews and keeps paused themes reviewing', () => {
    const day1 = new Date(2026, 10, 15, 8);
    const journal = catalog.map((c) => rev(c.id, 4, day1));
    const now = new Date(2027, 0, 30, 9);
    const all = plan(journal, now, { reviewCap: 1000, pausedDecks: ['d1'] });
    expect(all.counts.due).toBe(catalog.length);
    expect(plan(journal, now, { reviewCap: 25 }).counts.due).toBe(25);
  });

  it('counts reviews already done today against the cap', () => {
    const journal = catalog.map((c) => rev(c.id, 4, new Date(2026, 10, 15, 8)));
    const done = ['a00', 'a01', 'a02'].map((id) => rev(id, 3, new Date(2027, 0, 30, 8)));
    expect(plan([...journal, ...done], new Date(2027, 0, 30, 9), { reviewCap: 25 }).counts.due).toBe(22);
  });

  it('keeps learning cards due later today as pending', () => {
    const now = new Date(2026, 10, 15, 8);
    const p = plan([rev('a00', 1, min(now, -2))], now);
    expect(p.pending).toEqual([{ cardId: 'a00', dueAt: min(now, 3).getTime() }]);
  });

  it('ignores progress on cards removed from the files', () => {
    const p = plan([rev('gone', 4, new Date(2026, 10, 1))], new Date(2027, 0, 30, 9));
    expect(p.queue).not.toContain('gone');
  });
});

describe('helpers', () => {
  it('shuffle is stable for a seed and keeps every item', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(items, 'day')).toEqual(shuffle(items, 'day'));
    expect(shuffle(items, 'day')).not.toEqual(items);
    expect([...shuffle(items, 'day')].sort((a, b) => a - b)).toEqual(items);
  });
  it('interleave spreads the extra items', () => {
    expect(interleave(['r1', 'r2', 'r3', 'r4'], ['n1', 'n2'])).toEqual(['r1', 'n1', 'r2', 'r3', 'n2', 'r4']);
    expect(interleave([], ['n1'])).toEqual(['n1']);
  });
});

describe('buildFreePlan', () => {
  it('starts with the least retained cards, then new ones, up to the limit', () => {
    const cards = ['x1', 'x2', 'x3', 'x4'].map((id) => pc(id));
    const memory = replay([rev('x2', 4, '2026-11-01'), rev('x4', 1, '2026-11-01')], s).cards;
    const r = (m: { failures: number }) => (m.failures ? 0.2 : 0.9);
    expect(buildFreePlan({ cards, memory, retrievability: r }).queue).toEqual(['x4', 'x2', 'x1', 'x3']);
    expect(buildFreePlan({ cards, memory, retrievability: r, limit: 3 }).counts).toEqual({ learning: 0, due: 2, new: 1 });
  });
});

describe('new cards, one UE per study day', () => {
  const two = [
    ...Array.from({ length: 20 }, (_, i) => pc(`u1-${String(i).padStart(2, '0')}`, 'ue1-ch01', 't1', 'UE1')),
    ...Array.from({ length: 20 }, (_, i) => pc(`u4-${String(i).padStart(2, '0')}`, 'ue4-ch01', 't1', 'UE4')),
  ];
  const day = (d: number, h = 9) => new Date(2026, 10, d, h);

  function today(journal: Review[], now: Date, o: Partial<Settings> = {}) {
    const { cards, log } = replay(journal, s);
    const st = settings(o);
    const ue = newCardsUe(two, cards, log, st, now);
    const p = buildDailyPlan({ cards: two, memory: cards, settings: st, usage: dayUsage(log, now, st.dayStartHour), now, seed: 'x', newUe: ue });
    return { ue, p };
  }

  it('starts with the first UE of the catalog', () => {
    const { ue, p } = today([], day(16));
    expect(ue).toBe('UE1');
    expect(p.queue.every((id) => id.startsWith('u1-'))).toBe(true);
    expect(p.newUe).toBe('UE1');
  });

  it('takes the other UE the next study day, even after a rest day', () => {
    const journal = [rev('u1-00', 4, day(16)), rev('u1-01', 4, day(16))];
    expect(today(journal, day(17)).ue).toBe('UE4');
    expect(today(journal, day(19)).ue).toBe('UE4');
    const next = [...journal, rev('u4-00', 4, day(19))];
    expect(today(next, day(20)).ue).toBe('UE1');
  });

  it('keeps the UE already started today', () => {
    const journal = [rev('u1-00', 4, day(16)), rev('u4-00', 4, day(17, 8))];
    expect(today(journal, day(17, 20)).ue).toBe('UE4');
  });

  it('ignores free sessions when choosing the UE', () => {
    const journal = [rev('u1-00', 4, day(16)), rev('u4-00', 4, day(17), { libre: true })];
    expect(today(journal, day(18)).ue).toBe('UE4');
  });

  it('fills the daily limit with the other UE when today\'s UE runs out', () => {
    const journal = Array.from({ length: 15 }, (_, i) => rev(`u4-${String(i).padStart(2, '0')}`, 4, day(15)));
    const { ue, p } = today(journal, day(16), { newPerDay: 10, pausedDecks: ['ue1-ch01'] });
    expect(ue).toBeNull();
    expect(p.counts.new).toBe(5);
    const mixed = today(journal, day(16), { newPerDay: 10 });
    expect(mixed.ue).toBe('UE1');
    expect(mixed.p.counts.new).toBe(10);
  });

  it('tops up from the other UE when only a few cards of today\'s UE are left', () => {
    const journal = Array.from({ length: 17 }, (_, i) => rev(`u1-${String(i).padStart(2, '0')}`, 4, day(14)));
    journal.push(rev('u4-00', 4, day(15)));
    const { ue, p } = today(journal, day(16));
    expect(ue).toBe('UE1');
    expect(p.queue.filter((id) => id.startsWith('u1-')).length).toBe(3);
    expect(p.counts.new).toBe(15);
  });

  it('returns null when a single UE has new cards left', () => {
    const { ue } = today([], day(16), { pausedDecks: ['ue4-ch01'] });
    expect(ue).toBeNull();
  });
});
