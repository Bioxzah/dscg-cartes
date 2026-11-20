import { describe, expect, it } from 'vitest';
import { parseBold, splitCasAnswer, splitCasQuestion } from './richText.ts';

describe('parseBold', () => {
  it('keeps plain text and line breaks', () => {
    expect(parseBold('a\nb')).toEqual([{ text: 'a\nb', bold: false }]);
  });
  it('extracts bold parts', () => {
    expect(parseBold('La **nullité** est **relative**.')).toEqual([
      { text: 'La ', bold: false },
      { text: 'nullité', bold: true },
      { text: ' est ', bold: false },
      { text: 'relative', bold: true },
      { text: '.', bold: false },
    ]);
  });
  it('leaves an unmatched marker literal', () => {
    expect(parseBold('a ** b')).toEqual([{ text: 'a ** b', bold: false }]);
  });
});

describe('splitCasAnswer', () => {
  it('splits labelled lines into steps, capitalizing each text', () => {
    expect(splitCasAnswer('**Problème** : a ?\n**Règle** : b (art. 1).\n**Conclusion** : c.')).toEqual([
      { label: 'Problème', text: 'A ?' },
      { label: 'Règle', text: 'B (art. 1).' },
      { label: 'Conclusion', text: 'C.' },
    ]);
  });

  it('keeps bold inside the text of a step', () => {
    expect(splitCasAnswer('**Règle** : il faut **deux** conditions\n**Conclusion** : oui')?.[0]).toEqual({ label: 'Règle', text: 'Il faut **deux** conditions' });
  });

  it('returns null for an answer that is not split into steps', () => {
    expect(splitCasAnswer('Non : la clause est abusive.')).toBeNull();
    expect(splitCasAnswer('**Règle** : seule étape')).toBeNull();
    expect(splitCasAnswer('**Règle** : a\nune ligne libre')).toBeNull();
  });
});

describe('splitCasQuestion', () => {
  it('separates the facts from the question asked', () => {
    expect(splitCasQuestion('Faits un.\nFaits deux.\n\n**Que faire ?**')).toEqual({ facts: 'Faits un.\nFaits deux.', ask: '**Que faire ?**' });
  });

  it('returns null for a one-paragraph question', () => {
    expect(splitCasQuestion('Que faire ?')).toBeNull();
  });
});
