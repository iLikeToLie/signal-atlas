import type { ViewPoint, WindowView } from './agilityModel.ts';
import type { ObservationComparison } from './agilityMapTypes.ts';
import { normalizeParameters, parameterLabel, resolveSelectedChannels, sampledPoints } from './agilityComparison.ts';

export const PREVIEW_WIDTH=240, PREVIEW_HEIGHT=36, PREVIEW_INSET=8;
type Range=[number,number];
function range(points:ViewPoint[],id:string):Range|null{
  const values=points.flatMap(p=>typeof p.values[id]==='number'&&Number.isFinite(p.values[id])?[p.values[id]!]:[]);
  return values.length?[Math.min(...values),Math.max(...values)]:null;
}
function normalized(value:number,[lo,hi]:Range){
  if(lo===hi)return .5;
  const magnitude=Math.max(Math.abs(lo),Math.abs(hi),Number.MIN_VALUE);
  return (value/magnitude-lo/magnitude)/(hi/magnitude-lo/magnitude);
}
function scaled(value:number,from:Range,into:Range,full:Range){
  const fraction=normalized(value,from);
  // Preserve changing-versus-steady disagreement instead of flattening the changing trace.
  return into[0]===into[1]&&from[0]!==from[1]?fraction:normalized(into[0],full)+fraction*(normalized(into[1],full)-normalized(into[0],full));
}
function path(points:ViewPoint[],samples:Set<number>,id:string,position:(p:ViewPoint)=>[number,number,boolean?]|null){
  let open=false,result='';
  for(const p of points){
    if(p.values[id]===null||p.values[id]===undefined||p.breaks.includes(id))open=false;
    if(!samples.has(p.index))continue;
    const xy=position(p);if(!xy){open=false;continue;}
    const [x,y,breakBefore]=xy;if(breakBefore)open=false;
    if(!Number.isFinite(x)||!Number.isFinite(y)){open=false;continue;}
    result+=`${open?'L':'M'}${x.toFixed(2)},${(4+(1-y)*(PREVIEW_HEIGHT-8)).toFixed(2)}`;open=true;
  }
  return result;
}
export function relatedWindowPreview(query:WindowView,target:WindowView,comparison:ObservationComparison){
  const e=comparison.explanation;
  if(e.query.windowId!==query.windowId||e.target.windowId!==target.windowId||!query.points.length||!target.points.length)return null;
  const selectedAxis=e.query.endEvent-e.query.startEvent<query.count,reference=selectedAxis?query:target,axis=selectedAxis?'selected' as const:'related' as const;
  const windowStart=reference.points[0].index,windowEnd=windowStart+reference.count,{startEvent,endEvent}=selectedAxis?e.query:e.target;
  for(const [v,scope] of [[query,e.query],[target,e.target]] as const)if(scope.startEvent<v.points[0].index||scope.endEvent>v.points[0].index+v.count||scope.startEvent>=scope.endEvent)return null;
  const startFraction=(startEvent-windowStart)/reference.count,endFraction=(endEvent-windowStart)/reference.count;
  const parameters=normalizeParameters(e.selectedParameters),qc=resolveSelectedChannels(query,parameters),tc=resolveSelectedChannels(target,parameters);
  const allQuery=sampledPoints(query),q=allQuery.filter(p=>p.index>=e.query.startEvent&&p.index<e.query.endEvent),t=sampledPoints(target),matched=t.filter(p=>p.index>=e.target.startEvent&&p.index<e.target.endEvent);
  if(!q.length||!matched.length)return null;
  const qSamples=new Set(q.map(p=>p.index)),tSamples=new Set(t.map(p=>p.index));
  const x=(index:number)=>PREVIEW_INSET+(index-windowStart+.5)/reference.count*(PREVIEW_WIDTH-2*PREVIEW_INSET);
  const channels=parameters.map(quantity=>{
    const a=qc.channels.find(c=>c.quantity===quantity),b=tc.channels.find(c=>c.quantity===quantity);
    const own=a&&range(q,a.id),local=b&&range(matched,b.id),full=selectedAxis?a&&query.ranges[a.id]:b&&target.ranges[b.id];
    const supported=!!(a&&b&&own&&local&&full&&e.channelResults.some(c=>c.channelId===a.id&&c.agreement!==null));
    const contextChannel=selectedAxis?a:b;
    const contextPath=contextChannel&&full?path(reference.points,selectedAxis?new Set(allQuery.map(p=>p.index)):tSamples,contextChannel.id,p=>p.values[contextChannel.id]==null?null:[x(p.index),normalized(p.values[contextChannel.id]!,full)]):'';
    const alignedPath=(which:'selected'|'related')=>{let targetCursor=0;return supported?path(query.points,qSamples,a!.id,p=>{
      const fraction=(p.index-q[0].index)/Math.max(1,q.at(-1)!.index-q[0].index),paired=matched[Math.round(fraction*(matched.length-1))];
      if(p.values[a!.id]==null||paired.values[b!.id]==null||p.breaks.includes(a!.id)||paired.breaks.includes(b!.id))return null;
      let targetGap=false;
      while(targetCursor<target.points.length&&target.points[targetCursor].index<=paired.index){
        const point=target.points[targetCursor++];
        if(point.index>=e.target.startEvent&&(point.values[b!.id]==null||point.breaks.includes(b!.id)))targetGap=true;
      }
      const y=selectedAxis?(which==='selected'?normalized(p.values[a!.id]!,full!):scaled(paired.values[b!.id]!,local!,own!,full!)):scaled(p.values[a!.id]!,own!,local!,full!);
      return [x(selectedAxis?p.index:paired.index),y,targetGap];
    }):'';};
    const queryPath=alignedPath('selected');
    const matchPath=selectedAxis?alignedPath('related'):supported?path(target.points,tSamples,b!.id,p=>p.index<startEvent||p.index>=endEvent||p.values[b!.id]==null?null:[x(p.index),normalized(p.values[b!.id]!,full!)]):'';
    return {quantity,label:parameterLabel(quantity),supported,contextPath,matchPath,queryPath};
  });
  return {axis,windowStart,windowEnd,startEvent,endEvent,startFraction,endFraction,channels};
}
