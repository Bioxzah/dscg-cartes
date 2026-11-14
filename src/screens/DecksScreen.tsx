import { Link } from 'react-router-dom';
import { MasteryCounts } from '../components/MasteryCounts.tsx';
import { PauseToggle } from '../components/PauseToggle.tsx';
import { themeStyle } from '../components/themeStyle.ts';
import { useAppData } from '../data/AppData.tsx';
import { countMastery } from '../scheduler/stats.ts';

const plural = (n: number) => `${n} carte${n > 1 ? 's' : ''}`;
const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

export function DecksScreen() {
  const { catalog, memory, settings, updateSettings } = useAppData();

  return (
    <main className="screen">
      <h1 className="screen-title">Paquets</h1>
      <p className="muted small intro">Coupe l’interrupteur pour mettre un thème en pause : il ne donne plus de nouvelles cartes, mais ses révisions continuent.</p>
      {catalog.tree.map((ue) => (
        <section key={ue.ue} className="ue">
          <div className="ue-head">
            <div className="label">{ue.ue} · {plural(ue.cardCount)}</div>
            <h2>{ue.ueTitre}</h2>
          </div>
          {ue.chapters.map((ch) => {
            const deckPaused = settings.pausedDecks.includes(ch.deck.id);
            return (
              <div key={ch.deck.id} className={`panel chapter${deckPaused ? ' paused' : ''}`}>
                <div className="chapter-head">
                  <div>
                    <div className="label">Chapitre {ch.deck.chapitre} · {ch.cardCount}</div>
                    <h3>{ch.deck.titre}</h3>
                  </div>
                  <PauseToggle
                    paused={deckPaused}
                    label={ch.deck.titre}
                    onToggle={() => void updateSettings({ pausedDecks: toggle(settings.pausedDecks, ch.deck.id) })}
                  />
                </div>
                <ul className="rows">
                  {ch.themes.map(({ theme, cards }) => {
                    const key = `${ch.deck.id}/${theme.id}`;
                    const paused = deckPaused || settings.pausedThemes.includes(key);
                    return (
                      <li key={theme.id} className={`row-split${paused ? ' paused' : ''}`}>
                        <Link className="row" to={`/paquets/${ch.deck.id}/${theme.id}`} style={themeStyle(theme.couleur)}>
                          <span className="dot" />
                          <span className="row-main">
                            <span className="row-title">{theme.titre}</span>
                            {paused ? (
                              <span className="mastery paused-tag">En pause · {cards.length} cartes</span>
                            ) : (
                              <MasteryCounts counts={countMastery(cards.map((c) => c.id), memory)} />
                            )}
                          </span>
                          <span className="chevron" aria-hidden="true">›</span>
                        </Link>
                        {!deckPaused && (
                          <PauseToggle
                            paused={paused}
                            label={theme.titre}
                            onToggle={() => void updateSettings({ pausedThemes: toggle(settings.pausedThemes, key) })}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
