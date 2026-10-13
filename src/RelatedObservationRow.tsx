import { useState } from 'react';
import type { WindowView } from './agilityModel.ts';
import type { ObservationComparison } from './agilityMapTypes.ts';
import { comparisonCoverage } from './agilityComparison.ts';
import { RelatedWindowPreview } from './RelatedWindowPreview.tsx';
export function RelatedObservationRow({query,target,comparison,title,status,selected,qualifying,onCompare}:{query:WindowView;target:WindowView;comparison:ObservationComparison;title:string;status:string;selected:boolean;qualifying:boolean;onCompare:()=>void}){
  const [expanded,setExpanded]=useState(false),coverage=comparisonCoverage(query,target,comparison);
  const score=comparison.eligible?`${(comparison.score*100).toFixed(1)}%`:'Unresolved';
  const label=coverage.kind==='whole'?'Full windows':coverage.kind==='contained'?'Selected contained in related':coverage.kind==='partial'?'Part of selected window':'Partial channels';
  return <details className={`suggestion ${selected?'selected':''}`} data-target-window-id={target.windowId} onToggle={e=>setExpanded(e.currentTarget.open)}>
    <summary onClick={e=>{if(!e.currentTarget.parentElement!.hasAttribute('open'))onCompare();}} aria-label={`Compare ${title} · ${score}${comparison.eligible?' resemblance':''}${coverage.selected<1?` · ${(coverage.selected*100).toFixed(0)}% of selected events`:''}`}><strong><span>{title}</span><span className="suggestion-score">{score}{comparison.eligible&&coverage.selected<1&&<span className="suggestion-coverage">{(coverage.selected*100).toFixed(0)}% covered</span>}</span></strong></summary>
    {expanded&&<div className="suggestion-body"><small>{status} · {label} · {qualifying?'candidate / review':'weak / review'}</small><p className="small-note related-preview-key"><span>Selected</span> · <span>Related</span> · normalized shapes; grey shows the complete reference window. Coverage counts events, not resemblance.</p><RelatedWindowPreview query={query} target={target} comparison={comparison}/></div>}
  </details>;
}
