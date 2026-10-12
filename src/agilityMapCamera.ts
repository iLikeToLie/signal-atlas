import type { Bounds, Camera, Point, Viewport } from './agilityMapTypes.ts';
export const worldToScreen=(p:Point,c:Camera):Point=>({x:p.x*c.zoom+c.x,y:p.y*c.zoom+c.y});
export const screenToWorld=(p:Point,c:Camera):Point=>({x:(p.x-c.x)/c.zoom,y:(p.y-c.y)/c.zoom});
export function zoomAt(c:Camera,factor:number,anchor:Point):Camera{const zoom=Math.max(.03,Math.min(6,c.zoom*factor)),ratio=zoom/c.zoom;return {zoom,x:anchor.x-(anchor.x-c.x)*ratio,y:anchor.y-(anchor.y-c.y)*ratio};}
export function fitBounds(b:Bounds,v:Viewport,padding=64):Camera{const width=Math.max(1,v.width-padding*2),height=Math.max(1,v.height-padding*2),zoom=Math.max(.03,Math.min(2,width/Math.max(1,b.right-b.left),height/Math.max(1,b.bottom-b.top)));return {zoom,x:v.width/2-(b.left+b.right)/2*zoom,y:v.height/2-(b.top+b.bottom)/2*zoom};}
export function visibleBounds(c:Camera,v:Viewport,overscan=200):Bounds{const a=screenToWorld({x:-overscan,y:-overscan},c),b=screenToWorld({x:v.width+overscan,y:v.height+overscan},c);return {left:a.x,right:b.x,top:a.y,bottom:b.y};}
export function interpolatePositions(from:Record<string,Point>,to:Record<string,Point>,progress:number){const t=Math.max(0,Math.min(1,progress)),out:Record<string,Point>={};for(const [id,b] of Object.entries(to)){const a=from[id]||b;out[id]={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}return out;}
export const detailLevel=(width:number):'overview'|'preview'|'detail'=>width<32?'overview':width<144?'preview':'detail';
export function edgeEndpoints(a:Point,b:Point,ab:Bounds,bb:Bounds):{start:Point;end:Point}|null{
  const dx=b.x-a.x,dy=b.y-a.y;if(!Number.isFinite(dx+dy)||Math.hypot(dx,dy)<1e-9)return null;
  const clip=(p:Point,d:Point,bounds:Bounds)=>{const tx=d.x===0?Infinity:(d.x>0?bounds.right-p.x:bounds.left-p.x)/d.x,ty=d.y===0?Infinity:(d.y>0?bounds.bottom-p.y:bounds.top-p.y)/d.y,t=Math.min(tx,ty);return {x:p.x+d.x*t,y:p.y+d.y*t};};
  const start=clip(a,{x:dx,y:dy},ab),end=clip(b,{x:-dx,y:-dy},bb);if((end.x-start.x)*dx+(end.y-start.y)*dy<=0)return null;return {start,end};
}
