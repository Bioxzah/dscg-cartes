import { useEffect, useRef, useState } from 'react';
import type { Projection } from '../scheduler/dashboard.ts';
import type { AppData } from './AppData.tsx';

/** Computes the projection in a worker. Keeps showing the previous result while recomputing. */
export function useProjection(data: AppData): { projection: Projection | null; computing: boolean; error: string | null } {
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [computing, setComputing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('./projection.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e: MessageEvent<{ requestId: number; result?: Projection; error?: string }>) => {
      if (e.data.requestId !== request.current) return;
      setComputing(false);
      if (e.data.result) setProjection(e.data.result);
      setError(e.data.error ?? null);
    };
    return () => w.terminate();
  }, []);

  const { cards, memory, log, settings } = data;
  useEffect(() => {
    if (!worker.current) return;
    request.current += 1;
    setComputing(true);
    worker.current.postMessage({ requestId: request.current, cards, memory, log, settings, now: new Date() });
  }, [cards, memory, log, settings]);

  return { projection, computing, error };
}
