import type { Point, Region, RegionSet } from './types.ts';

export const TILE_STEP_X = 12;
export const TILE_STEP_Y = 10;
export const MAP_HALF_WIDTH = 540;
export const MAP_HALF_HEIGHT = 295;

export function movingTileIds(ids: string[], positions: Record<string, Point>, camera: { x: number; y: number; zoom: number }) {
  if (camera.zoom < 3.5) return new Set<string>();
  const screen = (id: string) => ({ x: positions[id].x * camera.zoom + camera.x, y: positions[id].y * camera.zoom + camera.y });
  // ponytail: cap decorative sweeps at 48 visible tiles; use a shared canvas for larger animation budgets.
  return new Set(ids.filter(id => positions[id] && Math.abs(screen(id).x) < 600 && Math.abs(screen(id).y) < 375)
    .sort((a, b) => Math.hypot(screen(a).x, screen(a).y) - Math.hypot(screen(b).x, screen(b).y)).slice(0, 48));
}

export function mapAnchors(positions: Record<string, Point>) {
  const points = Object.values(positions);
  if (!points.length) return {};
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  const scale = Math.min(840 / (maxX - minX || 1), 460 / (maxY - minY || 1));
  return Object.fromEntries(Object.entries(positions).map(([id, p]) => [id, { x: (p.x - (minX + maxX) / 2) * scale, y: (p.y - (minY + maxY) / 2) * scale }]));
}

// Display padding only: nearest unoccupied hex cell around each true similarity anchor.
// Reference IDs are assigned first, so local imports never move reference tiles.
export function spreadTiles(anchors: Record<string, Point>, reserved: Point[] = [], limits = { left: -MAP_HALF_WIDTH, right: MAP_HALF_WIDTH, top: -MAP_HALF_HEIGHT, bottom: MAP_HALF_HEIGHT }) {
  const occupied = new Set<string>(), result: Record<string, Point> = {};
  let labelsReserved = false;
  const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const ids = Object.keys(anchors).sort((a, b) => Number(a.startsWith('local-')) - Number(b.startsWith('local-')) || anchors[a].x - anchors[b].x || anchors[a].y - anchors[b].y || a.localeCompare(b));
  for (const id of ids) {
    // Reference labels overlay their tiles; local observations must stay clear of the text.
    if (id.startsWith('local-') && !labelsReserved) {
      reserved.forEach(p => { const r = Math.round(p.y / TILE_STEP_Y); occupied.add(`${Math.round(p.x / TILE_STEP_X - r / 2)},${r}`); });
      labelsReserved = true;
    }
    const anchor = anchors[id], r0 = Math.round(anchor.y / TILE_STEP_Y), q0 = Math.round(anchor.x / TILE_STEP_X - r0 / 2);
    let found = false;
    for (let radius = 0; radius < 100 && !found; radius++) {
      const cells: { q: number; r: number; x: number; y: number }[] = [];
      const add = (q: number, r: number) => cells.push({ q, r, x: (q + r / 2) * TILE_STEP_X, y: r * TILE_STEP_Y });
      if (!radius) add(q0, r0);
      else {
        let q = q0 - radius, r = r0 + radius;
        for (const [dq, dr] of directions) for (let i = 0; i < radius; i++) { add(q, r); q += dq; r += dr; }
      }
      cells.sort((a, b) => (a.x - anchor.x) ** 2 + (a.y - anchor.y) ** 2 - ((b.x - anchor.x) ** 2 + (b.y - anchor.y) ** 2));
      for (const cell of cells) {
        if (cell.x < limits.left || cell.x > limits.right || cell.y < limits.top || cell.y > limits.bottom || occupied.has(`${cell.q},${cell.r}`)) continue;
        occupied.add(`${cell.q},${cell.r}`); result[id] = { x: cell.x, y: cell.y }; found = true; break;
      }
    }
    // ponytail: fixed display grid fits ~3,700 tiles; expand the canvas for larger catalogues.
    if (!found) throw new Error('Display grid is full. Increase the map extent for this catalogue.');
  }
  return result;
}

