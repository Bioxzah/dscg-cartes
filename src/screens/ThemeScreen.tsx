import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { searchCards, TYPE_LABELS } from '../cards/catalog.ts';
import { catalog } from '../cards/load.ts';
import { themeStyle } from '../components/themeStyle.ts';
import { NotFound } from './NotFound.tsx';

export function ThemeScreen() {
  const { deckId = '', themeId = '' } = useParams();
  const node = catalog.findTheme(deckId, themeId);
  const [query, setQuery] = useState('');
  const results = useMemo(() => (node ? searchCards(node.cards, query) : []), [node, query]);

  if (!node) return <NotFound />;
  const { deck, theme, cards } = node;

  return (
    <main className="screen" style={themeStyle(theme.couleur)}>
      <Link className="back" to="/paquets">‹ Paquets</Link>
      <header className="theme-head">
        <div className="label">{deck.ue} · Chapitre {deck.chapitre} · {deck.titre}</div>
        <h1 className="screen-title">{theme.titre}</h1>
      </header>
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
