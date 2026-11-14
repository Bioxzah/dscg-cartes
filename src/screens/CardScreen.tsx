import { Link, useParams } from 'react-router-dom';
import { CardView } from '../components/CardView.tsx';
import { useAppData } from '../data/AppData.tsx';
import { formatInterval } from '../scheduler/format.ts';
import { compareReviews } from '../scheduler/replay.ts';
import { mastery } from '../scheduler/stats.ts';
import { NotFound } from './NotFound.tsx';

const GRADE_LABELS = { 1: 'À revoir', 2: 'Difficile', 3: 'Correct', 4: 'Facile' } as const;
const MASTERY_LABELS = { new: 'Nouvelle', learning: 'En apprentissage', mastered: 'Maîtrisée' } as const;
const when = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function CardScreen() {
  const { cardId = '' } = useParams();
  const { catalog, reviews, memory } = useAppData();
  const card = catalog.cardsById.get(cardId);
  const place = catalog.placeOf.get(cardId);
  if (!card || !place) return <NotFound />;

  const mem = memory.get(cardId);
  const history = reviews.filter((r) => r.card_id === cardId).sort(compareReviews).reverse();

  return (
    <main className="screen">
      <Link className="back" to={`/paquets/${place.deck.id}/${place.theme.id}`}>‹ {place.theme.titre}</Link>
      <CardView card={card} theme={place.theme} showAnswer />
      <p className="label card-id">{card.id}</p>

      <h2 className="section-title">Historique</h2>
      <div className="panel">
        <div className="kv"><span>État</span><span className="muted">{MASTERY_LABELS[mastery(mem)]}</span></div>
        {mem && (
          <>
            <div className="kv"><span>Prochaine révision</span><span className="muted">{when.format(mem.fsrs.dueAt)} ({formatInterval(new Date(), mem.fsrs.dueAt)})</span></div>
            <div className="kv"><span>Stabilité</span><span className="muted">{mem.fsrs.stability.toFixed(1)} j</span></div>
            <div className="kv"><span>Échecs</span><span className="muted">{mem.failures}</span></div>
          </>
        )}
      </div>
      {history.length > 0 ? (
        <ul className="rows panel history">
          {history.map((r) => (
            <li key={r.id} className={`kv${r.annulee ? ' cancelled' : ''}`}>
              <span>{GRADE_LABELS[r.rating]}{r.annulee ? ' (annulée)' : ''}{r.libre ? ' · libre' : ''}</span>
              <span className="muted">{when.format(new Date(r.reviewed_at))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Tu n’as pas encore révisé cette carte.</p>
      )}
    </main>
  );
}
