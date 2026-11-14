import { Link } from 'react-router-dom';
import { catalog } from '../cards/load.ts';
import { themeStyle } from '../components/themeStyle.ts';

const plural = (n: number) => `${n} carte${n > 1 ? 's' : ''}`;

export function DecksScreen() {
  return (
    <main className="screen">
      <h1 className="screen-title">Paquets</h1>
      {catalog.tree.map((ue) => (
        <section key={ue.ue} className="ue">
          <div className="ue-head">
            <div className="label">{ue.ue} · {plural(ue.cardCount)}</div>
            <h2>{ue.ueTitre}</h2>
          </div>
          {ue.chapters.map((ch) => (
            <div key={ch.deck.id} className="panel chapter">
              <div className="chapter-head">
                <div>
                  <div className="label">Chapitre {ch.deck.chapitre}</div>
                  <h3>{ch.deck.titre}</h3>
                </div>
                <span className="row-count">{ch.cardCount}</span>
              </div>
              <ul className="rows">
                {ch.themes.map(({ theme, cards }) => (
                  <li key={theme.id}>
                    <Link className="row" to={`/paquets/${ch.deck.id}/${theme.id}`} style={themeStyle(theme.couleur)}>
                      <span className="dot" />
                      <span className="row-main">{theme.titre}</span>
                      <span className="row-count">{cards.length}</span>
                      <span className="chevron" aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
