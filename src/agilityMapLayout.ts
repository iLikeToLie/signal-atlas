import { embed } from './layout.ts';
import type { WindowView } from './agilityModel.ts';
import type { StreamProfile } from '../spec/agility.ts';
import type { Bounds, GroupAnalysis, MapIsland, MapLayout, Point } from './agilityMapTypes.ts';
export const TILE_WIDTH=160,TILE_HEIGHT=112,TILE_STEP_X=188,TILE_STEP_Y=140;
const intersects=(a:Bounds,b:Bounds,gap=48)=>!(a.right+gap<=b.left||b.right+gap<=a.left||a.bottom+gap<=b.top||b.bottom+gap<=a.top);
function dimensions(n:number){const cols=Math.max(1,Math.ceil(Math.sqrt(n)*1.2)),rows=Math.ceil(n/cols);return {cols,width:Math.max(320,cols*TILE_STEP_X+36),height:Math.max(210,rows*TILE_STEP_Y+76)};}
function island(id:string,name:string,kind:MapIsland['kind'],members:string[],centre:Point):MapIsland{
  const d=dimensions(members.length);return {id,name,kind,members:[...members].sort(),centre,bounds:{left:centre.x-d.width/2,right:centre.x+d.width/2,top:centre.y-d.height/2,bottom:centre.y+d.height/2}};
}
function finish(islands:MapIsland[]):MapLayout{
  const positions:Record<string,Point>={};for(const area of islands){const d=dimensions(area.members.length);area.members.forEach((id,i)=>positions[id]={x:area.bounds.left+98+(i%d.cols)*TILE_STEP_X,y:area.bounds.top+110+Math.floor(i/d.cols)*TILE_STEP_Y});}
  const bounds=islands.length?{left:Math.min(...islands.map(a=>a.bounds.left)),right:Math.max(...islands.map(a=>a.bounds.right)),top:Math.min(...islands.map(a=>a.bounds.top)),bottom:Math.max(...islands.map(a=>a.bounds.bottom))}:{left:-160,right:160,top:-112,bottom:112};return {positions,islands,bounds};
}
export function layoutEmitters(views:Record<string,WindowView>,profiles:StreamProfile[]):MapLayout{
  const members=new Map<string,string[]>();for(const v of Object.values(views)){const list=members.get(v.streamId)||[];list.push(v.windowId);members.set(v.streamId,list);}
  const ids=[...members.keys()].sort(),maxWidth=Math.max(320,...[...members.values()].map(m=>dimensions(m.length).width)),maxHeight=Math.max(210,...[...members.values()].map(m=>dimensions(m.length).height)),cols=Math.max(1,Math.ceil(Math.sqrt(ids.length)));
  return finish(ids.map((id,i)=>island(`emitter:${id}`,profiles.find(p=>p.id===id)?.name||id,'emitter',members.get(id)!,{x:(i%cols)*(maxWidth+100),y:Math.floor(i/cols)*(maxHeight+100)})));
}
export function layoutSimilarity(analysis:GroupAnalysis,views:Record<string,WindowView>):MapLayout{
  const groups=[...analysis.groups].sort((a,b)=>a.id.localeCompare(b.id)),rep=groups.map(g=>analysis.pairIds.indexOf(g.representativeWindowId)),placed:MapIsland[]=[],centres:Point[]=groups.map(()=>({x:0,y:0}));
  const visited=new Set<number>();let component=0;
  for(let first=0;first<groups.length;first++){
    if(visited.has(first))continue;const nodes=[first];visited.add(first);
    for(let p=0;p<nodes.length;p++)for(let j=0;j<groups.length;j++)if(!visited.has(j)&&Number.isFinite(analysis.pairScores[rep[nodes[p]]]?.[rep[j]])){visited.add(j);nodes.push(j);}
    const matrix=nodes.map(a=>nodes.map(b=>{const score=analysis.pairScores[rep[a]]?.[rep[b]];return Number.isFinite(score)?-Math.log(Math.max(score,1e-12)):NaN;}));
    if(matrix.every(row=>row.every(Number.isFinite))){const points=embed(matrix,20261012).points;nodes.forEach((n,i)=>centres[n]={x:points[i].x*380+component*1800,y:points[i].y*380});}
    else nodes.forEach((n,i)=>{if(i===0){centres[n]={x:component*1800,y:0};return;}const neighbours=nodes.slice(0,i).filter(k=>Number.isFinite(analysis.pairScores[rep[n]][rep[k]])).sort((a,b)=>analysis.pairScores[rep[n]][rep[b]]-analysis.pairScores[rep[n]][rep[a]]),near=centres[neighbours[0]]||{x:component*1800,y:0},angle=i*2.399963;centres[n]={x:near.x+Math.cos(angle)*460,y:near.y+Math.sin(angle)*460};});component++;
  }
  groups.forEach((g,i)=>{
    const desired=centres[i];let area=island(g.id,`Pattern group ${String(i+1).padStart(2,'0')}`,'similarity',g.members,desired),attempt=0;
    while(placed.some(a=>intersects(a.bounds,area.bounds))){attempt++;const radius=80*Math.sqrt(attempt),angle=attempt*2.399963;area=island(g.id,area.name,'similarity',g.members,{x:desired.x+Math.cos(angle)*radius,y:desired.y+Math.sin(angle)*radius});}
    placed.push(area);
  });
  const insufficient=Object.keys(analysis.ineligible).filter(id=>views[id]).sort();if(insufficient.length){const bottom=placed.length?Math.max(...placed.map(a=>a.bounds.bottom)):0,d=dimensions(insufficient.length);placed.push(island('insufficient','Insufficient evidence','insufficient',insufficient,{x:0,y:bottom+100+d.height/2}));}
  return finish(placed);
}
