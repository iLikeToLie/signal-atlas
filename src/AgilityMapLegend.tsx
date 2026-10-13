import { STATUS_COLOURS,STATUS_LABELS } from './agilityMapPresentation.ts';
import { parameterLabel } from './agilityComparison.ts';
import type { ComparisonQuantity } from './agilityMapTypes.ts';
export function AgilityMapLegend({parameters,threshold}:{parameters:ComparisonQuantity[];threshold:number}){
  return <aside className="map-legend" aria-label="Map legend"><strong>Reading the map</strong>
    <div aria-label="Card legend"><b>Cards</b><span><i className="legend-card selected"/>Selected card</span><span><i className="legend-card matching"/>Matching card border</span>
      {(['unreviewed','reviewed','unresolved'] as const).map((s,i)=><span key={s}><i style={{color:STATUS_COLOURS[s]}}>{['●','■','◆'][i]}</i>{STATUS_LABELS[s]} status</span>)}<span><i className="legend-card dimmed"/>Dimmed: filtered or insufficient evidence</span>
    </div>
    <div aria-label="Connection legend"><b>Connections</b><span><i className="legend-line reviewed"/>Reviewed relationship</span><span><i className="legend-line whole"/>Full windows</span><span><i className="legend-line partial"/>Part of selected window</span><span><i className="legend-line contained"/>Selected inside related window</span></div>
    <div aria-label="Group outline legend"><b>Group outlines</b><span><i className="legend-outline"/>Similarity group or emitter island</span><span>Proximity is an approximate browsing aid.</span></div>
    <small>{parameters.map(parameterLabel).join(' + ')} · {(threshold*100).toFixed(0)}% provisional resemblance threshold · Coverage counts compared events; resemblance scores similarity. Neither establishes probability or emitter identity. Inspect a connection for its intervals and full evidence.</small>
  </aside>;
}
