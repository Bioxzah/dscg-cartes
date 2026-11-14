// The only place that writes to IndexedDB. The journal is append-only: no delete anywhere.
import { DEFAULT_SETTINGS, type Grade, type Review, type Settings } from '../scheduler/types.ts';
import { mergeReviews, pickSettings } from '../scheduler/merge.ts';
import { BACKUP_APP, BACKUP_FORMAT, type Backup } from './backup.ts';
import { db, type StoredReview } from './db.ts';

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iphone';
  if (/iPad/.test(ua)) return 'ipad';
  if (/Mac/.test(ua)) return 'mac';
  return 'web';
}

let deviceId: string | null = null;

/** Stable per-browser id, e.g. "iphone-3f9a1c2b". */
export async function getDevice(): Promise<string> {
  if (deviceId) return deviceId;
  const row = await db.meta.get('device');
  if (row) return (deviceId = row.value);
  const value = `${deviceLabel()}-${crypto.randomUUID().slice(0, 8)}`;
  await db.meta.put({ key: 'device', value });
  return (deviceId = value);
}

export async function addReview(input: { cardId: string; grade: Grade; at: Date; durationMs: number; libre: boolean }): Promise<Review> {
  const review: StoredReview = {
    id: crypto.randomUUID(),
    card_id: input.cardId,
    rating: input.grade,
    reviewed_at: input.at.toISOString(),
    duration_ms: Math.round(input.durationMs),
    device: await getDevice(),
    annulee: false,
    libre: input.libre,
    synced: 0,
  };
  await db.reviews.add(review);
  return review;
}

/** Undo: the review stays in the journal, flagged as cancelled. */
export async function cancelReview(id: string): Promise<void> {
  await db.reviews.update(id, { annulee: true, synced: 0 });
}

export async function saveSettings(data: Settings): Promise<void> {
  await db.settings.put({ key: 'me', data, updated_at: new Date().toISOString() });
}

export function withDefaults(data: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...data };
}

// ---------- Backup ----------

export async function buildBackup(now: Date): Promise<Backup> {
  const [rows, settings] = await Promise.all([db.reviews.toArray(), db.settings.get('me')]);
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exported_at: now.toISOString(),
    device: await getDevice(),
    reviews: rows.map(({ synced: _synced, ...review }) => review),
    settings: settings ? { data: settings.data, updated_at: settings.updated_at } : null,
  };
}

export async function markExported(at: Date): Promise<void> {
  await db.meta.put({ key: 'lastExport', value: at.toISOString() });
}

export interface ImportResult {
  added: number;
  cancelled: number;
  settingsUpdated: boolean;
}

/** Merges a backup into the local data. Never deletes anything. */
export async function importBackup(backup: Backup): Promise<ImportResult> {
  return db.transaction('rw', db.reviews, db.settings, async () => {
    const local = await db.reviews.toArray();
    const { toAdd, toCancel } = mergeReviews(local, backup.reviews);
    await db.reviews.bulkAdd(toAdd.map((r) => ({ ...r, synced: 0 as const })));
    for (const id of toCancel) await db.reviews.update(id, { annulee: true, synced: 0 });

    const current = (await db.settings.get('me')) ?? null;
    const chosen = pickSettings(current && { data: current.data, updated_at: current.updated_at }, backup.settings);
    const settingsUpdated = chosen !== null && chosen === backup.settings && chosen.updated_at !== current?.updated_at;
    if (chosen && settingsUpdated) await db.settings.put({ key: 'me', data: chosen.data, updated_at: chosen.updated_at });

    return { added: toAdd.length, cancelled: toCancel.length, settingsUpdated };
  });
}
