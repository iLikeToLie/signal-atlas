import { completeLinkage } from './completeLinkage.ts';
import { compareWindow } from './agilityMatching.ts';
import { normalizeMatchSettings, windowEligibility } from './agilityComparison.ts';
import type { MatchSettings, WindowView } from './agilityModel.ts';
import { MATCH_VERSION } from './agilityModel.ts';
import type { AnalysisIdentity, GroupAnalysis, SimilarityGroup } from './agilityMapTypes.ts';
const fingerprints = new Map<string, number>(), scores = new Map<string, number | null>();
function viewKey(v: WindowView) { const text = JSON.stringify(v); let key = fingerprints.get(text); if(key === undefined) { key=fingerprints.size; fingerprints.set(text,key); } return key; }
export function symmetricWholeScore(a: WindowView, b: WindowView, settings: MatchSettings): number | null {
  const s=normalizeMatchSettings(settings), x=compareWindow(a,b,s,true,{selected:s.parameters}), y=compareWindow(b,a,s,true,{selected:s.parameters});
  return x?.explanation.selectedEvidenceComplete && y?.explanation.selectedEvidenceComplete ? Math.min(x.score,y.score) : null;
}
export function groupScoreMatrix(ids: string[], matrix: Float64Array[], threshold: number): SimilarityGroup[] {
  const privateScores=matrix.map(row=>Float64Array.from(row,n=>Number.isFinite(n)?n:-Infinity));
  return completeLinkage(privateScores,threshold).clusters.map(cluster=>{
    const members=cluster.members.map(i=>ids[i]);
    const representative=cluster.members.reduce((best,i)=>{const sum=(j:number)=>cluster.members.reduce((n,k)=>n+(Number.isFinite(matrix[j][k])?matrix[j][k]:0),0);return sum(i)>sum(best)+1e-12?i:best;},cluster.members[0]);
    return {id:`similarity:${members[0]}`,members,representativeWindowId:ids[representative]};
  });
}
export function buildSimilarityGroups(views: Record<string,WindowView>, settings:MatchSettings, progress?:(done:number,total:number)=>void):GroupAnalysis {
  const s=normalizeMatchSettings(settings), all=Object.values(views).sort((a,b)=>a.windowId.localeCompare(b.windowId)), eligible:WindowView[]=[],ineligible:Record<string,string[]>={};
  for(const v of all){const e=windowEligibility(v,s);if(e.eligible)eligible.push(v);else ineligible[v.windowId]=e.reasons;}
  if(scores.size>250000||fingerprints.size>2000){scores.clear();fingerprints.clear();}
  const keys=eligible.map(viewKey), hash=JSON.stringify(s)+MATCH_VERSION, matrix=eligible.map(()=>new Float64Array(eligible.length).fill(NaN));let done=0,total=eligible.length*(eligible.length-1)/2;
  for(let a=0;a<eligible.length;a++){matrix[a][a]=1;for(let b=a+1;b<eligible.length;b++){
    const key=`${Math.min(keys[a],keys[b])}:${Math.max(keys[a],keys[b])}:${hash}`;
    let score=scores.get(key);if(score===undefined){score=symmetricWholeScore(eligible[a],eligible[b],s);scores.set(key,score);}
    matrix[a][b]=matrix[b][a]=score===null?NaN:score;done++;if(done%500===0||done===total)progress?.(done,total);
  }}
  const pairIds=eligible.map(v=>v.windowId), groups=groupScoreMatrix(pairIds,matrix,s.threshold),membership:Record<string,string>={};groups.forEach(g=>g.members.forEach(id=>membership[id]=g.id));
  return {groups,membership,ineligible,pairIds,pairScores:matrix};
}
export function sameAnalysisIdentity(a:AnalysisIdentity,b:AnalysisIdentity){return a.workspace===b.workspace&&a.revision===b.revision&&a.settingsHash===b.settingsHash&&a.inputFingerprint===b.inputFingerprint;}
export function acceptAnalysisResult(a:AnalysisIdentity,b:AnalysisIdentity,expectedSelection?:string,receivedSelection?:string){return sameAnalysisIdentity(a,b)&&expectedSelection===receivedSelection;}
