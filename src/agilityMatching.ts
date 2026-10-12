import { MATCH_VERSION, DEFAULT_MATCH } from './agilityModel.ts';
import type { WindowView, MatchSettings, ViewPoint, MatchExplanation } from './agilityModel.ts';
import type { PatternRecord } from '../spec/agility.ts';
export type Suggestion = { patternId: string; score: number; weak: boolean; explanation: MatchExplanation };
const times: Record<string, number> = { s: 1, ms: .001, us: .000001, ns: .000000001 };
const frequencies: Record<string, number> = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 };
const normalized = (v: number, lo: number, hi: number) => { const magnitude=Math.max(Math.abs(lo),Math.abs(hi),Number.MIN_VALUE);return (v/magnitude-lo/magnitude)/(hi/magnitude-lo/magnitude); };
const sampled = (points: ViewPoint[]) => points.length <= 128 ? points : Array.from({ length: 128 }, (_, i) => points[Math.round(i * (points.length - 1) / 127)]);
export const matchingView = (view: WindowView): WindowView => ({ ...view, points: sampled(view.points) });
function common(q: WindowView, t: WindowView) {
  return q.channels.map(a => {
    const b = t.channels.find(b => a.quantity === b.quantity && a.id === b.id) || (a.quantity !== 'numeric' && q.channels.filter(c => c.quantity === a.quantity).length === 1 && t.channels.filter(c => c.quantity === a.quantity).length === 1 ? t.channels.find(b => b.quantity === a.quantity) : undefined);
    if (!b || a.origin !== 'supplied' || b.origin !== 'supplied') return null;
    const scale = a.quantity === 'frequency' ? frequencies : a.quantity === 'pri' || a.quantity === 'pulse-width' ? times : {};
    if (a.unit !== b.unit && !(scale[a.unit] && scale[b.unit])) return null;
    const af=scale[a.unit]||1,bf=scale[b.unit]||1,ar=q.ranges[a.id],br=t.ranges[b.id];
    if(!ar||!br||![ar[0]*af,ar[1]*af,br[0]*bf,br[1]*bf].every(Number.isFinite))return null;
    return { a, b, af, bf };
  }).filter((c): c is NonNullable<typeof c> => !!c);
}
export function compareWindow(q: WindowView, target: WindowView, settings: MatchSettings = DEFAULT_MATCH, fullOnly = false): Suggestion | null {
  if (q.count < 16 || !Object.values(q.counts).some(n => n >= 16)) return null;
  const pairs = common(q, target); if (!pairs.length) return null;
  const query = sampled(q.points), full = sampled(target.points), settingsHash = JSON.stringify(settings);
  const lengths = fullOnly ? [full.length] : [...new Set([full.length, Math.min(full.length, query.length), ...[.25, .5, .75].map(f => Math.max(16, Math.round(full.length * f)))])].filter(n => n >= 16 && n <= full.length);
  let best: Suggestion | null = null, ties = 0;
  for (const length of lengths) {
    const stride = Math.max(1, Math.floor((full.length - length) / 24));
    const starts = [...new Set([...Array.from({ length: Math.floor((full.length - length) / stride) + 1 }, (_, i) => i * stride), full.length - length])];
    for (const start of starts) {
      const targetPoints = full.slice(start, start + length), sourceStart = targetPoints[0].index, sourceEnd = targetPoints.at(-1)!.index + 1;
      const bounds = pairs.map(c => {
        const values = (points: ViewPoint[], id: string, factor: number) => points.flatMap(p => p.values[id] === null ? [] : [p.values[id]! * factor]);
        const a = values(query, c.a.id, c.af), b = values(targetPoints, c.b.id, c.bf);
        return { ...c, al: Math.min(...a), ah: Math.max(...a), bl: Math.min(...b), bh: Math.max(...b), sum: 0, count: 0, queryIndices: new Set<number>(), targetIndices: new Set<number>() };
      });
      let timeError = 0, positions = 0; const overlap: Record<string, { q: Set<number>; t: Set<number> }> = {};
      const qDuration = query.at(-1)!.t - query[0].t, tDuration = targetPoints.at(-1)!.t - targetPoints[0].t;
      if (!(qDuration > 0 && tDuration > 0)) continue;
      for (const a of query) {
        const fraction = (a.index - query[0].index) / Math.max(1, query.at(-1)!.index - query[0].index);
        const b = targetPoints[Math.round(fraction * (targetPoints.length - 1))];
        const supported: string[] = [];
        for (const c of bounds) {
          const av = a.values[c.a.id], bv = b.values[c.b.id];
          if (av === null || bv === null || a.breaks.includes(c.a.id) || b.breaks.includes(c.b.id)) continue;
          const ae = c.ah - c.al, be = c.bh - c.bl;
          // Constant channels have no morphology. Constant-varying is a disagreement.
          const difference = ae === 0 && be === 0 ? 0 : ae === 0 || be === 0 ? 1 : normalized(av*c.af,c.al,c.ah)-normalized(bv*c.bf,c.bl,c.bh);
          c.sum += difference ** 2; c.count++; c.queryIndices.add(a.index); c.targetIndices.add(b.index); supported.push(c.a.id);
        }
        if (supported.length) { timeError += ((a.t - query[0].t) / qDuration - (b.t - targetPoints[0].t) / tDuration) ** 2; positions++; }
        for (let i = 0; i < supported.length; i++) for (let j = i + 1; j < supported.length; j++) { const key = `${supported[i]}|${supported[j]}`; const pair = overlap[key] ||= { q: new Set(), t: new Set() }; pair.q.add(a.index); pair.t.add(b.index); }
      }
      const supported = bounds.filter(c => c.count > 0); if (!supported.length) continue;
      const unique = (c: typeof bounds[number]) => Math.min(c.queryIndices.size, c.targetIndices.size);
      const eligible = supported.filter(c => unique(c) >= settings.minimumOverlap);
      const multi = Math.max(0, ...Object.values(overlap).map(p => Math.min(p.q.size, p.t.size))) >= settings.minimumOverlap;
      let absolute = 0;
      for (const c of supported) {const magnitude=Math.max(Math.abs(c.al),Math.abs(c.ah),Math.abs(c.bl),Math.abs(c.bh),Number.MIN_VALUE);absolute+=Math.abs((c.al/2+c.ah/2)/magnitude-(c.bl/2+c.bh/2)/magnitude);}
      const qf = times[q.timeUnit], tf = times[target.timeUnit], sameTime = q.timeUnit === target.timeUnit || qf && tf;
      if (settings.durationWeight && !sameTime) continue;
      const duration = sameTime ? Math.abs(Math.log2(qDuration)+Math.log2(qf||1)-Math.log2(tDuration)-Math.log2(tf||1)) : 0;
      const shape = Math.sqrt(supported.reduce((n, c) => n + c.sum / c.count, 0) / supported.length);
      const score = Math.exp(-4 * shape - 2 * Math.sqrt(timeError / Math.max(1, positions)) - settings.absoluteWeight * absolute / supported.length - settings.durationWeight * duration);
      const missing = q.channels.filter(c => !eligible.some(p => p.a.id === c.id));
      const partial = sourceStart > target.points[0].index || sourceEnd < target.points.at(-1)!.index + 1;
      const canonicalScale = qDuration * (qf || 1) / (tDuration * (tf || 1));
      if(!Number.isFinite(score)||!Number.isFinite(canonicalScale)||canonicalScale<=0)continue;
      const explanation: MatchExplanation = {
        query: { windowId: q.windowId, startEvent: query[0].index, endEvent: query.at(-1)!.index + 1, channelIds: eligible.map(c => c.a.id) },
        target: { windowId: target.windowId, startEvent: sourceStart, endEvent: sourceEnd, channelIds: eligible.map(c => c.b.id) },
        scope: !eligible.length ? 'insufficient-evidence' : multi ? 'multi-parameter' : 'single-parameter', partial,
        sharedAlignment: { timeOffset: query[0].t * (qf || 1) - targetPoints[0].t * (tf || 1) * canonicalScale, timeScale: canonicalScale, timeUnit: qf && tf ? 's' : 'tu' },
        channelResults: q.channels.map(c => { const p = bounds.find(p => p.a.id === c.id); return { channelId: c.id, agreement: p && unique(p) >= settings.minimumOverlap ? Math.exp(-4 * Math.sqrt(p.sum / p.count)) : null, missing: !p || unique(p) < settings.minimumOverlap, notes: p ? `${unique(p)} distinct aligned measurements; ${q.counts[c.id] || 0} source measurements. Reused samples do not add support.` : 'Missing, modelled or incompatible target channel.' }; }),
        limitations: [...(multi ? [] : ['No sufficiently overlapping channel pair; coordination remains unresolved.']), ...missing.map(c => `${c.name}: missing or insufficient common evidence.`), ...(partial ? ['Only this contiguous target interval is supported; unseen events remain unconfirmed.'] : []), ...(full.length < target.count || query.length < q.count ? ['Search uses bounded sampled features; interval endpoints are approximate. Narrow the source window to inspect original events.'] : []), ...supported.filter(c => c.ah === c.al && c.bh === c.bl).map(c => `${c.a.name}: steady values have no shape evidence; inspect absolute levels.`)], matcherVersion: MATCH_VERSION, settingsHash,
      };
      const candidate = { patternId: '', score, weak: score < settings.threshold || !multi || !eligible.length, explanation };
      const tier = Number(explanation.scope !== 'insufficient-evidence'), bestTier = Number(best?.explanation.scope !== 'insufficient-evidence');
      if (!best || tier > bestTier || tier === bestTier && (score > best.score + 1e-9 || Math.abs(score - best.score) < 1e-9 && !partial && best.explanation.partial)) { best = candidate; ties = 0; }
      else if (Math.abs(score - best.score) < 1e-9 && partial && best.explanation.partial) ties++;
    }
  }
  if (best && ties) best.explanation.limitations.push('Several intervals have equivalent scores; this is one candidate alignment.');
  return best;
}
export function overviewGroups(views: Record<string, WindowView>, settings = DEFAULT_MATCH) {
  const anchors: WindowView[] = [], groups: Record<string, string> = {};
  for (const view of Object.values(views).sort((a, b) => a.windowId.localeCompare(b.windowId))) {
    const anchor = anchors.find(a => { const m = compareWindow(view, a, settings, true); return m && m.score >= settings.threshold && m.explanation.scope === 'multi-parameter'; });
    if (anchor) groups[view.windowId] = anchor.windowId;
    else { groups[view.windowId] = view.windowId; anchors.push(view); }
  }
  return groups;
}
export function matchLibrary(query: WindowView, patterns: PatternRecord[], views: Record<string, WindowView>, settings = DEFAULT_MATCH, progress?: (done: number) => void) {
  const results: Suggestion[] = [];
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i], target = views[p.representativeWindowId];
    if (target && p.representativeWindowId !== query.windowId) { const match = compareWindow(query, target, settings); if (match) results.push({ ...match, patternId: p.id }); }
    progress?.(i + 1);
  }
  return results.sort((a, b) => Number(b.explanation.scope !== 'insufficient-evidence') - Number(a.explanation.scope !== 'insufficient-evidence') || b.score - a.score || a.patternId.localeCompare(b.patternId)).slice(0, 8);
}
