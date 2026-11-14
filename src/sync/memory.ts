// In-memory Remote and Local, used by tests. They model the Supabase table (with its trigger) and IndexedDB.
import { mergeReviews, type SettingsRecord } from '../scheduler/merge.ts';
import type { Review } from '../scheduler/types.ts';
import { compareCursor, type Cursor, type Local, type Remote, type RemoteReview } from './engine.ts';

/** Behaves like the Supabase table and its trigger: server clock on every write, cancellation is one-way. */
export class MemoryRemote implements Remote {
  rows = new Map<string, RemoteReview>();
  settings: SettingsRecord | null = null;
  private clock: number;
  constructor(start = Date.parse('2026-11-15T00:00:00Z')) {
    this.clock = start;
  }
  /** Rows written in one call share one timestamp, like rows of one transaction. */
  private tick() {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }
  async upsertReviews(reviews: Review[]) {
    const at = this.tick();
    for (const r of reviews) {
      const old = this.rows.get(r.id);
      this.rows.set(r.id, old ? { ...old, annulee: old.annulee || r.annulee, updated_at: at } : { ...r, updated_at: at });
    }
  }
  async pullReviews(after: Cursor | null, limit: number) {
    return [...this.rows.values()]
      .filter((r) => !after || compareCursor({ updated_at: r.updated_at, id: r.id }, after) > 0)
      .sort((a, b) => compareCursor(a, b))
      .slice(0, limit);
  }
  async getSettings() {
    return this.settings;
  }
  async putSettings(record: SettingsRecord) {
    this.settings = record;
  }
}

export class MemoryLocal implements Local {
  reviews = new Map<string, Review & { synced: boolean }>();
  cursor: Cursor | null = null;
  settings: SettingsRecord | null = null;
  add(r: Review) {
    this.reviews.set(r.id, { ...r, synced: false });
  }
  cancel(id: string) {
    const r = this.reviews.get(id);
    if (r) this.reviews.set(id, { ...r, annulee: true, synced: false });
  }
  all(): Review[] {
    return [...this.reviews.values()].map(({ synced: _s, ...r }) => r);
  }
  async unsynced(limit: number) {
    return [...this.reviews.values()].filter((r) => !r.synced).slice(0, limit).map(({ synced: _s, ...r }) => r);
  }
  async markSynced(sent: Review[]) {
    for (const s of sent) {
      const r = this.reviews.get(s.id);
      if (r && r.annulee === s.annulee) r.synced = true;
    }
  }
  async applyRemote(rows: Review[]) {
    const { toAdd, toCancel } = mergeReviews(this.all(), rows);
    for (const r of toAdd) this.reviews.set(r.id, { ...r, synced: true });
    for (const id of toCancel) {
      const r = this.reviews.get(id);
      if (r) this.reviews.set(id, { ...r, annulee: true, synced: true });
    }
    return { added: toAdd.length, cancelled: toCancel.length };
  }
  async getCursor() {
    return this.cursor;
  }
  async setCursor(c: Cursor) {
    this.cursor = c;
  }
  async getSettings() {
    return this.settings;
  }
  async putSettings(r: SettingsRecord) {
    this.settings = r;
  }
}
