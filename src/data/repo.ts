// The only place that writes to IndexedDB. The journal is append-only: no delete anywhere.
import { DEFAULT_SETTINGS, type Grade, type Review, type Settings } from '../scheduler/types.ts';
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
