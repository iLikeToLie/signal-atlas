import type { LibraryState, ObservationWindow } from './agilityModel.ts';
import type { Bounds, MapEdge, ObservationMatch, Point, WindowStatus } from './agilityMapTypes.ts';
export const DEFAULT_CONNECTION_LIMIT=4;
export function connectionLabelStyle(label:string,zoom:number){
  const text=zoom<.9?label.split(' · ')[0]:label,fontSize=Math.max(10,Math.min(12,10+zoom*2));
  return {text,fontSize,width:Math.max(40,text.length*fontSize*.62+14),height:fontSize+8};
}
export function placeConnectionLabel(center:Point,width:number,height:number,obstacles:Bounds[],viewport:Bounds):Point|null{
  if(center.x<viewport.left||center.x>viewport.right||center.y<viewport.top||center.y>viewport.bottom)return null;
  if(width>viewport.right-viewport.left||height>viewport.bottom-viewport.top)return null;
  // shortcut: bounded nearby offsets; inspect the connection when a dense scene has no clear badge position.
  for(const dy of [0,-24,24,-48,48]){
    const p={x:Math.max(viewport.left+width/2,Math.min(viewport.right-width/2,center.x)),y:Math.max(viewport.top+height/2,Math.min(viewport.bottom-height/2,center.y+dy))};
    if(obstacles.every(b=>p.x+width/2<b.left-4||p.x-width/2>b.right+4||p.y+height/2<b.top-4||p.y-height/2>b.bottom+4))return p;
  }
  return null;
}
export const STATUS_LABELS={unreviewed:'Unreviewed',reviewed:'Reviewed',unresolved:'Unresolved'};
export const STATUS_COLOURS={unreviewed:'#91b9ce',reviewed:'#a8d9ac',unresolved:'#e8b477'};
export function windowStatus(w:ObservationWindow):WindowStatus{return w.reviewState==='associated'?'reviewed':w.reviewState==='unresolved'?'unresolved':'unreviewed';}
export function windowName(state:LibraryState,id:string){return state.patterns.find(p=>p.representativeWindowId===id)?.name||state.views[id]?.name||id;}
export function filterWindowIds(state:LibraryState,filters:{search:string;profileId:string;status:WindowStatus|''}){
  const query=filters.search.toLowerCase().trim();return new Set(state.windows.filter(w=>{const v=state.views[w.id],profile=state.streams.find(s=>s.id===v.streamId);return (!filters.profileId||v.streamId===filters.profileId)&&(!filters.status||windowStatus(w)===filters.status)&&`${windowName(state,w.id)} ${v.name} ${profile?.name||v.streamId} ${w.id}`.toLowerCase().includes(query);}).map(w=>w.id));
}
export function mapPresentation(state:LibraryState,selectedWindowId:string,matches:ObservationMatch[],connectionLimit:number,showLinks:boolean){
  const qualifying=matches.filter(m=>m.qualifying&&m.preferred?.eligible).sort((a,b)=>Number(a.preferred!.kind==='partial')-Number(b.preferred!.kind==='partial')||b.preferred!.score-a.preferred!.score||a.targetWindowId.localeCompare(b.targetWindowId));
  const highlightedIds=new Set(qualifying.map(m=>m.targetWindowId)),edges:MapEdge[]=state.relationships.filter(r=>showLinks||r.evidence.from.windowId===selectedWindowId||r.evidence.to.windowId===selectedWindowId).map(r=>({id:r.id,fromWindowId:r.evidence.from.windowId,toWindowId:r.evidence.to.windowId,kind:'reviewed',label:'Reviewed',relationshipId:r.id}));
  const shown=qualifying.slice(0,Math.max(0,Math.floor(connectionLimit)));for(const m of shown){const c=m.preferred!;edges.push({id:`suggestion:${selectedWindowId}:${m.targetWindowId}`,fromWindowId:selectedWindowId,toWindowId:m.targetWindowId,kind:c.kind==='partial'?'partial':'whole',label:`${(c.score*100).toFixed(0)}%${c.kind==='partial'?' · Partial':''}`,match:m});}
  return {highlightedIds,edges,qualifyingCount:qualifying.length,drawnSuggestionCount:shown.length};
}
