import { expandedTrajectory, families, generateCatalogue, makeEntry } from './catalogue.ts';

// Paired synthetic attributes: stable signal IDs, independently generated pulse timing.
// Continuous interval trajectories illustrate PRI agility; they are not detected pulse timestamps.
export function generatePriCatalogue() {
  return generateCatalogue().map((frequency, i) => {
    const familyIndex = families.findIndex(f => f.id === frequency.family);
    const family = families[(familyIndex + 3) % 8].id;
    const shape = (Number(frequency.parameters.shapeIndex ?? frequency.parameters.variant ?? i) + familyIndex * 5) % 28;
    const entry = makeEntry(frequency.id, `PRI · ${frequency.name}`, family,
      frequency.period * 10, .02 * frequency.excursion, .08,
      p => expandedTrajectory(family, p, shape),
      { shapeIndex: shape, pairedSignal: frequency.id, pulseModel: 'continuous periodic interval trajectory' });
    entry.quantity = 'pri'; entry.units.frequency = 'tu';
    entry.provenance.generator = 'atlas-pri';
    return entry;
  });
}
