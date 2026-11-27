/** Stacked bar (mastered, learning, new) with its legend, in the UE color (--c). */
export function UeMeter({ counts }: { counts: { new: number; learning: number; mastered: number } }) {
  const n = counts.new + counts.learning + counts.mastered || 1;
  return (
    <>
      <div className="ue-bar" aria-hidden="true">
        <span className="ue-bar-mastered" style={{ width: `${(counts.mastered / n) * 100}%` }} />
        <span className="ue-bar-learning" style={{ width: `${(counts.learning / n) * 100}%` }} />
      </div>
      <div className="ue-progress-legend muted small">
        <span><i className="ue-dot mastered" />{counts.mastered} maîtrisée{counts.mastered > 1 ? 's' : ''}</span>
        <span><i className="ue-dot learning" />{counts.learning} en cours</span>
        <span><i className="ue-dot new" />{counts.new} à découvrir</span>
      </div>
    </>
  );
}
