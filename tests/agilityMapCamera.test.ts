import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt,screenToWorld,worldToScreen,fitBounds,visibleBounds,interpolatePositions,edgeEndpoints,detailLevel } from '../src/agilityMapCamera.ts';
test('wheel and pinch anchors retain world position, roundtrip coordinates and zoom clamp',()=>{
  const c={x:10,y:20,zoom:1},anchor={x:400,y:300},next=zoomAt(c,2,anchor);
  assert.deepEqual(screenToWorld(anchor,c),screenToWorld(anchor,next));assert.deepEqual(worldToScreen(screenToWorld(anchor,c),c),anchor);
  assert.equal(zoomAt(c,1000,anchor).zoom,6);assert.equal(zoomAt(c,.0001,anchor).zoom,.03);
});
test('fit and culling remain finite for empty or unavailable viewport dimensions',()=>{
  const b={left:-10,right:10,top:-10,bottom:10},c=fitBounds(b,{width:0,height:0});assert.ok(Number.isFinite(c.zoom));
  const fitted=fitBounds(b,{width:800,height:600},30),v=visibleBounds(fitted,{width:800,height:600},0);
  assert.ok(v.left<=b.left&&v.right>=b.right&&v.top<=b.top&&v.bottom>=b.bottom);
});
test('interrupted layout animation starts at current coordinates; completion and detail thresholds are exact',()=>{
  const from={a:{x:0,y:0}},to={a:{x:100,y:100}},current=interpolatePositions(from,to,.5),next={a:{x:-100,y:0}};
  assert.deepEqual(interpolatePositions(current,next,0),current);assert.deepEqual(interpolatePositions(current,next,1),next);
  assert.equal(detailLevel(20),'overview');assert.equal(detailLevel(80),'preview');assert.equal(detailLevel(160),'detail');
});
test('connection endpoints clip to current tile boundaries and degenerate links are harmless',()=>{
  const segment=edgeEndpoints({x:0,y:0},{x:200,y:0},{left:-80,right:80,top:-56,bottom:56},{left:120,right:280,top:-56,bottom:56})!;
  assert.deepEqual(segment,{start:{x:80,y:0},end:{x:120,y:0}});
  assert.equal(edgeEndpoints({x:0,y:0},{x:0,y:0},{left:-1,right:1,top:-1,bottom:1},{left:-1,right:1,top:-1,bottom:1}),null);
});
