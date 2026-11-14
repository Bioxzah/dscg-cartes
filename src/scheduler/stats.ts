import { previousDayKey, studyDayKey } from './day.ts';
import { MASTERED_STABILITY_DAYS } from './fsrs.ts';
import { State, type CardMemory, type ReplayedReview } from './replay.ts';

/** Consecutive study days with at least one answer, ending today (or yesterday if today is still empty). */
export function streak(log: readonly ReplayedReview[], now: Date, dayStartHour: number): number {
  const days = new Set(log.map(({ review }) => studyDayKey(new Date(review.reviewed_at), dayStartHour)));
  let key = studyDayKey(now, dayStartHour);
  if (!days.has(key)) key = previousDayKey(key);
  let n = 0;
  while (days.has(key)) {
    n += 1;
    key = previousDayKey(key);
  }
  return n;
}

export type Mastery = 'new' | 'learning' | 'mastered';

export function mastery(mem: CardMemory | undefined): Mastery {
  if (!mem || mem.fsrs.state === State.New) return 'new';
  return mem.fsrs.stability >= MASTERED_STABILITY_DAYS ? 'mastered' : 'learning';
}

export function countMastery(cardIds: readonly string[], memory: ReadonlyMap<string, CardMemory>) {
  const counts = { new: 0, learning: 0, mastered: 0 };
  for (const id of cardIds) counts[mastery(memory.get(id))] += 1;
  return counts;
}

/** Earliest due date among cards already seen, or null. */
export function nextDue(cardIds: readonly string[], memory: ReadonlyMap<string, CardMemory>): Date | null {
  let best: Date | null = null;
  for (const id of cardIds) {
    const due = memory.get(id)?.fsrs.dueAt;
    if (due && (!best || due < best)) best = due;
  }
  return best;
}
