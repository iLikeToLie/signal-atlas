import { useState } from 'react';
import { MiniPlot, Plot } from './Plot.tsx';
import { compare, SHAPE_WEIGHTS } from './signal.ts';
import type { AtlasData } from './types.ts';

export function RegionExample({ atlas }: { atlas: AtlasData }) {
  const [id, setId] = useState('sinusoidal-05');
  const examples = ['sinusoidal-05', 'harmonic-05', 'shoulders-05'].map(id => atlas.entries.find(e => e.id === id)!);
  const entry = examples.find(e => e.id === id)!;
  const candidates = atlas.regionSet.regions.map(region => {
    const medoid = atlas.entries.find(e => e.id === region.medoidId)!;
    return { region, medoid, ...compare(entry, medoid, SHAPE_WEIGHTS) };
  }).sort((a, b) => a.shape - b.shape || a.medoid.id.localeCompare(b.medoid.id));
  const winner = candidates[0];
  const memberPool = atlas.entries.filter(e => atlas.regionSet.membership[e.id] === winner.region.id && e.id !== winner.medoid.id && e.id !== entry.id);
  const members = Array.from({ length: 4 }, (_, i) => memberPool[Math.floor(i * memberPool.length / 4)]);
  return <figure className="region-example" aria-labelledby="region-example-title">
    <figcaption id="region-example-title">Grouping example</figcaption>
    <label className="example-picker">Choose a reference cycle<select value={id} onChange={e => setId(e.target.value)}>{examples.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
    <div className="example-step"><strong>1 · Normalize and align</strong><Plot entries={[entry, winner.medoid]} normalized shifts={[0, winner.phase]} title={`${entry.name} and the ${winner.region.name} representative, normalized and circularly aligned`} /><div className="example-legend"><span>━ Chosen cycle</span><span>┄ Closest representative</span></div><p>Time becomes 0–1 cycle; values become −0.5–+0.5. The dashed curve shifts around the cycle by {(winner.phase * 100).toFixed(1)}% to find the closest alignment.</p></div>
    <div className="example-step"><strong>2 · Compare representatives</strong><p>All {candidates.length} representatives are compared. These are the three closest; lower normalized RMS means more similar shape. Values show RMS × 100%, not match probabilities.</p><ol className="example-candidates">{candidates.slice(0, 3).map((c, i) => <li key={c.region.id} style={{ borderColor: i === 0 ? c.region.color : undefined }}><MiniPlot entry={c.medoid} color={c.region.color} /><span>{c.region.name}{i === 0 && <small>Closest · assigned region</small>}</span><output aria-label={`${c.region.name} normalized RMS percent`}>{(c.shape * 100).toFixed(1) + '%'}</output></li>)}</ol></div>
    <div className="example-step"><strong>3 · Form the island</strong><div className="example-island" style={{ borderColor: winner.region.color, background: `${winner.region.color}18` }}><span style={{ color: winner.region.color }}>{winner.region.name} · {winner.region.count} cycles</span><div className="example-members">{[entry, winner.medoid, ...members].map((e, i) => <div key={e.id} title={e.name}><MiniPlot entry={e} color={winner.region.color} /><small>{i === 0 ? 'Your choice' : i === 1 ? 'Representative' : 'Member'}</small></div>)}</div></div><p>Six actual members shown in an illustrative arrangement. The atlas packs all members into a coloured island; its outline and gaps are for readability.</p></div>
    <p className="small-note">This shows assignment using the final representatives. During clustering, assignment and representative updates repeat until stable. Colour and names are added afterwards.</p>
  </figure>;
}
