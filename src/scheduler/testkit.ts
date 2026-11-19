// Helpers shared by scheduler tests.
import type { Grade, PlannerCard, Review } from './types.ts';

let seq = 0;
export function rev(card_id: string, rating: Grade, at: string | Date, extra: Partial<Review> = {}): Review {
  seq += 1;
  return {
    id: `r${String(seq).padStart(5, '0')}`,
    card_id,
    rating,
    reviewed_at: new Date(at).toISOString(),
    duration_ms: 10_000,
    device: 'test',
    annulee: false,
    libre: false,
    ...extra,
  };
}

export const pc = (id: string, deckId = 'd1', themeId = 't1', ue = 'UE1'): PlannerCard => ({ id, deckId, themeId, ue });
export const min = (d: Date, n: number) => new Date(d.getTime() + n * 60_000);
