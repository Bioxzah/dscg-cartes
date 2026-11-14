export interface Segment {
  text: string;
  bold: boolean;
}

/**
 * Splits card text on **bold** markers. Only bold is interpreted; everything else,
 * including line breaks, is kept as plain text. An unmatched ** stays literal.
 */
export function parseBold(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\*\*(.+?)\*\*/gs;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), bold: false });
    segments.push({ text: m[1] ?? '', bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });
  return segments;
}
