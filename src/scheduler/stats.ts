import { parseLocalDate, studyDayKey } from './day.ts';
import { MASTERED_STABILITY_DAYS } from './fsrs.ts';
import { State, type CardMemory, type ReplayedReview } from './replay.ts';

export interface WeekDay {
  key: string;
  active: boolean;
  today: boolean;
  future: boolean;
}

export interface WeekProgress {
  /** Monday to Sunday of the current week. */
  days: WeekDay[];
  activeDays: number;
  goal: number;
  /** Consecutive weeks with the goal reached, counting the current week once it is reached. */
  weeksInARow: number;
}

function mondayOf(key: string): Date {
  const d = parseLocalDate(key);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12);
}

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Weekly goal instead of a daily streak: any day can be the rest day, missing one never resets
 * anything. A study day counts as soon as one answer was given.
 */
export function weekProgress(log: readonly ReplayedReview[], now: Date, dayStartHour: number, goal: number): WeekProgress {
  const active = new Set(log.map(({ review }) => studyDayKey(new Date(review.reviewed_at), dayStartHour)));
  const todayKey = studyDayKey(now, dayStartHour);
  const monday = mondayOf(todayKey);
  const weekKeys = (start: Date) =>
    Array.from({ length: 7 }, (_, i) => keyOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12)));

  const keys = weekKeys(monday);
  const days = keys.map((key) => ({ key, active: active.has(key), today: key === todayKey, future: key > todayKey }));
  const activeDays = days.filter((d) => d.active).length;

  let weeksInARow = activeDays >= goal ? 1 : 0;
  for (let w = 1; w < 520; w++) {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * w, 12);
    if (weekKeys(start).filter((k) => active.has(k)).length < goal) break;
    weeksInARow += 1;
  }
  return { days, activeDays, goal, weeksInARow };
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
