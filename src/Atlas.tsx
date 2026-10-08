import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { phaseGrid } from './signal.ts';
import type { Entry, Point } from './types.ts';
import { mapAnchors, movingTileIds } from './displayLayout.ts';
import type { RegionLayout } from './displayLayout.ts';
import { AtlasMotion } from './AtlasMotion.tsx';

type Props = { entries: Entry[]; positions: Record<string, Point>; regionPositions: Record<string, Point>; regionLayout: RegionLayout; focusedRegion: string; onExploreRegion: (id: string) => void; selectedId: string; onSelect: (id: string) => void; onGrid: () => void; pending: boolean; animate: boolean };
type Camera = { x: number; y: number; zoom: number };
const initial: Camera = { x: 0, y: 0, zoom: 1.15 };
export const Atlas = memo(function Atlas({ entries, positions, regionPositions, regionLayout, focusedRegion, onExploreRegion, selectedId, onSelect, onGrid, pending, animate }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const fitted = useMemo(() => {
    const points = Object.values(regionPositions);
    const bottom = Math.max(295, ...points.map(p => p.y + 40));
    if (!regionLayout.areas.some(a => a.region.local)) return initial;
    // Leave the lower viewport clear for captions and controls.
    const zoom = Math.min(1.15, 500 / (bottom + 295));
    return { x: 0, y: -25 - (bottom - 295) / 2 * zoom, zoom };
  }, [regionPositions, regionLayout]);
  const [camera, setCamera] = useState(initial);
  const cameraRef = useRef(camera); cameraRef.current = camera;
  const [hovered, setHovered] = useState<string | null>(null);
  const [spaced, setSpaced] = useState(true);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ camera: Camera; start: Point; span: number; moved: boolean; target: string | null; region: string | null } | null>(null);
  const anchors = useMemo(() => mapAnchors(positions), [positions]);
  const tiles = regionPositions;
  const displayed = spaced ? tiles : anchors;
  const moving = useMemo(() => movingTileIds(entries.map(e => e.id), displayed, camera), [entries, displayed, camera]);
  const labelOpacity = Math.max(0, Math.min(1, (3.2 - camera.zoom) / .9));
  const regionById = useMemo(() => Object.fromEntries(regionLayout.areas.map(a => [a.region.id, a.region])), [regionLayout]);
  const visibleCounts = useMemo(() => { const counts: Record<string, number> = {}; for (const e of entries) { const id = regionLayout.membership[e.id]; if (id) counts[id] = (counts[id] || 0) + 1; } return counts; }, [entries, regionLayout]);
  const shapes = useMemo(() => Object.fromEntries(entries.map(e => { const values = phaseGrid(e, 32); return [e.id, values.concat(values[0])]; })), [entries]);
  const thumbnails = useMemo(() => Object.fromEntries(Object.entries(shapes).map(([id, values]) => [id, values.map((v, i) => `${-3.75 + i / 32 * 7.5},${-v * 5.5}`).join(' ')])), [shapes]);
  const colors = useMemo(() => Object.fromEntries(entries.map(e => [e.id, regionById[regionLayout.membership[e.id]]?.color || '#e5ede8'])), [entries, regionById, regionLayout]);
  const motionView = useMemo(() => ({ entries, positions: displayed, shapes, colors, camera, quantity: entries[0]?.quantity || 'frequency' }), [entries, displayed, shapes, colors, camera]);
  const local = (clientX: number, clientY: number) => {
    const box = ref.current!.getBoundingClientRect();
    // The viewport uses xMidYMid meet, so account for SVG letterboxing.
    const unit = Math.min(box.width / 1200, box.height / 750);
    return { x: (clientX - box.left - box.width / 2) / unit, y: (clientY - box.top - box.height / 2) / unit };
  };
  const zoom = (factor: number, anchor: Point = { x: 0, y: 0 }) => setCamera(c => {
    const z = Math.max(0.12, Math.min(12, c.zoom * factor)), ratio = z / c.zoom;
    return { zoom: z, x: anchor.x - (anchor.x - c.x) * ratio, y: anchor.y - (anchor.y - c.y) * ratio };
  });
  useEffect(() => {
    const svg = ref.current!;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0018), local(e.clientX, e.clientY)); };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => { setCamera(spaced ? fitted : initial); }, [positions, fitted, spaced]);
  useEffect(() => {
    const area = spaced && regionLayout.areas.find(a => a.region.id === focusedRegion);
    if (!area) { setCamera(spaced ? fitted : initial); return; }
    const zoom = Math.min(4, 760 / (area.bounds.right - area.bounds.left), 420 / (area.bounds.bottom - area.bounds.top));
    setCamera({ x: -area.centre.x * zoom, y: -area.centre.y * zoom, zoom });
  }, [focusedRegion, regionLayout, spaced, fitted]);
  const resetGesture = () => {
    const points = [...pointers.current.values()];
    if (!points.length) return;
    const start = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
    const span = points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    gesture.current = { camera: cameraRef.current, start, span, moved: true, target: null, region: null };
  };
  const selected = entries.find(e => e.id === selectedId);
  const focusSelected = () => {
    if (!displayed[selectedId]) return;
    const p = displayed[selectedId];
    setCamera({ x: -p.x * 4, y: -p.y * 4, zoom: 4 });
  };
  const keyboard = (e: React.KeyboardEvent) => {
    const moves: Record<string, Point> = { ArrowLeft: { x: 60, y: 0 }, ArrowRight: { x: -60, y: 0 }, ArrowUp: { x: 0, y: 60 }, ArrowDown: { x: 0, y: -60 } };
    if (moves[e.key]) { e.preventDefault(); setCamera(c => ({ ...c, x: c.x + moves[e.key].x, y: c.y + moves[e.key].y })); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(1.3); }
    if (e.key === '-') { e.preventDefault(); zoom(1 / 1.3); }
    if (e.key === '0') { e.preventDefault(); setCamera(spaced ? fitted : initial); }
  };
  return <div className="atlas-stage" data-testid="atlas-stage">
    <div className="map-topline"><span><i className="status-dot" /> {pending ? 'Recomputing metric…' : spaced ? 'REFERENCE & LOCAL GROUPS' : 'EXACT SIMILARITY SPACE'}</span><button className="spacing-toggle" aria-label={spaced ? 'Show exact similarity coordinates' : 'Show named regions'} aria-pressed={spaced} onClick={() => { setSpaced(s => !s); setCamera(initial); }}>{spaced ? 'Named regions' : 'Exact positions'} ⓘ</button></div>
    <svg ref={ref} className="atlas-svg" viewBox="-600 -375 1200 750" tabIndex={0} aria-label={`${spaced ? 'Named morphology regions' : 'Exact similarity atlas'}. Drag to pan, scroll or pinch to zoom. Arrow keys pan, plus and minus zoom, zero resets. Use grid view to browse every pattern.`} onKeyDown={keyboard}
      onPointerDown={e => {
        if (e.button !== 0) return;
        ref.current!.setPointerCapture(e.pointerId);
        const p = local(e.clientX, e.clientY);
        pointers.current.set(e.pointerId, p);
        if (pointers.current.size > 1) resetGesture();
        else gesture.current = { camera: cameraRef.current, start: p, span: 0, moved: false, target: (e.target as Element).closest('[data-entry]')?.getAttribute('data-entry') || null, region: (e.target as Element).closest('[data-region]')?.getAttribute('data-region') || null };
      }}
      onPointerMove={e => {
        if (!pointers.current.has(e.pointerId) || !gesture.current) return;
        pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
        const points = [...pointers.current.values()], g = gesture.current;
        const middle = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
        const delta = { x: middle.x - g.start.x, y: middle.y - g.start.y };
        if (Math.hypot(delta.x, delta.y) > 4) g.moved = true;
        const ratio = points.length === 2 && g.span ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / g.span : 1;
        const z = Math.min(12, Math.max(0.12, g.camera.zoom * ratio));
        setCamera({ zoom: z, x: middle.x - (g.start.x - g.camera.x) * z / g.camera.zoom, y: middle.y - (g.start.y - g.camera.y) * z / g.camera.zoom });
      }}
      onPointerUp={e => {
        const g = gesture.current;
        if (g && !g.moved && pointers.current.size === 1) { if (g.target) onSelect(g.target); else if (g.region) onExploreRegion(g.region); }
        pointers.current.delete(e.pointerId);
        if (pointers.current.size) resetGesture(); else gesture.current = null;
      }} onPointerCancel={e => { pointers.current.delete(e.pointerId); gesture.current = null; }}>
      <defs><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".8" fill="#a2bbb4" opacity=".13" /></pattern><radialGradient id="map-glow"><stop stopColor="#31504a" stopOpacity=".23" /><stop offset="1" stopColor="#142123" stopOpacity="0" /></radialGradient></defs>
      <rect x="-600" y="-375" width="1200" height="750" fill="url(#map-glow)" /><rect x="-600" y="-375" width="1200" height="750" fill="url(#dots)" />
      <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
        {spaced && regionLayout.areas.filter(a => visibleCounts[a.region.id]).map(area => <g key={area.region.id} className="region-area" data-region={area.region.id} aria-hidden="true">
          <path d={area.outline} transform={`translate(${area.centre.x} ${area.centre.y})`} fill={area.region.color} fillRule="evenodd" fillOpacity={regionLayout.membership[selectedId] === area.region.id ? .24 : .16} stroke={area.region.color} strokeOpacity=".7" strokeWidth="1" strokeLinejoin="round" />
        </g>)}
        {entries.filter(e => displayed[e.id]).map(entry => {
          const p = displayed[entry.id], color = regionById[regionLayout.membership[entry.id]]?.color || '#e5ede8';
          const active = entry.id === selectedId, hover = entry.id === hovered;
          const thumbnail = camera.zoom >= 1.65;
          const points = thumbnails[entry.id];
          return <g key={entry.id} data-entry={entry.id} className="atlas-node" role="button" tabIndex={0} aria-label={`Select ${entry.name}`} aria-pressed={active} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(entry.id); } }} onMouseEnter={() => setHovered(entry.id)} onMouseLeave={() => setHovered(null)} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <title>{entry.name} · {entry.period} {entry.units.time} · {entry.excursion} {entry.units.frequency}</title>
            <rect x="-6" y="-4.5" width="12" height="9" fill="transparent" />
            <rect x="-5" y="-3.5" width="10" height="7" rx="1" fill={active || hover ? color : '#11191c'} fillOpacity={active || hover ? .25 : .7} stroke={active ? '#f4f0e7' : color} strokeOpacity={active || hover ? 1 : .5} strokeWidth={active ? 1.3 : .4} strokeDasharray={entry.source === 'measured' ? '2 1' : undefined} />
            <polyline points={points} stroke={color} opacity={active || hover ? 1 : .95} fill="none" strokeWidth={thumbnail ? .5 : .65} />
            {(hover || active && camera.zoom > 2 && labelOpacity > 0) && <text y="11" className="node-label" style={{ fontSize: Math.min(5, 15 / camera.zoom) }} textAnchor="middle">{entry.name}</text>}
          </g>;
        })}
        {spaced && labelOpacity > 0 && regionLayout.areas.filter(a => visibleCounts[a.region.id]).map(area => <g key={area.region.id} style={{ opacity: labelOpacity }} className="region-label" data-region={area.region.id} transform={`translate(${area.centre.x} ${area.centre.y})`} role="button" tabIndex={0} aria-label={`Focus ${area.region.name} region`} aria-pressed={focusedRegion === area.region.id} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onExploreRegion(area.region.id); } }}><text y="0" textAnchor="middle">{area.region.name}</text><text y="12" className="region-count" textAnchor="middle" fill={area.region.color}>{visibleCounts[area.region.id] === area.region.count ? `${area.region.count} CYCLES` : `${visibleCounts[area.region.id]} / ${area.region.count} VISIBLE`}</text></g>)}
      </g>
      <g opacity=".5" stroke="#607d78"><path d="M-475 -290h12m-6 -6v12M475 290h-12m6 -6v12" /></g>
    </svg>
    <AtlasMotion svg={ref} view={motionView} moving={moving} playing={animate} />
    {!entries.length && <div className="map-empty"><h3>No cycles in this view</h3><p>Try another family or a broader search.</p></div>}
    <div className="map-caption"><span>{spaced ? 'Colour = group · spacing is illustrative.' : 'Exact MDS coordinates · colour = group.'}<br /><strong>Ranked neighbours use the selected metric.</strong></span><button onClick={onGrid} className="text-button">Browse as grid ↗</button></div>
    <div className="map-controls"><button aria-label="Zoom in" onClick={() => zoom(1.35)}>+</button><button aria-label="Zoom out" onClick={() => zoom(1 / 1.35)}>−</button><button aria-label="Reset map" onClick={() => setCamera(spaced ? fitted : initial)}>⌖</button><button aria-label="Focus selected pattern" onClick={focusSelected} disabled={!selected || !displayed[selectedId]}>◎</button><output>{Math.round(camera.zoom * 100)}%</output></div>
    <div className="map-instructions">DRAG TO PAN <span>·</span> SCROLL / PINCH TO ZOOM <span>·</span> SELECT A CYCLE</div>
  </div>;
});
