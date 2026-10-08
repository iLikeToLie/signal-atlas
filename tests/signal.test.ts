import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expandedTrajectory, generateCatalogue, makeEntry, trajectory } from '../src/catalogue.ts';
import { align, compare, neighbours, repeatSamples, SHAPE_WEIGHTS, DEFAULT_WEIGHTS, sampleAt, sweepSeconds } from '../src/signal.ts';
import { distanceMatrix, embed, placeImport, shapeMatrix } from '../src/layout.ts';
import { layoutRegions, mapAnchors, spreadTiles, tileContour, movingTileIds, MAP_HALF_WIDTH, MAP_HALF_HEIGHT } from '../src/displayLayout.ts';
import { generatePriCatalogue } from '../src/priCatalogue.ts';
import { groupRegions } from '../src/regions.ts';
import { parseImport, exportEntry, validateCycle } from '../src/importExport.ts';
import type { AtlasData, Entry } from '../src/types.ts';

const entries = generateCatalogue();
const get = (id: string) => entries.find(e => e.id === id)!;
const reference = get('control-reference');

test('visual sweeps cap work to visible close-up tiles and preserve stored signal timing', () => {
  const points = Object.fromEntries(Array.from({length:100}, (_, i) => [`tile-${i}`, {x:i * 2, y:0}]));
  points['offscreen'] = {x:1000, y:1000};
  const ids = Object.keys(points);
  assert.equal(movingTileIds(ids, points, {x:0,y:0,zoom:1}).size, 0);
  const moving = movingTileIds(ids, points, {x:0,y:0,zoom:4});
  assert.equal(moving.size, 48); assert.ok(moving.has('tile-0')); assert.ok(!moving.has('offscreen'));
  assert.deepEqual([...movingTileIds(ids, points, {x:-3000,y:0,zoom:4})], []);
  const before = structuredClone(reference);
  assert.ok(Math.abs(sweepSeconds(reference, 3) - 1.92) < 1e-12);
  assert.ok(Math.abs(sweepSeconds(reference, 3, 2) - .96) < 1e-12);
  assert.equal(sweepSeconds({...reference, units:{time:'us',frequency:'Hz'}}, 3), .9);
  assert.equal(sweepSeconds({...reference, period:100}, 3), 4.8);
  assert.ok(Math.abs(sweepSeconds({...reference, quantity:'pri'}, 3) - 4.8) < 1e-12);
  assert.ok(Math.abs(sweepSeconds({...reference, quantity:'pri'}, 3, 2) - 2.4) < 1e-12);
  assert.equal(sweepSeconds({...reference, quantity:'pri', units:{time:'us',frequency:'s'}}, 3), 1.2);
  assert.equal(sweepSeconds({...reference, quantity:'pri', period:100}, 3), 12);
  assert.deepEqual(reference, before);
});

