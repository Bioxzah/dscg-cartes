// Dashboard figures (spec §6.4). Pure: memory, journal and time are passed in.
import { parseLocalDate, studyDayBounds, studyDayKey } from './day.ts';
import { MASTERED_STABILITY_DAYS, SCHEDULER_OPTIONS, type FsrsCard, type Scheduler } from './fsrs.ts';
import { isPaused } from './plan.ts';
import { applyGrade, newFsrsCard, State, type CardMemory, type ReplayedReview } from './replay.ts';
import type { Grade, PlannerCard, Settings } from './types.ts';

const DAY_MS = 86_400_000;

// ---------- Load forecast ----------

export interface LoadDay {
  key: string;
  date: Date;
  cards: number;
}

/** Cards due on each of the next `days` study days. Overdue cards count today. */
export function loadForecast(
  cardIds: readonly string[],
  memory: ReadonlyMap<string, CardMemory>,
  now: Date,
  dayStartHour: number,
  days = 14,
): LoadDay[] {
  const { start } = studyDayBounds(now, dayStartHour);
  const bounds = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, dayStartHour);
    return { date: d, end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, dayStartHour).getTime() };
  });
  const out = bounds.map((b) => ({ key: studyDayKey(b.date, dayStartHour), date: b.date, cards: 0 }));
  for (const id of cardIds) {
    const mem = memory.get(id);
    if (!mem || mem.fsrs.state === State.New) continue;
    const due = mem.fsrs.dueAt.getTime();
    const i = bounds.findIndex((b) => due < b.end);
    if (i >= 0) (out[i] as LoadDay).cards += 1;
  }
  return out;
}

/** Average time per answer over the last 30 days, in ms (null without data). */
export function averageAnswerMs(log: readonly ReplayedReview[], now: Date): number | null {
  const from = now.getTime() - 30 * DAY_MS;
  const recent = log.filter((l) => Date.parse(l.review.reviewed_at) >= from);
  if (recent.length === 0) return null;
  return recent.reduce((t, l) => t + l.review.duration_ms, 0) / recent.length;
}

// ---------- Success rate ----------

/** Share of "Correct"/"Facile" over the last 30 days, on cards already learned (spec §6.4). */
export function successRate(log: readonly ReplayedReview[], now: Date, days = 30): { rate: number | null; count: number } {
  const from = now.getTime() - days * DAY_MS;
  const learned = log.filter((l) => l.before === State.Review && Date.parse(l.review.reviewed_at) >= from);
  if (learned.length === 0) return { rate: null, count: 0 };
  return { rate: learned.filter((l) => l.review.rating !== 1).length / learned.length, count: learned.length };
}

// ---------- Activity ----------

export interface ActivityDay {
  key: string;
  date: Date;
  answers: number;
  /** 0 = nothing, 1–4 = quartiles of the busiest day. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** The last `weeks` weeks, Monday first, as columns of 7 days. The current week is the last column. */
export function activityGrid(log: readonly ReplayedReview[], now: Date, dayStartHour: number, weeks = 12): ActivityDay[][] {
  const counts = new Map<string, number>();
  for (const { review } of log) {
    const key = studyDayKey(new Date(review.reviewed_at), dayStartHour);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const todayKey = studyDayKey(now, dayStartHour);
  const today = parseLocalDate(todayKey);
  const mondayOffset = (today.getDay() + 6) % 7;
  const firstMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (weeks - 1) * 7);

  const days: Omit<ActivityDay, 'level'>[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + i, 12);
    const key = studyDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12), dayStartHour);
    days.push({ key, date, answers: counts.get(key) ?? 0, future: key > todayKey });
  }
  const max = Math.max(1, ...days.map((d) => d.answers));
  const withLevel = days.map((d) => ({
    ...d,
    level: (d.answers === 0 ? 0 : Math.min(4, Math.ceil((d.answers / max) * 4))) as ActivityDay['level'],
  }));
  return Array.from({ length: weeks }, (_, w) => withLevel.slice(w * 7, w * 7 + 7));
}

// ---------- Weak cards ----------

export interface WeakCard {
  id: string;
  failures: number;
  lastFailed: boolean;
}

/** Failed at least twice, or failed at the last review (spec §6.4). Most failures first. */
export function weakCards(cardIds: readonly string[], memory: ReadonlyMap<string, CardMemory>): WeakCard[] {
  const out: WeakCard[] = [];
  for (const id of cardIds) {
    const mem = memory.get(id);
    if (!mem) continue;
    const lastFailed = mem.lastRating === 1;
    if (mem.failures >= 2 || lastFailed) out.push({ id, failures: mem.failures, lastFailed });
  }
  return out.sort((a, b) => b.failures - a.failures || Number(b.lastFailed) - Number(a.lastFailed) || (a.id < b.id ? -1 : 1));
}

export interface WeakCardText {
  theme: string;
  chapter: string;
  question: string;
  failures: number;
  id: string;
}

