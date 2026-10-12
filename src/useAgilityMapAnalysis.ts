import { useEffect, useMemo, useRef, useState } from 'react';
import { matchingView } from './agilityMatching.ts';
import { normalizeMatchSettings } from './agilityComparison.ts';
import { acceptAnalysisResult } from './agilityGrouping.ts';
import type { LibraryState } from './agilityModel.ts';
import type { AnalysisIdentity, GroupAnalysis, ObservationMatch, MapLayout } from './agilityMapTypes.ts';
const newWorker=()=>new Worker(new URL('./agilityMap.worker.ts',import.meta.url),{type:'module'});
export function useAgilityMapAnalysis({state,workspace,selectedWindowId}:{state:LibraryState;workspace:string;selectedWindowId:string}){
  const views=useMemo(()=>Object.fromEntries(Object.values(state.views).map(v=>[v.windowId,matchingView(v)])),[state.views]);
  const settingsHash=JSON.stringify(normalizeMatchSettings(state.settings)), inputFingerprint=JSON.stringify(views);
  const identity=useMemo<AnalysisIdentity>(()=>({workspace,revision:state.revision,settingsHash,inputFingerprint}),[workspace,state.revision,settingsHash,inputFingerprint]);
  const latest=useRef({identity,selectedWindowId});latest.current={identity,selectedWindowId};
  const [analysis,setAnalysis]=useState<GroupAnalysis|null>(null),[similarityLayout,setSimilarityLayout]=useState<MapLayout|null>(null),[matches,setMatches]=useState<ObservationMatch[]>([]),[groupPending,setGroupPending]=useState(false),[matchPending,setMatchPending]=useState(false),[error,setError]=useState(''),[generation,setGeneration]=useState(0),[progress,setProgress]=useState('');
  const groupWorker=useRef<Worker|null>(null),matchWorker=useRef<Worker|null>(null), groupIdentity=useRef<AnalysisIdentity|null>(null),matchIdentity=useRef<{identity:AnalysisIdentity;selected:string}|null>(null);
  useEffect(()=>{
    const w=newWorker();groupWorker.current=w;setGroupPending(true);setError('');groupIdentity.current=null;
    w.onmessage=e=>{if(!acceptAnalysisResult(latest.current.identity,e.data.identity))return;if(e.data.progress!==undefined){setProgress(`Comparing ${e.data.progress}/${e.data.total} pairs…`);return;}setGroupPending(false);if(e.data.error)setError(e.data.error);else{setAnalysis(e.data.value);if(e.data.layout)setSimilarityLayout(e.data.layout);groupIdentity.current=e.data.identity;setProgress('');}};
    w.onerror=()=>{setGroupPending(false);setError('Map grouping failed. Originals and reviewed evidence remain intact.');};
    w.postMessage({id:generation,identity,kind:'groups',views,settings:state.settings});return()=>{w.terminate();};
  },[identity,generation]);
  useEffect(()=>{
    setMatches([]);matchIdentity.current=null;setError('');if(!views[selectedWindowId]){setMatchPending(false);return;}
    const w=newWorker();matchWorker.current=w;setMatchPending(true);
    w.onmessage=e=>{if(!acceptAnalysisResult(latest.current.identity,e.data.identity,latest.current.selectedWindowId,e.data.queryWindowId))return;if(e.data.progress!==undefined)return;setMatchPending(false);if(e.data.error)setError(e.data.error);else{setMatches(e.data.value);matchIdentity.current={identity:e.data.identity,selected:e.data.queryWindowId};}};
    w.onerror=()=>{setMatchPending(false);setError('Observation matching failed. Try matching again.');};
    w.postMessage({id:generation,identity,kind:'matches',views,settings:state.settings,queryWindowId:selectedWindowId});return()=>w.terminate();
  },[identity,selectedWindowId,generation]);
  const currentMatches=matchIdentity.current&&acceptAnalysisResult(identity,matchIdentity.current.identity,selectedWindowId,matchIdentity.current.selected)?matches:[];
  return {analysis,similarityLayout,matches:currentMatches,groupPending:groupPending||!groupIdentity.current||!acceptAnalysisResult(identity,groupIdentity.current),matchPending,error,progress,cancelMatching:()=>{matchWorker.current?.terminate();setMatchPending(false);setMatches([]);matchIdentity.current=null;},retry:()=>setGeneration(g=>g+1)};
}
