import { describe, expect, it } from 'vitest';
import type { UeNode } from '../cards/catalog.ts';
import type { Deck } from '../cards/types.ts';
import { ficheSections, ficheShelves } from './library.ts';

const deck = (id: string, ue: string, chapitre: number, titre: string) =>
  ({ id, ue, ueTitre: `Titre ${ue}`, chapitre, titre, themes: [] }) as unknown as Deck;
const ue = (name: string, decks: Deck[]): UeNode => ({
  ue: name,
  ueTitre: `Titre ${name}`,
  cardCount: 0,
  chapters: decks.map((d) => ({ deck: d, themes: [], cardCount: 0 })),
});

describe('ficheShelves', () => {
  const tree = [
    ue('UE1', [deck('ue1-ch01', 'UE1', 1, 'Contrats'), deck('ue1-ch02', 'UE1', 2, 'Contrats spéciaux')]),
    ue('UE4', [deck('ue4-ch00', 'UE4', 0, 'Prérequis'), deck('ue4-ch02', 'UE4', 2, 'Intro conso')]),
    ue('UE9', [deck('ue9-ch01', 'UE9', 1, 'Sans fiche')]),
  ];
  const has = (id: string) => id !== 'ue1-ch02' && id !== 'ue9-ch01';

  it('keeps only decks with a fiche, in catalog order', () => {
    expect(ficheShelves(tree, has)).toEqual([
      { ue: 'UE1', ueTitre: 'Titre UE1', fiches: [{ deckId: 'ue1-ch01', chapitre: 1, titre: 'Contrats' }] },
      {
        ue: 'UE4',
        ueTitre: 'Titre UE4',
        fiches: [
          { deckId: 'ue4-ch00', chapitre: 0, titre: 'Prérequis' },
          { deckId: 'ue4-ch02', chapitre: 2, titre: 'Intro conso' },
        ],
      },
    ]);
  });

  it('leaves out a UE without any fiche', () => {
    expect(ficheShelves(tree, () => false)).toEqual([]);
  });
});

describe('ficheSections', () => {
  const html = `
<section class="stage t4" id="groupe">
  <h2><span class="n">1</span>La notion de groupe</h2>
  <p>…</p>
</section>
<section class="stage t2" id="obligation">
  <h2><span class="n">2</span>L'obligation &amp; les <b>seuils</b></h2>
</section>
<section class="stage" id="reciter"><h2><span class="n">3</span>À réciter</h2></section>`;

  it('reads id, number, plain title and color of each section, in order', () => {
    expect(ficheSections(html)).toEqual([
      { id: 'groupe', n: '1', title: 'La notion de groupe', couleur: 'vert' },
      { id: 'obligation', n: '2', title: "L'obligation & les seuils", couleur: 'bleu' },
      { id: 'reciter', n: '3', title: 'À réciter', couleur: 'ardoise' },
    ]);
  });

  it('returns nothing for a page without sections', () => {
    expect(ficheSections('<p>Rien</p>')).toEqual([]);
  });
});
