import { useCallback, useRef, useState } from 'react';
import { buildDailyPlan, buildFreePlan, dayUsage, type Plan } from '../scheduler/plan.ts';
import { studyDayBounds, studyDayKey } from '../scheduler/day.ts';
import type { FsrsCard } from '../scheduler/fsrs.ts';
import { applyGrade, newFsrsCard } from '../scheduler/replay.ts';
import { answer, requeueTime, startSession, type Session } from '../scheduler/session.ts';
import type { Grade } from '../scheduler/types.ts';
import type { AppData } from './AppData.tsx';
import { addReview, cancelReview } from './repo.ts';

/** Time spent on a card is capped, so a card left open while away does not inflate the stats. */
const MAX_CARD_MS = 5 * 60_000;

export type SessionMode = { kind: 'daily' } | { kind: 'libre'; deckId: string; themeId: string };

interface Step {
  session: Session;
  reviewId: string;
  cardId: string;
  /** Card state right before the answer, restored on undo. */
  before: FsrsCard;
}

export function planFor(data: AppData, mode: SessionMode, now: Date): Plan {
  if (mode.kind === 'daily') {
    const usage = dayUsage(data.log, now, data.settings.dayStartHour);
    return buildDailyPlan({
      cards: data.cards,
      memory: data.memory,
      settings: data.settings,
      usage,
      now,
      seed: studyDayKey(now, data.settings.dayStartHour),
    });
  }
  const cards = data.cards.filter((c) => c.deckId === mode.deckId && c.themeId === mode.themeId);
  return buildFreePlan({
    cards,
    memory: data.memory,
    retrievability: (mem) => {
      const last = mem.fsrs.lastReviewAt ?? now;
      return data.scheduler.model.forgettingCurve(mem.fsrs, data.scheduler.chrono.difference(last, now));
    },
  });
}

/**
 * Drives one session. Card states are tracked locally during the session (the journal write
 * and the replay it triggers are asynchronous), starting from the replayed memory.
 */
export function useSession(data: AppData, mode: SessionMode) {
  const [session, setSession] = useState<Session>(() => startSession(planFor(data, mode, new Date()), new Date()));
  const [shownAt, setShownAt] = useState(() => Date.now());
  const local = useRef(new Map<string, FsrsCard>());
  const history = useRef<Step[]>([]);
  const busy = useRef(false);

  const cardState = useCallback(
    (cardId: string, now: Date): FsrsCard =>
      local.current.get(cardId) ?? data.memory.get(cardId)?.fsrs ?? newFsrsCard(data.scheduler, cardId, now),
    [data],
  );

  /** Next state for each grade, to label the buttons. */
  const preview = useCallback(
    (cardId: string, now: Date): Record<Grade, FsrsCard> => {
      const card = cardState(cardId, now);
      return {
        1: applyGrade(data.scheduler, card, 1, now),
        3: applyGrade(data.scheduler, card, 3, now),
        4: applyGrade(data.scheduler, card, 4, now),
      };
    },
    [cardState, data.scheduler],
  );

  const rate = useCallback(
    async (grade: Grade) => {
      const cardId = session.current;
      if (!cardId || busy.current) return;
      busy.current = true;
      try {
        const now = new Date();
        const before = cardState(cardId, now);
        const next = applyGrade(data.scheduler, before, grade, now);
        const durationMs = Math.min(now.getTime() - shownAt, MAX_CARD_MS);
        const review = await addReview({ cardId, grade, at: now, durationMs, libre: mode.kind === 'libre' });
        local.current.set(cardId, next);
        history.current.push({ session, reviewId: review.id, cardId, before });
        const dayEnd = studyDayBounds(now, data.settings.dayStartHour).end;
        setSession(answer(session, { cardId, grade, durationMs }, requeueTime(next.state, next.dueAt, dayEnd), now));
        setShownAt(Date.now());
      } finally {
        busy.current = false;
      }
    },
    [session, shownAt, data, mode.kind, cardState],
  );

  /** Undo the last answer of this session: the review is flagged cancelled, the card comes back. */
  const undo = useCallback(async (): Promise<Session | null> => {
    if (busy.current) return null;
    const step = history.current.pop();
    if (!step) return null;
    busy.current = true;
    try {
      await cancelReview(step.reviewId);
      local.current.set(step.cardId, step.before);
      setSession(step.session);
      setShownAt(Date.now());
      return step.session;
    } finally {
      busy.current = false;
    }
  }, []);

  return { session, rate, undo, preview, canUndo: history.current.length > 0 };
}
