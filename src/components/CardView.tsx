import { TYPE_LABELS } from '../cards/catalog.ts';
import type { Card, Theme } from '../cards/types.ts';
import { RichText } from './RichText.tsx';
import { themeStyle } from './themeStyle.ts';

interface Props {
  card: Card;
  theme: Theme;
  showAnswer: boolean;
  /** When set, tapping the card reveals the answer. */
  onReveal?: () => void;
}

/** One card: theme band, labels, question and, when asked, the answer. */
export function CardView({ card, theme, showAnswer, onReveal }: Props) {
  const typeLabel = TYPE_LABELS[card.type];
  const tappable = !showAnswer && onReveal;
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
          </div>
        )}
      </div>
    </article>
  );
}
