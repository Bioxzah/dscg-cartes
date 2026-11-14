import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/** Subscribes to a Dexie query and re-renders on every change. `undefined` while loading. */
export function useLiveQuery<T>(query: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (e: unknown) => console.error(e),
    });
    return () => sub.unsubscribe();
  }, deps);
  return value;
}
