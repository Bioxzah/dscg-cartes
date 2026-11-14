import { describe, expect, it } from 'vitest';
import { answer, MIN_GAP, recap, remaining, requeueTime, startSession, type Session } from './session.ts';
import { min } from './testkit.ts';

const t0 = new Date(2026, 10, 15, 8);
const plan = (queue: string[]) => ({ queue, pending: [], counts: { learning: 0, due: 0, new: queue.length } });
const ans = (s: Session, grade: 1 | 3 | 4, now: Date, requeueMin: number | null = null) =>
  answer(s, { cardId: s.current!, grade, durationMs: 1000 }, requeueMin === null ? null : min(now, requeueMin).getTime(), now);

describe('session', () => {
  it('a failed card waits for its 5 minutes when other cards are left', () => {
    let s = startSession(plan(['a', 'b', 'c', 'd', 'e', 'f']), t0);
    s = ans(s, 1, t0, 5); // a failed
    const order = [];
    for (let i = 1; i <= 5; i++) {
      order.push(s.current);
      s = ans(s, 3, min(t0, i));
    }
    expect(order).toEqual(['b', 'c', 'd', 'e', 'f']);
    expect(s.current).toBe('a');
  });

  it('a failed card comes back once due, ahead of the queue, but after at least 3 other cards', () => {
    let s = startSession(plan(['a', 'b', 'c', 'd', 'e', 'f', 'g']), t0);
    s = ans(s, 1, t0, 0); // a due right away (as if 5 minutes were over)
    expect(s.current).toBe('b');
    s = ans(s, 3, min(t0, 6));
    expect(s.current).toBe('c');
    s = ans(s, 3, min(t0, 7));
    expect(s.current).toBe('d');
    s = ans(s, 3, min(t0, 8));
    expect(s.current).toBe('a');
    expect(MIN_GAP).toBe(3);
  });

  it('shows waiting cards early when nothing else is left, the oldest first', () => {
    let s = startSession(plan(['a', 'b']), t0);
    s = ans(s, 1, t0, 5);
    s = ans(s, 1, min(t0, 1), 5);
    expect(s.current).toBe('a');
    s = ans(s, 3, min(t0, 2));
    expect(s.current).toBe('b');
    s = ans(s, 3, min(t0, 3));
    expect(s.current).toBeNull();
    expect(remaining(s)).toBe(0);
  });

  it('undo is the previous session object', () => {
    const s0 = startSession(plan(['a', 'b']), t0);
    const s1 = ans(s0, 1, t0, 5);
    expect(s1.current).toBe('b');
    expect(s0.current).toBe('a');
    expect(remaining(s0)).toBe(2);
  });

  it('rejects an answer for a card not on screen', () => {
    const s = startSession(plan(['a', 'b']), t0);
    expect(() => answer(s, { cardId: 'b', grade: 3, durationMs: 0 }, null, t0)).toThrow();
  });

  it('summarises the session', () => {
    let s = startSession(plan(['a', 'b']), t0);
    s = ans(s, 1, t0, 5);
    s = ans(s, 3, t0);
    s = ans(s, 3, t0);
    expect(recap(s)).toEqual({ cards: 2, answers: 3, successRate: 2 / 3, timeMs: 3000 });
  });

  it('keeps a card in the session only while in a short step that ends today', () => {
    const end = new Date(2026, 10, 16, 4);
    expect(requeueTime(1, min(t0, 5), end)).toBe(min(t0, 5).getTime());
    expect(requeueTime(3, min(t0, 5), end)).toBe(min(t0, 5).getTime());
    expect(requeueTime(2, min(t0, 5), end)).toBeNull();
    expect(requeueTime(1, new Date(2026, 10, 16, 5), end)).toBeNull();
  });
});
