import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { plannerCards, type Catalog } from '../cards/catalog.ts';
import type { Scheduler } from '../scheduler/fsrs.ts';
import { replay, type CardMemory, type ReplayCache, type ReplayedReview } from '../scheduler/replay.ts';
import type { PlannerCard, Settings } from '../scheduler/types.ts';
import { db, type StoredReview } from './db.ts';
import { saveSettings, withDefaults } from './repo.ts';
import { useLiveQuery } from './useLiveQuery.ts';

export interface AppData {
  catalog: Catalog;
  cards: PlannerCard[];
  scheduler: Scheduler;
  reviews: StoredReview[];
  memory: ReadonlyMap<string, CardMemory>;
  log: readonly ReplayedReview[];
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAppData outside AppDataProvider');
  return value;
}

export function AppDataProvider({ catalog, scheduler, children }: { catalog: Catalog; scheduler: Scheduler; children: ReactNode }) {
  const reviews = useLiveQuery(() => db.reviews.toArray());
  // null = no settings saved yet; undefined = still loading.
  const stored = useLiveQuery(async () => (await db.settings.get('me')) ?? null);
  const cache = useRef<ReplayCache>(new Map());
  const cards = useMemo(() => plannerCards(catalog), [catalog]);

  const replayed = useMemo(() => {
    if (!reviews) return null;
    const r = replay(reviews, scheduler, cache.current);
    cache.current = r.cache;
    return r;
  }, [reviews, scheduler]);

  const settings = useMemo(() => withDefaults(stored?.data), [stored]);
  useAppearance(settings.appearance);

  const value = useMemo<AppData | null>(() => {
    if (!reviews || !replayed || stored === undefined) return null;
    return {
      catalog,
      cards,
      scheduler,
      reviews,
      memory: replayed.cards,
      log: replayed.log,
      settings,
      updateSettings: (patch) => saveSettings({ ...settings, ...patch }),
    };
  }, [catalog, cards, scheduler, reviews, replayed, settings, stored]);

  if (!value) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useAppearance(appearance: Settings['appearance']) {
  useEffect(() => {
    const root = document.documentElement;
    if (appearance === 'auto') delete root.dataset.theme;
    else root.dataset.theme = appearance;
  }, [appearance]);
}

/** Current time, refreshed every 30 s and whenever the app comes back to the foreground. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}