// Add local members around their assigned islands and put new groups on an
// expandable shelf below the reference atlas. Reference tile positions stay fixed.
export function layoutIncoming(base: RegionLayout, regionSet: RegionSet): RegionLayout {
  if (Object.keys(regionSet.membership).every(id => base.points[id])) return base;
  const anchors = { ...base.points }, labelCells = [...base.labelCells];
  const centres = Object.fromEntries(base.areas.map(a => [a.region.id, a.centre]));
  const localRegions = regionSet.regions.filter(r => r.local);
  localRegions.forEach((region, i) => {
    const centre = { x: (i % 5 - 2) * 216, y: 350 + Math.floor(i / 5) * 90 };
    centres[region.id] = centre;
    const width = region.name.length * 8.7 + 12;
    for (let row = -1; row <= 1; row++) for (let column = -7; column <= 7; column++) {
      if (Math.abs(column * TILE_STEP_X) <= width / 2 + 6) labelCells.push({ x: centre.x + column * TILE_STEP_X, y: centre.y + row * TILE_STEP_Y });
    }
  });
  for (const [id, regionId] of Object.entries(regionSet.membership)) {
    if (!base.points[id]) anchors[id] = centres[regionId];
  }
  const bottom = localRegions.length ? 410 + Math.floor((localRegions.length - 1) / 5) * 90 : MAP_HALF_HEIGHT;
  const points = spreadTiles(anchors, labelCells, { left: -MAP_HALF_WIDTH, right: MAP_HALF_WIDTH, top: -MAP_HALF_HEIGHT, bottom });
  const areas = regionSet.regions.map(region => {
    const centre = centres[region.id];
    const members = Object.keys(regionSet.membership).filter(id => regionSet.membership[id] === region.id).map(id => points[id]);
    const old = base.areas.find(a => a.region.id === region.id);
    const width = region.name.length * 8.7 + 12;
    return { region, centre, outline: tileContour(members.map(p => ({ x: p.x - centre.x, y: p.y - centre.y })), 0),
      bounds: { left: Math.min(old?.bounds.left ?? centre.x - width / 2, ...members.map(p => p.x - 7)),
        right: Math.max(old?.bounds.right ?? centre.x + width / 2, ...members.map(p => p.x + 7)),
        top: Math.min(centre.y - 15, ...members.map(p => p.y - 6)), bottom: Math.max(centre.y + 15, ...members.map(p => p.y + 6)) } };
  });
  return { points, labelCells, membership: regionSet.membership, areas };
}

// Trace the occupied tile footprint instead of stretching a convex polygon across it.
export function tileContour(tiles: Point[], labelWidth: number) {
  const cells = new Set<string>();
  const fill = (left: number, right: number, top: number, bottom: number) => {
    for (let y = Math.floor(top / 5); y < Math.ceil(bottom / 5); y++) for (let x = Math.floor(left / 6); x < Math.ceil(right / 6); x++) cells.add(`${x},${y}`);
  };
  tiles.forEach(p => fill(p.x - 6, p.x + 6, p.y - 5, p.y + 5));
  fill(-labelWidth / 2, labelWidth / 2, -15, 15);
  const edges = new Map<string, string[]>();
  const add = (a: string, b: string) => edges.set(a, [...(edges.get(a) || []), b]);
  for (const cell of cells) {
    const [x, y] = cell.split(',').map(Number);
    if (!cells.has(`${x},${y - 1}`)) add(`${x},${y}`, `${x + 1},${y}`);
    if (!cells.has(`${x + 1},${y}`)) add(`${x + 1},${y}`, `${x + 1},${y + 1}`);
    if (!cells.has(`${x},${y + 1}`)) add(`${x + 1},${y + 1}`, `${x},${y + 1}`);
    if (!cells.has(`${x - 1},${y}`)) add(`${x},${y + 1}`, `${x},${y}`);
  }
  let path = '';
  while (edges.size) {
    const start = edges.keys().next().value!, vertices = [start];
    let current = start;
    do {
      const next = edges.get(current)!.pop()!;
      if (!edges.get(current)!.length) edges.delete(current);
      vertices.push(next); current = next;
    } while (current !== start);
    path += vertices.map((v, i) => { const [x, y] = v.split(',').map(Number); return `${i ? 'L' : 'M'}${x * 6},${y * 5}`; }).join('') + 'Z';
  }
  return path;
}
export type RegionLayout = { points: Record<string, Point>; labelCells: Point[]; membership: Record<string, string>; areas: { region: Region; centre: Point; outline: string; bounds: { left: number; right: number; top: number; bottom: number } }[] };

