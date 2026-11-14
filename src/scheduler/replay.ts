import { State } from 'ts-fsrs';
import type { FsrsCard, Scheduler } from './fsrs.ts';
import type { Grade, Review } from './types.ts';

export type CardStateKind = (typeof State)[keyof typeof State];

export interface CardMemory {
  fsrs: FsrsCard;
  reviewCount: number;
  /** Number of "À revoir" answers. */
  failures: number;
  lastRating: Grade;
}

export interface ReplayedReview {
  review: Review;
  /** FSRS state of the card just before this review (New, Learning, Review, Relearning). */
  before: CardStateKind;
}

export interface Replay {
  cards: Map<string, CardMemory>;
  /** Non-cancelled reviews in replay order, annotated. */
  log: ReplayedReview[];
}

/** Replay order: review time, then id, so every device gets the same order. */
export function compareReviews(a: Review, b: Review): number {
  return a.reviewed_at < b.reviewed_at ? -1 : a.reviewed_at > b.reviewed_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function newFsrsCard(scheduler: Scheduler, cardId: string, now: Date): FsrsCard {
  return scheduler.newCard({ now, cardId });
}

/** One FSRS step. Pure: the input card is not mutated. */
export function applyGrade(scheduler: Scheduler, card: FsrsCard, grade: Grade, at: Date): FsrsCard {
  return scheduler.review({ card, grade, now: at }).card;
}

interface CardReplay {
  /** Identifies the card's journal: ids and cancel flags, in replay order. */
  signature: string;
  memory: CardMemory;
  log: ReplayedReview[];
}

/** Per-card results kept between replays, so only cards whose journal changed are recomputed. */
export type ReplayCache = ReadonlyMap<string, CardReplay>;

function replayCard(scheduler: Scheduler, cardId: string, reviews: readonly Review[]): Omit<CardReplay, 'signature'> {
  let memory: CardMemory | undefined;
  const log: ReplayedReview[] = [];
  for (const review of reviews) {
    const at = new Date(review.reviewed_at);
    const card = memory?.fsrs ?? newFsrsCard(scheduler, cardId, at);
    log.push({ review, before: card.state as CardStateKind });
    memory = {
      fsrs: applyGrade(scheduler, card, review.rating, at),
      reviewCount: (memory?.reviewCount ?? 0) + 1,
      failures: (memory?.failures ?? 0) + (review.rating === 1 ? 1 : 0),
      lastRating: review.rating,
    };
  }
  return { memory: memory as CardMemory, log };
}

/**
 * Rebuilds every card's memory state from the journal. Deterministic: the same set of
 * reviews gives the same states, whatever their order in the input. Pass the previous
 * `cache` to skip cards whose journal did not change.
 */
export function replay(
  reviews: readonly Review[],
  scheduler: Scheduler,
  cache: ReplayCache = new Map(),
): Replay & { cache: ReplayCache } {
  const byCard = new Map<string, Review[]>();
  for (const r of reviews) {
    if (r.annulee) continue;
    const list = byCard.get(r.card_id);
    if (list) list.push(r);
    else byCard.set(r.card_id, [r]);
  }

  const cards = new Map<string, CardMemory>();
  const nextCache = new Map<string, CardReplay>();
  const log: ReplayedReview[] = [];
  for (const [cardId, list] of byCard) {
    list.sort(compareReviews);
    const signature = list.map((r) => r.id).join(',');
    const hit = cache.get(cardId);
    const result = hit && hit.signature === signature ? hit : { signature, ...replayCard(scheduler, cardId, list) };
    nextCache.set(cardId, result);
    cards.set(cardId, result.memory);
    log.push(...result.log);
  }
  log.sort((a, b) => compareReviews(a.review, b.review));
  return { cards, log, cache: nextCache };
}

export { State };
