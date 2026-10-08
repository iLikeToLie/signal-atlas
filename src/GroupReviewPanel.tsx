import type { Entry } from './types.ts';
import type { GroupingResult } from './grouping.ts';
import type { SplitProposal } from './groupPolicy.ts';
import { MiniPlot } from './Plot.tsx';

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function GroupReviewPanel({ grouping, entries, onSelect, onAcknowledge, onMove, onSplit, onUndo, undoCount, disabled }: {
  grouping: GroupingResult; entries: Entry[]; onSelect: (id: string) => void; onAcknowledge: (id: string) => void;
  onMove: (id: string, target: string) => void; onSplit: (proposal: SplitProposal) => void; onUndo: () => void; undoCount: number; disabled: boolean;
}) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const reviews = Object.values(grouping.assignments).filter(a => a.needsReview);
  const proposals = Object.values(grouping.health).flatMap(h => h.proposals);
  const activeRegions = grouping.regionSet.regions.filter(r => r.local || grouping.health[r.id].coreIds.length + grouping.health[r.id].fringeIds.length > 0);
  return <section className="group-review-panel" aria-label="Group health and review">
    <details open={reviews.length > 0 || proposals.length > 0 || grouping.reviewWarnings.length > 0 || undoCount > 0}>
      <summary>Group health & review · {reviews.length} to review · {proposals.length} split proposals</summary>
      <p>Groups keep fixed identity anchors. Clear core members can add up to two coverage examples after three distinct core shapes. Fringe members do not expand the boundary. Splits need your approval.</p>
      {disabled && <p>Review actions are unavailable in the control demo or while saved review storage needs recovery.</p>}
      {!!grouping.reviewWarnings.length && <div role="status" className="review-warnings">{grouping.reviewWarnings.map((warning, i) => <p key={i}>{warning}</p>)}</div>}
      <div className="group-health-list">{activeRegions.map(r => {
        const health = grouping.health[r.id];
        return <div key={r.id}><strong style={{ color: r.color }}>{r.name}</strong><span>{health.coreIds.length} local core · {health.fringeIds.length} fringe / review</span><small>{r.local ? r.provisional ? `Provisional · ${health.distinctCoreShapes}/3 distinct core shapes` : 'Supported by distinct core shapes' : 'Fixed catalogue region'} · {health.representativeIds.length} representatives</small><button onClick={() => onSelect(r.medoidId)}>Inspect anchor</button></div>;
      })}</div>
      {!activeRegions.length && <p>Import cycles to see their group health and review suggestions.</p>}
      {reviews.map(a => {
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
      {proposals.map(proposal => {
        const parent = grouping.regionSet.regions.find(r => r.id === proposal.regionId)!;
        return <article className="split-proposal" key={proposal.id}>
          <h3>Proposed split from {parent.name}</h3>
          <p>{proposal.memberIds.length} fringe members · {proposal.distinctShapes} distinct shapes · weakest pair similarity {percent(proposal.cohesion)}. Every pair matches more strongly than these members match the parent anchor.</p>
          <div className="split-examples">{proposal.memberIds.map(id => <button key={id} onClick={() => onSelect(id)}><MiniPlot entry={byId.get(id)!} /><span>{byId.get(id)!.name}{id === proposal.anchorId && ' · proposed anchor'}</span></button>)}</div>
          <button className="primary" disabled={disabled} onClick={() => onSplit(proposal)}>Approve split ({proposal.memberIds.length} members)</button>
          <small>The parent anchor stays in place. This decision and its undo are saved in this browser.</small>
        </article>;
      })}
      {undoCount > 0 && <div className="grouping-actions"><button disabled={disabled} onClick={onUndo}>Undo last group decision</button><small>{undoCount} decisions available to undo</small></div>}
      <p className="small-note">Distinct shapes are a conservative support proxy, not proof of independent captures or a physical class. Reconstruction review is separate from unfamiliarity; a low similarity score alone does not identify noise.</p>
    </details>
  </section>;
}
