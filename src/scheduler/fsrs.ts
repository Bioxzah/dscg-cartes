import { DefaultScheduler } from 'ts-fsrs';

/**
 * In-session steps (see docs/SPEC.md §5 and the milestone 2 decision):
 * a failed card, or a new card answered "Correct", comes back about 5 minutes later.
 * Research on retrieval practice (Karpicke & Roediger 2007, Pyc & Rawson 2009) favours a delayed,
 * effortful first retrieval over an immediate one; one successful delayed recall then hands the
 * card to FSRS for the following days (Rawson & Dunlosky 2011).
 */
export const STEP = '5m';

export const SCHEDULER_OPTIONS = {
  version: 'FSRS-7',
  desiredRetention: 0.9,
  enableShortTerm: true,
  learningSteps: [STEP, STEP],
  relearningSteps: [STEP],
  // Without this, FSRS-7 skips the steps when its own interval is longer.
  allowModelOverride: false,
  // Deterministic: the fuzz seed comes from the card id and its review count.
  enableFuzz: true,
} as const;

export type Scheduler = Awaited<ReturnType<typeof createScheduler>>;
export type FsrsCard = ReturnType<Scheduler['review']>['card'];

export function createScheduler() {
  return DefaultScheduler({ ...SCHEDULER_OPTIONS, learningSteps: [...SCHEDULER_OPTIONS.learningSteps], relearningSteps: [...SCHEDULER_OPTIONS.relearningSteps] });
}

/** A card becomes "maîtrisée" once its stability reaches 21 days (spec §6.4). */
export const MASTERED_STABILITY_DAYS = 21;
