import { describe, expect, it } from 'vitest';
import type { Card } from '../cards/types.ts';
import { choiceOrder, pickQuiz, quizCards, quizScore, shuffle } from './quiz.ts';

const card = (id: string, type: Card['type']): Card => ({ id, theme: 't', type, question: 'Q', reponse: 'R' });

/** Deterministic pseudo-random sequence (LCG), for repeatable tests. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe('shuffle', () => {
  it('keeps every item exactly once and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, seeded(7));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('pickQuiz', () => {
  const cards = [
    card('q1', 'qcm'),
    card('q2', 'qcm'),
    card('e1', 'ecriture'),
    card('c1', 'calcul'),
    card('r1', 'regle'),
    card('m1', 'memo'),
    card('k1', 'cas'),
  ];

  it('asks only qcm, ecriture and calcul cards', () => {
    expect(quizCards(cards).map((c) => c.id)).toEqual(['q1', 'q2', 'e1', 'c1']);
    expect(pickQuiz(cards, seeded(1)).sort()).toEqual(['c1', 'e1', 'q1', 'q2']);
  });

  it('limits the quiz to its size, without repeats', () => {
    const many = Array.from({ length: 30 }, (_, i) => card(`q${i}`, 'qcm'));
    const picked = pickQuiz(many, seeded(3), 20);
    expect(picked).toHaveLength(20);
    expect(new Set(picked).size).toBe(20);
  });

  it('is repeatable with the same random sequence', () => {
    expect(pickQuiz(cards, seeded(5))).toEqual(pickQuiz(cards, seeded(5)));
  });
});

describe('choiceOrder', () => {
  it('is a permutation of the choice indexes', () => {
    expect([...choiceOrder(4, seeded(2))].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('quizScore', () => {
  it('counts right answers and lists the mistakes in order', () => {
    expect(
      quizScore([
        { cardId: 'a', ok: true },
        { cardId: 'b', ok: false },
        { cardId: 'c', ok: true },
        { cardId: 'd', ok: false },
      ]),
    ).toEqual({ right: 2, total: 4, mistakes: ['b', 'd'] });
  });
});
