import { chapterLabel } from '../cards/catalog.ts';
import { Link } from 'react-router-dom';
import { useAppData } from '../data/AppData.tsx';
import { hasFiche } from '../fiches/fiches.ts';
import { ficheShelves } from '../fiches/library.ts';

export function FichesScreen() {
  const { catalog } = useAppData();
  const shelves = ficheShelves(catalog.tree, hasFiche);

  return (
    <main className="screen">
      <h1 className="screen-title">Fiches</h1>
      {shelves.length === 0 && <p className="muted">Les fiches de révision apparaîtront ici avec leurs chapitres.</p>}
      {shelves.map((shelf) => (
        <section key={shelf.ue} className="ue">
          <div className="ue-head">
            <div className="label">{shelf.ue}</div>
            <h2>{shelf.ueTitre}</h2>
          </div>
          <ul className="panel rows fiche-list">
            {shelf.fiches.map((f) => (
              <li key={f.deckId}>
                <Link className="row" to={`/fiches/${f.deckId}`}>
                  <span className="row-main">
                    <span className="label">{chapterLabel(f.chapitre)}</span>
                    <span className="row-title">{f.titre}</span>
                  </span>
                  <span className="chevron" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
