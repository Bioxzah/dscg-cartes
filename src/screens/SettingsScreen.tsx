import { useEffect, useState } from 'react';
import { AccountPanel } from '../components/AccountPanel.tsx';
import { BackupPanel } from '../components/BackupPanel.tsx';
import { useAppData } from '../data/AppData.tsx';
import type { Appearance } from '../scheduler/types.ts';

const buildDate = new Date(__BUILD_DATE__).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

function Stepper({ value, min, max, step, onChange, label }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Diminuer : ${label}`}>−</button>
      <output>{value}</output>
      <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Augmenter : ${label}`}>+</button>
    </div>
  );
}

export function SettingsScreen() {
  const { settings, updateSettings } = useAppData();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    if (navigator.storage?.persisted) void navigator.storage.persisted().then(setPersisted);
    else setPersisted(false);
  }, []);

  return (
    <main className="screen">
      <h1 className="screen-title">Réglages</h1>

      <h2 className="section-title">Compte et synchronisation</h2>
      <AccountPanel />

      <h2 className="section-title">Révisions</h2>
      <div className="panel">
        <div className="kv">
          <span>Nouvelles cartes par jour</span>
          <Stepper label="Nouvelles cartes par jour" value={settings.newPerDay} min={0} max={100} step={5} onChange={(v) => void updateSettings({ newPerDay: v })} />
        </div>
        <div className="kv">
          <span>Plafond de révisions par jour</span>
          <Stepper label="Plafond de révisions" value={settings.reviewCap} min={10} max={500} step={10} onChange={(v) => void updateSettings({ reviewCap: v })} />
        </div>
        <label className="kv">
          <span>Date de l’examen</span>
          <input
            className="date"
            type="date"
            value={settings.examDate}
            onChange={(e) => e.target.value && void updateSettings({ examDate: e.target.value })}
          />
        </label>
      </div>

      <h2 className="section-title">Affichage</h2>
      <div className="panel">
        <div className="kv">
          <span>Thème</span>
          <div className="segmented" role="radiogroup" aria-label="Thème">
            {APPEARANCES.map((a) => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={settings.appearance === a.value}
                className={settings.appearance === a.value ? 'on' : undefined}
                onClick={() => void updateSettings({ appearance: a.value })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="section-title">Sauvegarde</h2>
      <BackupPanel />

      <h2 className="section-title">Application</h2>
      <div className="panel">
        <div className="kv"><span>Stockage protégé</span><span className="muted">{persisted === null ? '…' : persisted ? 'oui' : 'non'}</span></div>
        <div className="kv"><span>Version</span><span className="muted">{__APP_VERSION__}</span></div>
        <div className="kv"><span>Déployée le</span><span className="muted">{buildDate}</span></div>
      </div>
    </main>
  );
}
