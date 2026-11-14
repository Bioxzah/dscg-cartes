import { TYPE_LABELS } from '../cards/catalog.ts';
import type { Card, Theme } from '../cards/types.ts';
import { RichText } from './RichText.tsx';
import { themeStyle } from './themeStyle.ts';

interface Props {
  card: Card;
  theme: Theme;
  showAnswer: boolean;
}

/** One card: theme band, labels, question and, when asked, the answer. */
export function CardView({ card, theme, showAnswer }: Props) {
  const typeLabel = TYPE_LABELS[card.type];
  return (
    <article className="panel card" style={themeStyle(theme.couleur)}>
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
