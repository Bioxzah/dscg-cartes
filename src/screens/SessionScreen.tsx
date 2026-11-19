import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardView } from '../components/CardView.tsx';
import { useAppData } from '../data/AppData.tsx';
import { useSync } from '../sync/SyncProvider.tsx';
import { useSession, type SessionMode } from '../data/useSession.ts';
import { formatDuration, formatInterval } from '../scheduler/format.ts';
import { recap, remaining } from '../scheduler/session.ts';
import type { Grade } from '../scheduler/types.ts';

const BUTTONS: { grade: Grade; label: string; key: string; tone: string }[] = [
  { grade: 1, label: 'À revoir', key: '1', tone: 'again' },
  { grade: 3, label: 'Correct', key: '2', tone: 'good' },
  { grade: 4, label: 'Facile', key: '3', tone: 'easy' },
];

const CAS_GRID = ['Règle citée', 'Conditions vérifiées dans les faits', 'Conclusion et sanction'];

export function DailySessionScreen() {
  return <SessionScreen mode={{ kind: 'daily' }} />;
}

export function FreeSessionScreen() {
  const { deckId = '', themeId = '' } = useParams();
  return <SessionScreen mode={{ kind: 'libre', deckId, themeId }} />;
}

function SessionScreen({ mode }: { mode: SessionMode }) {
  const data = useAppData();
  const navigate = useNavigate();
  const { session, rate, undo, preview, canUndo } = useSession(data, mode);
  const { requestSync } = useSync();

  // Sync at the end of a session (spec §4.5), and when leaving it early.
  const finished = session.current === null;
  useEffect(() => {
    if (finished) requestSync();
  }, [finished, requestSync]);
  useEffect(() => () => requestSync(), [requestSync]);
  // The answer is visible for one session state only: any answer or undo hides it again.
  const [revealedFor, setRevealedFor] = useState<typeof session | null>(null);
  const revealed = revealedFor === session;
  const reveal = () => setRevealedFor(session);
  const [draft, setDraft] = useState('');
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);

  const cardId = session.current;
  const card = cardId ? data.catalog.cardsById.get(cardId) : undefined;
  const place = cardId ? data.catalog.placeOf.get(cardId) : undefined;
  const exit = mode.kind === 'daily' ? '/' : `/paquets/${mode.deckId}/${mode.themeId}`;

  // Reset the case-study inputs whenever the card on screen changes.
  useEffect(() => {
    setDraft('');
    setChecks([false, false, false]);
  }, [session]);

  const onRate = (grade: Grade) => void rate(grade);
  const onUndo = () => {
    if (!canUndo) return;
    void undo().then((restored) => restored && setRevealedFor(restored));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') return navigate(exit);
      if (e.key === 'z' || e.key === 'Z') return onUndo();
      if (!cardId) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        reveal();
        return;
      }
      const button = BUTTONS.find((b) => b.key === e.key);
      if (revealed && button) onRate(button.grade);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!cardId) return <Recap session={session} exit={exit} empty={session.answers.length === 0} />;
  if (!card || !place) return null;

  const now = new Date();
  const next = revealed ? preview(cardId, now) : null;
  const isCas = card.type === 'cas';

  return (
    <div className="session">
      <header className="session-top">
        <Link className="icon-btn" to={exit} aria-label="Quitter la session">✕</Link>
        <span className="label">{remaining(session)} restante{remaining(session) > 1 ? 's' : ''}</span>
        <button className="icon-btn" onClick={onUndo} disabled={!canUndo} aria-label="Annuler la dernière note (Z)">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
      </header>

      <main className="session-body">
        <CardView card={card} theme={place.theme} deckId={place.deck.id} showAnswer={revealed} onReveal={reveal} />

        {isCas && !revealed && (
          <textarea
            className="draft"
            placeholder="Ma réponse (facultatif) : règle, application aux faits, conclusion"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
          />
        )}
        {isCas && revealed && (
          <div className="panel cas-check">
            {draft.trim() && <p className="cas-draft">{draft}</p>}
            <div className="label">Ta réponse contenait…</div>
            <div className="chips">
              {CAS_GRID.map((item, i) => (
                <button
                  key={item}
                  className={`chip${checks[i] ? ' on' : ''}`}
                  aria-pressed={checks[i]}
                  onClick={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="session-actions">
        {revealed && next ? (
          <div className="grades">
            {BUTTONS.map((b) => (
              <button key={b.grade} className={`grade ${b.tone}`} onClick={() => onRate(b.grade)}>
                <span className="grade-label">{b.label}</span>
                <span className="grade-interval">{formatInterval(now, next[b.grade].dueAt)}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className="primary" onClick={reveal}>
            Voir la réponse
          </button>
        )}
      </footer>
    </div>
  );
}

function Recap({ session, exit, empty }: { session: Parameters<typeof recap>[0]; exit: string; empty: boolean }) {
  const r = recap(session);
  return (
    <main className="screen">
      <h1 className="screen-title">{empty ? 'Rien à réviser' : 'Session terminée'}</h1>
      {!empty && (
        <div className="panel recap">
          <div className="recap-item">
            <div className="label">Cartes vues</div>
            <div className="stat-value">{r.cards}</div>
          </div>
          <div className="recap-item">
            <div className="label">Réussite</div>
            <div className="stat-value">{Math.round(r.successRate * 100)} %</div>
          </div>
          <div className="recap-item">
            <div className="label">Temps</div>
            <div className="stat-value">{formatDuration(r.timeMs)}</div>
          </div>
        </div>
      )}
      <Link className="primary block" to={exit}>
        {exit === '/' ? 'Retour à l’accueil' : 'Retour au thème'}
      </Link>
    </main>
  );
}
