import type { Card, Deck, DeckFile, Theme } from './types.ts';
import type { PlannerCard } from '../scheduler/types.ts';

export interface ThemeNode {
  deck: Deck;
  theme: Theme;
  cards: Card[];
}

export interface ChapterNode {
  deck: Deck;
  themes: ThemeNode[];
  cardCount: number;
}

export interface UeNode {
  ue: string;
  ueTitre: string;
  chapters: ChapterNode[];
  cardCount: number;
}

export interface Catalog {
  tree: UeNode[];
  cardsById: Map<string, Card>;
  /** Card id → its deck and theme, for rendering the theme color and label. */
  placeOf: Map<string, { deck: Deck; theme: Theme }>;
  findTheme(deckId: string, themeId: string): ThemeNode | undefined;
}

/** Builds the UE → chapter → theme tree. Pure: same files, same catalog. */
export function buildCatalog(files: DeckFile[]): Catalog {
  const byUe = new Map<string, UeNode>();
  const cardsById = new Map<string, Card>();
  const placeOf = new Map<string, { deck: Deck; theme: Theme }>();
  const themeIndex = new Map<string, ThemeNode>();

  const sorted = [...files].sort(
    (a, b) => a.deck.ue.localeCompare(b.deck.ue, 'fr', { numeric: true }) || a.deck.chapitre - b.deck.chapitre,
  );

  for (const { deck, cards } of sorted) {
    let ue = byUe.get(deck.ue);
    if (!ue) {
      ue = { ue: deck.ue, ueTitre: deck.ueTitre, chapters: [], cardCount: 0 };
      byUe.set(deck.ue, ue);
    }
    const themes = [...deck.themes]
      .sort((a, b) => a.ordre - b.ordre)
      .map((theme) => ({ deck, theme, cards: cards.filter((c) => c.theme === theme.id) }));

    for (const node of themes) {
      themeIndex.set(`${deck.id}/${node.theme.id}`, node);
      for (const card of node.cards) {
        cardsById.set(card.id, card);
        placeOf.set(card.id, { deck, theme: node.theme });
      }
    }
    ue.chapters.push({ deck, themes, cardCount: cards.length });
    ue.cardCount += cards.length;
  }

  return {
    tree: [...byUe.values()],
    cardsById,
    placeOf,
    findTheme: (deckId, themeId) => themeIndex.get(`${deckId}/${themeId}`),
  };
}

/** Lowercase, accent-free form used for search. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Keeps cards whose question, answer or source contains every word of the query. */
export function searchCards(cards: Card[], query: string): Card[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return cards;
  return cards.filter((c) => {
    const hay = normalize(`${c.question} ${c.reponse} ${c.source ?? ''} ${c.id}`);
    return words.every((w) => hay.includes(w));
  });
}

export const TYPE_LABELS: Partial<Record<Card['type'], string>> = {
  cas: 'Cas pratique',
  memo: 'Mémo',
  qcm: 'QCM',
  ecriture: 'Écriture',
  calcul: 'Calcul',
};

/** "Chapitre 2", or "Bases" for a foundation deck (negative chapter number, listed first). */
export function chapterLabel(chapitre: number): string {
  return chapitre < 0 ? 'Bases' : `Chapitre ${chapitre}`;
}

/** Every card in catalog order (UE, chapter, theme order, file order), as the planner needs it. */
export function plannerCards(catalog: Catalog): PlannerCard[] {
  return catalog.tree.flatMap((ue) =>
    ue.chapters.flatMap((ch) => ch.themes.flatMap((t) => t.cards.map((c) => ({ id: c.id, deckId: ch.deck.id, themeId: t.theme.id, ue: ue.ue })))),
  );
}
