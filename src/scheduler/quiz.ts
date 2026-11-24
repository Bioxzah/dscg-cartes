// The "Faire un quiz" mode: a one-off test on a deck, with a score. Pure: no storage, no clock,
// and randomness comes from the caller, so it is covered by tests. A quiz never writes to the journal.
import type { Card, CardType } from '../cards/types.ts';

/** Card types a quiz asks: the app checks a qcm, the learner marks the others right or wrong. */
export const QUIZ_TYPES: readonly CardType[] = ['qcm', 'ecriture', 'calcul'];
export const QUIZ_SIZE = 20;
/** A deck offers a quiz once it has this many quiz cards. */
export const QUIZ_MIN = 5;

export type Random = () => number;

/** Fisher–Yates shuffle of a copy. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function quizCards(cards: readonly Card[]): Card[] {
  return cards.filter((c) => QUIZ_TYPES.includes(c.type));
}

/** Picks up to `size` quiz cards at random, keeping about the deck's mix of qcm and other types. */
export function pickQuiz(cards: readonly Card[], random: Random, size = QUIZ_SIZE): string[] {
  return shuffle(quizCards(cards), random)
    .slice(0, size)
    .map((c) => c.id);
}

/** Order in which to show a qcm's choices: shuffled, so the right answer's place is not learned. */
export function choiceOrder(count: number, random: Random): number[] {
  return shuffle(
    Array.from({ length: count }, (_, i) => i),
    random,
  );
}

export interface QuizResult {
  cardId: string;
  ok: boolean;
}

export function quizScore(results: readonly QuizResult[]): { right: number; total: number; mistakes: string[] } {
  return {
    right: results.filter((r) => r.ok).length,
    total: results.length,
    mistakes: results.filter((r) => !r.ok).map((r) => r.cardId),
  };
}
