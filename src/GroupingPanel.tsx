import { useState } from 'react';
import type { Assignment, GroupingSettings } from './grouping.ts';
import { DEFAULT_GROUPING } from './grouping.ts';
import type { ControlInsert } from './controlInserts.ts';
import type { RegionSet } from './types.ts';

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function AssignmentDetails({ assignment, regionSet, calibrationDataset }: { assignment: Assignment; regionSet: RegionSet; calibrationDataset?: string }) {
  const region = regionSet.regions.find(r => r.id === assignment.regionId)!;
  const best = assignment.candidates[0];
  return <div className="assignment-details" aria-label="Automatic grouping result">
    <strong>{assignment.created ? 'Created' : 'Joined'} {region.name}</strong>
    <p>{assignment.reason} {region.local && (region.provisional ? 'This group has one example.' : 'This group now has multiple examples.')} Membership describes resemblance.</p>
    <p>Admission threshold: {percent(assignment.threshold)} · similarity is not a probability.</p>
    {calibrationDataset && <p>Calibrated score mappings: {calibrationDataset}. Formula and vision scores below use balanced-pair evidence scales.</p>}
    {best && <><p>Best candidate: {regionSet.regions.find(r => r.id === best.regionId)?.name}</p><dl><div><dt>Formula similarity</dt><dd>{percent(best.formula)}</dd></div><div><dt>Vision similarity</dt><dd>{best.vision === null ? 'Disabled' : percent(best.vision)}</dd></div><div><dt>Combined similarity</dt><dd>{percent(best.combined)}</dd></div>{calibrationDataset && <><div><dt>Raw formula</dt><dd>{percent(best.rawFormula)}</dd></div><div><dt>Raw vision</dt><dd>{best.rawVision === null ? 'Disabled' : percent(best.rawVision)}</dd></div></>}</dl></>}
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
      <p>Grouping settings are separate from browsing weights and saved separately for Frequency and PRI. Applying them replays local assignments in insertion order. Reference memberships and representatives stay fixed.</p>
      {settings.calibration && <p>Active calibration: {settings.calibration.datasetId}. Changing formula feature weights removes the draft calibration and resets its threshold; rerun evaluation for the new weights.</p>}
      <form onSubmit={e => { e.preventDefault(); onApply(draft); }}>
        <label><span>Admission threshold</span><input type="range" aria-label="Grouping similarity threshold" min="0.01" max="1" step="0.001" value={draft.threshold} onChange={e => setDraft({ ...draft, threshold: Number(e.target.value) })} /><output>{percent(draft.threshold)}</output></label>
        <label><span>Formula / vision</span><input type="range" aria-label="Grouping formula share" min="0" max="1" step="0.05" value={draft.formulaWeight} onChange={e => setDraft({ ...draft, formulaWeight: Number(e.target.value) })} /><output className="blend-output">{percent(draft.formulaWeight)} / {percent(1 - draft.formulaWeight)}</output></label>
        <p>Standard CV pixel overlap compares phase-aligned, standardized curve images without learned features. Raw formula similarity = exp(−distance). {draft.calibration && 'Fitted mappings convert both raw scores before blending.'}</p>
        {(['shape', 'period', 'excursion', 'centre'] as const).map(key => <label key={key}><span>Formula {key}</span><input type="range" aria-label={`Grouping ${key} weight`} min="0" max="1" step="0.05" value={draft.weights[key]} onChange={e => { const weights = { ...draft.weights, [key]: Number(e.target.value) }; if (Object.values(weights).some(w => w > 0)) { const next = { ...draft, weights }; if (next.calibration) { delete next.calibration; next.threshold = DEFAULT_GROUPING.threshold; } setDraft(next); } }} /><output>{percent(draft.weights[key])}</output></label>)}
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
