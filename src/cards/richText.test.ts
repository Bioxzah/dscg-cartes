import { describe, expect, it } from 'vitest';
import { parseBold } from './richText.ts';

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
