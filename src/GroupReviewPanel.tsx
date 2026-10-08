import type { Entry } from './types.ts';
import type { GroupingResult } from './grouping.ts';
import type { SplitProposal } from './groupPolicy.ts';
import { MiniPlot } from './Plot.tsx';
import { Plot } from './Plot.tsx';
import { useMemo, useState } from 'react';
import { makeEntry } from './catalogue.ts';
import { DEFAULT_GROUPING, groupIncoming } from './grouping.ts';
import { approveSplit, emptyReview, moveMember, reviewToken } from './groupPolicy.ts';
import { emptyAtlas } from './measured.ts';
import type { GroupReview } from './groupPolicy.ts';
import type { MergeProposal } from './library.ts';

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function GroupReviewPanel({ grouping, entries, onSelect, onAcknowledge, onMove, onSplit, onUndo, undoCount, disabled, hideDemo = false, ephemeral = false, merges = [], onMerge, defaultCollapsed = false }: {
  grouping: GroupingResult; entries: Entry[]; onSelect: (id: string) => void; onAcknowledge: (id: string) => void;
  onMove: (id: string, target: string) => void; onSplit: (proposal: SplitProposal) => void; onUndo: () => void; undoCount: number; disabled: boolean;
  hideDemo?: boolean; ephemeral?: boolean;
  merges?: MergeProposal[]; onMerge?: (proposal: MergeProposal) => void; defaultCollapsed?: boolean;
}) {
  const [demo, setDemo] = useState(false);
  const [reviewLimit, setReviewLimit] = useState(20);
  const byId = new Map(entries.map(e => [e.id, e]));
  const reviews = Object.values(grouping.assignments).filter(a => a.needsReview);
  const proposals = Object.values(grouping.health).flatMap(h => h.proposals);
  const activeRegions = grouping.regionSet.regions.filter(r => r.local || grouping.health[r.id].coreIds.length + grouping.health[r.id].fringeIds.length > 0);
  return <section className="group-review-panel" aria-label="Group health and review">
    {!hideDemo && <div className="grouping-actions"><button onClick={() => setDemo(d => !d)}>{demo ? 'Close group review demo' : 'Try group review demo'}</button><small>Interactive example · separate from your saved cycles</small></div>}
    {demo && <GroupReviewDemo />}
    <details open={!defaultCollapsed && (reviews.length > 0 || proposals.length > 0 || merges.length > 0 || grouping.reviewWarnings.length > 0 || undoCount > 0)}>
      <summary>Group health & review · {reviews.length} to review · {proposals.length} split proposals{onMerge && ` · ${merges.length} merge proposals`}</summary>
      <p>Groups retain identity anchors between reviewed changes. Clear core members can add up to two coverage examples after three distinct core shapes. Fringe members do not expand the boundary. Merges and splits need your approval.</p>
      {disabled && <p>Review actions are unavailable in the control demo or while saved review storage needs recovery.</p>}
      {!!grouping.reviewWarnings.length && <div role="status" className="review-warnings">{grouping.reviewWarnings.map((warning, i) => <p key={i}>{warning}</p>)}</div>}
      <div className="group-health-list">{activeRegions.map(r => {
        const health = grouping.health[r.id];
        return <div key={r.id}><strong style={{ color: r.color }}>{r.name}</strong><span>{health.coreIds.length} core · {health.fringeIds.length} fringe / review</span><small>{r.local ? health.distinctCoreCaptures !== undefined ? `${r.provisional ? 'Provisional' : 'Capture-supported'} · ${health.distinctCoreCaptures}/3 supplied measured core capture IDs · ${health.distinctCoreShapes} distinct shapes` : r.provisional ? `Provisional · ${health.distinctCoreShapes}/3 distinct core shapes` : 'Supported by distinct core shapes' : 'Fixed catalogue region'} · {health.representativeIds.length} representatives</small><button onClick={() => onSelect(r.medoidId)}>Inspect anchor</button></div>;
      })}</div>
      {!activeRegions.length && <p>Import cycles to see their group health and review suggestions.</p>}
      {reviews.slice(0, reviewLimit).map(a => {
        const entry = byId.get(a.entryId)!, region = grouping.regionSet.regions.find(r => r.id === a.regionId)!;
        const anchor = grouping.health[a.regionId].anchorIds.includes(a.entryId);
        const alternatives = a.candidates.filter(c => c.eligible && c.regionId !== a.regionId && grouping.regionSet.regions.some(r => r.id === c.regionId));
        return <article className="review-item" key={a.entryId}>
          <button className="review-entry" onClick={() => onSelect(a.entryId)}><MiniPlot entry={entry} /><strong>{entry.name}</strong></button>
          <p>Tentative member of {region.name}. {a.reviewReasons.join(' ')}{a.anchorSimilarity !== null && ` Anchor similarity: ${percent(a.anchorSimilarity)}.`}</p>
          <div className="grouping-actions"><button disabled={disabled} onClick={() => onAcknowledge(a.entryId)}>Keep reviewed match</button>{!anchor && alternatives.map(c => <button key={c.regionId} disabled={disabled} onClick={() => onMove(a.entryId, c.regionId)}>Move to {grouping.regionSet.regions.find(r => r.id === c.regionId)!.name}</button>)}</div>
          {anchor && <small>This entry is a protected identity anchor. Review does not certify its observation quality.</small>}
        </article>;
      })}
      {reviews.length > reviewLimit && <button onClick={() => setReviewLimit(n => n + 20)}>Show 20 more reviews ({reviews.length - reviewLimit} remaining)</button>}
      {onMerge && merges.map(proposal => {
        const source = grouping.regionSet.regions.find(r => r.id === proposal.sourceId)!, target = grouping.regionSet.regions.find(r => r.id === proposal.targetId)!;
        return <article className="split-proposal" key={proposal.id}>
          <h3>Proposed merge · {source.name} into {target.name}</h3>
          <p>{proposal.memberIds.length} members fit the surviving group's anchor. Weakest admission: {percent(proposal.weakestAdmission)}; weakest cross-group representative similarity: {percent(proposal.representativeCohesion)}.</p>
          <div className="split-examples">{[target.medoidId, source.medoidId].map(id => <button key={id} onClick={() => onSelect(id)}><MiniPlot entry={byId.get(id)!} /><span>{byId.get(id)!.name}</span></button>)}</div>
          <button className="primary" disabled={disabled} onClick={() => onMerge(proposal)}>Approve merge ({proposal.memberIds.length} members)</button>
          <small>{target.name} keeps its name and identity anchor. Original signals remain stored; undo restores both groups.</small>
        </article>;
      })}
      {proposals.map(proposal => {
        const parent = grouping.regionSet.regions.find(r => r.id === proposal.regionId)!;
        return <article className="split-proposal" key={proposal.id}>
          <h3>Proposed split from {parent.name}</h3>
          <p>{proposal.memberIds.length} fringe members · {proposal.distinctShapes} distinct shapes · weakest pair similarity {percent(proposal.cohesion)}. Every pair matches more strongly than these members match the parent anchor.</p>
          <div className="split-examples">{proposal.memberIds.map(id => <button key={id} onClick={() => onSelect(id)}><MiniPlot entry={byId.get(id)!} /><span>{byId.get(id)!.name}{id === proposal.anchorId && ' · proposed anchor'}</span></button>)}</div>
          <button className="primary" disabled={disabled} onClick={() => onSplit(proposal)}>Approve split ({proposal.memberIds.length} members)</button>
          <small>The parent anchor stays in place. {ephemeral ? 'Demo decisions are temporary and never saved.' : 'This decision and its undo are saved in this browser.'}</small>
        </article>;
      })}
      {undoCount > 0 && <div className="grouping-actions"><button disabled={disabled} onClick={onUndo}>Undo last group decision</button><small>{undoCount} decisions available to undo</small></div>}
      <p className="small-note">Distinct shapes are a conservative support proxy, not proof of independent captures or a physical class. Reconstruction review is separate from unfamiliarity; a low similarity score alone does not identify noise.</p>
      {Object.values(grouping.health).some(h => h.distinctCoreCaptures !== undefined) && <p className="small-note">Measured support uses three distinct supplied capture IDs among core members. Repeated windows from one capture count once; missing IDs do not establish support. Dense approved windows (maximum gap ≤5%) can enter the core; wider gaps stay under observation review. These are review heuristics, not accuracy guarantees.</p>}
    </details>
  </section>;
}

