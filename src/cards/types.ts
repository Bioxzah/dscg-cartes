export const THEME_COLORS = ['bleu', 'violet', 'rouge', 'sarcelle', 'vert', 'ardoise'] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

/**
 * regle, cas, memo: question and answer. qcm: choices, one right answer, checked by the app.
 * ecriture: an operation whose answer is a journal entry. calcul: a short computation.
 */
export const CARD_TYPES = ['regle', 'cas', 'memo', 'ecriture', 'calcul', 'qcm'] as const;
export type CardType = (typeof CARD_TYPES)[number];

export interface Theme {
  id: string;
  titre: string;
  couleur: ThemeColor;
  ordre: number;
}

export interface Deck {
  id: string;
  ue: string;
  ueTitre: string;
  chapitre: number;
  titre: string;
  themes: Theme[];
}

/** One line of a journal entry: an account, debited or credited (exactly one of the two). */
export interface JournalLine {
  compte: string;
  intitule: string;
  debit?: number;
  credit?: number;
}

export interface Card {
  id: string;
  theme: string;
  type: CardType;
  question: string;
  /** For a qcm, the explanation shown after the choice. */
  reponse: string;
  source?: string;
  /** qcm only: the choices, and the index of the right one. */
  choix?: string[];
  bonne?: number;
  /** ecriture only (optional): the expected journal entry, balanced; shown as a table. */
  journal?: JournalLine[];
}

export interface DeckFile {
  schema: 1;
  deck: Deck;
  cards: Card[];
}
