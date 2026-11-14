import { Link } from 'react-router-dom';
import { useSync, type SyncState } from '../sync/SyncProvider.tsx';

const plural = (n: number) => `${n} révision${n > 1 ? 's' : ''}`;

function ago(date: Date, now: Date): string {
  const min = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function describeSync(state: SyncState, now = new Date()): { text: string; tone: 'ok' | 'wait' | 'bad' } {
  switch (state.kind) {
    case 'local':
      return { text: 'Synchronisation non configurée', tone: 'wait' };
    case 'signedOut':
      return { text: 'Non connecté : ta progression reste sur cet appareil', tone: 'wait' };
    case 'syncing':
      return { text: 'Synchronisation…', tone: 'wait' };
    case 'offline':
      return { text: state.pending ? `Hors ligne : ${plural(state.pending)} en attente` : 'Hors ligne', tone: 'wait' };
    case 'error':
      return { text: `Erreur de synchronisation : ${state.message}`, tone: 'bad' };
    case 'pending':
      return { text: `En attente : ${plural(state.pending)}`, tone: 'wait' };
    case 'ok':
      return { text: state.lastSyncAt ? `Synchronisé ${ago(state.lastSyncAt, now)}` : 'Synchronisé', tone: 'ok' };
  }
}

/** One line on the home screen. Tapping it opens the account settings. */
export function SyncStatus() {
  const { state } = useSync();
  if (state.kind === 'local') return null;
  const { text, tone } = describeSync(state);
  return (
    <Link to="/reglages" className={`sync-status ${tone}`}>
      <span className="sync-dot" aria-hidden="true" />
      {text}
    </Link>
  );
}
