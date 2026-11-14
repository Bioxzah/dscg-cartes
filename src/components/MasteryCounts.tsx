export function MasteryCounts({ counts }: { counts: { new: number; learning: number; mastered: number } }) {
  return (
    <span className="mastery" aria-label={`${counts.new} nouvelles, ${counts.learning} en apprentissage, ${counts.mastered} maîtrisées`}>
      {counts.new} nouv. · {counts.learning} en cours · {counts.mastered} maîtrisées
    </span>
  );
}
