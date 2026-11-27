import { Link } from 'react-router-dom';
import { chapterLabel } from '../cards/catalog.ts';
import { MasteryCounts } from '../components/MasteryCounts.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { UeMeter } from '../components/UeMeter.tsx';
import { ueLabel, ueStyle } from '../components/ueColor.ts';
import { PauseToggle } from '../components/PauseToggle.tsx';
import { themeStyle } from '../components/themeStyle.ts';
import { useAppData } from '../data/AppData.tsx';
import { QUIZ_MIN, QUIZ_SIZE, quizCards } from '../scheduler/quiz.ts';
import { countMastery } from '../scheduler/stats.ts';

const plural = (n: number) => `${n} carte${n > 1 ? 's' : ''}`;
const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

export function DecksScreen() {
  const { catalog, memory, settings, updateSettings } = useAppData();

  return (
    <main className="screen">
      <PageHeader eyebrow={`Bibliothèque · ${plural(catalog.tree.reduce((n, u) => n + u.cardCount, 0))}`} title="Paquets" />
      <p className="muted small intro">Coupe l’interrupteur pour mettre un thème en pause : il ne donne plus de nouvelles cartes, mais ses révisions continuent.</p>
      {catalog.tree.map((ue) => (
        <section key={ue.ue} className="ue" style={ueStyle(catalog.tree, ue.ue)}>
          <div className="panel ue-card">
            <div className="ue-head">
              <span className="ue-tag">{ueLabel(ue.ue)}</span>
              <span className="label">{plural(ue.cardCount)}</span>
              <h2>{ue.ueTitre}</h2>
            </div>
            <UeMeter counts={countMastery(ue.chapters.flatMap((ch) => ch.themes.flatMap((t) => t.cards.map((c) => c.id))), memory)} />
          </div>
          {ue.chapters.map((ch) => {
            const deckPaused = settings.pausedDecks.includes(ch.deck.id);
            const quizCount = quizCards(ch.themes.flatMap((t) => t.cards)).length;
            return (
              <div key={ch.deck.id} className={`panel chapter${deckPaused ? ' paused' : ''}`}>
                <div className="chapter-head">
                  <div>
                    <div className="label"><span className="chap-pill">{chapterLabel(ch.deck.chapitre)}</span>{plural(ch.cardCount)}</div>
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
                {quizCount >= QUIZ_MIN && (
                  <Link className="row quiz-row" to={`/quiz/${ch.deck.id}`}>
                    <span className="quiz-icon" aria-hidden="true">?</span>
                    <span className="row-main">
                      <span className="row-title">Faire un quiz</span>
                      <span className="mastery">{Math.min(quizCount, QUIZ_SIZE)} questions tirées au hasard, avec un score</span>
                    </span>
                    <span className="chevron" aria-hidden="true">›</span>
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
