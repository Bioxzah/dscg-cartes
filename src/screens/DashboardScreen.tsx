import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { themeStyle } from '../components/themeStyle.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { useAppData, useNow, type AppData } from '../data/AppData.tsx';
import { useProjection } from '../data/useProjection.ts';
import {
  activityGrid,
  averageAnswerMs,
  loadForecast,
  successRate,
  weakCards,
  weakCardsText,
  type ActivityDay,
  type LoadDay,
} from '../scheduler/dashboard.ts';
import { countMastery } from '../scheduler/stats.ts';
import type { Projection } from '../scheduler/dashboard.ts';

const pct = (x: number) => `${Math.round(x * 100)} %`;
const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtPace = (x: number) => (x === 0 ? '0' : x < 10 ? x.toFixed(1).replace('.', ',') : String(Math.round(x)));
/** "1er octobre 2027", "2 août 2027" */
const fmtLong = (d: Date) => fmtDate.format(d).replace(/^1 /, '1er ');

export function DashboardScreen() {
  const data = useAppData();
  const now = useNow();
  const ids = useMemo(() => data.cards.map((c) => c.id), [data.cards]);

  return (
    <main className="screen dashboard">
      <PageHeader eyebrow="Ta progression" title="Tableau de bord" />
      <ProjectionPanel data={data} />
      <LoadPanel data={data} ids={ids} now={now} />
      <ActivityPanel data={data} now={now} />
      <MasteryPanel data={data} />
      <WeakPanel data={data} ids={ids} now={now} />
    </main>
  );
}

// ---------- Projection ----------

function ProjectionPanel({ data }: { data: AppData }) {
  const { projection: p, computing, error } = useProjection(data);
  return (
    <section aria-labelledby="proj-title">
      <h2 className="section-title" id="proj-title">Projection à l’examen</h2>
      {error && <p className="backup-msg error">{error}</p>}
      {!p ? (
        <div className="panel notice">Calcul en cours…</div>
      ) : (
        <div className={computing ? 'stale' : undefined}>
          <div className="tiles two">
            <div className="panel tile">
              <div className="label">Maîtrisées à l’examen</div>
              <div className="tile-value">{p.masteredAtExam} <span className="tile-of">/ {p.totalCards}</span></div>
              <div className="muted small">le {fmtLong(p.examDate)}, en gardant ton rythme ({fmtPace(p.pace)} nouvelle{p.pace >= 2 ? 's' : ''} carte{p.pace >= 2 ? 's' : ''} par jour de révision{p.paceFromHistory ? '' : ', ton réglage'})</div>
            </div>
            <PaceTile p={p} data={data} />
          </div>
          <p className="muted small hint">
            Simulation FSRS sur {data.settings.daysPerWeek} jours de révision par semaine, avec ton taux de réussite ({pct(p.successRate)}),
            sur les {p.totalCards} cartes déjà dans l’app. Chaque nouveau chapitre ajouté met la projection à jour.
          </p>
        </div>
      )}
    </section>
  );
}

/** Either a reassurance, or one gentle adjustment the user can apply in one tap. */
function PaceTile({ p, data }: { p: Projection; data: AppData }) {
  const needed = p.neededPace === null ? null : Math.ceil(p.neededPace);
  return (
    <div className="panel tile">
      <div className="label">Pour tout voir à temps</div>
      {p.unseenActive === 0 ? (
        <>
          <div className="tile-value goal-done">Tout vu</div>
          <div className="muted small">Place aux révisions : chaque jour consolide ce que tu sais.</div>
        </>
      ) : needed === null ? (
        <>
          <div className="tile-value">{p.unseenActive}</div>
          <div className="muted small">cartes encore à découvrir, à ton rythme : chacune compte.</div>
        </>
      ) : p.settingIsEnough ? (
        <>
          <div className="tile-value goal-done">C’est bon</div>
          <div className="muted small">Tes {data.settings.newPerDay} nouvelles cartes par jour suffisent pour tout voir avant le {fmtLong(p.introDeadline)}.</div>
        </>
      ) : (
        <>
          <div className="tile-value">{needed} <span className="tile-of">/ jour</span></div>
          <div className="muted small">nouvelles cartes par jour de révision pour tout voir avant le {fmtLong(p.introDeadline)}.</div>
          <button type="button" className="secondary small-btn" onClick={() => void data.updateSettings({ newPerDay: needed })}>
            Passer à {needed} par jour
          </button>
        </>
      )}
    </div>
  );
}

// ---------- Load forecast ----------

