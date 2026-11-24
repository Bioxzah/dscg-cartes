import { useCallback, useState } from 'react';
import { TYPE_LABELS } from '../cards/catalog.ts';
import { splitCasAnswer, splitCasQuestion } from '../cards/richText.ts';
import type { Card, Theme } from '../cards/types.ts';
import { ficheUrl } from '../fiches/fiches.ts';
import { FicheSheet } from './FicheSheet.tsx';
import { JournalTable } from './JournalTable.tsx';
import { RichText } from './RichText.tsx';
import { themeStyle } from './themeStyle.ts';

interface Props {
  card: Card;
  theme: Theme;
  /** Deck of the card: when the deck has a fiche, the answer offers to open it at the right passage. */
  deckId: string;
  showAnswer: boolean;
  /** When set, tapping the card reveals the answer (not for a qcm: the choice reveals it). */
  onReveal?: () => void;
  /** qcm: the choice made (index in card.choix), or null before choosing. */
  chosen?: number | null;
  /** qcm: called with the index in card.choix; unset when the choices are only shown. */
  onChoose?: (index: number) => void;
  /** qcm: display order of the choices (indexes in card.choix). Defaults to the file order. */
  order?: number[];
}

const LETTERS = 'ABCDE';

/** One card: theme band, labels, question and, when asked, the answer. */
export function CardView({ card, theme, deckId, showAnswer, onReveal, chosen = null, onChoose, order }: Props) {
  const typeLabel = TYPE_LABELS[card.type];
  const isQcm = card.type === 'qcm' && Array.isArray(card.choix);
  const tappable = !showAnswer && onReveal && !isQcm;
  const fiche = ficheUrl(deckId);
  const [ficheOpen, setFicheOpen] = useState(false);
  const closeFiche = useCallback(() => setFicheOpen(false), []);
  const isCas = card.type === 'cas';
  const casQuestion = isCas ? splitCasQuestion(card.question) : null;
  const casSteps = isCas ? splitCasAnswer(card.reponse) : null;
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
        {casQuestion ? (
          <>
            <p className="cas-facts">
              <RichText text={casQuestion.facts} />
            </p>
            <h2 className="card-question">
              <RichText text={casQuestion.ask} />
            </h2>
          </>
        ) : (
          <h2 className="card-question">
            <RichText text={card.question} />
          </h2>
        )}
        {isQcm && (
          <ol className="qcm-choices">
            {(order ?? card.choix!.map((_, i) => i)).map((i, pos) => {
              const state = showAnswer ? (i === card.bonne ? ' right' : i === chosen ? ' wrong' : ' faded') : '';
              return (
                <li key={i}>
                  <button
                    className={`qcm-choice${state}`}
                    disabled={showAnswer || !onChoose}
                    onClick={() => onChoose?.(i)}
                    aria-label={`${LETTERS[pos]} : ${card.choix![i]}`}
                  >
                    <span className="qcm-letter" aria-hidden="true">{LETTERS[pos]}</span>
                    <span className="qcm-text">
                      <RichText text={card.choix![i] ?? ''} />
                    </span>
                    {showAnswer && i === card.bonne && <span className="qcm-mark">Bonne réponse</span>}
                    {showAnswer && i === chosen && i !== card.bonne && <span className="qcm-mark">Ton choix</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {showAnswer && (
          <div className="answer">
            {card.journal && <JournalTable lines={card.journal} />}
            {casSteps ? (
              <ol className="cas-steps">
                {casSteps.map((step) => (
                  <li key={step.label}>
                    <span className="label">{step.label}</span>
                    <p>
                      <RichText text={step.text} />
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                <RichText text={card.reponse} />
              </p>
            )}
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
