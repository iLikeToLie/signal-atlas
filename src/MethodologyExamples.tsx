import { useMemo,useState } from 'react';
import type { MatchSettings } from './agilityModel.ts';
import { AgilityPlot } from './AgilityPlot.tsx';
import { COMPARISON_PARAMETERS,normalizeParameters,parameterLabel } from './agilityComparison.ts';
import { groupScoreMatrix } from './agilityGrouping.ts';
import { observationGroupName } from './groupNames.ts';
import { methodologyExamples,METHODOLOGY_GROUP_IDS,METHODOLOGY_GROUP_MATRIX } from './agilityMethodology.ts';

type Example=ReturnType<typeof methodologyExamples>[number];
function PartialMatchDiagram({example}:{example:Example}){
  const comparison=example.match?.partial,scope=comparison?.explanation.target,count=example.fullTarget.count,supported=!!comparison?.eligible;
  const start=scope?.startEvent??0,end=scope?.endEvent??0,x=(i:number)=>80+i/count*480;
  return <figure className="methodology-partial"><svg viewBox="0 0 640 160" role="img" aria-label={supported?`Partial comparison covers target events ${start} to ${end-1}; events outside that interval remain unsupported`:'No eligible partial interval with these exploration settings'}>
    <text x="80" y="20">Full target · {count} events</text><line x1="80" x2="560" y1="52" y2="52" className="coverage-track"/>
    {supported&&<rect x={x(start)} y="35" width={x(end)-x(start)} height="34" rx="5" className="coverage-band"/>}
    {example.fullTarget.points.map((p,i)=><circle key={p.index} cx={x(i+.5)} cy="52" r="2.6" className={supported&&p.index>=start&&p.index<end?'supported-event':'unsupported-event'}/>)}
    <text x="80" y="93">Observed window · {example.view.count} events</text>
    {supported&&example.view.points.map((p,i)=><circle key={p.index} cx={x(start+(i+.5)/example.view.count*(end-start))} cy="116" r="2.6" className="supported-event"/>)}
    <text x="80" y="150">0</text><text x="560" y="150" textAnchor="end">{count} (end excluded)</text>
  </svg><figcaption>{supported?<>Only the orange target interval <strong>[{start},{end})</strong> supports this partial candidate ({(comparison!.score*100).toFixed(1)}%). Gray events before and after it remain unconfirmed. This partial score is never used for whole-window grouping.</>:<>There is no eligible partial candidate under these exploration settings. Missing or inadequate evidence cannot confirm an interval.</>}</figcaption></figure>;
}

