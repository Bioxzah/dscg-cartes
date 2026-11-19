import { describe, expect, it } from 'vitest';
import { indexFiche, tokens } from './match.ts';

describe('tokens', () => {
  it('drops accents, short and common words, and adds word pairs', () => {
    expect(tokens('Le pacte de préférence est violé')).toEqual(['pacte', 'preference', 'viole', 'pacte_preference', 'preference_viole']);
  });
});

describe('indexFiche', () => {
  const blocks = [
    'Offre et acceptation. Le contrat se forme par la rencontre d’une offre et d’une acceptation.',
    'Pacte de préférence. Le promettant s’engage à proposer en priorité au bénéficiaire.',
    'Force majeure. Un événement échappant au contrôle du débiteur, imprévisible et irrésistible.',
  ];
  const idx = indexFiche(blocks);

  it('finds the passage that shares the most distinctive words', () => {
    expect(idx.best('Comment se forme un contrat ? Par une offre et une acceptation.')).toBe(0);
    expect(idx.best('Le tiers connaissait le pacte de préférence : substitution ?')).toBe(1);
    expect(idx.best('Quelles conditions pour la force majeure ?')).toBe(2);
  });

  it('scores every block', () => {
    expect(idx.score('force majeure')).toHaveLength(3);
  });
});
