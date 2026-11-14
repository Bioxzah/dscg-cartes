import { beforeAll, describe, expect, it } from 'vitest';
import { createScheduler, type Scheduler } from './fsrs.ts';
import { replay, State } from './replay.ts';
import { min, rev } from './testkit.ts';

let s: Scheduler;
beforeAll(async () => {
  s = await createScheduler();
});

const t0 = new Date(2026, 10, 15, 8, 0);

describe('FSRS settings', () => {
  it('a new card answered Correct comes back 5 minutes later, then leaves for the following days', () => {
    const one = replay([rev('a', 3, t0)], s).cards.get('a')!;
    expect(one.fsrs.state).toBe(State.Learning);
    expect(one.fsrs.dueAt).toEqual(min(t0, 5));

    const two = replay([rev('a', 3, t0), rev('a', 3, min(t0, 6))], s).cards.get('a')!;
    expect(two.fsrs.state).toBe(State.Review);
    expect(two.fsrs.dueAt.getTime() - t0.getTime()).toBeGreaterThan(86_400_000);
  });

  it('a failed card comes back 5 minutes later', () => {
    const m = replay([rev('a', 1, t0)], s).cards.get('a')!;
    expect(m.fsrs.dueAt).toEqual(min(t0, 5));
    expect(m.failures).toBe(1);
  });

  it('a forgotten review card goes to relearning for 5 minutes', () => {
    const later = new Date(2026, 11, 20, 8, 0);
    const m = replay([rev('a', 4, t0), rev('a', 1, later)], s).cards.get('a')!;
    expect(m.fsrs.state).toBe(State.Relearning);
    expect(m.fsrs.dueAt).toEqual(min(later, 5));
  });

  it('Facile sends a new card straight to the following days', () => {
    const m = replay([rev('a', 4, t0)], s).cards.get('a')!;
    expect(m.fsrs.state).toBe(State.Review);
  });
});

describe('replay', () => {
  const journal = [
    rev('a', 3, t0), rev('b', 1, min(t0, 1)), rev('a', 3, min(t0, 7)), rev('b', 3, min(t0, 8)),
    rev('a', 4, '2026-11-25T09:00:00Z'), rev('b', 1, '2026-11-26T09:00:00Z'), rev('c', 4, '2026-11-26T09:00:01Z'),
    rev('b', 3, '2026-11-26T09:06:00Z'), rev('a', 3, '2027-01-10T09:00:00Z'),
  ];
  const snapshot = (r: ReturnType<typeof replay>) =>
    [...r.cards].sort(([x], [y]) => (x < y ? -1 : 1)).map(([id, m]) => [id, m.fsrs.dueAt.toISOString(), m.fsrs.stability, m.fsrs.difficulty, m.reviewCount, m.failures]);

  it('is deterministic whatever the input order and the scheduler instance', async () => {
    const other = await createScheduler();
    const expected = snapshot(replay(journal, s));
    expect(snapshot(replay([...journal].reverse(), s))).toEqual(expected);
    expect(snapshot(replay([...journal].sort(() => 0.5 - Math.random()), other))).toEqual(expected);
  });

  it('ignores cancelled reviews', () => {
    const withUndo = [...journal, rev('a', 1, '2027-01-10T09:00:30Z', { annulee: true })];
    expect(snapshot(replay(withUndo, s))).toEqual(snapshot(replay(journal, s)));
  });

  it('merging two device journals equals replaying the union', () => {
    const phone = journal.filter((_, i) => i % 2 === 0);
    const mac = journal.filter((_, i) => i % 2 === 1);
    const merged = new Map([...phone, ...mac, ...phone].map((r) => [r.id, r]));
    expect(snapshot(replay([...merged.values()], s))).toEqual(snapshot(replay(journal, s)));
  });

  it('records the state each review started from', () => {
    const { log } = replay([rev('a', 3, t0), rev('a', 3, min(t0, 6))], s);
    expect(log.map((l) => l.before)).toEqual([State.New, State.Learning]);
  });
});

describe('incremental replay', () => {
  it('gives the same result as a full replay and reuses unchanged cards', () => {
    const base = [rev('a', 3, '2026-11-15T08:00:00Z'), rev('b', 4, '2026-11-15T08:01:00Z')];
    const first = replay(base, s);
    const added = rev('b', 3, '2026-11-25T08:00:00Z');
    const second = replay([...base, added], s, first.cache);
    expect(second.cards.get('a')).toBe(first.cards.get('a'));
    expect(second.cards.get('b')).toEqual(replay([...base, added], s).cards.get('b'));
    expect(second.log.map((l) => l.review.id)).toEqual([...base, added].map((r) => r.id));
  });

  it('recomputes a card when one of its reviews is cancelled', () => {
    const a1 = rev('a', 4, '2026-11-15T08:00:00Z');
    const a2 = rev('a', 1, '2026-11-25T08:00:00Z');
    const first = replay([a1, a2], s);
    const undone = replay([a1, { ...a2, annulee: true }], s, first.cache);
    expect(undone.cards.get('a')).toEqual(replay([a1], s).cards.get('a'));
  });
});
