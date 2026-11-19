// Finds the passage of a fiche that explains a card. Pure: works on plain texts, no DOM.
// Method: TF-IDF cosine between the card (question + answer) and each block of the fiche,
// on words and pairs of consecutive words, without accents or common words.

const STOP = new Set(
  (
    'les des une est sont pas par pour dans sur aux avec que qui quoi quel quelle quels quelles son ses leur leurs ' +
    'cette ces cet elle elles ils peut peuvent doit doivent faut etre avoir fait faire mais donc car plus moins tout ' +
    'tous toute toutes sans sous entre comme ainsi aussi alors oui non deux trois lors dont cas regle article art ' +
    'selon apres avant quand comment pourquoi chaque autre autres meme tres bien encore deja ont ete sera'
  ).split(' '),
);

export function tokens(text: string): string[] {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const out = [...words];
  for (let i = 1; i < words.length; i++) out.push(`${words[i - 1]}_${words[i]}`);
  return out;
}

function counts(list: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of list) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

export interface FicheIndex {
  score(text: string): number[];
  best(text: string): number;
}

/** Indexes the texts of the fiche's blocks once; then scores any card text against them. */
export function indexFiche(blocks: readonly string[]): FicheIndex {
  const docs = blocks.map((b) => counts(tokens(b)));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log((docs.length + 1) / ((df.get(t) ?? 0) + 1)) + 1;
  const vectors = docs.map((d) => {
    const v = new Map<string, number>();
    let norm = 0;
    for (const [t, n] of d) {
      const w = (1 + Math.log(n)) * idf(t) * (t.includes('_') ? 1.5 : 1);
      v.set(t, w);
      norm += w * w;
    }
    return { v, norm: Math.sqrt(norm) || 1 };
  });

  const score = (text: string): number[] => {
    const q = counts(tokens(text));
    const qv = new Map<string, number>();
    let qn = 0;
    for (const [t, n] of q) {
      if (!df.has(t)) continue;
      const w = (1 + Math.log(n)) * idf(t) * (t.includes('_') ? 1.5 : 1);
      qv.set(t, w);
      qn += w * w;
    }
    qn = Math.sqrt(qn) || 1;
    return vectors.map(({ v, norm }) => {
      let dot = 0;
      for (const [t, w] of qv) dot += w * (v.get(t) ?? 0);
      return dot / (norm * qn);
    });
  };

  return {
    score,
    best(text) {
      const s = score(text);
      let best = 0;
      for (let i = 1; i < s.length; i++) if ((s[i] as number) > (s[best] as number)) best = i;
      return best;
    },
  };
}

/** Elements that count as one passage of a fiche, from the largest to the smallest. */
export const BLOCK_SELECTOR = '.stage .card, .stage .tile, .stage .trap, .stage .memo, .stage tbody tr, .stage > p, .stage li';