function GroupReviewDemo() {
  const settings = { ...DEFAULT_GROUPING, formulaWeight: 1, threshold: .85 };
  const entries = useMemo(() => [0, .18, .19, .20].map((h, i) => makeEntry(`demo-health-${i}`, i ? `Fringe variation ${i}` : 'Sinusoid identity anchor', 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * p) + h * Math.sin(6 * Math.PI * p), {})), []);
  const [review, setReview] = useState(emptyReview), [history, setHistory] = useState<GroupReview[]>([]), [selected, setSelected] = useState(entries[0].id);
  const grouping = useMemo(() => groupIncoming({ ...emptyAtlas('frequency'), workspace: undefined }, entries, settings, review), [entries, review]);
  const decide = (next: GroupReview) => { setHistory(h => [...h, review]); setReview(next); };
  const splitCount = grouping.regionSet.regions.length - 1;
  return <div className="group-review-demo" aria-label="Interactive group review example">
    <h3>Example · a stable sinusoid and a coherent fringe</h3>
    <p>Four generated curves use an 85% formula-only admission threshold. Three related fringe variations resemble each other more strongly than the sinusoid anchor. Inspect them, approve the proposed split, then undo it to see the parent group restored.</p>
    <p role="status">{splitCount ? 'Split approved: two groups, with the original sinusoid anchor preserved.' : 'One group: its anchor stays fixed while three fringe members await review.'} Your workspace is unchanged.</p>
    <Plot entries={[entries.find(e => e.id === selected)!]} cycles={1} />
    <button onClick={() => { setReview(emptyReview()); setHistory([]); setSelected(entries[0].id); }}>Reset group review demo</button>
    <GroupReviewPanel grouping={grouping} entries={entries} onSelect={setSelected} onAcknowledge={id => decide({ ...review, acknowledged: [...review.acknowledged, reviewToken(id, grouping.assignments[id].regionId, settings)] })} onMove={(id, target) => decide(moveMember(review, id, grouping.regionSet, target))} onSplit={proposal => decide(approveSplit(review, proposal, grouping.regionSet.regions.find(r => r.id === proposal.regionId)!.name, grouping.regionSet.regions.find(r => r.id === proposal.regionId)!.medoidId, grouping.regionSet))} onUndo={() => { if (history.length) { setReview(history.at(-1)!); setHistory(history.slice(0, -1)); } }} undoCount={history.length} disabled={false} hideDemo ephemeral />
  </div>;
}
