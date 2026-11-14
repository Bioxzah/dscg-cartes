import { Dexie, type EntityTable } from 'dexie';
import type { Review, Settings } from '../scheduler/types.ts';

/** Local review row. `synced` is local bookkeeping for milestone 4 (0 = not sent yet). */
export interface StoredReview extends Review {
  synced: 0 | 1;
}

export interface StoredSettings {
  key: 'me';
  data: Settings;
  updated_at: string;
}

export interface Meta {
  key: string;
  value: string;
}

export class AppDb extends Dexie {
  reviews!: EntityTable<StoredReview, 'id'>;
  settings!: EntityTable<StoredSettings, 'key'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor() {
    super('dscg-cartes');
    this.version(1).stores({
      reviews: 'id, card_id, reviewed_at, synced',
      settings: 'key',
      meta: 'key',
    });
  }
}

export const db = new AppDb();
