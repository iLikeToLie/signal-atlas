export type ComparisonRequest = {
  requestId: number; workspace: string; revision: number; queryWindowId: string;
  targetWindowId: string; startEvent: number; endEvent: number;
};
export function acceptComparisonLoad(expected:ComparisonRequest|null,received:ComparisonRequest,current:{workspace:string;revision:number;selectedWindowId:string}){
  return !!expected && Object.keys(received).every(k=>expected[k as keyof ComparisonRequest]===received[k as keyof ComparisonRequest])
    && current.workspace===received.workspace && current.revision===received.revision && current.selectedWindowId===received.queryWindowId;
}
