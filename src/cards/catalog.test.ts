import { describe, expect, it } from 'vitest';
import { buildCatalog, searchCards } from './catalog.ts';
import type { DeckFile } from './types.ts';

const file = (ue: string, chapitre: number, cardIds: string[]): DeckFile => ({
  schema: 1,
  deck: {
    id: `${ue}-ch${chapitre}`, ue, ueTitre: ue, chapitre, titre: `Ch ${chapitre}`,
    themes: [
      { id: 'b', titre: 'B', couleur: 'rouge', ordre: 2 },
      { id: 'a', titre: 'A', couleur: 'bleu', ordre: 1 },
    ],
  },
  cards: cardIds.map((id, i) => ({ id, theme: i % 2 ? 'b' : 'a', type: 'regle', question: 'Q', reponse: 'R' })),
});

describe('buildCatalog', () => {
  it('sorts UEs, chapters and themes, and indexes cards', () => {
    const cat = buildCatalog([file('UE4', 1, ['x']), file('UE1', 2, ['y']), file('UE1', 1, ['p', 'q', 'r'])]);
    expect(cat.tree.map((u) => u.ue)).toEqual(['UE1', 'UE4']);
    expect(cat.tree[0]?.chapters.map((c) => c.deck.chapitre)).toEqual([1, 2]);
    expect(cat.tree[0]?.cardCount).toBe(4);
    const ch1 = cat.tree[0]?.chapters[0];
    expect(ch1?.themes.map((t) => [t.theme.id, t.cards.map((c) => c.id)])).toEqual([
      ['a', ['p', 'r']],
      ['b', ['q']],
    ]);
    expect(cat.placeOf.get('q')?.theme.couleur).toBe('rouge');
    expect(cat.findTheme('UE1-ch1', 'b')?.cards).toHaveLength(1);
  });
});

describe('searchCards', () => {
  const cards = [
    { id: '1', theme: 'a', type: 'regle' as const, question: 'Qu’est-ce que la caducité ?', reponse: 'Disparition', source: 'Art. 1186' },
    { id: '2', theme: 'a', type: 'regle' as const, question: 'Offre', reponse: 'Proposition ferme' },
  ];
  it('ignores accents and case, matches every word', () => {
    expect(searchCards(cards, 'CADUCITE').map((c) => c.id)).toEqual(['1']);
    expect(searchCards(cards, 'art 1186').map((c) => c.id)).toEqual(['1']);
    expect(searchCards(cards, 'offre caducité')).toEqual([]);
    expect(searchCards(cards, '  ')).toHaveLength(2);
  });
});
