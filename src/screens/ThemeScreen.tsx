import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { searchCards, TYPE_LABELS, chapterLabel } from '../cards/catalog.ts';
import { MasteryCounts } from '../components/MasteryCounts.tsx';
import { useAppData } from '../data/AppData.tsx';
import { countMastery } from '../scheduler/stats.ts';
import { themeStyle } from '../components/themeStyle.ts';
import { NotFound } from './NotFound.tsx';

export function ThemeScreen() {
  const { deckId = '', themeId = '' } = useParams();
  const { catalog, memory } = useAppData();
  const node = catalog.findTheme(deckId, themeId);
  const [query, setQuery] = useState('');
  const results = useMemo(() => (node ? searchCards(node.cards, query) : []), [node, query]);

  if (!node) return <NotFound />;
  const { deck, theme, cards } = node;

  return (
    <main className="screen" style={themeStyle(theme.couleur)}>
      <Link className="back" to="/paquets">‹ Paquets</Link>
      <header className="theme-hero">
        <p className="theme-hero-eyebrow">{deck.ue.replace(/^UE\s*/, 'UE ')} · {chapterLabel(deck.chapitre)} · {deck.titre}</p>
        <h1 className="theme-hero-title">{theme.titre}</h1>
        <MasteryCounts counts={countMastery(cards.map((c) => c.id), memory)} />
        <Link className="theme-hero-go" to={`/session/libre/${deck.id}/${theme.id}`}>
          Session libre sur ce thème <span aria-hidden="true">→</span>
        </Link>
      </header>
      <p className="muted small hint">20 cartes au plus : celles que tu risques le plus d’avoir oubliées, puis des nouvelles. Ne compte pas dans tes limites du jour.</p>
      <input
        className="search"
        type="search"
        placeholder={`Chercher dans ${cards.length} cartes`}
        aria-label="Chercher une carte"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length === 0 ? (
        <p className="muted">Aucune carte ne correspond à ta recherche.</p>
      ) : (
        <ul className="rows panel">
          {results.map((c) => (
            <li key={c.id}>
              <Link className="row card-row" to={`/carte/${encodeURIComponent(c.id)}`}>
                <span className="row-main">
                  <span className="label">{c.id}{TYPE_LABELS[c.type] ? ` · ${TYPE_LABELS[c.type]}` : ''}</span>
                  <span className="card-row-q">{c.question}</span>
                </span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
