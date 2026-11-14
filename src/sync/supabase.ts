import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SettingsRecord } from '../scheduler/merge.ts';
import { DEFAULT_SETTINGS, type Grade, type Review, type Settings } from '../scheduler/types.ts';
import type { Cursor, Remote, RemoteReview } from './engine.ts';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when the build has no Supabase variables: the app then runs local-only. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    : null;

const COLUMNS = 'id,card_id,rating,reviewed_at,duration_ms,device,annulee,libre,updated_at';

interface Row {
  id: string;
  card_id: string;
  rating: number;
  reviewed_at: string;
  duration_ms: number | null;
  device: string | null;
  annulee: boolean;
  libre: boolean;
  updated_at: string;
}

function fromRow(r: Row): RemoteReview {
  return {
    id: r.id,
    card_id: r.card_id,
    rating: r.rating as Grade,
    reviewed_at: r.reviewed_at,
    duration_ms: r.duration_ms ?? 0,
    device: r.device ?? '',
    annulee: r.annulee,
    libre: r.libre,
    updated_at: r.updated_at,
  };
}

export class SupabaseRemote implements Remote {
  private client: SupabaseClient;
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async upsertReviews(reviews: Review[]) {
    const rows = reviews.map(({ id, card_id, rating, reviewed_at, duration_ms, device, annulee, libre }) => ({
      id, card_id, rating, reviewed_at, duration_ms, device, annulee, libre,
    }));
    const { error } = await this.client.from('reviews').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  async pullReviews(after: Cursor | null, limit: number) {
    let query = this.client.from('reviews').select(COLUMNS).order('updated_at').order('id').limit(limit);
    if (after) {
      query = after.id
        ? query.or(`updated_at.gt.${after.updated_at},and(updated_at.eq.${after.updated_at},id.gt.${after.id})`)
        : query.gte('updated_at', after.updated_at);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as Row[]).map(fromRow);
  }

  async getSettings(): Promise<SettingsRecord | null> {
    const { data, error } = await this.client.from('settings').select('data,updated_at').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { data: { ...DEFAULT_SETTINGS, ...(data.data as Partial<Settings>) }, updated_at: data.updated_at as string };
  }

  async putSettings(record: SettingsRecord) {
    const { error } = await this.client.from('settings').upsert({ data: record.data, updated_at: record.updated_at }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  }
}
