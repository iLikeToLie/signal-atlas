import { buildSimilarityGroups } from './agilityGrouping.ts';
import { matchObservationWindows } from './agilityMatching.ts';
import { layoutSimilarity } from './agilityMapLayout.ts';
self.onmessage = event => {
  const {id,identity,kind,views,settings,queryWindowId}=event.data;
  const respond=(data:object)=>self.postMessage({id,identity,kind,queryWindowId,...data});
  try {
    if(kind==='groups'){const value=buildSimilarityGroups(views,settings,(done,total)=>respond({progress:done,total}));respond({value,layout:layoutSimilarity(value,views)});}
    else if(kind==='matches')respond({value:views[queryWindowId]?matchObservationWindows(views[queryWindowId],views,settings,done=>{if(done%10===0)respond({progress:done,total:Object.keys(views).length});}):[]});
    else throw new Error('Unknown map analysis request.');
  }catch(error){respond({error:error instanceof Error?error.message:String(error)});}
};