export function MethodologyExamples({settings}:{settings:MatchSettings}){
  const [exploration,setExploration]=useState<MatchSettings>(()=>({...settings,parameters:[...normalizeParameters(settings.parameters)]})),[selected,setSelected]=useState('coordination');
  const examples=useMemo(()=>methodologyExamples(exploration),[exploration]),example=examples.find(e=>e.id===selected)!,parameters=normalizeParameters(exploration.parameters);
  const channels=(view:Example['view'])=>({...view,channels:view.channels.filter(c=>parameters.includes(c.quantity as typeof parameters[number]))});
  return <section aria-labelledby="examples-title" className="methodology-lab"><h2 id="examples-title">Try the comparison</h2><p>Choose a synthetic example, then change what is compared. This sandbox starts with your applied map settings; its controls affect only these examples.</p>
    <div className="methodology-lab-controls"><label>Example<select aria-label="Methodology example" value={selected} onChange={e=>setSelected(e.target.value)}>{examples.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <fieldset className="parameter-selection"><legend>Compare using</legend>{COMPARISON_PARAMETERS.map(q=><label key={q} className="check-label"><input aria-label={`Example compare ${parameterLabel(q)}`} type="checkbox" checked={parameters.includes(q)} disabled={parameters.length===1&&parameters.includes(q)} onChange={e=>setExploration({...exploration,parameters:e.target.checked?[...parameters,q]:parameters.filter(p=>p!==q)})}/>{parameterLabel(q)}</label>)}</fieldset>
      <label>Absolute-level penalty · {exploration.absoluteWeight.toFixed(1)}<input aria-label="Example absolute-level weight" type="range" min="0" max="2" step="0.1" value={exploration.absoluteWeight} onChange={e=>setExploration({...exploration,absoluteWeight:Number(e.target.value)})}/></label>
      <label>Duration penalty · {exploration.durationWeight.toFixed(1)}<input aria-label="Example duration weight" type="range" min="0" max="2" step="0.1" value={exploration.durationWeight} onChange={e=>setExploration({...exploration,durationWeight:Number(e.target.value)})}/></label>
      <button onClick={()=>setExploration({...settings,parameters:[...normalizeParameters(settings.parameters)]})}>Use map settings</button>
    </div>
    <div className="methodology-comparison" data-methodology-comparison={example.id}><h3>{example.name}</h3><p>{example.description}</p>
      <div className="methodology-result" role="status" aria-live="polite"><strong>{example.score===null?'No comparable score':`${(example.score*100).toFixed(1)}% resemblance`}</strong><span>{example.kind==='partial'?'Partial interval':example.kind==='whole'?'Whole-window comparison':example.kind==='partial-channel'?'Incomplete selected channels':'Insufficient evidence'} · {example.qualifying?'qualifying suggestion':'not a qualifying suggestion'} · {example.groupable?'pair passes whole-window group boundary':'pair does not pass whole-window group boundary'}</span></div>
      <p className="methodology-trace-key"><span>Green: observed window</span><span>Orange dashed: compared target interval</span></p>
      <AgilityPlot key={`${selected}:${parameters.join(',')}`} view={channels(example.view)} target={channels(example.comparedTarget)} normalized/>
      <p className="small-note">Hover to inspect a shared relative-time position, or zoom all displayed channels together. These plots show the original compared intervals; the score also uses shared monotonic event-order alignment.</p>
    </div>
    <details className="methodology-example-summary"><summary>All five outcomes under these exploration settings</summary><div className="methodology-examples">{examples.map(e=><section key={e.id} data-methodology-example={e.id}><h3>{e.name}</h3><strong>{e.score===null?'No comparable score':`${(e.score*100).toFixed(1)}% resemblance`}</strong><p className="small-note">{e.kind==='partial'?'Partial interval':e.kind==='whole'?'Whole window':'Incomplete evidence'} · {e.qualifying?'qualifying':'not qualifying'} · {e.groupable?'whole-window pair passes':'whole-window pair does not pass'}</p></section>)}</div></details>
    <h3>See the limits of a partial match</h3><p>The constructed middle-window example contains only part of a longer recording. The diagram uses the matcher’s partial candidate and exact original event indices.</p>
    <PartialMatchDiagram example={examples.find(e=>e.id==='partial')!}/>
  </section>;
}

export function MethodologyGrouping({threshold}:{threshold:number}){
  const [percent,setPercent]=useState(Math.round(threshold*100)),groups=groupScoreMatrix(METHODOLOGY_GROUP_IDS,METHODOLOGY_GROUP_MATRIX,percent/100);
  const nodes=[{id:'A',x:105,y:195},{id:'B',x:535,y:195},{id:'C',x:320,y:55}],colours=['#a8d9ac','#91b9ce','#e8b477'];
  return <div className="methodology-group-demo"><h3>Two strong links do not guarantee one group</h3><p>A, B and C here are observation windows. Their <strong>illustrative</strong> symmetric whole-window scores demonstrate the grouping rule; they are not measured signal scores. All three are assumed to have complete selected evidence.</p>
    <label>Illustration threshold · {percent}%<input aria-label="Illustration grouping threshold" type="range" min="0" max="100" step="1" value={percent} onChange={e=>setPercent(Number(e.target.value))}/></label>
    <svg viewBox="0 0 640 255" role="img" aria-label={`Complete-link illustration: ${groups.length} groups at ${percent} percent threshold; A–B 92 percent, B–C 90 percent, A–C 78 percent`}>
      {[[0,1],[1,2],[0,2]].map(([a,b])=>{const from=nodes[a],to=nodes[b],score=METHODOLOGY_GROUP_MATRIX[a][b],passes=score>=percent/100;return <g key={`${a}:${b}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={passes?'pair-passes':'pair-fails'}/><rect x={(from.x+to.x)/2-27} y={(from.y+to.y)/2-13} width="54" height="26" rx="5"/><text x={(from.x+to.x)/2} y={(from.y+to.y)/2+5} textAnchor="middle">{Math.round(score*100)}%</text></g>;})}
      {nodes.map(n=><g key={n.id}><circle cx={n.x} cy={n.y} r="28" fill={colours[groups.findIndex(g=>g.members.includes(n.id))]}/><text x={n.x} y={n.y+5} textAnchor="middle" className="group-demo-node">{n.id}</text></g>)}
    </svg><p className="small-note">Solid line: pair meets threshold · dashed line: pair falls below threshold · matching node colours: same resulting group.</p>
    <div role="status" aria-live="polite" data-methodology-group-count={groups.length}><strong>{groups.length} {groups.length===1?'group':'groups'}</strong><ul>{groups.map((g,i)=><li key={g.id}>{observationGroupName(i)}: {g.members.join(' + ')}</li>)}</ul></div>
    <p>{percent<=78?'All three can share a group because even the weakest pair reaches the threshold.':percent<=92?'A strong neighbour cannot bridge a below-threshold pair. Complete linkage checks every pair across a proposed merge.':'No pair reaches this threshold, so each window remains separate.'} Move the threshold to 78% to see all three join, or above 92% to separate them.</p>
  </div>;
}
