import base from '../datasets/agility-stage0-v1/recordings/recording-0001.json' with {type:'json'};
import equivalent from '../datasets/agility-stage0-v1/recordings/recording-0002.json' with {type:'json'};
import scale from '../datasets/agility-stage0-v1/recordings/recording-0003.json' with {type:'json'};
import coordination from '../datasets/agility-stage0-v1/recordings/recording-0004.json' with {type:'json'};
import partial from '../datasets/agility-stage0-v1/recordings/recording-0005.json' with {type:'json'};
import missing from '../datasets/agility-stage0-v1/recordings/recording-0006.json' with {type:'json'};
import { windowView } from './agilityModel.ts';
import type { EventRecording, MatchSettings } from './agilityModel.ts';
import { compareObservationWindows } from './agilityMatching.ts';
import { symmetricWholeScore } from './agilityGrouping.ts';

const view=(recording:EventRecording)=>windowView(recording,{id:recording.id,recordingId:recording.id,startEvent:0,endEvent:recording.events.length,reviewState:'unreviewed'});
const target=view(base as EventRecording);
const examples=[
  {id:'equivalent',name:'Same behaviour, different emitter and units',description:'Emitter B expresses the base Frequency values in GHz rather than MHz. Explicit unit conversion preserves the comparison.',recording:equivalent},
  {id:'scale',name:'Scale and level change',description:'A has the same coordination with twice the duration, shifted Frequency range and scaled PRI/PW. Absolute and duration weights determine how much those differences matter.',recording:scale},
  {id:'coordination',name:'Changed PRI coordination',description:'B shifts the PRI order while keeping Frequency/PW behaviour. Selecting PRI exposes a coordination difference that Frequency alone cannot show.',recording:coordination},
  {id:'partial',name:'Only the middle was observed',description:'B contains events [16,48) of the base. A partial suggestion supports that interval; it cannot establish whole-window group membership.',recording:partial},
  {id:'missing',name:'Pulse width is unobserved',description:'A has Frequency and PRI measurements but no PW. A comparison requiring PW remains incomplete; selecting only observed parameters changes eligibility.',recording:missing},
];
export function methodologyExamples(settings:MatchSettings){
  return examples.map(({recording,...example})=>{
    const query=view(recording as EventRecording),match=compareObservationWindows(query,target,settings),whole=symmetricWholeScore(query,target,settings);
    return {...example,score:match?.preferred?.score??null,kind:match?.preferred?.kind??'insufficient',qualifying:match?.qualifying??false,groupable:whole!==null&&whole>=settings.threshold};
  });
}