// Group membership determines the display. No pairwise projection is needed;
// the canvas grows rather than squeezing new signals into occupied cells.
export function layoutLibrary(regionSet: RegionSet): RegionLayout {
  const points: Record<string, Point> = {}, areas: RegionLayout['areas'] = [];
  const members = new Map<string, string[]>();
  for (const [id, group] of Object.entries(regionSet.membership)) {
    if (!members.has(group)) members.set(group, []);
    members.get(group)!.push(id);
  }
  let x = -520, y = -245, rowHeight = 0;
  for (const region of regionSet.regions) {
    const ids = members.get(region.id) || [];
    if (!ids.length) continue;
    const radius = Math.ceil(Math.sqrt(ids.length)) + 1, slots: Point[] = [];
    for (let r = -radius; r <= radius; r++) for (let q = -radius; q <= radius; q++) slots.push({ x: (q + r / 2) * TILE_STEP_X, y: r * TILE_STEP_Y });
    const chosen = slots.sort((a, b) => a.x ** 2 + a.y ** 2 * 1.35 - (b.x ** 2 + b.y ** 2 * 1.35) || a.y - b.y || a.x - b.x).slice(0, ids.length).sort((a, b) => a.y - b.y || a.x - b.x);
    const left = Math.min(...chosen.map(p => p.x)) - 7, right = Math.max(...chosen.map(p => p.x)) + 7;
    const top = Math.min(...chosen.map(p => p.y)) - 6, bottom = Math.max(...chosen.map(p => p.y)) + 6;
    const width = Math.max(right - left, region.name.length * 8.7 + 12), height = bottom - top + 42;
    if (x > -520 && x + width > 520) { x = -520; y += rowHeight + 28; rowHeight = 0; }
    const origin = { x: x + width / 2 - (left + right) / 2, y: y + 36 - top };
    ids.forEach((id, i) => { points[id] = { x: origin.x + chosen[i].x, y: origin.y + chosen[i].y }; });
    const centre = { x: origin.x, y: y + 10 };
    areas.push({ region, centre, outline: tileContour(chosen.map(p => ({ x: p.x, y: p.y + origin.y - centre.y })), 0), bounds: { left: x, right: x + width, top: y, bottom: y + height } });
    x += width + 32; rowHeight = Math.max(rowHeight, height);
  }
  return { points, areas, labelCells: [], membership: regionSet.membership };
}

