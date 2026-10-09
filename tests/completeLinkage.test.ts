import test from 'node:test';
import assert from 'node:assert/strict';
import { completeLinkage } from '../src/completeLinkage.ts';
import { groupLibrary } from '../src/library.ts';
import { DEFAULT_GROUPING, similarityScorer } from '../src/grouping.ts';
import { emptyReview, reviewToken } from '../src/groupPolicy.ts';
import { validateReview } from '../src/groupReviewStorage.ts';
import { makeEntry } from '../src/catalogue.ts';

const matrix = (rows: number[][]) => rows.map(r => Float64Array.from(r));
const wave = (id: string, h = 0) => makeEntry(id, id, 'unassigned', 1, 2, 10, p => Math.sin(2 * Math.PI * p) + h * Math.sin(6 * Math.PI * p), {});
const settings = { ...DEFAULT_GROUPING, formulaWeight: 1, threshold: .85 };

test('complete linkage merges the strongest pair first and forbids similarity chains', () => {
  const data = matrix([[1,.9,.6],[.9,1,.95],[.6,.95,1]]);
  assert.deepEqual(completeLinkage(data,.8).clusters.map(c=>c.members), [[0],[1,2]]);
  assert.deepEqual(completeLinkage(data,.6).clusters.map(c=>c.members), [[0,1,2]]);
  assert.deepEqual(completeLinkage(data,.951).clusters.map(c=>c.members), [[0],[1],[2]]);
});

test('heap agrees with a simple global complete-link implementation', () => {
  let seed = 91;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/2**32; };
  for (let run=0;run<25;run++) {
    const n=3+run, data=matrix(Array.from({length:n},()=>Array(n).fill(1)));
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)data[i][j]=data[j][i]=Math.round(random()*100)/100;
    const groups=Array.from({length:n},(_,i)=>[i]);
    while(true){
      let best=-1,left=-1,right=-1;
      for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
        const s=Math.min(...groups[i].flatMap(a=>groups[j].map(b=>data[a][b])));
        if(s>best){best=s;left=i;right=j;}
      }
      if(best+1e-12<.65)break;
      groups[left]=[...groups[left],...groups[right]].sort((a,b)=>a-b);groups.splice(right,1);
    }
    assert.deepEqual(completeLinkage(data,.65).clusters.map(c=>c.members),groups);
  }
});

test('there is no requested minimum or maximum group count', () => {
  assert.equal(completeLinkage([], .65).clusters.length, 0);
  const n=1100, separate=Array.from({length:n},(_,i)=>Float64Array.from({length:n},(_,j)=>i===j?1:0));
  assert.equal(completeLinkage(separate,.65).clusters.length,n);
  assert.equal(completeLinkage(matrix([[1,1],[1,1]]),1).clusters.length,1);
  assert.doesNotThrow(()=>validateReview({...emptyReview(),groups:Array.from({length:n},(_,i)=>({id:`region-${i}`,name:`G${i}`,anchorId:`a${i}`}))}));
});

test('medoids use distinct shapes and are not dragged by repeated copies', () => {
  const originals=[wave('a',0),wave('b',.1),wave('c',.2)], initial=groupLibrary(originals,'frequency',settings,emptyReview());
  assert.equal(initial.regionSet.regions.length,1);
  assert.equal(initial.regionSet.regions[0].medoidId,'b');
  const copies=Array.from({length:30},(_,i)=>({...originals[0],id:`z-copy-${i}`}));
  const expanded=groupLibrary([...originals,...copies],'frequency',settings,emptyReview());
  assert.equal(expanded.regionSet.regions[0].medoidId,'b');
  assert.equal(expanded.regionSet.regions[0].count,33);
});

test('a representative match alone cannot bypass weakest-member cohesion', () => {
  const entries=[wave('a',0),wave('b',.18),wave('c',.6)], score=similarityScorer(settings);
  const result=groupLibrary(entries,'frequency',settings,emptyReview());
  for(const a of entries)for(const b of entries)if(result.regionSet.membership[a.id]===result.regionSet.membership[b.id])assert.ok(score(a,b)!.combined+1e-12>=settings.threshold);
  assert.notEqual(result.regionSet.membership.a,result.regionSet.membership.c);
});

test('complete linkage preserves scale and quantity compatibility', () => {
  const a=wave('a'), b={...wave('b'),period:2,samples:wave('b').samples.map(s=>({...s,t:s.t*2}))};
  const scale={...settings,threshold:.9,weights:{shape:1,period:1,excursion:0,centre:0}};
  assert.equal(groupLibrary([a,b],'frequency',settings,emptyReview()).regionSet.regions.length,1);
  assert.equal(groupLibrary([a,b],'frequency',scale,emptyReview()).regionSet.regions.length,2);
  const physical={...a,id:'physical',units:{time:'s',frequency:'Hz'}};
  assert.equal(groupLibrary([a,physical],'frequency',scale,emptyReview()).regionSet.regions.length,2);
  assert.equal(groupLibrary([a,physical],'frequency',settings,emptyReview()).regionSet.regions.length,1);
  assert.throws(()=>groupLibrary([a,{...b,quantity:'pri'}],'frequency',settings,emptyReview()),/separately/);
  assert.throws(()=>groupLibrary([a,a],'frequency',settings,emptyReview()),/unique/);
  const pri=[a,b].map(e=>({...e,quantity:'pri' as const,units:{time:'tu',frequency:'tu'}}));
  assert.equal(groupLibrary(pri,'pri',settings,emptyReview()).regionSet.regions.length,1);
});

test('reviewed decisions that fail whole-group cohesion pause without modifying history', () => {
  const entries=[wave('a'),wave('b',.18),wave('c',.6)];
  const review={...emptyReview(),groups:[{id:'region-a',name:'Saved',anchorId:'a'}],placements:{b:'region-a',c:'region-a'}};
  const before=JSON.stringify(review), result=groupLibrary(entries,'frequency',settings,review);
  assert.ok(result.reviewWarnings.some(w=>w.includes('complete-link cohesion')));
  assert.equal(result.regionSet.membership.b,'region-a');
  assert.notEqual(result.regionSet.membership.c,'region-a');
  assert.equal(JSON.stringify(review),before);
  const removed=groupLibrary(entries.slice(1),'frequency',settings,review);
  assert.ok(removed.reviewWarnings.some(w=>w.includes('anchor is absent')));
});

test('acknowledgment applies to the current group composition and never promotes uncertain members', () => {
  const entries=[wave('a'),wave('b',.18)], initial=groupLibrary(entries,'frequency',settings,emptyReview());
  const a=initial.assignments.b;assert.equal(a.needsReview,true);
  const review={...emptyReview(),acknowledged:[reviewToken('b',a.regionId,settings,a.reviewContext)]};
  const kept=groupLibrary(entries,'frequency',settings,review);
  assert.equal(kept.assignments.b.needsReview,false);assert.equal(kept.assignments.b.status,'fringe');
  const extended=groupLibrary([...entries,wave('c',.19)],'frequency',settings,review);
  assert.equal(extended.assignments.b.needsReview,true);
});
