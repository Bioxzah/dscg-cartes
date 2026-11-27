import { Link } from 'react-router-dom';
import { SyncStatus } from '../components/SyncStatus.tsx';
import { useAppData, useNow } from '../data/AppData.tsx';
import { planFor } from '../data/useSession.ts';
import { daysUntil, parseLocalDate } from '../scheduler/day.ts';
import { formatDuration } from '../scheduler/format.ts';
import { dayUsage, isPaused } from '../scheduler/plan.ts';
import { countMastery, nextDue, weekProgress, type WeekProgress } from '../scheduler/stats.ts';
import type { UeNode } from '../cards/catalog.ts';

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const dateFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const nextFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** Seconds per answer when there is no history yet today. */
const DEFAULT_ANSWER_MS = 15_000;
const UE_COLORS = ['violet', 'sarcelle', 'bleu', 'vert', 'rouge', 'ardoise'] as const;

function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 18 || h < 5) return 'Bonsoir';
  if (h >= 12) return 'Bon après-midi';
  return 'Bonjour';
}

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

  const perAnswer = usage.answers > 0 ? usage.timeMs / usage.answers : DEFAULT_ANSWER_MS;
  const minutes = Math.max(1, Math.round((total * perAnswer) / 60_000));
  const progress = usage.answers + total > 0 ? usage.answers / (usage.answers + total) : 1;

  return (
    <main className="screen home">
      <header className="home-head">
        <p className="home-date">{dayFmt.format(now)}</p>
        <h1 className="home-hello">{greeting(now)}</h1>
        <SyncStatus />
      </header>

      {total > 0 ? (
        <Link className="hero" to="/session">
          <div className="hero-body">
            <p className="hero-label">Session du jour</p>
            <p className="hero-title">{usage.answers > 0 ? 'Continuer' : 'Réviser'}</p>
            <p className="hero-meta">environ {minutes} min</p>
            <div className="hero-chips">
              {plan.counts.due > 0 && <span className="hero-chip"><b>{plan.counts.due}</b> à revoir</span>}
              {plan.counts.new > 0 && (
                <span className="hero-chip">
                  <b>{plan.counts.new}</b> nouvelle{plan.counts.new > 1 ? 's' : ''}
                  {plan.newUe ? ` · ${plan.newUe.replace(/^UE\s*/, 'UE ')}` : ''}
                </span>
              )}
              {plan.counts.learning > 0 && <span className="hero-chip"><b>{plan.counts.learning}</b> en cours</span>}
            </div>
          </div>
          <Ring value={progress} label={String(total)} sub={total > 1 ? 'cartes' : 'carte'} />
          <span className="hero-go" aria-hidden="true">→</span>
        </Link>
      ) : (
        <div className="hero done">
          <div className="hero-body">
            <p className="hero-label">Session du jour</p>
            <p className="hero-title">{usage.answers > 0 ? 'Bravo, c’est fait' : 'Rien à réviser'}</p>
            <p className="hero-meta">
              {usage.answers > 0
                ? `${usage.answers} réponse${usage.answers > 1 ? 's' : ''} en ${formatDuration(usage.timeMs)} aujourd’hui.`
                : 'Ta mémoire est à jour.'}
              {upcoming && <> Prochaine carte {nextFmt.format(upcoming)}.</>}
              {newLeft && settings.newPerDay > 0 ? ` Nouvelles cartes demain dès ${settings.dayStartHour} h.` : ''}
            </p>
            <Link className="hero-more" to="/paquets">Envie d’en faire plus ? Session libre ou quiz</Link>
          </div>
          <Ring value={1} label="✓" sub="à jour" />
        </div>
      )}

      <div className="home-tiles">
        <div className="panel tile exam-tile">
          <div className="label">Examen</div>
          <div className="tile-value">{days > 0 ? `J-${days}` : 'Jour J'}</div>
          <div className="muted small">Session {dateFmt.format(parseLocalDate(settings.examDate))}</div>
        </div>
        <div className="panel tile">
          <div className="label">Aujourd’hui</div>
          <div className="tile-value">{formatDuration(usage.timeMs)}</div>
          <div className="muted small">{usage.answers} réponse{usage.answers > 1 ? 's' : ''}</div>
        </div>
        <WeekTile week={week} />
      </div>

      <section className="home-progress" aria-labelledby="progress-title">
        <h2 id="progress-title" className="home-h2">Ta progression</h2>
        {data.catalog.tree.map((ue, i) => (
          <UeProgress key={ue.ue} ue={ue} color={UE_COLORS[i % UE_COLORS.length] ?? 'bleu'} />
        ))}
      </section>
    </main>
  );
}

/** A progress ring: the share of today's session already answered, with the remaining count inside. */
function Ring({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${Math.round(value * 100)} % de la session du jour`}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="ring-track" cx="40" cy="40" r={r} />
        <circle className="ring-fill" cx="40" cy="40" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
      </svg>
      <span className="ring-text">
        <span className="ring-num">{label}</span>
        <span className="ring-sub">{sub}</span>
      </span>
    </div>
  );
}

function UeProgress({ ue, color }: { ue: UeNode; color: string }) {
  const data = useAppData();
  const ids = ue.chapters.flatMap((ch) => ch.themes.flatMap((t) => t.cards.map((c) => c.id)));
  const m = countMastery(ids, data.memory);
  const n = ids.length || 1;
  const seen = m.learning + m.mastered;
  return (
    <Link className="panel ue-progress" to="/paquets" style={{ ['--c' as string]: `var(--${color})`, ['--cs' as string]: `var(--${color}-soft)` }}>
      <div className="ue-progress-head">
        <span className="ue-progress-name">
          <span className="ue-progress-tag">{ue.ue.replace(/^UE\s*/, 'UE ')}</span>
          {ue.ueTitre}
        </span>
        <span className="ue-progress-pct">{Math.round((seen / n) * 100)} %</span>
      </div>
      <div className="ue-bar" aria-hidden="true">
        <span className="ue-bar-mastered" style={{ width: `${(m.mastered / n) * 100}%` }} />
        <span className="ue-bar-learning" style={{ width: `${(m.learning / n) * 100}%` }} />
      </div>
      <div className="ue-progress-legend muted small">
        <span><i className="ue-dot mastered" />{m.mastered} maîtrisée{m.mastered > 1 ? 's' : ''}</span>
        <span><i className="ue-dot learning" />{m.learning} en cours</span>
        <span><i className="ue-dot new" />{m.new} à découvrir</span>
      </div>
    </Link>
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
