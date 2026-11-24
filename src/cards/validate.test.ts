import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAll, validateDeckFile } from './validate.ts';

const deck = (cards: unknown[], overrides: Record<string, unknown> = {}) => ({
  schema: 1,
  deck: {
    id: 'ue1-ch01', ue: 'UE1', ueTitre: 'Droit', chapitre: 1, titre: 'Contrats',
    themes: [{ id: 'formation', titre: 'Formation', couleur: 'bleu', ordre: 1 }],
    ...overrides,
  },
  cards,
});
const card = (id: string, extra: Record<string, unknown> = {}) => ({
  id, theme: 'formation', type: 'regle', question: 'Q ?', reponse: 'R.', ...extra,
});

describe('validateDeckFile', () => {
  it('accepts a qcm and a balanced journal entry', () => {
    const qcm = card('q1', { type: 'qcm', choix: ['Actif', 'Passif'], bonne: 1 });
    const entry = card('e1', {
      type: 'ecriture',
      journal: [
        { compte: '607', intitule: 'Achats', debit: 1000 },
        { compte: '44566', intitule: 'TVA déductible', debit: 200 },
        { compte: '401', intitule: 'Fournisseurs', credit: 1200 },
      ],
    });
    expect(validateDeckFile({ name: 'a.json', data: deck([qcm, entry]) })).toEqual([]);
  });

  it('rejects a qcm without a valid right answer, and choices on another type', () => {
    const errors = validateDeckFile({
      name: 'a.json',
      data: deck([card('q1', { type: 'qcm', choix: ['A', 'B'], bonne: 2 }), card('q2', { type: 'qcm', choix: ['A'] }), card('r1', { choix: ['A', 'B'], bonne: 0 })]),
    }).join('\n');
    expect(errors).toMatch(/q1.*« bonne »/);
    expect(errors).toMatch(/q2.*de 2 à 5/);
    expect(errors).toMatch(/r1.*réservés aux qcm/);
  });

  it('rejects an unbalanced or malformed journal entry', () => {
    const errors = validateDeckFile({
      name: 'a.json',
      data: deck([
        card('e1', { type: 'ecriture', journal: [{ compte: '512', intitule: 'Banque', debit: 100 }, { compte: '101', intitule: 'Capital', credit: 90 }] }),
        card('e2', { type: 'ecriture', journal: [{ compte: '512', intitule: 'Banque', debit: 100, credit: 100 }, { compte: '101', intitule: 'Capital', credit: 100 }] }),
      ]),
    }).join('\n');
    expect(errors).toMatch(/e1.*déséquilibrée/);
    expect(errors).toMatch(/e2\) ligne 1.*soit « debit », soit « credit »/);
  });

  it('accepts a valid file', () => {
    expect(validateDeckFile({ name: 'a.json', data: deck([card('c1'), card('c2', { source: 'Art. 1' })]) })).toEqual([]);
  });

  it('rejects a card pointing to an unknown theme', () => {
    const errors = validateDeckFile({ name: 'a.json', data: deck([card('c1', { theme: 'nope' })]) });
    expect(errors.join()).toMatch(/thème « nope » absent/);
  });

  it('rejects unknown types, colors and fields, and empty text', () => {
    const data = deck([card('c1', { type: 'quiz', question: ' ', extra: 1 })], {
      themes: [{ id: 'formation', titre: 'F', couleur: 'jaune', ordre: 1 }],
    });
    const errors = validateDeckFile({ name: 'a.json', data }).join('\n');
    expect(errors).toMatch(/type « quiz »/);
    expect(errors).toMatch(/couleur « jaune »/);
    expect(errors).toMatch(/champ inconnu « extra »/);
    expect(errors).toMatch(/« question »/);
  });

  it('rejects a wrong schema version and duplicate theme ids', () => {
    const data = { ...deck([]), schema: 2 };
    data.deck.themes.push({ id: 'formation', titre: 'Bis', couleur: 'vert', ordre: 2 });
    const errors = validateDeckFile({ name: 'a.json', data }).join('\n');
    expect(errors).toMatch(/schema/);
    expect(errors).toMatch(/thème en double/);
  });
});

describe('validateAll', () => {
  it('rejects a card id used twice across files', () => {
    const errors = validateAll([
      { name: 'a.json', data: deck([card('c1')]) },
      { name: 'b.json', data: deck([card('c1')], { id: 'ue1-ch02' }) },
    ]);
    expect(errors).toEqual(['b.json : identifiant de carte en double « c1 » (déjà dans a.json)']);
  });

  it('rejects a card id used twice in one file and a deck defined twice', () => {
    const errors = validateAll([
      { name: 'a.json', data: deck([card('c1'), card('c1')]) },
      { name: 'b.json', data: deck([card('c2')]) },
    ]).join('\n');
    expect(errors).toMatch(/double « c1 »/);
    expect(errors).toMatch(/paquet « ue1-ch01 » déjà défini/);
  });

  it('accepts every file in cards/', () => {
    const dir = join(import.meta.dirname, '..', '..', 'cards');
    const files = readdirSync(dir).filter((n) => n.endsWith('.json'))
      .map((name) => ({ name, data: JSON.parse(readFileSync(join(dir, name), 'utf8')) }));
    expect(validateAll(files)).toEqual([]);
  });
});
