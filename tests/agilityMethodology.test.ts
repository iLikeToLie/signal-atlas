import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MATCH } from '../src/agilityModel.ts';
import { methodologyExamples } from '../src/agilityMethodology.ts';

test('methodology examples use current matcher scores and distinguish partial support from whole grouping',()=>{
  const examples=methodologyExamples(DEFAULT_MATCH),equivalent=examples.find(e=>e.id==='equivalent')!,partial=examples.find(e=>e.id==='partial')!,missing=examples.find(e=>e.id==='missing')!;
  assert.ok(equivalent.score!==null&&equivalent.score>.999);assert.equal(equivalent.groupable,true);
  assert.equal(partial.kind,'partial');assert.ok(partial.score!==null&&partial.score>.999);assert.equal(partial.groupable,false);
  assert.equal(missing.qualifying,false);assert.equal(missing.groupable,false);
  assert.ok(examples.find(e=>e.id==='coordination')!.score!<equivalent.score!);
});
test('worked examples follow applied parameter selection and level weights without changing settings',()=>{
  const before=structuredClone(DEFAULT_MATCH),frequency={...DEFAULT_MATCH,parameters:['frequency'] as const};
  assert.equal(methodologyExamples({...frequency,parameters:[...frequency.parameters]}).find(e=>e.id==='missing')!.groupable,true);
  const clean=methodologyExamples(DEFAULT_MATCH).find(e=>e.id==='scale')!,weighted=methodologyExamples({...DEFAULT_MATCH,absoluteWeight:2,durationWeight:2}).find(e=>e.id==='scale')!;
  assert.ok(weighted.score!<clean.score!);assert.deepEqual(DEFAULT_MATCH,before);
});
