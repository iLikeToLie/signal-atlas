import type { AtlasData, Entry } from './types.ts';
import { makeEntry } from './catalogue.ts';
import { sampleAt } from './signal.ts';

export type ControlInsert = { entry: Entry; description: string; expected: 'join' | 'create'; expectedGroup?: string };

// Fixed fixtures; expected outcomes use DEFAULT_GROUPING, never the observed result.
export function controlInserts(atlas: AtlasData): ControlInsert[] {
  const region = atlas.regionSet.regions[0], reference = atlas.entries.find(e => e.id === region.medoidId)!;
  const quantity = reference.quantity || 'frequency';
  const build = (id: string, name: string, fn: (p: number) => number) => {
    const entry = makeEntry(`local-demo-${quantity}-${id}`, `Control insert · ${name}`, 'unassigned', reference.period, reference.excursion, reference.centre, fn, { controlInsert: id });
    entry.quantity = quantity; entry.units = { ...reference.units };
    entry.provenance = { generator: 'control-insert', version: '1.0.0', seed: 20261006 };
    return entry;
  };
  const base = (p: number) => (sampleAt(reference, p) - reference.centre) / reference.excursion;
  const novel = (p: number) => Math.sin(2 * Math.PI * 11 * p) + .22 * Math.sin(2 * Math.PI * 17 * p + .4);
  const newEntry = build('novel', 'unfamiliar pattern', novel);
  return [
    { entry: build('match', 'clear match', base), description: 'A copy of a region representative should join that region.', expected: 'join', expectedGroup: region.id },
    { entry: build('noise', 'noisy match', p => base(p) + .008 * Math.sin(2 * Math.PI * 19 * p)), description: 'Small deterministic noise should preserve the existing match.', expected: 'join', expectedGroup: region.id },
    { entry: newEntry, description: 'An eleven-lobed pattern should create a provisional group.', expected: 'create' },
    { entry: build('novel-repeat', 'repeat unfamiliar pattern', p => novel(p + .125)), description: 'A shifted repeat should join the new group; duplicate shape support keeps it provisional.', expected: 'join', expectedGroup: `region-${newEntry.id}` },
    { entry: build('borderline', 'borderline mixture', p => .65 * base(p) + .35 * novel(p)), description: 'A mixture probes the threshold; compare the scores as settings change.', expected: 'create' },
  ];
}
