import { catalog } from '../cards/load.ts';
import { daysUntil } from '../scheduler/day.ts';
const DEFAULT_EXAM_DATE = new Date(2027, 9, 1);

export function TodayScreen() {
  const days = daysUntil(DEFAULT_EXAM_DATE, new Date());
  const total = catalog.tree.reduce((n, ue) => n + ue.cardCount, 0);

  return (
    <main className="screen">
      <h1 className="screen-title">Aujourd’hui</h1>
      <div className="panel stat">
        <div className="label">Examen du DSCG</div>
        <div className="stat-value">{days > 0 ? `J-${days}` : 'Jour J'}</div>
        <div className="muted">
          {DEFAULT_EXAM_DATE.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div className="panel stat">
        <div className="label">Cartes disponibles</div>
        <div className="stat-value">{total}</div>
      </div>
      <div className="panel notice">Les sessions de révision arrivent au prochain jalon.</div>
    </main>
  );
}
