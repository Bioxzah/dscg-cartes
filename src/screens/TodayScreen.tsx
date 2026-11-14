import { Link } from 'react-router-dom';
import { SyncStatus } from '../components/SyncStatus.tsx';
import { useAppData, useNow } from '../data/AppData.tsx';
import { planFor } from '../data/useSession.ts';
import { daysUntil, parseLocalDate } from '../scheduler/day.ts';
import { formatDuration } from '../scheduler/format.ts';
import { dayUsage, isPaused } from '../scheduler/plan.ts';
import { nextDue, streak } from '../scheduler/stats.ts';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const nextFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function TodayScreen() {
  const data = useAppData();
  const now = useNow();
  const { settings } = data;
  const plan = planFor(data, { kind: 'daily' }, now);
  const total = plan.queue.length + plan.pending.length;
  const usage = dayUsage(data.log, now, settings.dayStartHour);
  const days = daysUntil(parseLocalDate(settings.examDate), now);
  const series = streak(data.log, now, settings.dayStartHour);
  const upcoming = total === 0 ? nextDue(data.cards.map((c) => c.id), data.memory) : null;
  const newLeft = data.cards.some((c) => !data.memory.has(c.id) && !isPaused(c, settings));

  return (
    <main className="screen">
      <h1 className="screen-title">Aujourd’hui</h1>
      <SyncStatus />

      {total > 0 ? (
        <Link className="panel start" to="/session">
          <span className="start-main">
            <span className="start-title">Réviser</span>
            <span className="start-count">{total} carte{total > 1 ? 's' : ''}</span>
          </span>
          <span className="start-split">
            <span><b>{plan.counts.due}</b> à revoir</span>
            <span><b>{plan.counts.new}</b> nouvelles</span>
            <span><b>{plan.counts.learning}</b> en cours</span>
          </span>
        </Link>
      ) : (
        <div className="panel empty">
          <div className="start-title">Rien à réviser aujourd’hui</div>
          <p className="muted">
            {upcoming && <>Prochaine révision : {nextFmt.format(upcoming)}. </>}
            {newLeft && settings.newPerDay > 0 ? `De nouvelles cartes t’attendent demain dès ${settings.dayStartHour} h. ` : ''}
            Pour avancer quand même, lance une session libre sur un thème.
          </p>
          <Link className="secondary block" to="/paquets">Choisir un thème</Link>
        </div>
      )}

      <div className="tiles">
        <div className="panel tile">
          <div className="label">Examen</div>
          <div className="tile-value">{days > 0 ? `J-${days}` : 'Jour J'}</div>
          <div className="muted small">{dateFmt.format(parseLocalDate(settings.examDate))}</div>
        </div>
        <div className="panel tile">
          <div className="label">Série</div>
          <div className="tile-value">{series} j</div>
          <div className="muted small">jours d’affilée</div>
        </div>
        <div className="panel tile">
          <div className="label">Aujourd’hui</div>
          <div className="tile-value">{formatDuration(usage.timeMs)}</div>
          <div className="muted small">{usage.answers} réponse{usage.answers > 1 ? 's' : ''}</div>
        </div>
      </div>
    </main>
  );
}
