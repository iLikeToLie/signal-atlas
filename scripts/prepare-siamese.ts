import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseImport } from '../src/importExport.ts';
import { phaseGrid } from '../src/signal.ts';

// Feature extraction deliberately never opens the test label file or source ledger.
const root = 'datasets/signal-shapes-v1';
const lines = readFileSync(`${root}/manifest.csv`, 'utf8').trim().split('\n');
const columns = lines.shift()!.split(',');
const rows = lines.map(line => {
  const cells = [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m => m[1].replaceAll('""', '"'));
  const row = Object.fromEntries(columns.map((key, i) => [key, cells[i]]));
  const entry = parseImport(readFileSync(`${root}/${row.relative_path}`, 'utf8'), row.relative_path);
  return { id: row.signal_id, source: row.source_id, component: row.leakage_group_id, split: row.split, quantity: row.quantity, condition: row.condition, grid: phaseGrid(entry) };
});
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/siamese-input.json', JSON.stringify({ corpus: JSON.parse(readFileSync(`${root}/validation-report.json`, 'utf8')).corpusSha256, rows }));
console.log(`Prepared ${rows.length} normalized curves with the app's exact preprocessing; no family labels.`);
