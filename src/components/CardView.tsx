import { useCallback, useState } from 'react';
import { TYPE_LABELS } from '../cards/catalog.ts';
import type { Card, Theme } from '../cards/types.ts';
import { ficheUrl } from '../fiches/fiches.ts';
import { FicheSheet } from './FicheSheet.tsx';
import { RichText } from './RichText.tsx';
import { themeStyle } from './themeStyle.ts';

interface Props {
  card: Card;
  theme: Theme;
  /** Deck of the card: when the deck has a fiche, the answer offers to open it at the right passage. */
  deckId: string;
  showAnswer: boolean;
  /** When set, tapping the card reveals the answer. */
  onReveal?: () => void;
}

/** One card: theme band, labels, question and, when asked, the answer. */
export function CardView({ card, theme, deckId, showAnswer, onReveal }: Props) {
  const typeLabel = TYPE_LABELS[card.type];
  const tappable = !showAnswer && onReveal;
  const fiche = ficheUrl(deckId);
  const [ficheOpen, setFicheOpen] = useState(false);
  const closeFiche = useCallback(() => setFicheOpen(false), []);
  return (
    <article
      className={`panel card${tappable ? ' tappable' : ''}`}
      style={themeStyle(theme.couleur)}
      onClick={tappable ? onReveal : undefined}
    >
      <div className="card-band" />
      <div className="card-body">
        <div className="card-tags">
          <span className="label theme-tag">{theme.titre}</span>
          {typeLabel && <span className="label">{typeLabel}</span>}
        </div>
        <h2 className="card-question">
          <RichText text={card.question} />
        </h2>
        {showAnswer && (
          <div className="answer">
            <p>
              <RichText text={card.reponse} />
            </p>
            {card.source && <div className="answer-source">{card.source}</div>}
            {fiche && (
              <button className="fiche-link" onClick={() => setFicheOpen(true)}>
                Voir dans la fiche
              </button>
            )}
          </div>
        )}
        {ficheOpen && fiche && <FicheSheet url={fiche} card={card} title={theme.titre} onClose={closeFiche} />}
      </div>
    </article>
  );
}