/** Plain text to paste into Claude, grouped by chapter and theme. */
export function weakCardsText(items: readonly WeakCardText[], now: Date): string {
  if (items.length === 0) return 'Aucune carte faible pour le moment.';
  const groups = new Map<string, WeakCardText[]>();
  for (const it of items) {
    const key = `${it.chapter} · ${it.theme}`;
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [`Mes points faibles en révision DSCG (${date}) : ${items.length} carte${items.length > 1 ? 's' : ''}.`, ''];
  for (const [group, list] of groups) {
    lines.push(`## ${group}`);
    for (const it of list) lines.push(`- ${it.question} (${it.failures} échec${it.failures > 1 ? 's' : ''}, ${it.id})`);
    lines.push('');
  }
  lines.push('Propose-moi des exercices ciblés sur ces notions.');
  return lines.join('\n');
}

// ---------- Projection ----------

export interface Projection {
  examDate: Date;
  daysLeft: number;
  totalCards: number;
  seenNow: number;
  unseenActive: number;
  /** New cards per study day over the last 14 days (or the daily setting without history). */
  pace: number;
  paceFromHistory: boolean;
  /** Success rate used for the simulation. */
  successRate: number;
  masteredAtExam: number;
  seenAtExam: number;
  /** Date by which every card should have been seen (exam minus the buffer). */
  introDeadline: Date;
  /** New cards per study day needed to see every active card by the deadline (null when the deadline is past). */
  neededPace: number | null;
  /** True when the daily new-card setting is enough to see every active card by the deadline. */
  settingIsEnough: boolean;
}

/** Deterministic pseudo-random in [0, 1) from a string. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

interface ProjectionInput {
  cards: readonly PlannerCard[];
  memory: ReadonlyMap<string, CardMemory>;
  log: readonly ReplayedReview[];
  settings: Settings;
  scheduler: Scheduler;
  now: Date;
}

/**
 * Simulates day by day until the exam, with `daysPerWeek` study days per week (rest days carry
 * their due cards over to the next study day): due cards are reviewed at noon, answered correctly
 * with the observed success rate (a failure is relearned 5 minutes later); new cards are introduced
 * at the observed pace, in catalog order, from active themes. A card counts as mastered on exam day
 * when its stability reaches 21 days.
 */
export function project({ cards, memory, log, settings, scheduler, now }: ProjectionInput): Projection {
  const examDate = parseLocalDate(settings.examDate);
  const todayKey = studyDayKey(now, settings.dayStartHour);
  const today = parseLocalDate(todayKey);
  const daysLeft = Math.max(0, Math.round((examDate.getTime() - today.getTime()) / DAY_MS));

  // Pace: distinct cards started over the last 14 study days.
  const since = today.getTime() - 13 * DAY_MS;
  const started = new Set<string>();
  const activeDays = new Set<string>();
  for (const l of log) {
    activeDays.add(studyDayKey(new Date(l.review.reviewed_at), settings.dayStartHour));
    if (l.before === State.New && Date.parse(l.review.reviewed_at) >= since) started.add(l.review.card_id);
  }
  const studyShare = Math.min(7, Math.max(1, settings.daysPerWeek)) / 7;
  const paceFromHistory = activeDays.size >= 3;
  const pace = paceFromHistory ? started.size / (14 * studyShare) : settings.newPerDay;

  const observed = successRate(log, now);
  const p = observed.count >= 30 && observed.rate !== null ? observed.rate : SCHEDULER_OPTIONS.desiredRetention;

  const state = new Map<string, FsrsCard>();
  for (const c of cards) {
    const mem = memory.get(c.id);
    if (mem) state.set(c.id, mem.fsrs);
  }
  const queue = cards.filter((c) => !state.has(c.id) && !isPaused(c, settings)).map((c) => c.id);
  const unseenActive = queue.length;
  const seenNow = state.size;

  let budget = 0;
  for (let d = 0; d < daysLeft; d++) {
    // Rest days: the last (7 - daysPerWeek) days of each simulated week.
    if (d % 7 >= settings.daysPerWeek) continue;
    const noon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d, 12);
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d + 1, settings.dayStartHour).getTime();
    const review = (id: string, card: FsrsCard, at: Date): FsrsCard => {
      const ok = hash01(`${id}|${card.reps}|${d}`) < p;
      const grade: Grade = ok ? 3 : 1;
      let next = applyGrade(scheduler, card, grade, at);
      // Short steps: answered again 5 minutes later, correctly, until the card leaves them.
      let t = at.getTime();
      while ((next.state === State.Learning || next.state === State.Relearning) && next.dueAt.getTime() < dayEnd) {
        t = Math.max(t + 5 * 60_000, next.dueAt.getTime());
        next = applyGrade(scheduler, next, 3, new Date(t));
      }
      return next;
    };
    for (const [id, card] of state) {
      if (card.dueAt.getTime() < dayEnd) state.set(id, review(id, card, noon));
    }
    budget += pace;
    while (budget >= 1 && queue.length > 0) {
      budget -= 1;
      const id = queue.shift() as string;
      state.set(id, review(id, newFsrsCard(scheduler, id, noon), noon));
    }
  }

  let masteredAtExam = 0;
  for (const card of state.values()) if (card.stability >= MASTERED_STABILITY_DAYS) masteredAtExam += 1;

  const introDeadline = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate() - settings.introBufferDays);
  const daysToDeadline = Math.round((introDeadline.getTime() - today.getTime()) / DAY_MS);
  const studyDaysToDeadline = daysToDeadline * studyShare;
  const neededPace = unseenActive === 0 ? 0 : studyDaysToDeadline >= 1 ? unseenActive / studyDaysToDeadline : null;
  const settingIsEnough = neededPace !== null && settings.newPerDay >= neededPace;

  return {
    examDate,
    daysLeft,
    totalCards: cards.length,
    seenNow,
    unseenActive,
    pace,
    paceFromHistory,
    successRate: p,
    masteredAtExam,
    seenAtExam: state.size,
    introDeadline,
    neededPace,
    settingIsEnough,
  };
}
