import { studyDayBounds, studyDayKey } from './day.ts';
import { State, type CardMemory, type ReplayedReview } from './replay.ts';
import type { PlannerCard, Settings } from './types.ts';

/** A card waiting for its short step inside the session. */
export interface Pending {
  cardId: string;
  dueAt: number;
}

export interface Plan {
  /** Cards to show in order. */
  queue: string[];
  /** Learning cards due later today: they join when due. */
  pending: Pending[];
  counts: { learning: number; due: number; new: number };
  /** UE of today's new cards, or null when only one UE still has new cards. */
  newUe?: string | null;
}

export interface DayUsage {
  /** Cards seen for the first time today, outside free sessions. */
  newDone: number;
  /** Review-state cards answered today, outside free sessions. */
  reviewsDone: number;
  /** Time spent today, all sessions. */
  timeMs: number;
  /** Answers given today, all sessions. */
  answers: number;
}

export function isPaused(card: PlannerCard, settings: Settings): boolean {
  return settings.pausedDecks.includes(card.deckId) || settings.pausedThemes.includes(`${card.deckId}/${card.themeId}`);
}

export function dayUsage(log: readonly ReplayedReview[], now: Date, dayStartHour: number): DayUsage {
  const { start, end } = studyDayBounds(now, dayStartHour);
  const from = start.toISOString();
  const to = end.toISOString();
  const newCards = new Set<string>();
  const reviewCards = new Set<string>();
  let timeMs = 0;
  let answers = 0;
  for (const { review, before } of log) {
    // ISO strings in UTC compare correctly as text.
    const at = new Date(review.reviewed_at).toISOString();
    if (at < from || at >= to) continue;
    timeMs += review.duration_ms;
    answers += 1;
    if (review.libre) continue;
    if (before === State.New) newCards.add(review.card_id);
    else if (before === State.Review) reviewCards.add(review.card_id);
  }
  return { newDone: newCards.size, reviewsDone: reviewCards.size, timeMs, answers };
}

/** Small seeded PRNG so the daily shuffle is stable across reloads of the same day. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Spreads `extra` evenly through `base`, keeping the order of each list. */
export function interleave<T>(base: readonly T[], extra: readonly T[]): T[] {
  if (extra.length === 0) return [...base];
  if (base.length === 0) return [...extra];
  const keyed = [
    ...base.map((item, i) => ({ item, key: (i + 0.5) / base.length, tie: 0 })),
    ...extra.map((item, i) => ({ item, key: (i + 0.5) / extra.length, tie: 1 })),
  ];
  keyed.sort((a, b) => a.key - b.key || a.tie - b.tie);
  return keyed.map((k) => k.item);
}

/**
 * UE whose new cards come today. New cards alternate one UE per study day (decision of 2026-11-19), so the
 * new notions of a day follow one course. Rest days do not shift the turn: today's UE is the one after the UE
 * of the last day that introduced new cards, or the UE already started today. Free sessions do not count.
 * Returns null when at most one UE still has new cards.
 */
export function newCardsUe(
  cards: readonly PlannerCard[],
  memory: ReadonlyMap<string, CardMemory>,
  log: readonly ReplayedReview[],
  settings: Settings,
  now: Date,
): string | null {
  const order: string[] = [];
  const open: string[] = [];
  for (const card of cards) {
    if (!order.includes(card.ue)) order.push(card.ue);
    if (!open.includes(card.ue) && !memory.has(card.id) && !isPaused(card, settings)) open.push(card.ue);
  }
  if (open.length <= 1) return null;

  const ueOf = new Map(cards.map((c) => [c.id, c.ue]));
  const today = studyDayKey(now, settings.dayStartHour);
  let todayUe: string | null = null;
  let lastDay: string | null = null;
  let lastUe: string | null = null;
  for (const { review, before } of log) {
    if (review.libre || before !== State.New) continue;
    const ue = ueOf.get(review.card_id);
    if (!ue) continue;
    const day = studyDayKey(new Date(review.reviewed_at), settings.dayStartHour);
    if (day === today) todayUe ??= ue;
    else if (day < today && day !== lastDay) {
      lastDay = day;
      lastUe = ue;
    }
  }
  if (todayUe && open.includes(todayUe)) return todayUe;
  if (lastUe === null) return open[0] ?? null;
  const from = order.indexOf(lastUe);
  for (let k = 1; k <= order.length; k++) {
    const ue = order[(from + k) % order.length] as string;
    if (open.includes(ue)) return ue;
  }
  return open[0] ?? null;
}

