import { describe, expect, it } from 'vitest';
import { rev } from '../scheduler/testkit.ts';
import { DEFAULT_SETTINGS } from '../scheduler/types.ts';
import { backupFileName, parseBackup } from './backup.ts';

const file = (o: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'dscg-cartes', format: 1, exported_at: '2026-11-15T10:00:00Z', device: 'iphone-1', reviews: [], settings: null, ...o });

describe('parseBackup', () => {
  it('reads a valid file', () => {
    const r = rev('c1', 3, '2026-11-15T08:00:00Z');
    const settings = { data: { newPerDay: 20 }, updated_at: '2026-11-15T09:00:00Z' };
    const b = parseBackup(file({ reviews: [r], settings }));
    expect(b.reviews).toEqual([r]);
    expect(b.settings?.data).toEqual({ ...DEFAULT_SETTINGS, newPerDay: 20 });
  });

  it('defaults libre to false for older files and drops unknown fields', () => {
    const { libre: _, ...old } = rev('c1', 3, '2026-11-15T08:00:00Z');
    const b = parseBackup(file({ reviews: [{ ...old, synced: 1 }] }));
    expect(b.reviews[0]).toEqual({ ...old, libre: false });
  });

  it('rejects files that are not a backup, with a clear message', () => {
    expect(() => parseBackup('pas du json')).toThrow('JSON valide');
    expect(() => parseBackup(JSON.stringify({ app: 'autre' }))).toThrow('pas une sauvegarde');
    expect(() => parseBackup(file({ format: 2 }))).toThrow('Format de sauvegarde inconnu');
    expect(() => parseBackup(file({ reviews: [{ id: 'x' }] }))).toThrow('Révision n°1 invalide');
    expect(() => parseBackup(file({ reviews: [{ ...rev('c', 3, '2026-11-15'), rating: 7 }] }))).toThrow('invalide');
  });

  it('names the file with the local date', () => {
    expect(backupFileName(new Date(2026, 10, 5, 23, 30))).toBe('dscg-cartes-2026-11-05.json');
  });
});
