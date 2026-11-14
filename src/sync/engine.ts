// Synchronisation of the review journal and settings. No globals and no clock of its own:
// storage and server are passed in, so the logic is tested with in-memory fakes.
import { pickSettings, type SettingsRecord } from '../scheduler/merge.ts';
import type { Review } from '../scheduler/types.ts';

/** A review as stored on the server: `updated_at` is the server time of its last write. */
export interface RemoteReview extends Review {
  updated_at: string;
}

/** Position in the server's (updated_at, id) order. */
export interface Cursor {
  updated_at: string;
  id: string;
}

export interface Remote {
  /** Insert or update by id. Replaying a batch is harmless. */
  upsertReviews(reviews: Review[]): Promise<void>;
  /** Rows strictly after `after` in (updated_at, id) order, oldest first. */
  pullReviews(after: Cursor | null, limit: number): Promise<RemoteReview[]>;
  getSettings(): Promise<SettingsRecord | null>;
  putSettings(record: SettingsRecord): Promise<void>;
}

export interface Local {
  /** Reviews created or cancelled here and not yet acknowledged by the server. */
  unsynced(limit: number): Promise<Review[]>;
  /** Marks reviews as sent, unless they changed (were cancelled) since they were read. */
  markSynced(sent: Review[]): Promise<void>;
  /** Merges server rows: adds the unknown ones, carries cancellations over. */
  applyRemote(rows: Review[]): Promise<{ added: number; cancelled: number }>;
  getCursor(): Promise<Cursor | null>;
  setCursor(cursor: Cursor): Promise<void>;
  getSettings(): Promise<SettingsRecord | null>;
  putSettings(record: SettingsRecord): Promise<void>;
}

export const PUSH_BATCH = 500;
export const PULL_PAGE = 1000;
/**
 * Pulls restart a little before the last cursor: a row written in a transaction that began
 * before the cursor time could commit later. Re-reading a few rows is free (merge is idempotent).
 */
export const PULL_OVERLAP_MS = 2 * 60_000;

export interface SyncReport {
  pushed: number;
  pulled: number;
  added: number;
  cancelled: number;
  settings: 'pulled' | 'pushed' | 'same';
}

function rewind(cursor: Cursor | null): Cursor | null {
  if (!cursor) return null;
  return { updated_at: new Date(Date.parse(cursor.updated_at) - PULL_OVERLAP_MS).toISOString(), id: '' };
}

/** One full synchronisation: push local changes, pull server changes, reconcile settings. */
export async function syncOnce(local: Local, remote: Remote): Promise<SyncReport> {
  const report: SyncReport = { pushed: 0, pulled: 0, added: 0, cancelled: 0, settings: 'same' };

  // 1. Push, in batches, until nothing is left.
  for (;;) {
    const batch = await local.unsynced(PUSH_BATCH);
    if (batch.length === 0) break;
    await remote.upsertReviews(batch);
    await local.markSynced(batch);
    report.pushed += batch.length;
    if (batch.length < PUSH_BATCH) break;
  }

  // 2. Pull everything after the (rewound) cursor, page by page.
  const saved = await local.getCursor();
  let after = rewind(saved);
  let last = saved;
  for (;;) {
    const page = await remote.pullReviews(after, PULL_PAGE);
    if (page.length > 0) {
      const merged = await local.applyRemote(page.map(({ updated_at: _u, ...r }) => r));
      report.pulled += page.length;
      report.added += merged.added;
      report.cancelled += merged.cancelled;
      const tail = page[page.length - 1] as RemoteReview;
      after = { updated_at: tail.updated_at, id: tail.id };
      if (!last || compareCursor(after, last) > 0) last = after;
    }
    if (page.length < PULL_PAGE) break;
  }
  if (last && last !== saved) await local.setCursor(last);

  // 3. Settings: the most recent wins.
  const [mine, theirs] = await Promise.all([local.getSettings(), remote.getSettings()]);
  const winner = pickSettings(mine, theirs);
  if (winner && winner === theirs && winner.updated_at !== mine?.updated_at) {
    await local.putSettings(winner);
    report.settings = 'pulled';
  } else if (winner && winner === mine && winner.updated_at !== theirs?.updated_at) {
    await remote.putSettings(winner);
    report.settings = 'pushed';
  }
  return report;
}

export function compareCursor(a: Cursor, b: Cursor): number {
  const ta = Date.parse(a.updated_at);
  const tb = Date.parse(b.updated_at);
  return ta !== tb ? ta - tb : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