interface DailyInput {
  /** Every card of the catalog, in catalog order (deck, theme order, file order). */
  cards: readonly PlannerCard[];
  memory: ReadonlyMap<string, CardMemory>;
  settings: Settings;
  usage: DayUsage;
  now: Date;
  /** Seed for the review shuffle, normally the study day key. */
  seed: string;
  /** UE of today's new cards (see `newCardsUe`). When it runs out, other UEs fill the daily limit. */
  newUe?: string | null;
}

/**
 * Today's session, by priority (spec §5):
 * 1. learning cards already due; 2. due reviews, shuffled, up to the cap;
 * 3. new cards from active themes, up to the daily limit, spread through the session.
 */
export function buildDailyPlan({ cards, memory, settings, usage, now, seed, newUe = null }: DailyInput): Plan {
  const nowMs = now.getTime();
  const dayEnd = studyDayBounds(now, settings.dayStartHour).end.getTime();
  const learningNow: Pending[] = [];
  const pending: Pending[] = [];
  const due: string[] = [];
  const fresh: string[] = [];
  const filler: string[] = [];
  const newLeft = Math.max(0, settings.newPerDay - usage.newDone);

  for (const card of cards) {
    const mem = memory.get(card.id);
    if (!mem) {
      if (isPaused(card, settings)) continue;
      const list = newUe === null || card.ue === newUe ? fresh : filler;
      if (list.length < newLeft) list.push(card.id);
      continue;
    }
    const dueAt = mem.fsrs.dueAt.getTime();
    const state = mem.fsrs.state;
    if (state === State.Learning || state === State.Relearning) {
      if (dueAt <= nowMs) learningNow.push({ cardId: card.id, dueAt });
      else if (dueAt < dayEnd) pending.push({ cardId: card.id, dueAt });
    } else if (state === State.Review && dueAt < dayEnd) {
      due.push(card.id);
    }
  }

  learningNow.sort((a, b) => a.dueAt - b.dueAt || (a.cardId < b.cardId ? -1 : 1));
  pending.sort((a, b) => a.dueAt - b.dueAt);
  const reviews = shuffle(due.sort(), seed).slice(0, Math.max(0, settings.reviewCap - usage.reviewsDone));
  fresh.push(...filler.slice(0, newLeft - fresh.length));

  return {
    queue: [...learningNow.map((p) => p.cardId), ...interleave(reviews, fresh)],
    pending,
    counts: { learning: learningNow.length + pending.length, due: reviews.length, new: fresh.length },
    newUe,
  };
}

interface FreeInput {
  /** The theme's cards, in file order. */
  cards: readonly PlannerCard[];
  memory: ReadonlyMap<string, CardMemory>;
  /** Estimated recall probability now, for a card already seen. */
  retrievability: (mem: CardMemory) => number;
  limit?: number;
}

/** Free session on one theme: the cards you are most likely to have forgotten first, then new cards. */
export function buildFreePlan({ cards, memory, retrievability, limit = 20 }: FreeInput): Plan {
  const seen = cards
    .filter((c) => memory.has(c.id))
    .map((c) => ({ id: c.id, r: retrievability(memory.get(c.id) as CardMemory) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.id);
  const fresh = cards.filter((c) => !memory.has(c.id)).map((c) => c.id);
  const queue = [...seen, ...fresh].slice(0, limit);
  const nNew = queue.filter((id) => !memory.has(id)).length;
  return { queue, pending: [], counts: { learning: 0, due: queue.length - nNew, new: nNew }, newUe: null };
}