function LoadPanel({ data, ids, now }: { data: AppData; ids: string[]; now: Date }) {
  const load = useMemo(() => loadForecast(ids, data.memory, now, data.settings.dayStartHour), [ids, data.memory, now, data.settings.dayStartHour]);
  const avgMs = useMemo(() => averageAnswerMs(data.log, now), [data.log, now]);
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...load.map((d) => d.cards));
  const minutes = (d: LoadDay) => (avgMs ? Math.round((d.cards * avgMs) / 60_000) : null);
  const total = load.reduce((n, d) => n + d.cards, 0);
  const shown = sel === null ? null : load[sel];

  return (
    <section aria-labelledby="load-title">
      <h2 className="section-title" id="load-title">Révisions prévues sur 14 jours</h2>
      <div className="panel chart-panel">
        <p className="chart-caption" aria-live="polite">
          {shown ? (
            <><b>{fmtDay.format(shown.date)}</b> : {shown.cards} carte{shown.cards > 1 ? 's' : ''}{minutes(shown) !== null ? ` · ≈ ${minutes(shown)} min` : ''}</>
          ) : (
            <>{total} révisions, aujourd’hui en premier · {avgMs ? `≈ ${Math.round((total * avgMs) / 60_000 / 14)} min par jour en moyenne` : 'durée estimée après tes premières révisions'}</>
          )}
        </p>
        <div className="bars" role="list" onPointerLeave={() => setSel(null)}>
          {load.map((d, i) => (
            <button
              key={d.key}
              type="button"
              role="listitem"
              className={`bar-col${sel === i ? ' on' : ''}${i === 0 ? ' today' : ''}`}
              aria-label={`${fmtDay.format(d.date)} : ${d.cards} cartes`}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onBlur={() => setSel(null)}
              onClick={() => setSel(i)}
            >
              <span className="bar-track">
                {d.cards > 0 && <span className="bar" style={{ height: `${(d.cards / max) * 100}%` }} />}
              </span>
              <span className="bar-label">{d.date.getDate()}</span>
            </button>
          ))}
        </div>
        <details className="table-view">
          <summary>Voir les valeurs</summary>
          <table>
            <thead><tr><th>Jour</th><th>Cartes</th><th>Minutes</th></tr></thead>
            <tbody>
              {load.map((d) => (
                <tr key={d.key}><td>{fmtDay.format(d.date)}</td><td>{d.cards}</td><td>{minutes(d) ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </section>
  );
}

// ---------- Success and activity ----------

function ActivityPanel({ data, now }: { data: AppData; now: Date }) {
  const success = useMemo(() => successRate(data.log, now), [data.log, now]);
  const grid = useMemo(() => activityGrid(data.log, now, data.settings.dayStartHour), [data.log, now, data.settings.dayStartHour]);
  const [sel, setSel] = useState<ActivityDay | null>(null);
  const activeDays = grid.flat().filter((d) => d.answers > 0).length;

  return (
    <section aria-labelledby="act-title">
      <h2 className="section-title" id="act-title">Réussite et activité</h2>
      <div className="tiles two">
        <div className="panel tile">
          <div className="label">Réussite sur 30 jours</div>
          <div className="tile-value">{success.rate === null ? '—' : pct(success.rate)}</div>
          <div className="muted small">{success.count ? `sur ${success.count} révisions de cartes apprises` : 'après tes premières révisions espacées'}</div>
        </div>
        <div className="panel tile">
          <div className="label">Jours actifs</div>
          <div className="tile-value">{activeDays}</div>
          <div className="muted small">sur les 12 dernières semaines</div>
        </div>
      </div>
      <div className="panel chart-panel">
        <p className="chart-caption" aria-live="polite">
          {sel ? <><b>{fmtDay.format(sel.date)}</b> : {sel.answers} réponse{sel.answers > 1 ? 's' : ''}</> : 'Une case par jour, d’autant plus marquée que tu as révisé.'}
        </p>
        <div className="heatmap" onPointerLeave={() => setSel(null)}>
          <div className="heat-days" aria-hidden="true">
            <span>L</span><span /><span>M</span><span /><span>V</span><span /><span>D</span>
          </div>
          {grid.map((week) => (
            <div key={week[0]?.key} className="heat-week">
              {week.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className={`heat-cell l${d.level}${d.future ? ' future' : ''}`}
                  aria-label={`${fmtDay.format(d.date)} : ${d.answers} réponses`}
                  disabled={d.future}
                  onPointerEnter={() => setSel(d)}
                  onFocus={() => setSel(d)}
                  onClick={() => setSel(d)}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="heat-legend" aria-hidden="true">
          Moins <span className="heat-cell l0" /><span className="heat-cell l1" /><span className="heat-cell l2" /><span className="heat-cell l3" /><span className="heat-cell l4" /> Plus
        </div>
      </div>
    </section>
  );
}

// ---------- Mastery ----------

function MasteryBar({ counts }: { counts: { new: number; learning: number; mastered: number } }) {
  const total = counts.new + counts.learning + counts.mastered || 1;
  return (
    <span className="mbar" aria-hidden="true">
      {counts.mastered > 0 && <span className="mbar-m" style={{ width: `${(counts.mastered / total) * 100}%` }} />}
      {counts.learning > 0 && <span className="mbar-l" style={{ width: `${(counts.learning / total) * 100}%` }} />}
    </span>
  );
}

function MasteryPanel({ data }: { data: AppData }) {
  const { catalog, memory } = data;
  const label = (c: { new: number; learning: number; mastered: number }) =>
    `${c.mastered} maîtrisées, ${c.learning} en apprentissage, ${c.new} nouvelles`;
  return (
    <section aria-labelledby="mast-title">
      <h2 className="section-title" id="mast-title">Maîtrise</h2>
      <div className="mlegend" aria-hidden="true">
        <span><i className="sw sw-m" /> maîtrisées</span>
        <span><i className="sw sw-l" /> en apprentissage</span>
        <span><i className="sw sw-n" /> nouvelles</span>
      </div>
      {catalog.tree.map((ue) => {
        const ueIds = ue.chapters.flatMap((ch) => ch.themes.flatMap((t) => t.cards.map((c) => c.id)));
        const ueCounts = countMastery(ueIds, memory);
        return (
          <div key={ue.ue} className="panel mastery-panel">
            <div className="mrow head" aria-label={`${ue.ue} : ${label(ueCounts)}`}>
              <span className="mrow-title"><span className="label">{ue.ue}</span> {ue.ueTitre}</span>
              <span className="mrow-pct">{pct(ueCounts.mastered / (ueIds.length || 1))}</span>
              <MasteryBar counts={ueCounts} />
            </div>
            {ue.chapters.map((ch) => {
              const chCounts = countMastery(ch.themes.flatMap((t) => t.cards.map((c) => c.id)), memory);
              return (
                <div key={ch.deck.id}>
                  <div className="mrow chapter-row" aria-label={`${ch.deck.titre} : ${label(chCounts)}`}>
                    <span className="mrow-title">Ch. {ch.deck.chapitre} · {ch.deck.titre}</span>
                    <span className="mrow-pct">{pct(chCounts.mastered / (ch.cardCount || 1))}</span>
                    <MasteryBar counts={chCounts} />
                  </div>
                  {ch.themes.map(({ theme, cards }) => {
                    const c = countMastery(cards.map((x) => x.id), memory);
                    return (
                      <Link
                        key={theme.id}
                        to={`/paquets/${ch.deck.id}/${theme.id}`}
                        className="mrow theme-row"
                        style={themeStyle(theme.couleur)}
                        aria-label={`${theme.titre} : ${label(c)}`}
                      >
                        <span className="mrow-title"><span className="dot" /> {theme.titre}</span>
                        <span className="mrow-pct">{c.mastered}/{cards.length}</span>
                        <MasteryBar counts={c} />
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

// ---------- Weak cards ----------

function WeakPanel({ data, ids, now }: { data: AppData; ids: string[]; now: Date }) {
  const weak = useMemo(() => weakCards(ids, data.memory), [ids, data.memory]);
  const [copied, setCopied] = useState<string | null>(null);
  const [manual, setManual] = useState<string | null>(null);

  const items = weak.flatMap((w) => {
    const card = data.catalog.cardsById.get(w.id);
    const place = data.catalog.placeOf.get(w.id);
    return card && place ? [{ ...w, card, place }] : [];
  });

  const copy = async () => {
    const text = weakCardsText(
      items.map((it) => ({ chapter: it.place.deck.titre, theme: it.place.theme.titre, question: it.card.question, failures: it.failures, id: it.id })),
      now,
    );
    try {
      await navigator.clipboard.writeText(text);
      setManual(null);
      setCopied(`Copié : ${items.length} carte${items.length > 1 ? 's' : ''}. Colle-le dans le projet DSCG de Claude.`);
    } catch {
      // Clipboard refused (permissions): show the text, selected, to copy by hand.
      setCopied('Copie automatique impossible : sélectionne le texte ci-dessous et copie-le.');
      setManual(text);
    }
  };

  return (
    <section aria-labelledby="weak-title">
      <h2 className="section-title" id="weak-title">À consolider {items.length > 0 && `(${items.length})`}</h2>
      {items.length === 0 ? (
        <div className="panel notice">Rien à consolider pour l’instant. Une carte apparaît ici quand elle t’a résisté deux fois, ou à sa dernière révision : c’est la liste à travailler avec Claude.</div>
      ) : (
        <>
          <button type="button" className="primary" onClick={() => void copy()}>Copier mes points faibles</button>
          {copied && <p className="backup-msg" role="status">{copied}</p>}
          {manual && <textarea className="draft" readOnly rows={8} value={manual} onFocus={(e) => e.target.select()} autoFocus />}
          <ul className="rows panel weak-list">
            {items.map((it) => (
              <li key={it.id}>
                <Link className="row" to={`/carte/${encodeURIComponent(it.id)}`} style={themeStyle(it.place.theme.couleur)}>
                  <span className="dot" />
                  <span className="row-main">
                    <span className="label">{it.place.theme.titre}</span>
                    <span className="card-row-q">{it.card.question}</span>
                  </span>
                  <span className="weak-count" aria-label={`${it.failures} échecs`}>{it.failures}×</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
