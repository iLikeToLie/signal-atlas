import { useEffect, useRef, useState } from 'react';
import type { Entry, Weights } from './types.ts';
import type { neighbours } from './signal.ts';

export function useNeighbours(frequency: Entry[], pri: Entry[], local: Entry[], selected: Entry, weights: Weights) {
  const worker = useRef<Worker | null>(null), request = useRef({ id: 0, key: '' });
  const key = JSON.stringify([selected.quantity || 'frequency', selected.id, weights, local.map(e => e.id)]);
  const [result, setResult] = useState<{ key: string; rows: ReturnType<typeof neighbours>; error: string }>({ key: '', rows: [], error: '' });
  useEffect(() => {
    const next = new Worker(new URL('./ranking.worker.ts', import.meta.url), { type: 'module' });
    worker.current = next;
    next.postMessage({ type: 'init', catalogues: { frequency, pri } });
    next.onmessage = event => { if (event.data.id === request.current.id) setResult({ key: request.current.key, rows: event.data.rows || [], error: event.data.error || '' }); };
    next.onerror = () => setResult({ key: request.current.key, rows: [], error: 'Neighbour computation failed. Reload to retry.' });
    return () => { next.terminate(); worker.current = null; };
  }, [frequency, pri]);
  useEffect(() => {
    const id = request.current.id + 1;
    request.current = { id, key };
    worker.current?.postMessage({ id, quantity: selected.quantity || 'frequency', selectedId: selected.id, local, weights });
  }, [key, frequency, pri]);
  return { ranked: result.key === key ? result.rows : [], rankingPending: result.key !== key, rankingError: result.key === key ? result.error : '' };
}
