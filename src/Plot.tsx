import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { repeatSamples, sampleAt, sweepSeconds } from './signal.ts';
import { familyInfo } from './catalogue.ts';
import type { Entry } from './types.ts';

export function MiniPlot({ entry, color, className = '' }: { entry: Entry; color?: string; className?: string }) {
  const points = Array.from({ length: 65 }, (_, i) => `${i / 64 * 100},${27 - (sampleAt(entry, i / 64) - entry.centre) / entry.excursion * 42}`).join(' ');
  return <svg className={`mini-plot ${className}`} viewBox="0 0 100 54" aria-hidden="true"><path d="M0 27H100" stroke="currentColor" opacity=".12" /><polyline points={points} fill="none" stroke={color || familyInfo(entry.family).color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg>;
}

export function Plot({ entries, normalized = false, shifts = [], phase, title, cycles = 1, pulse, progress }: { entries: Entry[]; normalized?: boolean; shifts?: number[]; phase?: number; title?: string; cycles?: number; pulse?: { playing: boolean; speed: number }; progress?: RefObject<HTMLSpanElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null), elapsed = useRef(0);
  const width = 620, height = 270, left = 62, right = 18, top = 24, bottom = 49;
  const end = cycles * (normalized ? 1 : Math.max(...entries.map(e => e.period)));
  const min = normalized ? -0.5 : Math.min(...entries.map(e => e.centre - e.excursion / 2));
  const max = normalized ? 0.5 : Math.max(...entries.map(e => e.centre + e.excursion / 2));
  const margin = (max - min) * 0.12, low = min - margin, high = max + margin;
  const x = (t: number) => left + t / end * (width - left - right);
  const y = (f: number) => top + (high - f) / (high - low) * (height - top - bottom);
  const colors = entries.map((e, i) => i === 1 ? '#e9b987' : familyInfo(e.family).color);
  const value = (entry: Entry, p: number) => normalized ? (sampleAt(entry, p) - entry.centre) / entry.excursion : sampleAt(entry, p);
  const format = (n: number) => Number(n.toPrecision(4)).toString();
  const ticks = cycles === 3 ? 7 : 5;
  const pri = entries[0].quantity === 'pri';
  const traces = useMemo(() => entries.map((entry, index) => repeatSamples(entry, cycles, normalized, normalized ? shifts[index] || 0 : 0).map(s => `${x(s.t)},${y(s.f)}`).join(' ')), [entries, cycles, normalized, shifts.join(',')]);
  useEffect(() => {
    if (!pulse || !canvas.current) return;
    const overlay = canvas.current, context = overlay.getContext('2d')!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const bitmap = document.createElement('canvas'); bitmap.width = width; bitmap.height = height;
    const bright = bitmap.getContext('2d')!;
    traces.forEach((trace, i) => { bright.strokeStyle = colors[i]; bright.lineWidth = 3; bright.stroke(new Path2D(`M${trace.replaceAll(' ', ' L')}`)); });
    const duration = sweepSeconds(entries[0], cycles, pulse.speed) * 1000;
    let frame = 0, last = performance.now(), lastReadout = 0;
    const resetClock = () => { last = performance.now(); };
    const draw = (now: number) => {
      if (motion.matches) { context.clearRect(0, 0, width, height); last = now; return; }
      if (!document.hidden && !motion.matches) {
        if (pulse.playing) elapsed.current += now - last;
        const fraction = elapsed.current % duration / duration, position = left + fraction * (width - left - right);
        context.clearRect(0, 0, width, height);
        const start = Math.max(left, position - 80), span = position - start;
        if (span > 0) context.drawImage(bitmap, start, top, span, height - top - bottom, start, top, span, height - top - bottom);
        context.strokeStyle = colors[0]; context.globalAlpha = .35; context.lineWidth = 1;
        context.beginPath(); context.moveTo(position, top); context.lineTo(position, height - bottom); context.stroke(); context.globalAlpha = 1;
        if (progress?.current && now - lastReadout >= 125) {
          const phase = fraction * cycles;
          progress.current.textContent = `Cycle ${Math.floor(phase) + 1} / ${cycles} · ${Math.round((phase % 1) * 100)}%`;
          lastReadout = now;
        }
        overlay.dataset.frameTime = String(now);
      }
      last = now;
      if (pulse.playing) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const redraw = () => { cancelAnimationFrame(frame); resetClock(); frame = requestAnimationFrame(draw); };
    motion.addEventListener('change', redraw);
    document.addEventListener('visibilitychange', resetClock);
    return () => { cancelAnimationFrame(frame); motion.removeEventListener('change', redraw); document.removeEventListener('visibilitychange', resetClock); };
  }, [traces, pulse?.playing, pulse?.speed, cycles, progress]);
  return <div className="plot-shell"><svg className="wave-plot" data-cycles={cycles} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title || `${cycles} ${cycles === 1 ? 'cycle' : 'cycles'} · ${normalized ? `aligned normalized ${pri ? 'pulse interval' : 'frequency'} against cycle phase` : `${pri ? 'pulse repetition interval' : 'instantaneous frequency'} against time in original units`}`}>
    <rect x={left} y={top} width={width - left - right} height={height - top - bottom} fill="#121c1e" />
    {Array.from({ length: ticks }, (_, i) => {
      const t = i / (ticks - 1) * end;
      return <g key={i} className="plot-grid"><line x1={x(t)} x2={x(t)} y1={top} y2={height - bottom} /><text x={x(t)} y={height - bottom + 22} textAnchor="middle">{format(t)}</text></g>;
    })}
    {Array.from({ length: 5 }, (_, i) => { const f = min + i / 4 * (max - min); return <g key={i} className="plot-grid"><line x1={left} x2={width - right} y1={y(f)} y2={y(f)} /><text x={left - 10} y={y(f) + 4} textAnchor="end">{format(f)}</text></g>; })}
    {cycles > 1 && (entries.length === 1 || normalized) && Array.from({ length: cycles }, (_, i) => <g key={i} className="cycle-boundary"><text x={x((i + .5) * (normalized ? 1 : entries[0].period))} y={top - 9} textAnchor="middle">CYCLE {i + 1}</text>{i > 0 && <line x1={x(i * (normalized ? 1 : entries[0].period))} x2={x(i * (normalized ? 1 : entries[0].period))} y1={top} y2={height - bottom} />}</g>)}
    {entries.map((entry, index) => {
      return <g key={entry.id}><polyline className={pulse ? 'pulse-base' : undefined} points={traces[index]} fill="none" stroke={colors[index]} opacity={pulse ? .35 : 1} strokeWidth="2.4" strokeDasharray={index === 1 ? '7 4' : undefined} vectorEffect="non-scaling-stroke" /></g>;
    })}
    {!pulse && phase !== undefined && <g className="playhead" data-testid="playhead" transform={`translate(${x(normalized ? phase : phase * entries[0].period)},0)`}><line y1={top} y2={height - bottom} stroke={colors[0]} opacity=".35" /><circle cx="0" cy={y(value(entries[0], phase))} r="5" fill={colors[0]} stroke="#101719" strokeWidth="2" /></g>}
    <text className="axis-label" x={(left + width - right) / 2} y={height - 5} textAnchor="middle">{normalized ? 'CYCLE PHASE · t / T' : `TIME [${entries[0].units.time}]`}</text>
    <text className="axis-label" transform={`translate(14 ${(top + height - bottom) / 2}) rotate(-90)`} textAnchor="middle">{normalized ? `(${pri ? 'PRI' : 'f'} − centre) / excursion` : `${pri ? 'PRI' : 'FREQUENCY'} [${entries[0].units.frequency}]`}</text>
  </svg>{pulse && <canvas ref={canvas} width={width} height={height} className="plot-motion" aria-hidden="true" />}</div>;
}
