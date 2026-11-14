import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db } from '../data/db.ts';
import { useLiveQuery } from '../data/useLiveQuery.ts';
import { DexieLocal } from './dexieLocal.ts';
import { syncOnce } from './engine.ts';
import { supabase, SupabaseRemote } from './supabase.ts';

export type SyncState =
  | { kind: 'local' } // build without Supabase
  | { kind: 'signedOut' }
  | { kind: 'syncing' }
  | { kind: 'offline'; pending: number }
  | { kind: 'error'; message: string; pending: number }
  | { kind: 'pending'; pending: number }
  | { kind: 'ok'; lastSyncAt: Date | null };

export interface Sync {
  state: SyncState;
  email: string | null;
  /** Starts a sync now (or right after the running one). Safe to call often. */
  requestSync: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Sync | null>(null);

export function useSync(): Sync {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSync outside SyncProvider');
  return value;
}

function frenchError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou mot de passe incorrect.';
  if (/failed to fetch|network/i.test(message)) return 'Pas de connexion au serveur.';
  return message;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const pending = useLiveQuery(() => db.reviews.where('synced').equals(0).count()) ?? 0;
  const lastSync = useLiveQuery(async () => (await db.meta.get('lastSync'))?.value ?? null);

  const busy = useRef(false);
  const again = useRef(false);
  const signedIn = useRef(false);

  const run = useCallback(async () => {
    if (!supabase || !signedIn.current) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setRunning(true);
    try {
      do {
        again.current = false;
        await syncOnce(new DexieLocal(), new SupabaseRemote(supabase));
        await db.meta.put({ key: 'lastSync', value: new Date().toISOString() });
      } while (again.current);
      setError(null);
    } catch (e) {
      setError(frenchError((e as Error).message));
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }, []);

  const requestSync = useCallback(() => {
    if (navigator.onLine) void run();
  }, [run]);

  // Session: restore it, then follow sign-in / sign-out.
  useEffect(() => {
    if (!supabase) return;
    const apply = (mail: string | null) => {
      const wasIn = signedIn.current;
      signedIn.current = mail !== null;
      setEmail(mail);
      setAuthReady(true);
      if (mail && !wasIn) void run();
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, [run]);

  // Triggers: back to the foreground, network back (spec §4.5). Opening the app is the sign-in restore above.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && requestSync();
    const onOnline = () => {
      setOnline(true);
      requestSync();
    };
    const onOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [requestSync]);

  const signIn = useCallback(async (mail: string, password: string) => {
    if (!supabase) return 'Synchronisation non configurée.';
    const { error: e } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
    return e ? frenchError(e.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: 'local' });
    // Local data stays; the next sign-in pulls everything again (merge is idempotent).
    await db.meta.delete('syncCursor');
  }, []);

  const state = useMemo<SyncState>(() => {
    if (!supabase) return { kind: 'local' };
    if (!authReady || !email) return { kind: 'signedOut' };
    if (running) return { kind: 'syncing' };
    if (!online) return { kind: 'offline', pending };
    if (error) return { kind: 'error', message: error, pending };
    if (pending > 0) return { kind: 'pending', pending };
    return { kind: 'ok', lastSyncAt: lastSync ? new Date(lastSync) : null };
  }, [authReady, email, running, online, error, pending, lastSync]);

  const value = useMemo(() => ({ state, email, requestSync, signIn, signOut }), [state, email, requestSync, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
