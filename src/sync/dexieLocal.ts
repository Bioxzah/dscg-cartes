import { db } from '../data/db.ts';
import { mergeReviews, type SettingsRecord } from '../scheduler/merge.ts';
import type { Review } from '../scheduler/types.ts';
import type { Cursor, Local } from './engine.ts';

const strip = ({ synced: _s, ...r }: Review & { synced: 0 | 1 }): Review => r;

/** The engine's view of IndexedDB. */
export class DexieLocal implements Local {
  async unsynced(limit: number) {
    return (await db.reviews.where('synced').equals(0).limit(limit).toArray()).map(strip);
  }

  async markSynced(sent: Review[]) {
    await db.transaction('rw', db.reviews, async () => {
      const rows = await db.reviews.bulkGet(sent.map((r) => r.id));
      const done = rows.filter((row, i) => row && row.synced === 0 && row.annulee === sent[i]?.annulee);
      await db.reviews.bulkPut(done.map((row) => ({ ...row!, synced: 1 as const })));
    });
  }

  async applyRemote(rows: Review[]) {
    return db.transaction('rw', db.reviews, async () => {
      const existing = (await db.reviews.bulkGet(rows.map((r) => r.id))).filter((r) => r !== undefined);
      const { toAdd, toCancel } = mergeReviews(existing.map(strip), rows);
      await db.reviews.bulkAdd(toAdd.map((r) => ({ ...r, synced: 1 as const })));
      for (const id of toCancel) await db.reviews.update(id, { annulee: true, synced: 1 });
      return { added: toAdd.length, cancelled: toCancel.length };
    });
  }

  async getCursor(): Promise<Cursor | null> {
    const row = await db.meta.get('syncCursor');
    return row ? (JSON.parse(row.value) as Cursor) : null;
  }

  async setCursor(cursor: Cursor) {
    await db.meta.put({ key: 'syncCursor', value: JSON.stringify(cursor) });
  }

  async getSettings(): Promise<SettingsRecord | null> {
    const row = await db.settings.get('me');
    return row ? { data: row.data, updated_at: row.updated_at } : null;
  }

  async putSettings(record: SettingsRecord) {
    await db.settings.put({ key: 'me', data: record.data, updated_at: record.updated_at });
  }
}
