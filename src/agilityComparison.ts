import type { Channel, MatchSettings, WindowView } from './agilityModel.ts';
import type { ComparisonQuantity, WindowEligibility, ObservationComparison } from './agilityMapTypes.ts';
export const COMPARISON_PARAMETERS: ComparisonQuantity[] = ['frequency', 'pri', 'pulse-width'];
export const parameterLabel = (q: ComparisonQuantity) => ({ frequency: 'Frequency', pri: 'PRI', 'pulse-width': 'PW' })[q];
export function normalizeParameters(value: unknown): ComparisonQuantity[] {
  if (value === undefined) return [...COMPARISON_PARAMETERS];
  if (!Array.isArray(value) || !value.length || value.some(q => !COMPARISON_PARAMETERS.includes(q))) throw new Error('Select at least one of Frequency, PRI and PW.');
  return COMPARISON_PARAMETERS.filter(q => value.includes(q));
}
export function normalizeMatchSettings(value: MatchSettings): MatchSettings & { parameters: ComparisonQuantity[] } {
  if (!value || !Number.isFinite(value.threshold) || value.threshold < 0 || value.threshold > 1 || !Number.isFinite(value.absoluteWeight) || value.absoluteWeight < 0 || value.absoluteWeight > 2 || !Number.isFinite(value.durationWeight) || value.durationWeight < 0 || value.durationWeight > 2 || !Number.isInteger(value.minimumOverlap) || value.minimumOverlap < 16 || value.minimumOverlap > 128) throw new Error('Invalid matching settings.');
  return { ...value, parameters: normalizeParameters(value.parameters) };
}
export function resolveSelectedChannels(view: WindowView, quantities: readonly ComparisonQuantity[]) {
  const channels: Channel[] = [], missing: ComparisonQuantity[] = [], reasons: string[] = [];
  for (const q of quantities) {
    const candidates = view.channels.filter(c => c.quantity === q && c.origin === 'supplied');
    if (candidates.length !== 1) { missing.push(q); reasons.push(`${parameterLabel(q)}: ${candidates.length > 1 ? 'ambiguous supplied channels' : 'not observed'}.`); }
    else channels.push(candidates[0]);
  }
  return { channels, missing, reasons };
}
export function sampledPoints(view: WindowView) { return view.points.length <= 128 ? view.points : Array.from({ length: 128 }, (_, i) => view.points[Math.round(i * (view.points.length - 1) / 127)]); }
export function comparisonCoverage(query:WindowView,target:WindowView,c:ObservationComparison){
  const selected=(c.explanation.query.endEvent-c.explanation.query.startEvent)/query.count,related=(c.explanation.target.endEvent-c.explanation.target.startEvent)/target.count;
  return {selected,related,kind:!c.eligible?'unresolved' as const:selected<1?'partial' as const:related<1?'contained' as const:'whole' as const};
}
export function windowEligibility(view: WindowView, settings: MatchSettings): WindowEligibility {
  const s = normalizeMatchSettings(settings), selected = resolveSelectedChannels(view, s.parameters), reasons = [...selected.reasons];
  const points = sampledPoints(view), jointMeasured = points.filter(p => selected.channels.every(c => p.values[c.id] !== null && p.values[c.id] !== undefined && !p.breaks.includes(c.id))).length;
  for (const c of selected.channels) if ((view.counts[c.id] || 0) < s.minimumOverlap) reasons.push(`${c.name}: fewer than ${s.minimumOverlap} measured events.`);
  if (view.count < 16 || !Number.isFinite(view.duration) || view.duration <= 0) reasons.push('Window needs 16 events spanning nonzero time.');
  if (jointMeasured < s.minimumOverlap) reasons.push(`Fewer than ${s.minimumOverlap} simultaneously supported comparison positions.`);
  return { eligible: !reasons.length, missing: selected.missing, jointMeasured, reasons };
}
