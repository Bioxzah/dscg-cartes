export const THEME_COLORS = ['bleu', 'violet', 'rouge', 'sarcelle', 'vert', 'ardoise'] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];

/** regle, cas, memo exist today; ecriture and calcul are announced for UE 4 and render as regle until then. */
export const CARD_TYPES = ['regle', 'cas', 'memo', 'ecriture', 'calcul'] as const;
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

export interface Card {
  id: string;
  theme: string;
  type: CardType;
  question: string;
  reponse: string;
  source?: string;
}

export interface DeckFile {
  schema: 1;
  deck: Deck;
  cards: Card[];
}
