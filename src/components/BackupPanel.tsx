import { useRef, useState } from 'react';
import { backupFileName, parseBackup } from '../data/backup.ts';
import { db } from '../data/db.ts';
import { buildBackup, importBackup, markExported } from '../data/repo.ts';
import { useLiveQuery } from '../data/useLiveQuery.ts';

const when = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Hands the file to the share sheet when possible (iPhone: "Enregistrer dans Fichiers", Drive…), else downloads it. */
async function saveFile(name: string, text: string): Promise<boolean> {
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export function BackupPanel() {
  const lastExport = useLiveQuery(async () => (await db.meta.get('lastExport'))?.value ?? null);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const onExport = async () => {
    const now = new Date();
    const backup = await buildBackup(now);
    const saved = await saveFile(backupFileName(now), JSON.stringify(backup));
    if (!saved) return;
    await markExported(now);
    setMessage({ ok: true, text: `Sauvegarde créée : ${backup.reviews.length} révisions.` });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await importBackup(parseBackup(await file.text()));
      const parts = [`${result.added} révision${result.added > 1 ? 's' : ''} ajoutée${result.added > 1 ? 's' : ''}`];
      if (result.cancelled) parts.push(`${result.cancelled} annulation${result.cancelled > 1 ? 's' : ''} reprise${result.cancelled > 1 ? 's' : ''}`);
      parts.push(result.settingsUpdated ? 'réglages mis à jour' : 'réglages inchangés');
      setMessage({ ok: true, text: `Import terminé : ${parts.join(', ')}.` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <div className="panel">
        <div className="kv">
          <span>Dernière sauvegarde</span>
          <span className="muted">{lastExport ? when.format(new Date(lastExport)) : 'jamais'}</span>
        </div>
        <div className="kv actions">
          <button type="button" className="secondary" onClick={() => void onExport()}>
            Exporter ma progression
          </button>
          <button type="button" className="secondary" onClick={() => input.current?.click()}>
            Importer une sauvegarde
          </button>
          <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
        </div>
      </div>
      {message && <p className={`backup-msg${message.ok ? '' : ' error'}`} role="status">{message.text}</p>}
      <p className="muted small hint">L’import ajoute les révisions qui manquent ici, sans rien effacer. Range tes sauvegardes sur Drive.</p>
    </>
  );
}