test('PRI atlas is paired, positive, distinct, and supports interval-unit imports', () => {
  const pri = generatePriCatalogue();
  assert.deepEqual(pri, generatePriCatalogue());
  assert.deepEqual(pri.map(e => e.id), entries.map(e => e.id));
  assert.ok(pri.every(e => e.quantity === 'pri' && e.units.frequency === 'tu' && e.samples.every(s => s.f > 0)));
  assert.equal(compare(pri[0], entries[0], SHAPE_WEIGHTS).distance, Infinity);
  const atlas = JSON.parse(readFileSync(new URL('../src/data/pri-atlas.json', import.meta.url), 'utf8')) as AtlasData;
  assert.deepEqual(atlas.entries, pri);
  const layout = layoutRegions(atlas.shapePositions, atlas.regionSet);
  assert.equal(Object.keys(layout.points).length, 1000);
  assert.equal(atlas.regionSet.regions.reduce((sum, r) => sum + r.count, 0), 1000);
  for (const area of layout.areas) assert.match(area.outline, /^M.*Z$/);
  const a = validateCycle({ ...pri[0], units: { time: 's', frequency: 'ms' } });
  const b = validateCycle({ ...a, units: { time: 'ms', frequency: 's' }, period: a.period * 1000, samples: a.samples.map(s => ({t:s.t * 1000, f:s.f / 1000})) });
  assert.ok(compare(a, b).distance < 1e-10);
  const parsed = parseImport(exportEntry(a, 'csv'), 'pri.csv');
  assert.equal(parsed.quantity, 'pri'); assert.deepEqual(parsed.samples, a.samples);
  assert.equal(validateCycle(JSON.parse(exportEntry(a, 'json'))).quantity, 'pri');
  assert.throws(() => validateCycle({ ...a, samples: a.samples.map(s => ({...s, f:-s.f})) }), /greater than zero/);
  const coastal = tileContour([{x:0,y:0},{x:24,y:10}], 0);
  assert.match(coastal, /^M.*Z$/); assert.ok(coastal.includes('L'));
  assert.equal(coastal.split('M').length - 1, 2, 'Separate tile footprints must not be bridged by a convex hull.');
});

