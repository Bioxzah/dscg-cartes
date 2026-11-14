import type { Pending, Plan } from './plan.ts';
import type { Grade } from './types.ts';

/** A failed card never comes back before this many other cards, unless nothing else is left (spec §5). */
export const MIN_GAP = 3;

export interface Answer {
  cardId: string;
  grade: Grade;
  durationMs: number;
}

/** Immutable session state. Undo = go back to the previous object. */
export interface Session {
  queue: readonly string[];
  pending: readonly Pending[];
  /** Card on screen, or null when the session is over. */
  current: string | null;
  /** Card ids in the order they were shown. */
  shown: readonly string[];
  answers: readonly Answer[];
}

function gapSince(shown: readonly string[], cardId: string): number {
  const last = shown.lastIndexOf(cardId);
  return last === -1 ? Infinity : shown.length - 1 - last;
}

/** Picks the next card: a pending card whose step is over, else the queue, else the waiting cards anyway. */
function pick(queue: readonly string[], pending: readonly Pending[], shown: readonly string[], nowMs: number) {
  const ready = pending
    .filter((p) => p.dueAt <= nowMs && gapSince(shown, p.cardId) >= MIN_GAP)
    .sort((a, b) => a.dueAt - b.dueAt);
  const first = ready[0];
  if (first) return { current: first.cardId, queue, pending: pending.filter((p) => p !== first) };

  const [head, ...rest] = queue;
  if (head !== undefined) return { current: head, queue: rest, pending };

  if (pending.length === 0) return { current: null, queue, pending };
  // Only waiting cards remain: show them early, the one seen longest ago first.
  const next = [...pending].sort(
    (a, b) => gapSince(shown, b.cardId) - gapSince(shown, a.cardId) || a.dueAt - b.dueAt,
  )[0] as Pending;
  return { current: next.cardId, queue, pending: pending.filter((p) => p !== next) };
}

export function startSession(plan: Plan, now: Date): Session {
  const picked = pick(plan.queue, plan.pending, [], now.getTime());
  return { ...picked, shown: picked.current ? [picked.current] : [], answers: [] };
}

/**
 * Records the answer to the current card. `requeueAt` is the card's next due time when
 * FSRS keeps it in a short step today, or null when it leaves the session.
 */
export function answer(session: Session, a: Answer, requeueAt: number | null, now: Date): Session {
  if (session.current !== a.cardId) throw new Error(`Not the current card: ${a.cardId}`);
  const pending = requeueAt === null ? session.pending : [...session.pending, { cardId: a.cardId, dueAt: requeueAt }];
  const picked = pick(session.queue, pending, session.shown, now.getTime());
  return {
    ...picked,
    shown: picked.current ? [...session.shown, picked.current] : session.shown,
    answers: [...session.answers, a],
  };
}

export function remaining(session: Session): number {
  return session.queue.length + session.pending.length + (session.current ? 1 : 0);
}

export interface Recap {
  cards: number;
  answers: number;
  /** Share of "Correct" or "Facile" answers. */
  successRate: number;
  timeMs: number;
}

export function recap(session: Session): Recap {
  const n = session.answers.length;
  return {
    cards: new Set(session.answers.map((a) => a.cardId)).size,
    answers: n,
    successRate: n === 0 ? 0 : session.answers.filter((a) => a.grade !== 1).length / n,
    timeMs: session.answers.reduce((t, a) => t + a.durationMs, 0),
  };
}

/** When FSRS keeps the card in a short step that ends before the day is over, it stays in the session. */
export function requeueTime(state: number, dueAt: Date, dayEnd: Date): number | null {
  const inStep = state === 1 || state === 3; // Learning, Relearning
  return inStep && dueAt.getTime() < dayEnd.getTime() ? dueAt.getTime() : null;
}
