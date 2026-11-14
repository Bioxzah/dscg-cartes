import { Link } from 'react-router-dom';
import { SyncStatus } from '../components/SyncStatus.tsx';
import { useAppData, useNow } from '../data/AppData.tsx';
import { planFor } from '../data/useSession.ts';
import { daysUntil, parseLocalDate } from '../scheduler/day.ts';
import { formatDuration } from '../scheduler/format.ts';
import { dayUsage, isPaused } from '../scheduler/plan.ts';
import { nextDue, weekProgress, type WeekProgress } from '../scheduler/stats.ts';

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
  const week = weekProgress(data.log, now, settings.dayStartHour, settings.daysPerWeek);
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

      <div className="tiles two">
        <WeekTile week={week} />
        <div className="panel tile">
          <div className="label">Examen</div>
          <div className="tile-value">{days > 0 ? `J-${days}` : 'Jour J'}</div>
          <div className="muted small">{dateFmt.format(parseLocalDate(settings.examDate))}</div>
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

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function weekMessage(w: WeekProgress): string {
  if (w.activeDays >= w.goal) return w.weeksInARow > 1 ? `Objectif atteint, ${w.weeksInARow} semaines de suite` : 'Objectif atteint';
  if (w.weeksInARow > 0) return `${w.weeksInARow} semaine${w.weeksInARow > 1 ? 's' : ''} réussie${w.weeksInARow > 1 ? 's' : ''} de suite`;
  return 'Un jour de repos par semaine, quand tu veux';
}

/** Weekly goal (6 days by default): any day can be the rest day. */
function WeekTile({ week }: { week: WeekProgress }) {
  const done = week.activeDays >= week.goal;
  return (
    <div className="panel tile week-tile">
      <div className="label">Cette semaine</div>
      <div className="tile-value">{Math.min(week.activeDays, 7)}<span className="tile-of"> / {week.goal} j</span></div>
      <div className="week-dots" aria-label={`${week.activeDays} jours de révision sur ${week.goal} cette semaine`}>
        {week.days.map((d, i) => (
          <span key={d.key} className={`week-dot${d.active ? ' on' : ''}${d.today ? ' today' : ''}`} title={d.key} aria-hidden="true">
            {WEEKDAYS[i]}
          </span>
        ))}
      </div>
      <div className={`muted small${done ? ' goal-done' : ''}`}>{weekMessage(week)}</div>
    </div>
  );
}
