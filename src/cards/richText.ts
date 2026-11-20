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

export interface CasStep {
  label: string;
  text: string;
}

/**
 * Splits a case answer written as "**Label** : text" lines (Problème, Règle, Application, Conclusion)
 * into steps. Returns null when the answer does not follow that shape, so it renders as plain text.
 */
export function splitCasAnswer(text: string): CasStep[] | null {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const steps: CasStep[] = [];
  for (const line of lines) {
    const m = /^\*\*([^*]+)\*\*\s*:\s*([\s\S]*)$/.exec(line.trim());
    if (!m) return null;
    const body = (m[2] ?? '').trim();
    steps.push({ label: (m[1] ?? '').trim(), text: body.charAt(0).toUpperCase() + body.slice(1) });
  }
  return steps.length >= 2 ? steps : null;
}

/** A case question: the facts, then the question asked (its last paragraph). */
export function splitCasQuestion(text: string): { facts: string; ask: string } | null {
  const at = text.lastIndexOf('\n\n');
  if (at < 0) return null;
  return { facts: text.slice(0, at).trim(), ask: text.slice(at + 2).trim() };
}
