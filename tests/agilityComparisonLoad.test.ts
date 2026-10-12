import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptComparisonLoad} from '../src/agilityComparisonLoad.ts';
const first={requestId:1,workspace:'retained',revision:7,queryWindowId:'query',targetWindowId:'A',startEvent:0,endEvent:64};
const current={workspace:'retained',revision:7,selectedWindowId:'query'};
test('late destination or interval responses cannot replace the most recent comparison',()=>{
  const next={...first,requestId:2,targetWindowId:'B',startEvent:16,endEvent:48};
  assert.equal(acceptComparisonLoad(next,next,current),true);
  assert.equal(acceptComparisonLoad(next,first,current),false);
  assert.equal(acceptComparisonLoad(next,{...next,startEvent:0},current),false);
  assert.equal(acceptComparisonLoad(null,next,current),false);
});
test('comparison loads cannot return into another selection, revision or workspace',()=>{
  assert.equal(acceptComparisonLoad(first,first,{...current,selectedWindowId:'other'}),false);
  assert.equal(acceptComparisonLoad(first,first,{...current,revision:8}),false);
  assert.equal(acceptComparisonLoad(first,first,{...current,workspace:'demo'}),false);
});
