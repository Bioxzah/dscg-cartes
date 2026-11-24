import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { chapterLabel } from '../cards/catalog.ts';
import { CardView } from '../components/CardView.tsx';
import { RichText } from '../components/RichText.tsx';
import { useAppData } from '../data/AppData.tsx';
import { choiceOrder, pickQuiz, quizScore, type QuizResult } from '../scheduler/quiz.ts';
import { NotFound } from './NotFound.tsx';

/** A new quiz each time the route is entered, even from the quiz's own "Refaire" button. */
export function QuizRoute() {
  const location = useLocation();
  return <QuizScreen key={location.key} />;
}

/** A one-off test on a deck: a score at the end, no effect on the revision schedule. */
function QuizScreen() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();
  const { catalog } = useAppData();
  const chapter = useMemo(() => catalog.tree.flatMap((ue) => ue.chapters).find((ch) => ch.deck.id === deckId), [catalog, deckId]);
  const [ids] = useState(() => (chapter ? pickQuiz(chapter.themes.flatMap((t) => t.cards), Math.random) : []));
  const [results, setResults] = useState<QuizResult[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  const cardId = ids[results.length];
  const card = cardId ? catalog.cardsById.get(cardId) : undefined;
  const place = cardId ? catalog.placeOf.get(cardId) : undefined;
  const order = useMemo(() => (card?.type === 'qcm' && card.choix ? choiceOrder(card.choix.length, Math.random) : undefined), [card]);
  const exit = '/paquets';

  const record = (ok: boolean) => {
    if (!cardId) return;
    setResults((r) => [...r, { cardId, ok }]);
    setRevealed(false);
    setChosen(null);
  };
  const choose = (i: number) => {
    setChosen(i);
    setRevealed(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !card) return;
      if (e.key === 'Escape') return navigate(exit);
      if (card.type === 'qcm' && !revealed) {
        const i = order?.['abcde'.indexOf(e.key.toLowerCase())];
        if (i !== undefined) choose(i);
        return;
      }
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) return setRevealed(true);
      if (revealed && card.type === 'qcm' && (e.key === ' ' || e.key === 'Enter')) return record(chosen === card.bonne);
      if (revealed && card.type !== 'qcm' && e.key === '1') return record(false);
      if (revealed && card.type !== 'qcm' && e.key === '2') return record(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!chapter) return <NotFound />;
  if (ids.length === 0) {
    return (
      <main className="screen">
        <h1 className="screen-title">Pas de quiz ici</h1>
        <p className="muted">Ce chapitre n’a pas encore de questions de quiz.</p>
        <Link className="primary block" to={exit}>Retour aux paquets</Link>
      </main>
    );
  }

  if (!card || !place) {
    const score = quizScore(results);
    const pct = Math.round((score.right / score.total) * 100);
    return (
      <main className="screen">
        <p className="label">{chapterLabel(chapter.deck.chapitre)} · {chapter.deck.titre}</p>
        <h1 className="screen-title">Quiz terminé</h1>
        <div className="panel quiz-score">
          <div className="stat-value">{score.right} / {score.total}</div>
          <p className="muted">
            {pct >= 85 ? 'Les fondamentaux sont solides.' : pct >= 60 ? 'Bonne base : revois les questions ci-dessous.' : 'Reprends la fiche sur les points ci-dessous, puis refais un quiz.'}
          </p>
        </div>
        {score.mistakes.length > 0 && (
          <>
            <h2 className="section-title">À revoir</h2>
            <ul className="panel rows quiz-mistakes">
              {score.mistakes.map((id) => {
                const c = catalog.cardsById.get(id);
                return (
                  c && (
                    <li key={id}>
                      <Link className="row" to={`/carte/${id}`}>
                        <span className="row-main"><RichText text={c.question.split('\n\n').pop() ?? c.question} /></span>
                        <span className="chevron" aria-hidden="true">›</span>
                      </Link>
                    </li>
                  )
                );
              })}
            </ul>
          </>
        )}
        <button className="primary block" onClick={() => navigate(`/quiz/${deckId}`)}>Refaire un quiz</button>
        <Link className="secondary block" to={exit}>Retour aux paquets</Link>
      </main>
    );
  }

  const isQcm = card.type === 'qcm';
  return (
    <div className="session">
      <header className="session-top">
        <Link className="icon-btn" to={exit} aria-label="Quitter le quiz">✕</Link>
        <span className="label">Quiz · {results.length + 1} / {ids.length}</span>
        <span className="icon-btn" aria-hidden="true" />
      </header>
      <main className="session-body">
        <CardView card={card} theme={place.theme} deckId={place.deck.id} showAnswer={revealed} onReveal={() => setRevealed(true)} chosen={chosen} onChoose={choose} order={order} />
      </main>
      <footer className="session-actions">
        {isQcm && !revealed ? (
          <p className="qcm-hint muted">Choisis une réponse</p>
        ) : isQcm ? (
          <button className="primary" onClick={() => record(chosen === card.bonne)}>
            {chosen === card.bonne ? 'Juste · Suivante' : 'Raté · Suivante'}
          </button>
        ) : !revealed ? (
          <button className="primary" onClick={() => setRevealed(true)}>Voir la réponse</button>
        ) : (
          <div className="grades two">
            <button className="grade again" onClick={() => record(false)}>
              <span className="grade-label">Faux</span>
            </button>
            <button className="grade easy" onClick={() => record(true)}>
              <span className="grade-label">Juste</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
