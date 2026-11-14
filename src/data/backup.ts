// Backup file format and validation. Pure: no storage access here.
import type { SettingsRecord } from '../scheduler/merge.ts';
import { DEFAULT_SETTINGS, type Review } from '../scheduler/types.ts';

export const BACKUP_APP = 'dscg-cartes';
export const BACKUP_FORMAT = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  exported_at: string;
  device: string;
  reviews: Review[];
  settings: SettingsRecord | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

function toReview(v: unknown): Review | null {
  if (!isObj(v)) return null;
  const { id, card_id, rating, reviewed_at, duration_ms, device, annulee, libre } = v;
  if (typeof id !== 'string' || !id || typeof card_id !== 'string' || !card_id) return null;
  if (rating !== 1 && rating !== 3 && rating !== 4) return null;
  if (!isDate(reviewed_at) || typeof duration_ms !== 'number' || duration_ms < 0) return null;
  if (typeof device !== 'string' || typeof annulee !== 'boolean') return null;
  if (libre !== undefined && typeof libre !== 'boolean') return null;
  return { id, card_id, rating, reviewed_at, duration_ms, device, annulee, libre: libre ?? false };
}

/** Parses and checks a backup file. Throws a French message when the file cannot be used. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas du JSON valide.');
  }
  if (!isObj(data) || data.app !== BACKUP_APP) throw new Error('Ce fichier n’est pas une sauvegarde de DSCG Cartes.');
  if (data.format !== BACKUP_FORMAT) throw new Error(`Format de sauvegarde inconnu (${String(data.format)}).`);
  if (!Array.isArray(data.reviews)) throw new Error('La sauvegarde ne contient pas de journal.');

  const reviews: Review[] = [];
  data.reviews.forEach((raw, i) => {
    const r = toReview(raw);
    if (!r) throw new Error(`Révision n°${i + 1} invalide : la sauvegarde est peut-être abîmée.`);
    reviews.push(r);
  });

  let settings: SettingsRecord | null = null;
  if (isObj(data.settings) && isObj(data.settings.data) && isDate(data.settings.updated_at)) {
    settings = { data: { ...DEFAULT_SETTINGS, ...(data.settings.data as Partial<SettingsRecord['data']>) }, updated_at: data.settings.updated_at };
  }

  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exported_at: isDate(data.exported_at) ? data.exported_at : '',
    device: typeof data.device === 'string' ? data.device : '',
    reviews,
    settings,
  };
}

export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dscg-cartes-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
