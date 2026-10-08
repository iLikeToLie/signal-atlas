import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Entry, Point } from './types.ts';

type View = { entries: Entry[]; positions: Record<string, Point>; colors: Record<string, string>; shapes: Record<string, number[]>; camera: { x: number; y: number; zoom: number }; quantity: string };
export function AtlasMotion({ svg, view, moving, playing }: { svg: RefObject<SVGSVGElement | null>; view: View; moving: Set<string>; playing: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), previous = useRef<View | null>(null), progress = useRef(0);
  const transition = useRef<{ from: View; quantity: string; started: number } | null>(null);
  useLayoutEffect(() => {
    const surface = canvas.current!, map = svg.current!, context = surface.getContext('2d')!;
    const lastView = previous.current;
    previous.current = view;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (lastView?.entries.length && view.entries.length && lastView.quantity !== view.quantity && !reduced.matches) transition.current = { from: lastView, quantity: view.quantity, started: performance.now() };
    if (reduced.matches || transition.current && (transition.current.quantity !== view.quantity || performance.now() - transition.current.started >= 720)) transition.current = null;
    const active = transition.current, before = active?.from;
    const morph = !!active;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    let unit = 1;
    const resize = () => {
      const box = map.getBoundingClientRect(), parent = surface.parentElement!.getBoundingClientRect();
      unit = Math.min(box.width / 1200, box.height / 750);
      surface.width = Math.round(box.width * ratio); surface.height = Math.round(box.height * ratio);
      Object.assign(surface.style, { left: `${box.left - parent.left}px`, top: `${box.top - parent.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    };
    resize();
    map.dataset.morphing = String(morph);
    let frame = 0, started = active?.started ?? performance.now(), last = performance.now();
    const trail = (values: number[], x: number, y: number, color: string, alpha: number, lineWidth: number) => {
      context.globalAlpha = alpha; context.strokeStyle = color; context.lineWidth = lineWidth;
      context.beginPath(); values.forEach((v, i) => { const px = x - 3.75 + i / 32 * 7.5, py = y - v * 5.5; if (i) context.lineTo(px, py); else context.moveTo(px, py); }); context.stroke();
    };
    const draw = (now: number) => {
      if (reduced.matches) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, surface.width, surface.height); map.dataset.morphing = 'false'; last = now; return; }
      if (document.hidden) { last = now; frame = requestAnimationFrame(draw); return; }
      const amount = morph ? Math.min(1, (now - started) / 720) : 1;
      const ease = amount * amount * (3 - 2 * amount);
      context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, surface.width, surface.height);
      context.setTransform(ratio * unit, 0, 0, ratio * unit, surface.width / 2, surface.height / 2);
      const camera = morph && before ? { x: before.camera.x + (view.camera.x - before.camera.x) * ease, y: before.camera.y + (view.camera.y - before.camera.y) * ease, zoom: before.camera.zoom + (view.camera.zoom - before.camera.zoom) * ease } : view.camera;
      context.translate(camera.x, camera.y); context.scale(camera.zoom, camera.zoom);
      if (morph && amount < 1 && before) {
        for (const entry of view.entries) {
          const to = view.positions[entry.id];
          if (!to) continue;
          // Keep the collision-free destination tiles fixed while their curves
          // crossfade. Interpolating locations lets tiles cross and overlap.
          const x = to.x, y = to.y;
          if (Math.abs(x * camera.zoom + camera.x) > 610 || Math.abs(y * camera.zoom + camera.y) > 385) continue;
          context.globalAlpha = .7; context.fillStyle = '#11191c'; context.fillRect(x - 5, y - 3.5, 10, 7);
          context.globalAlpha = .55; context.strokeStyle = view.colors[entry.id]; context.lineWidth = .4; context.strokeRect(x - 5, y - 3.5, 10, 7);
          if (before.shapes[entry.id]) trail(before.shapes[entry.id], x, y, before.colors[entry.id], 1 - ease, .65);
          trail(view.shapes[entry.id], x, y, view.colors[entry.id], ease, .65);
        }
      } else {
        transition.current = null;
        map.dataset.morphing = 'false';
        if (playing && moving.size) {
          progress.current += Math.min(50, now - last) / 3000;
          const scan = -5 + progress.current % 1 * 13;
          for (const id of moving) {
            const p = view.positions[id]; if (!p) continue;
            context.save(); context.beginPath(); context.rect(p.x + scan - 3, p.y - 3.5, 3, 7); context.clip();
            trail(view.shapes[id], p.x, p.y, '#fff9e9', .85, .65); context.restore();
          }
        }
      }
      surface.dataset.frameTime = String(now);
      last = now;
      if (amount < 1 || playing && moving.size) frame = requestAnimationFrame(draw);
    };
    const resetClock = () => { const now = performance.now(); started += now - last; if (transition.current) transition.current.started = started; last = now; };
    const redraw = () => { cancelAnimationFrame(frame); resetClock(); frame = requestAnimationFrame(draw); };
    const observer = new ResizeObserver(() => { resize(); redraw(); });
    observer.observe(map);
    if (!reduced.matches) frame = requestAnimationFrame(draw);
    reduced.addEventListener('change', redraw);
    document.addEventListener('visibilitychange', resetClock);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); map.dataset.morphing = 'false'; reduced.removeEventListener('change', redraw); document.removeEventListener('visibilitychange', resetClock); };
  }, [svg, view, moving, playing]);
  return <canvas ref={canvas} className="atlas-motion" aria-hidden="true" />;
}
