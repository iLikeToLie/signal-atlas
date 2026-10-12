import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MATCH } from '../src/agilityModel.ts';
import { methodologyExamples } from '../src/agilityMethodology.ts';
import * as methodology from '../src/agilityMethodology.ts';
import { groupScoreMatrix } from '../src/agilityGrouping.ts';

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
test('interactive comparison exposes the original source and exact matched target interval',()=>{
  const example=methodologyExamples(DEFAULT_MATCH).find(e=>e.id==='partial')!;
  assert.equal(example.view.count,32);assert.equal(example.fullTarget.count,64);
  assert.equal(example.comparedTarget.points[0].index,16);assert.equal(example.comparedTarget.points.at(-1)!.index,47);
  assert.equal(example.comparedTarget.count,32);assert.equal(example.match!.partial!.explanation.target.startEvent,16);
});
test('illustrative grouping uses complete linkage so a strong neighbour cannot bridge a weak pair',()=>{
  const matrix=methodology.METHODOLOGY_GROUP_MATRIX,ids=methodology.METHODOLOGY_GROUP_IDS;
  const before=matrix.map(row=>Array.from(row));
  assert.deepEqual(groupScoreMatrix(ids,matrix,.85).map(g=>g.members),[['A','B'],['C']]);
  assert.equal(groupScoreMatrix(ids,matrix,.78).length,1);
  assert.equal(groupScoreMatrix(ids,matrix,.93).length,3);
  assert.deepEqual(matrix.map(row=>Array.from(row)),before);
});
