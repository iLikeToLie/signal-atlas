import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEventRecording, summarizeEvents } from '../spec/agility.ts';
import type { Channel, EventRecording, EventRow } from '../spec/agility.ts';

export const DEMO_VERSION='1.0.0', DEMO_SEED=20261012;
const round=(n:number)=>Number(n.toFixed(12));
const json=(v:unknown)=>JSON.stringify(v,null,2)+'\n';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const channels:Channel[]=[
  {id:'frequency',name:'Frequency',quantity:'frequency',unit:'MHz',origin:'supplied'},
  {id:'pri',name:'Pulse repetition interval',quantity:'pri',unit:'us',origin:'supplied',priConvention:'preceding-event'},
  {id:'pulseWidth',name:'Pulse width',quantity:'pulse-width',unit:'us',origin:'supplied'},
];
const random=(initial:number)=>{let seed=initial;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};};
function mode(kind:'shared'|'dwell'|'hop'):EventRow[]{
  const rng=random(DEMO_SEED+3);let t=0;
  return Array.from({length:64},(_,i)=>{
    const block=Math.floor(i/8),p=i%8;
    const frequency=10000+.5*(kind==='shared'?[0,3,1,2,3,0,2,1][p]:kind==='dwell'?[0,1,3,2,1,0,2,3][block]:Math.floor(rng()*4));
    const pri=kind==='shared'?[250,500,750,500,1000,250,750,1000][p]:kind==='dwell'?[850,650,400,550,950,300,700,450][block]:600+(rng()-.5)*80;
    const pulseWidth=kind==='shared'?[40,80,60,100,80,40,100,60][p]:kind==='dwell'?[100,60,80,40,60,100,40,80][block]:[40,60,80,100][Math.floor(rng()*4)];
    if(i)t+=pri;
    return {t:round(t),values:{frequency:round(frequency),pri:i?round(pri):null,pulseWidth}};
  });
}
function noisy(rows:EventRow[],seed:number):EventRow[]{
  const rng=random(seed);let t=0;
  return rows.map((e,i)=>{
    // Small interval perturbations change transmitter timing; F/PW perturbations model observations.
    const pri=e.values.pri===null?null:round(e.values.pri+(rng()-.5)*2);
    if(i)t+=pri!;
    return {t:round(t),values:{frequency:round(e.values.frequency!+(rng()-.5)*.009),pri,pulseWidth:round(e.values.pulseWidth!+(rng()-.5)*.4)}};
  });
}
function record(id:string,name:string,streamId:string,events:EventRow[],definitions=channels):EventRecording{
  return {schemaVersion:1,id,name,streamId,captureId:id+'-capture',time:{unit:'us',basis:'relative'},channels:structuredClone(definitions),events,
    provenance:{source:'synthetic',generator:'agility-demo',generatorVersion:DEMO_VERSION,seed:DEMO_SEED}};
}
export function buildDemo(){
  const shared=mode('shared'),dwell=mode('dwell'),hop=mode('hop');
  let t=shared.at(-1)!.t;
  const transition=[...structuredClone(shared),...hop.map((e,i)=>{const pri=i?e.values.pri!:600;t+=pri;return {t:round(t),values:{...e.values,pri}};})];
  const records=[
    record('demo-a-shared','A · Shared stagger','emitter-A',shared),
    record('demo-b-shared','B · Shared stagger','emitter-B',shared.map(e=>({...e,values:{...e.values,frequency:round(e.values.frequency!/1000)}})),channels.map(c=>c.id==='frequency'?{...c,unit:'GHz'}:c)),
    record('demo-a-dwell','A · Dwell schedule','emitter-A',dwell),
    record('demo-a-dwell-noisy','A · Dwell with perturbations','emitter-A',noisy(dwell,DEMO_SEED+4)),
    record('demo-b-hop','B · Jittered hops','emitter-B',hop),
    record('demo-b-hop-noisy','B · Hops with perturbations','emitter-B',noisy(hop,DEMO_SEED+5)),
    record('demo-b-transition','B · Stagger to hops','emitter-B',transition),
    record('demo-c-incomplete','C · Missing pulse width','candidate-C',shared.map(e=>({...e,values:{...e.values,pulseWidth:null}}))),
  ];
  records.forEach(validateEventRecording);
  const streams=[
    {id:'emitter-A',name:'Synthetic emitter A',kind:'emitter' as const,attribution:'reviewed' as const,notes:'Supplied construction attribution; shared stagger and distinctive dwell schedule.'},
    {id:'emitter-B',name:'Synthetic emitter B',kind:'emitter' as const,attribution:'reviewed' as const,notes:'Supplied construction attribution; shared stagger and distinctive jittered hops.'},
    {id:'candidate-C',name:'Unresolved stream C',kind:'candidate' as const,attribution:'uncertain' as const,notes:'Missing PW; resemblance cannot supply attribution.'},
  ];
  const sourceGroups=[{id:'related-curated-constructions',recordingIds:records.map(r=>r.id),notes:'Shared templates, perturbations and transition reuse; not independent measured captures or evaluation samples.'}];
  return {streams,records,sourceGroups};
}
export function writeDemo(output=resolve('datasets/agility-demo-v1')){
  const {records,streams,sourceGroups}=buildDemo();
  const recordings=records.map(r=>{const path=`recordings/${r.id}.json`,raw=json(r);mkdirSync(dirname(resolve(output,path)),{recursive:true});writeFileSync(resolve(output,path),raw);return {id:r.id,path,sha256:sha(raw),summary:summarizeEvents(r)};});
  const manifest={schemaVersion:1,datasetId:'agility-demo-v1',purpose:'synthetic-narrative-only',generatorVersion:DEMO_VERSION,seed:DEMO_SEED,generatorSha256:sha(readFileSync(fileURLToPath(import.meta.url),'utf8')),streams,recordings,sourceGroups};
  writeFileSync(resolve(output,'manifest.json'),json(manifest));return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(`Generated ${writeDemo().recordings.length} synthetic demo recordings.`);
