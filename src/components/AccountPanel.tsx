import { useState, type FormEvent } from 'react';
import { useSync } from '../sync/SyncProvider.tsx';
import { describeSync } from './SyncStatus.tsx';

export function AccountPanel() {
  const { state, email, signIn, signOut, requestSync } = useSync();
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.kind === 'local') {
    return <div className="panel notice">La synchronisation n’est pas configurée dans cette version.</div>;
  }

  if (!email) {
    const submit = async (e: FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(await signIn(mail, password));
      setBusy(false);
    };
    return (
      <form className="panel login" onSubmit={(e) => void submit(e)}>
        <p className="muted small">Connecte-toi pour retrouver ta progression sur l’iPhone et sur le Mac.</p>
        <input type="email" autoComplete="username" placeholder="E-mail" value={mail} onChange={(e) => setMail(e.target.value)} required />
        <input type="password" autoComplete="current-password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="backup-msg error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    );
  }

  const { text, tone } = describeSync(state);
  return (
    <div className="panel">
      <div className="kv"><span>Compte</span><span className="muted ellipsis">{email}</span></div>
      <div className="kv"><span>État</span><span className={`sync-text ${tone}`}>{text}</span></div>
      <div className="kv actions">
        <button type="button" className="secondary" onClick={requestSync} disabled={state.kind === 'syncing'}>
          Synchroniser maintenant
        </button>
        <button type="button" className="secondary" onClick={() => void signOut()}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
