// The fiches tab: which fiches exist, grouped like the decks, and the outline of one fiche.
// Pure: no DOM, no storage, so it is covered by tests.
import type { UeNode } from '../cards/catalog.ts';
import type { ThemeColor } from '../cards/types.ts';

export interface FicheEntry {
  deckId: string;
  chapitre: number;
  titre: string;
}

export interface FicheShelf {
  ue: string;
  ueTitre: string;
  fiches: FicheEntry[];
}

/** The decks that have a fiche, by UE and in chapter order (the catalog's order). Empty UEs are left out. */
export function ficheShelves(tree: readonly UeNode[], hasFiche: (deckId: string) => boolean): FicheShelf[] {
  return tree
    .map((ue) => ({
      ue: ue.ue,
      ueTitre: ue.ueTitre,
      fiches: ue.chapters
        .filter((ch) => hasFiche(ch.deck.id))
        .map((ch) => ({ deckId: ch.deck.id, chapitre: ch.deck.chapitre, titre: ch.deck.titre })),
    }))
    .filter((shelf) => shelf.fiches.length > 0);
}

export interface FicheSection {
  /** Element id of the section in the fiche, to scroll to. */
  id: string;
  /** Its number as printed in the fiche ("1", "2"…). */
  n: string;
  title: string;
  /** Same color as the section in the fiche. */
  couleur: ThemeColor;
}

// The fiche template colors its sections with t0…t5, in this order.
const STAGE_COLORS: readonly ThemeColor[] = ['ardoise', 'sarcelle', 'bleu', 'violet', 'vert', 'rouge'];

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e] ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** The sections of a fiche (`<section class="stage tN" id="…"><h2><span class="n">N</span>Title</h2>`), in order. */
export function ficheSections(html: string): FicheSection[] {
  const sections: FicheSection[] = [];
  const re = /<section\s+class="stage(?:\s+t(\d))?[^"]*"\s+id="([^"]+)"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/g;
  for (const m of html.matchAll(re)) {
    const [, t, id = '', h2 = ''] = m;
    const n = /<span class="n">([\s\S]*?)<\/span>/.exec(h2)?.[1] ?? '';
    sections.push({
      id,
      n: text(n),
      title: text(h2.replace(/<span class="n">[\s\S]*?<\/span>/, '')),
      couleur: STAGE_COLORS[Number(t ?? 0)] ?? 'ardoise',
    });
  }
  return sections;
}