export function layoutRegions(positions: Record<string, Point>, regionSet: RegionSet): RegionLayout {
  const anchors = mapAnchors(positions), points: Record<string, Point> = {}, areas: RegionLayout['areas'] = [], labelCells: Point[] = [];
  const candidates: Point[] = [];
  for (let r = -28; r <= 28; r++) for (let q = -60; q <= 60; q++) { const x = (q + r / 2) * TILE_STEP_X; if (Math.abs(x) <= 530) candidates.push({ x, y: r * TILE_STEP_Y }); }
  for (const region of [...regionSet.regions].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))) {
    const ids = Object.keys(regionSet.membership).filter(id => regionSet.membership[id] === region.id).sort((a, b) => anchors[a].y - anchors[b].y || anchors[a].x - anchors[b].x || a.localeCompare(b));
    const target = { x: ids.reduce((sum, id) => sum + anchors[id].x, 0) / ids.length, y: ids.reduce((sum, id) => sum + anchors[id].y, 0) / ids.length };
    const radius = Math.ceil(Math.sqrt(ids.length)) + 1, slots: Point[] = [];
    for (let r = -radius; r <= radius; r++) for (let q = -radius; q <= radius; q++) slots.push({ x: (q + r / 2) * TILE_STEP_X, y: r * TILE_STEP_Y });
    // Dense, uninterrupted tile islands; readable names overlay the centre as in the reference atlas.
    const seed = region.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
    const score = (p: Point) => {
      const angle = Math.atan2(p.y, p.x), phase = seed * .07;
      const coast = 1 + .16 * Math.sin(3 * angle + phase) + .09 * Math.cos(5 * angle - phase);
      return (p.x ** 2 + p.y ** 2 * 1.35) / coast ** 2;
    };
    const chosen = slots.sort((a, b) => score(a) - score(b) || a.y - b.y || a.x - b.x).slice(0, ids.length)
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const edges = chosen.flatMap(p => [{ x: p.x - 7, y: p.y - 6 }, { x: p.x + 7, y: p.y - 6 }, { x: p.x + 7, y: p.y + 6 }, { x: p.x - 7, y: p.y + 6 }]);
    const labelWidth = region.name.length * 8.7 + 12;
    edges.push({ x: -labelWidth / 2, y: -11 }, { x: labelWidth / 2, y: -11 }, { x: -labelWidth / 2, y: 13 }, { x: labelWidth / 2, y: 13 });
    const bounds = { left: Math.floor(Math.min(...edges.map(p => p.x)) / 6) * 6, right: Math.ceil(Math.max(...edges.map(p => p.x)) / 6) * 6, top: Math.min(-15, Math.floor(Math.min(...edges.map(p => p.y)) / 5) * 5), bottom: Math.max(15, Math.ceil(Math.max(...edges.map(p => p.y)) / 5) * 5) };
    const centre = [...candidates].sort((a, b) => (a.x - target.x) ** 2 + (a.y - target.y) ** 2 - ((b.x - target.x) ** 2 + (b.y - target.y) ** 2)).find(p => {
      const box = { left: p.x + bounds.left, right: p.x + bounds.right, top: p.y + bounds.top, bottom: p.y + bounds.bottom };
      return box.left >= -MAP_HALF_WIDTH && box.right <= MAP_HALF_WIDTH && box.top >= -MAP_HALF_HEIGHT && box.bottom <= MAP_HALF_HEIGHT && areas.every(a => box.right + 20 <= a.bounds.left || box.left - 20 >= a.bounds.right || box.bottom + 20 <= a.bounds.top || box.top - 20 >= a.bounds.bottom);
    });
    // ponytail: greedy packing fits the 12 browsing regions; expand the canvas if the catalogue outgrows it.
    if (!centre) throw new Error('Named regions exceed the display extent. Expand the map canvas.');
    for (let r = -1; r <= 1; r++) for (let q = -Math.ceil(labelWidth / TILE_STEP_X / 2) - 1; q <= Math.ceil(labelWidth / TILE_STEP_X / 2) + 1; q++) {
      const x = (q + r / 2) * TILE_STEP_X;
      if (Math.abs(x) <= labelWidth / 2 + 6) labelCells.push({ x: centre.x + x, y: centre.y + r * TILE_STEP_Y });
    }
    ids.forEach((id, i) => { points[id] = { x: centre.x + chosen[i].x, y: centre.y + chosen[i].y }; });
    areas.push({ region, centre, outline: tileContour(chosen, 0), bounds: { left: centre.x + bounds.left, right: centre.x + bounds.right, top: centre.y + bounds.top, bottom: centre.y + bounds.bottom } });
  }
  return { points, labelCells, areas, membership: regionSet.membership };
}
