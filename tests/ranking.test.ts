import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { neighbours, DEFAULT_WEIGHTS, SHAPE_WEIGHTS } from '../src/signal.ts';
import { controlInserts } from '../src/controlInserts.ts';
import type { AtlasData } from '../src/types.ts';

test('ranking worker agrees with synchronous rankings across quantities and local queries', async () => {
  const messages: any[] = [];
  const scope = { onmessage: null as null | ((event: { data: unknown }) => void), postMessage: (message: unknown) => messages.push(message) };
  Object.defineProperty(globalThis, 'self', { value: scope, configurable: true });
  await import('../src/ranking.worker.ts');
  const atlases = Object.fromEntries(['frequency', 'pri'].map(quantity => [quantity, JSON.parse(readFileSync(new URL(`../src/data/${quantity === 'pri' ? 'pri-atlas' : 'atlas'}.json`, import.meta.url), 'utf8')) as AtlasData]));
  const catalogues = Object.fromEntries(Object.entries(atlases).map(([quantity, atlas]) => [quantity, atlas.entries.slice(0, 64)]));
  scope.onmessage!({ data: { type: 'init', catalogues } });
  let id = 0;
  for (const quantity of ['frequency', 'pri']) {
    const local = [controlInserts(atlases[quantity])[0].entry];
    const entries = [...catalogues[quantity], ...local];
    for (const selected of [entries[0], local[0]]) for (const weights of [DEFAULT_WEIGHTS, SHAPE_WEIGHTS]) {
      scope.onmessage!({ data: { id: ++id, quantity, selectedId: selected.id, local, weights } });
      const response = messages.at(-1);
      assert.equal(response.id, id);
      assert.deepEqual(response.rows, neighbours(selected, entries, weights).slice(0, 5));
    }
  }
  scope.onmessage!({ data: { id: ++id, quantity: 'frequency', selectedId: 'missing', local: [], weights: DEFAULT_WEIGHTS } });
  assert.ok(messages.at(-1).error);
  Reflect.deleteProperty(globalThis, 'self');
});