test('catalogue is deterministic, preserves original entries and has 1,000 valid cycles', () => {
  assert.deepEqual(entries, generateCatalogue()); assert.equal(entries.length, 1000);
  assert.equal(new Set(entries.map(e => e.id)).size, 1000);
  assert.deepEqual(get('blend-04'), makeEntry('blend-04', 'Periodic blends 04', 'blend', 2.2, 1, 10, p => trajectory('blend', p, 0.6), { shapeParameter: 0.6, variant: 4 }));
  assert.equal(entries.filter(e => e.provenance.version === '1.0.0').length, 104);
  assert.equal(entries.filter(e => e.provenance.version === '1.1.0').length, 896);
  for (const e of entries) {
    assert.equal(e.samples[0].f, e.samples.at(-1)!.f);
    assert.equal(e.samples.at(-1)!.t, e.period);
    const fs = e.samples.map(s => s.f);
    assert.ok(Math.abs(Math.max(...fs) - Math.min(...fs) - e.excursion) < 1e-10);
    assert.ok(Math.abs((Math.max(...fs) + Math.min(...fs)) / 2 - e.centre) < 1e-10);
    assert.deepEqual(e.units, { time: 'tu', frequency: 'fu' });
    assert.equal(e.sampling, 'closed-endpoint');
    assert.doesNotThrow(() => validateCycle(e, 'control', 'local-test'));
  }
});
test('smooth generators join with continuous slopes; triangle corners remain allowed', () => {
  for (const family of ['sinusoidal', 'rounded', 'rise-fall', 'sweep-dwell', 'harmonic', 'shoulders', 'blend'] as const) {
    for (const q of [0, 0.5, 1]) {
      const h = 1e-6, f = (p: number) => trajectory(family, p, q);
      assert.ok(Math.abs(f(h) - f(1 - h)) < 1e-3);
      assert.ok(Math.abs((f(h) - f(0)) / h - (f(0) - f(1 - h)) / h) < 0.01);
    }
    for (let shape = 0; shape < 28; shape++) {
      const h = 1e-6, f = (p: number) => expandedTrajectory(family, p, shape);
      assert.ok(Math.abs(f(h) - f(1 - h)) < 1e-3, `${family} ${shape}: boundary`);
      assert.ok(Math.abs((f(h) - f(0)) / h - (f(0) - f(1 - h)) / h) < 0.05, `${family} ${shape}: slope`);
    }
  }
});
test('three repeats preserve cycle timing, phase alignment and stored samples', () => {
  const original = structuredClone(reference), repeated = repeatSamples(reference, 3);
  assert.equal(repeated.length, 769);
  assert.equal(repeated.at(-1)!.t, reference.period * 3);
  for (let cycle = 0; cycle < 3; cycle++) for (let i = 0; i < 256; i++) {
    assert.ok(Math.abs(repeated[cycle * 256 + i].f - repeated[i].f) < 1e-10);
    assert.ok(Math.abs(repeated[cycle * 256 + i].t - repeated[i].t - cycle * reference.period) < 1e-10);
  }
  const normalized = repeatSamples(reference, 3, true);
  assert.equal(normalized.at(-1)!.t, 3);
  assert.ok(normalized.every(s => Math.abs(s.f) <= 0.5 + 1e-10));
  const shifted = repeatSamples(get('control-shift'), 3, true, compare(reference, get('control-shift')).phase);
  assert.ok(shifted.every((s, i) => Math.abs(s.f - normalized[i].f) < 1e-10));
  assert.deepEqual(reference, original);
});
test('cached morphology matrices retain exact comparison distances within numerical precision', () => {
  const subset = entries.slice(0, 28), shapes = shapeMatrix(subset), matrix = distanceMatrix(subset, DEFAULT_WEIGHTS, shapes);
  for (let i = 0; i < subset.length; i++) for (let j = 0; j < subset.length; j++) {
    const direct = compare(subset[i], subset[j]);
    assert.ok(Math.abs(matrix[i][j] - direct.distance) < 1e-8);
    assert.ok(Math.abs(shapes[i][j] - direct.shape) < 1e-8);
  }
});
test('display spacing separates dense anchors deterministically without moving reference tiles for imports', () => {
  const positions = Object.fromEntries(entries.map(e => [e.id, { x: 1, y: 1 }]));
  const anchors = mapAnchors(positions), original = structuredClone(anchors), tiles = spreadTiles(anchors);
  assert.deepEqual(tiles, spreadTiles(anchors)); assert.deepEqual(anchors, original);
  assert.equal(new Set(Object.values(tiles).map(p => `${p.x},${p.y}`)).size, 1000);
  const points = Object.values(tiles);
  for (let i = 0; i < points.length; i++) {
    assert.ok(Math.abs(points[i].x) <= MAP_HALF_WIDTH && Math.abs(points[i].y) <= MAP_HALF_HEIGHT);
    for (let j = i + 1; j < points.length; j++) assert.ok(Math.abs(points[i].x - points[j].x) >= 12 || Math.abs(points[i].y - points[j].y) >= 9);
  }
  const withImport = spreadTiles({ ...anchors, 'local-check': { x: 0, y: 0 } });
  for (const id of Object.keys(tiles)) assert.deepEqual(withImport[id], tiles[id]);
});
test('regions use signal distances, have real medoids, and ignore generator labels and input order', () => {
  const subset = entries.slice(0, 6).map((e, i) => ({ ...e, id: `group-${i}` }));
  const coordinate = [0, 1, 2, 20, 21, 22], distances = coordinate.map(a => coordinate.map(b => Math.abs(a - b)));
  const grouped = groupRegions(subset, distances, 2);
  assert.deepEqual(grouped, groupRegions(subset, distances, 2));
  assert.equal(grouped.converged, true); assert.equal(grouped.objective, 4);
  assert.deepEqual(grouped.regions.map(r => r.medoidId), ['group-1', 'group-4']);
  assert.equal(grouped.membership['group-0'], grouped.membership['group-2']);
  assert.notEqual(grouped.membership['group-0'], grouped.membership['group-3']);
  assert.deepEqual(grouped.membership, groupRegions(subset.map(e => ({ ...e, family: 'triangular' })), distances, 2).membership);
  const order = [3, 0, 4, 1, 5, 2];
  assert.deepEqual(grouped.membership, groupRegions(order.map(i => subset[i]), order.map(i => order.map(j => distances[i][j])), 2).membership);
  assert.equal(groupRegions(subset, distances.map(row => row.map(() => 0))).regions.length, 1);
});
test('the full regional atlas covers 1,000 cycles in 12 separated coloured islands', () => {
  const atlas = JSON.parse(readFileSync(new URL('../src/data/atlas.json', import.meta.url), 'utf8')) as AtlasData;
  const grouped = atlas.regionSet, original = structuredClone(atlas.shapePositions), layout = layoutRegions(atlas.shapePositions, grouped);
  assert.equal(grouped.regions.length, 12); assert.equal(grouped.converged, true);
  assert.equal(grouped.regions.reduce((sum, r) => sum + r.count, 0), 1000);
  assert.equal(new Set(grouped.regions.map(r => r.name)).size, 12);
  assert.equal(new Set(grouped.regions.map(r => r.color)).size, 12);
  for (const region of grouped.regions) assert.equal(grouped.membership[region.medoidId], region.id);
  for (const family of ['sinusoidal', 'triangular', 'rounded', 'rise-fall', 'sweep-dwell', 'harmonic', 'shoulders', 'blend']) {
    for (const variant of ['014', '015', '016']) assert.equal(grouped.membership[`${family}-013`], grouped.membership[`${family}-${variant}`]);
  }
  assert.deepEqual(atlas.shapePositions, original);
  assert.deepEqual(layout, layoutRegions(atlas.shapePositions, grouped));
  assert.equal(Object.keys(layout.points).length, 1000);
  for (let i = 0; i < layout.areas.length; i++) {
    const a = layout.areas[i].bounds;
    assert.ok(a.left >= -MAP_HALF_WIDTH && a.right <= MAP_HALF_WIDTH && a.top >= -MAP_HALF_HEIGHT && a.bottom <= MAP_HALF_HEIGHT);
    for (let j = i + 1; j < layout.areas.length; j++) { const b = layout.areas[j].bounds; assert.ok(a.right + 20 <= b.left || a.left - 20 >= b.right || a.bottom + 20 <= b.top || a.top - 20 >= b.bottom); }
  }
  const tiles = spreadTiles({ ...layout.points, 'local-regional-test': layout.areas[0].centre }, layout.labelCells);
  for (const id of Object.keys(layout.points)) assert.deepEqual(tiles[id], layout.points[id]);
  assert.equal(new Set(Object.values(tiles).map(p => `${p.x},${p.y}`)).size, 1001);
  assert.ok(layout.labelCells.every(p => p.x !== tiles['local-regional-test'].x || p.y !== tiles['local-regional-test'].y));
  assert.equal(grouped.membership['local-regional-test'], undefined);
});
test('phase shifts and centre shifts are equivalent, scale and directed timing remain distinct', () => {
  assert.ok(compare(reference, get('control-shift')).distance < 1e-12);
  assert.ok(compare(reference, get('control-centre')).distance < 1e-12);
  assert.ok(compare(reference, get('control-centre'), { ...DEFAULT_WEIGHTS, centre: 0.1 }).distance > 1);
  assert.ok(compare(reference, get('control-period')).distance > 0.4);
  assert.ok(compare(reference, get('control-excursion')).distance > 0.3);
  for (const id of ['control-reversal', 'control-reflection', 'control-timing']) assert.ok(compare(reference, get(id)).shape > 0.02, id);
  assert.ok(compare(reference, get('control-period'), SHAPE_WEIGHTS).distance < 1e-12);
  assert.ok(compare(reference, get('control-excursion'), SHAPE_WEIGHTS).distance < 1e-12);
  assert.equal(sampleAt(reference, 0), sampleAt(reference, 1));
  assert.throws(() => align([], []));
  assert.throws(() => compare(reference, reference, { shape: 0, period: 0, excursion: 0, centre: 0 }));
});
test('neighbours use underlying distances and MDS is deterministic', () => {
  const subset = entries.slice(0, 16), matrix = distanceMatrix(subset), a = embed(matrix), b = embed(matrix);
  assert.deepEqual(a, b); assert.ok(a.stress >= 0 && a.stress < 1);
  const rankings = neighbours(reference, entries);
  assert.ok(rankings[0].distance < 1e-12);
  assert.deepEqual(rankings.map(n => n.entry.id), neighbours(reference, entries).map(n => n.entry.id));
  const positions = Object.fromEntries(entries.map(e => [e.id, { x: 10, y: 20 }]));
  const original = structuredClone(positions);
  assert.deepEqual(placeImport({ ...reference, id: 'local-import' }, entries, positions, DEFAULT_WEIGHTS), { x: 10, y: 20 });
  assert.deepEqual(positions, original);
  assert.ok(Math.abs(compare(entries[0], entries[7]).distance - compare(entries[7], entries[0]).distance) < 1e-12);
});
test('CSV and JSON export round trip; metadata can be explicitly supplied', () => {
  for (const format of ['json', 'csv'] as const) {
    const e = parseImport(exportEntry(reference, format), `roundtrip.${format}`);
    assert.deepEqual(e.samples, reference.samples); assert.equal(e.period, reference.period); assert.equal(e.source, 'measured');
  }
  const csv = ['t,f', ...reference.samples.map(s => `${s.t},${s.f}`)].join('\n');
  assert.throws(() => parseImport(csv, 'x.csv'), /Period/);
  assert.doesNotThrow(() => parseImport(csv, 'x.csv', { period: reference.period, timeUnit: 'tu', frequencyUnit: 'fu', sampling: 'closed-endpoint' }));
});
test('invalid imports are rejected without silently sorting, closing or smoothing', () => {
  const bad = (change: (e: Entry) => void, message: RegExp) => { const e = structuredClone(reference); change(e); assert.throws(() => validateCycle(e), message); };
  bad(e => { e.samples[3].t = e.samples[2].t; }, /duplicate or unordered/);
  bad(e => { e.samples[3].t = -1; }, /duplicate or unordered/);
  bad(e => { e.samples[4].f = Infinity; }, /finite/);
  bad(e => { e.period = 0; }, /greater than zero/);
  bad(e => { e.samples[0].t = 0.01; }, /start at t = 0/);
  bad(e => { e.units.time = ''; }, /explicit units/);
  bad(e => { e.samples.at(-1)!.f += 0.1; }, /Boundary mismatch/);
  bad(e => { e.samples.pop(); }, /include the endpoint/);
  bad(e => { e.samples = e.samples.map(s => ({ ...s, f: 3 })); }, /non-zero/);
  const open = { ...reference, sampling: 'uniform-open', samples: reference.samples.slice(0, -1) };
  assert.doesNotThrow(() => validateCycle(open));
  assert.throws(() => validateCycle({ ...open, samples: open.samples.slice(0, -1) }), /Uniform-open/);
  assert.throws(() => parseImport('t,f\n0,1,2', 'x.csv'), /exactly two/);
  assert.throws(() => parseImport('{', 'x.json'), /Invalid JSON/);
  assert.throws(() => parseImport('t,f\n0,NaN', 'x.csv', { period: 1, timeUnit: 'tu', frequencyUnit: 'fu' }), /Declare sampling/);
});
test('physical units convert consistently; shape-only matching is unit-free', () => {
  const physical = { ...reference, id: 'local-physical-test', units: { time: 's', frequency: 'Hz' } };
  const scaled = { ...physical, period: physical.period * 1000, excursion: physical.excursion / 1000, centre: physical.centre / 1000, units: { time: 'ms', frequency: 'kHz' }, samples: physical.samples.map(s => ({ t: s.t * 1000, f: s.f / 1000 })) };
  assert.ok(compare(physical, scaled).distance < 1e-12);
  assert.equal(compare(physical, reference).distance, Infinity);
  assert.equal(neighbours(physical, entries).length, 0);
  assert.ok(compare(physical, reference, SHAPE_WEIGHTS).distance < 1e-12);
  assert.equal(neighbours(physical, entries, SHAPE_WEIGHTS).length, entries.length);
});
