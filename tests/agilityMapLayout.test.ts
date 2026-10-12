import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutSimilarity, layoutEmitters } from '../src/agilityMapLayout.ts';
import { buildSimilarityGroups } from '../src/agilityGrouping.ts';
import { DEFAULT_MATCH } from '../src/agilityModel.ts';
import { controlView } from './helpers/agilityMapFixtures.ts';
import type { MapLayout } from '../src/agilityMapTypes.ts';
test('similarity islands use unique one-word names and keep emitter attribution unchanged',()=>{
  const views=Object.fromEntries(Array.from({length:40},(_,i)=>{const v=controlView(0,`window-${i.toString().padStart(2,'0')}`);return [v.windowId,v];}));
  const pairIds=Object.keys(views),groups=pairIds.map(id=>({id:`similarity:${id}`,members:[id],representativeWindowId:id}));
  const layout=layoutSimilarity({groups,pairIds,pairScores:pairIds.map((_,i)=>Float64Array.from(pairIds,(_,j)=>i===j?1:.5)),membership:{},ineligible:{}},views);
  assert.ok(layout.islands.every(a=>/^[A-Za-z]+$/.test(a.name)));assert.equal(new Set(layout.islands.map(a=>a.name)).size,40);
  assert.equal(layout.islands[0].name,'Vega');assert.equal(layout.islands[1].name,'Lyra');
  assert.equal(layoutEmitters(views,[{id:'emitter-A',name:'Emitter A',kind:'emitter',attribution:'reviewed',notes:''}]).islands[0].name,'Emitter A');
});
function disjoint(layout:MapLayout){for(const p of Object.values(layout.positions))assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));for(let i=0;i<layout.islands.length;i++)for(let j=i+1;j<layout.islands.length;j++){const a=layout.islands[i].bounds,b=layout.islands[j].bounds;assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);}const p=Object.values(layout.positions);for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)assert.ok(Math.abs(p[i].x-p[j].x)>=160||Math.abs(p[i].y-p[j].y)>=112);}
test('similarity layout covers every window and separates insufficient evidence with finite disjoint geometry',()=>{
  const all=[controlView(0),controlView(1),controlView(3),controlView(5)],views=Object.fromEntries(all.map(v=>[v.windowId,v])),a=buildSimilarityGroups(views,DEFAULT_MATCH),l=layoutSimilarity(a,views);
  assert.deepEqual(Object.keys(l.positions).sort(),all.map(v=>v.windowId).sort());assert.ok(l.islands.some(i=>i.kind==='insufficient'&&i.members.includes('control-5')));disjoint(l);
  assert.deepEqual(l,layoutSimilarity(buildSimilarityGroups(Object.fromEntries(Object.entries(views).reverse()),DEFAULT_MATCH),views));
});
test('emitter layouts are stable independent of masks/filters, unknown profiles and input order',()=>{
  const v=[controlView(0),controlView(1),controlView(5)],views=Object.fromEntries(v.map(v=>[v.windowId,v]));
  const l=layoutEmitters(views,[]);assert.deepEqual(l,layoutEmitters(Object.fromEntries(Object.entries(views).reverse()),[]));disjoint(l);assert.equal(Object.keys(l.positions).length,3);
  assert.equal(layoutEmitters({},[]).islands.length,0);
});
test('500 windows and long identical labels pack without collisions or pagination',()=>{
  const views=Object.fromEntries(Array.from({length:500},(_,i)=>{const v=controlView(0,`window-${i.toString().padStart(3,'0')}`);v.streamId=`emitter-${i%50}`;return [v.windowId,v];}));
  const l=layoutEmitters(views,[]);assert.equal(Object.keys(l.positions).length,500);assert.equal(l.islands.length,50);disjoint(l);
});
