// Merging journals from another device or a backup file. Pure; reused by sync in milestone 4.
import type { Review, Settings } from './types.ts';

export interface SettingsRecord {
  data: Settings;
  updated_at: string;
}

export interface ReviewMerge {
  /** Reviews unknown locally. */
  toAdd: Review[];
  /** Local reviews cancelled on the other side. A cancellation is never undone by a merge. */
  toCancel: string[];
}

/** Union by id. Same id on both sides = same review; only the cancel flag can differ. */
export function mergeReviews(local: readonly Review[], incoming: readonly Review[]): ReviewMerge {
  const byId = new Map(local.map((r) => [r.id, r]));
  const toAdd: Review[] = [];
  const toCancel = new Set<string>();
  for (const r of incoming) {
    const mine = byId.get(r.id);
    if (!mine) {
      byId.set(r.id, r);
      toAdd.push(r);
    } else if (r.annulee && !mine.annulee) {
      toCancel.add(r.id);
    }
  }
  return { toAdd, toCancel: [...toCancel] };
}

/** The most recently saved settings win. */
export function pickSettings(local: SettingsRecord | null, incoming: SettingsRecord | null): SettingsRecord | null {
  if (!incoming) return local;
  if (!local) return incoming;
  return incoming.updated_at > local.updated_at ? incoming : local;
}
