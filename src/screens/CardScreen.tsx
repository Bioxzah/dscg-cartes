import { Link, useParams } from 'react-router-dom';
import { catalog } from '../cards/load.ts';
import { CardView } from '../components/CardView.tsx';
import { NotFound } from './NotFound.tsx';

export function CardScreen() {
  const { cardId = '' } = useParams();
  const card = catalog.cardsById.get(cardId);
  const place = catalog.placeOf.get(cardId);
  if (!card || !place) return <NotFound />;

  return (
    <main className="screen">
      <Link className="back" to={`/paquets/${place.deck.id}/${place.theme.id}`}>‹ {place.theme.titre}</Link>
      <CardView card={card} theme={place.theme} showAnswer />
      <p className="label" style={{ marginTop: 16 }}>{card.id}</p>
      <div className="panel notice">L’historique de tes révisions sur cette carte apparaîtra ici.</div>
    </main>
  );
}
