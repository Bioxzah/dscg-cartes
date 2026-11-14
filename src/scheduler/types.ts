/** Grades offered in the app. 2 (Hard) is never offered but stays valid in the journal schema. */
export type Grade = 1 | 3 | 4;

/** One entry of the review journal. Append-only: undo sets `annulee`, nothing is deleted. */
export interface Review {
  id: string;
  card_id: string;
  rating: Grade;
  /** ISO 8601 */
  reviewed_at: string;
  duration_ms: number;
  device: string;
  annulee: boolean;
  /** True when made in a free session: it does not use up the daily new-card quota or review cap. */
  libre: boolean;
}

export type Appearance = 'auto' | 'light' | 'dark';

export interface Settings {
  newPerDay: number;
  reviewCap: number;
  /** "deckId/themeId" keys */
  pausedThemes: string[];
  /** deck ids */
  pausedDecks: string[];
  /** YYYY-MM-DD */
  examDate: string;
  dayStartHour: number;
  appearance: Appearance;
  /** Every card should have been seen this many days before the exam (milestone 5 decision: 60). */
  introBufferDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 15,
  reviewCap: 100,
  pausedThemes: [],
  pausedDecks: [],
  examDate: '2027-10-25',
  dayStartHour: 4,
  appearance: 'auto',
  introBufferDays: 60,
};

/** A card as the planner sees it: its id and where it sits in the catalog. Catalog order = new-card order. */
export interface PlannerCard {
  id: string;
  deckId: string;
  themeId: string;
}
