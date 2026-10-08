import type { Entry, Family, RegionSet } from './types.ts';
import type { GroupReview } from './groupPolicy.ts';
import { signature } from './calibration.ts';

// Editorial map labels only. They never participate in signal admission.
const skyNames = ['Vega', 'Lyra', 'Nova', 'Halo', 'Orion', 'Aster', 'Vela', 'Sirius', 'Sol', 'Luna', 'Aurora', 'Polaris', 'Altair', 'Mira', 'Atlas', 'Draco', 'Cetus', 'Cygnus', 'Aquila', 'Rigel', 'Solis', 'Astra', 'Carina', 'Argo', 'Dawn', 'Dusk', 'Horizon', 'Meridian', 'Zenith', 'Nadir', 'Haven', 'Ember'];
const formNames: Record<Family, string[]> = {
  sinusoidal: ['Tide', 'Moonwater', 'Orbit', 'Crescent', 'Lagoon', 'Current'],
  triangular: ['Kite', 'Ridge', 'Copper', 'Switchback', 'Glass', 'Facet'],
  rounded: ['Petal', 'Cloudline', 'Bloom', 'Summit', 'Silk', 'Cove'],
  'rise-fall': ['Comet', 'Slingshot', 'Arc', 'Tail', 'Rise', 'Fall'],
  'sweep-dwell': ['Lantern', 'Harbour', 'Horizon', 'Stillwater', 'Dwell', 'Beacon'],
  harmonic: ['Echo', 'Braid', 'Ripple', 'Chorus', 'Reef', 'Prism', 'Spiral', 'Lattice', 'Twinwake', 'Knot', 'Fold', 'Garden'],
  shoulders: ['Mesa', 'Shelf', 'Terrace', 'Plateau', 'Amber', 'Shore'],
  blend: ['Loom', 'Weave', 'Delta', 'Drift', 'Reach', 'Grove'],
  unassigned: skyNames,
};
const automatic = (name: string) => /^(?:(?:New )?Group \d+|Split from (?:New )?Group \d+)$/i.test(name);

export function nameLibraryGroups(regionSet: RegionSet, entries: Entry[], review: GroupReview) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const saved = new Map(review.groups.filter(g => !automatic(g.name)).map(g => [g.id, g.name]));
  const used = new Set(saved.values());
  for (const region of regionSet.regions) {
    const retained = saved.get(region.id);
    if (retained) { region.name = retained; continue; }
    const anchor = byId.get(region.medoidId), preferred = formNames[anchor?.family || 'unassigned'];
    const seed = parseInt(signature(region.id), 16);
    const choices = [...preferred.slice(seed % preferred.length), ...preferred.slice(0, seed % preferred.length), ...skyNames];
    let name = choices.find(candidate => !used.has(candidate));
    // Larger directories keep readable names without falling back to group numbers.
    if (!name) {
      const first = preferred[seed % preferred.length];
      const places = ['Cove', 'Field', 'Reach', 'Vale', 'Bay', 'Grove', 'Ridge', 'Garden', 'Basin', 'Harbour'];
      name = places.map(place => `${first} ${place}`).find(candidate => !used.has(candidate)) || `${first} ${signature(region.id).slice(0, 4)}`;
    }
    region.name = name; used.add(name);
  }
}
