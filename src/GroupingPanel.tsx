import { useState } from 'react';
import type { Assignment, GroupingSettings } from './grouping.ts';
import { DEFAULT_GROUPING } from './grouping.ts';
import type { ControlInsert } from './controlInserts.ts';
import type { RegionSet } from './types.ts';

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function AssignmentDetails({ assignment, regionSet }: { assignment: Assignment; regionSet: RegionSet }) {
  const region = regionSet.regions.find(r => r.id === assignment.regionId)!;
  const best = assignment.candidates[0];
  return <div className="assignment-details" aria-label="Automatic grouping result">
    <strong>{assignment.created ? 'Created' : 'Joined'} {region.name}</strong>
    <p>{assignment.reason} {region.local && (region.provisional ? 'This group has one example.' : 'This group now has multiple examples.')} Membership describes resemblance.</p>
    <p>Admission threshold: {percent(assignment.threshold)} · similarity is not a probability.</p>
    {best && <><p>Best candidate: {regionSet.regions.find(r => r.id === best.regionId)?.name}</p><dl><div><dt>Formula similarity</dt><dd>{percent(best.formula)}</dd></div><div><dt>Vision similarity</dt><dd>{best.vision === null ? 'Disabled' : percent(best.vision)}</dd></div><div><dt>Combined similarity</dt><dd>{percent(best.combined)}</dd></div></dl></>}
    <details><summary>Compared groups ({assignment.candidates.length})</summary><ol>{assignment.candidates.map(c => <li key={c.regionId}><span>{regionSet.regions.find(r => r.id === c.regionId)?.name}<small>Reference: {c.representativeId}</small></span><output>{percent(c.combined)}</output></li>)}</ol>{!best && <p>No compatible group representatives.</p>}</details>
  </div>;
}

export function GroupingPanel({ settings, onApply, demoActive, controls, inserted, assignments, regionSet, onStart, onNext, onReset, onExit }: {
  settings: GroupingSettings; onApply: (settings: GroupingSettings) => void;
  demoActive: boolean; controls: ControlInsert[]; inserted: number; assignments: Record<string, Assignment>; regionSet: RegionSet;
  onStart: () => void; onNext: () => void; onReset: () => void; onExit: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  return <section className="grouping-panel" aria-label="Automatic grouping">
    <div className="grouping-heading"><div><strong>Automatic grouping</strong><small>{demoActive ? 'Demo workspace · saved imports are separate' : 'New cycles join a match or start a new group'}</small></div>{!demoActive && <button onClick={onStart}>Run control demo</button>}</div>
    <details className="grouping-settings"><summary>Grouping settings · {percent(settings.formulaWeight)} formula / {percent(1 - settings.formulaWeight)} vision</summary>
      <p>Grouping settings are separate from browsing weights. Applying them replays local assignments in insertion order. Reference memberships and representatives stay fixed.</p>
      <form onSubmit={e => { e.preventDefault(); onApply(draft); }}>
        <label><span>Admission threshold</span><input type="range" aria-label="Grouping similarity threshold" min="0.5" max="1" step="0.01" value={draft.threshold} onChange={e => setDraft({ ...draft, threshold: Number(e.target.value) })} /><output>{percent(draft.threshold)}</output></label>
        <label><span>Formula share</span><input type="range" aria-label="Grouping formula share" min="0" max="1" step="0.05" value={draft.formulaWeight} onChange={e => setDraft({ ...draft, formulaWeight: Number(e.target.value) })} /><output>{percent(draft.formulaWeight)}</output></label>
        <p>Vision uses soft overlap of phase-aligned, standardized curve images. This is an experimental classical vision method; it has no trained model. Formula similarity = exp(−distance).</p>
        {(['shape', 'period', 'excursion', 'centre'] as const).map(key => <label key={key}><span>Formula {key}</span><input type="range" aria-label={`Grouping ${key} weight`} min="0" max="1" step="0.05" value={draft.weights[key]} onChange={e => { const weights = { ...draft.weights, [key]: Number(e.target.value) }; if (Object.values(weights).some(w => w > 0)) setDraft({ ...draft, weights }); }} /><output>{draft.weights[key].toFixed(2)}</output></label>)}
        <div className="grouping-actions"><button type="submit">Apply & regroup {demoActive ? 'demo' : 'local cycles'}</button><button type="button" onClick={() => setDraft(DEFAULT_GROUPING)}>Use defaults</button></div>
      </form>
    </details>
    {demoActive && <div className="control-demo">
      <p>Insert the fixed controls one at a time. Expected outcomes below use the default settings; changing weights may change the observed result.</p>
      <div className="grouping-actions"><button className="primary" onClick={onNext} disabled={inserted >= controls.length}>{inserted < controls.length ? `Insert control ${inserted + 1} / ${controls.length}` : 'Demo complete'}</button><button onClick={onReset}>Reset demo</button><button onClick={onExit}>Exit demo</button></div>
      <ol>{controls.map((control, i) => {
        const assignment = assignments[control.entry.id];
        const pass = assignment && assignment.created === (control.expected === 'create') && (!control.expectedGroup || assignment.regionId === control.expectedGroup);
        return <li key={control.entry.id}><div><strong>{control.entry.name.replace('Control insert · ', '')}</strong><small>{control.description}</small><small>Default expectation: {control.expected === 'create' ? 'create a group' : 'join a group'}</small></div><span>{i >= inserted ? 'Pending' : <>{assignment?.created ? 'Created' : 'Joined'} {regionSet.regions.find(r => r.id === assignment?.regionId)?.name}<small>{pass ? 'Matches default expectation' : 'Differs from default expectation'} · best {assignment?.candidates[0] ? percent(assignment.candidates[0].combined) : '—'}</small></>}</span></li>;
      })}</ol>
    </div>}
  </section>;
}
