import { memo, useMemo, useState } from 'react';
import type { WindowView } from './agilityModel.ts';
function PlotContents({ view, target, normalized = true, compact = false }: { view: WindowView; target?: WindowView; normalized?: boolean; compact?: boolean }) {
  const [cursor, setCursor] = useState<number | null>(null), [zoom, setZoom] = useState<[number, number]>([0, 1]);
  const definitions = view.channels.slice(0, compact ? 3 : undefined), width = 560, height = compact ? 30 : 94;
  const charts = useMemo(() => definitions.map(channel => {
    const paired = target && (target.channels.find(c => c.id === channel.id && c.quantity === channel.quantity) || (channel.quantity !== 'numeric' && view.channels.filter(c => c.quantity === channel.quantity).length === 1 && target.channels.filter(c => c.quantity === channel.quantity).length === 1 ? target.channels.find(c => c.quantity === channel.quantity) : undefined));
    const ownRange = view.ranges[channel.id], targetRange = paired && target?.ranges[paired.id];
    const sharedRange = !normalized && paired?.unit === channel.unit && ownRange && targetRange ? [Math.min(ownRange[0], targetRange[0]), Math.max(ownRange[1], targetRange[1])] : null;
    const draw = (v: WindowView, id: string) => {
      let points = v.points;
      if (compact && points.length > 64) {
        const indices = new Set([0, points.length - 1]), stride = Math.ceil(points.length / 16);
        for (let first = 0; first < points.length; first += stride) { let lo = -1, hi = -1, missing = -1;
          for (let i = first; i < Math.min(first + stride, points.length); i++) { const value = points[i].values[id]; if (value === null) { if (missing < 0) missing = i; } else { if (lo < 0 || value < points[lo].values[id]!) lo = i; if (hi < 0 || value > points[hi].values[id]!) hi = i; } }
          for (const i of [first, lo, hi, missing]) if (i >= 0) indices.add(i);
        }
        let prior = -1; points = [...indices].sort((a,b)=>a-b).map(i=>{const p=points[i], gap=points.slice(prior+1,i).some(p=>p.values[id]===null||p.breaks.includes(id));prior=i;return gap?{...p,breaks:[...p.breaks,id]}:p});
      }
      const first = points[0].t, duration = Math.max(Number.EPSILON, points.at(-1)!.t - first);
      const range = sharedRange || v.ranges[id];
      const lo = range?.[0] ?? 0, hi = range?.[1] ?? lo;
      let open = false, path = '';
      for (const p of points) {
        const phase = (p.t - first) / duration, value = p.values[id];
        if (value === null || p.breaks.includes(id)) { open = false; if (value === null) continue; }
        if (phase < zoom[0] || phase > zoom[1]) continue;
        const magnitude=Math.max(Math.abs(lo),Math.abs(hi),Number.MIN_VALUE);
        const x = 8 + (phase - zoom[0]) / (zoom[1] - zoom[0]) * (width - 16), y = height - 6 - (hi === lo ? .5 : (value!/magnitude - lo/magnitude) / (hi/magnitude - lo/magnitude)) * (height - 12);
        path += `${open ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`; open = true;
      }
      return { path, lo, hi };
    };
    const own = draw(view, channel.id);
    const overlay = paired && (normalized || paired.unit === channel.unit) ? draw(target!, paired.id) : null;
    return { channel, own, overlay };
  }), [view, target, normalized, compact, zoom]);
  return <div className={`agility-plots ${compact ? 'compact' : ''}`} aria-label={compact ? 'Multi-parameter preview' : 'Coordinated parameter plots'}>
    {charts.map(({ channel, own, overlay }) => <div className="agility-chart" key={channel.id}>
      {!compact && <div className="chart-label"><strong>{channel.name}</strong><span>{view.counts[channel.id] || 0} measured · {channel.unit} · {view.ranges[channel.id]?.map(n => Number(n.toPrecision(5))).join('–') || 'unobserved'}</span></div>}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${channel.name} observed trajectory`} onPointerMove={compact ? undefined : e => { const r = e.currentTarget.getBoundingClientRect(); setCursor(zoom[0] + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (zoom[1] - zoom[0])); }} onPointerLeave={() => setCursor(null)}>
        {[.25, .5, .75].map(p => <line key={p} x1={p * width} x2={p * width} y1={0} y2={height} className="plot-rule" />)}
        <path d={own.path} className="trace" />{overlay && <path d={overlay.path} className="comparison-trace" />}
        {cursor !== null && <line x1={(cursor - zoom[0]) / (zoom[1] - zoom[0]) * width} x2={(cursor - zoom[0]) / (zoom[1] - zoom[0]) * width} y1={0} y2={height} className="cursor-line" />}
      </svg>
    </div>)}
    {!compact && <><p className="small-note">Shared time position {cursor === null ? '—' : `${(cursor * 100).toFixed(1)}%`} · {view.duration.toPrecision(4)} {view.timeUnit}{target && ` · target ${target.duration.toPrecision(4)} ${target.timeUnit}`}. Lines connect observed display samples; gaps break traces. {target && (normalized ? 'Each channel is normalized; orange is the aligned target interval.' : 'Original-scale overlay requires identical declared units. Normalized comparison supports converted units.')}</p>
      <div className="zoom-controls"><label>Shared start %<input aria-label="Shared zoom start" type="range" min={0} max={95} value={zoom[0] * 100} onChange={e => setZoom([Math.min(Number(e.target.value) / 100, zoom[1] - .05), zoom[1]])} /></label><label>Shared end %<input aria-label="Shared zoom end" type="range" min={5} max={100} value={zoom[1] * 100} onChange={e => setZoom([zoom[0], Math.max(Number(e.target.value) / 100, zoom[0] + .05)])} /></label><button onClick={() => setZoom([0, 1])}>Reset zoom</button></div></>}
  </div>;
}
export const AgilityPlot = memo(PlotContents);
export function JointPlot({ view }: { view: WindowView }) {
  const [x, setX] = useState(view.channels[0]?.id || ''), [y, setY] = useState(view.channels[1]?.id || view.channels[0]?.id || '');
  const xr = view.ranges[x], yr = view.ranges[y];
  return <details className="joint-view"><summary>Joint parameter relationship</summary><div className="zoom-controls"><label>X<select value={x} onChange={e => setX(e.target.value)}>{view.channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Y<select value={y} onChange={e => setY(e.target.value)}>{view.channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><svg viewBox="0 0 360 190" role="img" aria-label="Joint observed parameter values coloured by time">
    {view.points.map((p, i) => p.values[x] !== null && p.values[y] !== null && xr && yr ? <circle key={i} cx={20 + (xr[1] === xr[0] ? .5 : (p.values[x]! - xr[0]) / (xr[1] - xr[0])) * 320} cy={170 - (yr[1] === yr[0] ? .5 : (p.values[y]! - yr[0]) / (yr[1] - yr[0])) * 150} r={3} fill={`hsl(${150 + i / view.points.length * 80} 65% 65%)`} /> : null)}
  </svg><p className="small-note">Only simultaneously observed pairs are shown; colour follows event order.</p></details>;
}
