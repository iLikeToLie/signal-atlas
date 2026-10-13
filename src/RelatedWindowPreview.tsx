import { memo } from 'react';
import type { WindowView } from './agilityModel.ts';
import type { ObservationComparison } from './agilityMapTypes.ts';
import { relatedWindowPreview, PREVIEW_WIDTH, PREVIEW_HEIGHT, PREVIEW_INSET } from './relatedWindowPreview.ts';
import { comparisonCoverage } from './agilityComparison.ts';

export const RelatedWindowPreview=memo(function RelatedWindowPreview({query,target,comparison}:{query:WindowView;target:WindowView;comparison:ObservationComparison}){
  const p=relatedWindowPreview(query,target,comparison);if(!p)return null;
  const width=PREVIEW_WIDTH-2*PREVIEW_INSET,left=PREVIEW_INSET+p.startFraction*width,span=(p.endFraction-p.startFraction)*width,centre=(p.startFraction+p.endFraction)/2;
  const score=comparison.eligible?`${(comparison.score*100).toFixed(1)}%`:'Unresolved',coverage=comparisonCoverage(query,target,comparison);
  return <span className="related-preview" data-preview-kind={comparison.kind} data-reference-axis={p.axis}>
    {p.channels.map(c=><span className="related-preview-channel" key={c.quantity} data-preview-quantity={c.quantity}>
      <span className="related-preview-label">{c.label}{!c.supported&&<span>Insufficient evidence</span>}</span>
      <svg viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`${c.label}: comparison at ${p.axis} events [${p.startEvent},${p.endEvent})${!c.supported?'; insufficient evidence':''}`}>
        <rect x={left} y="0" width={span} height={PREVIEW_HEIGHT} className="related-preview-band"/>
        <path d={c.contextPath} className="related-preview-context"/>
        <path d={c.queryPath} className="related-preview-query"/>
        <path d={c.matchPath} className="related-preview-target"/>
      </svg>
    </span>)}
    <svg className={`related-preview-scope ${comparison.weak?'weak':''}`} viewBox={`0 0 ${PREVIEW_WIDTH} 26`} role="img" aria-label={`${score}${comparison.eligible?' resemblance':''} · ${p.axis} events [${p.startEvent},${p.endEvent}) of [${p.windowStart},${p.windowEnd})`} data-match-start={p.startEvent} data-match-end={p.endEvent} data-match-start-fraction={p.startFraction} data-match-end-fraction={p.endFraction}>
      <rect x={PREVIEW_INSET} y="17" width={width} height="6" rx="2" className="related-preview-track"/>
      <rect x={left} y="17" width={span} height="6" className="related-preview-coverage"/>
      <text x={PREVIEW_INSET+centre*width} y="12" textAnchor={centre<.15?'start':centre>.85?'end':'middle'}>{score}</text>
    </svg>
    {([['selected',query,comparison.explanation.query,coverage.selected],['related',target,comparison.explanation.target,coverage.related]] as const).map(([side,v,scope,fraction])=><svg key={side} className="related-preview-coverage-row" viewBox={`0 0 ${PREVIEW_WIDTH} 22`} role="img" aria-label={`${(fraction*100).toFixed(0)}% of ${side} events · [${scope.startEvent},${scope.endEvent})`} data-coverage-side={side} data-coverage-fraction={fraction}>
      <text x={PREVIEW_INSET} y="10">{side==='selected'?'Selected':'Related'} · {(fraction*100).toFixed(0)}% covered</text><rect x={PREVIEW_INSET} y="15" width={width} height="5" className="related-preview-track"/><rect x={PREVIEW_INSET+(scope.startEvent-v.points[0].index)/v.count*width} y="15" width={fraction*width} height="5" className="related-preview-coverage"/>
    </svg>)}
    <span className="related-preview-caption">Selected [{comparison.explanation.query.startEvent},{comparison.explanation.query.endEvent}) / related [{comparison.explanation.target.startEvent},{comparison.explanation.target.endEvent}) · {score}{comparison.eligible?' resemblance':''}</span>
  </span>;
});
