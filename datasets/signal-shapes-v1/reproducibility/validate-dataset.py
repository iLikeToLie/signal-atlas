"""Independent standard-library audit of the generated, unified CSV corpus."""
import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'datasets' / 'signal-shapes-v1'
rows = list(csv.DictReader((root / 'manifest.csv').open(encoding='utf-8', newline='')))
labels = list(csv.DictReader((root / 'test_labels.csv').open(encoding='utf-8', newline='')))
sha = lambda value: hashlib.sha256(value).hexdigest()
assert len(rows) == 2304
assert len({row['signal_id'] for row in rows}) == len(rows)
assert not {'family_label', 'generator_form', 'expected_region', 'cluster_label'} & set(rows[0])
source_splits, component_splits, source_views = defaultdict(set), defaultdict(set), defaultdict(set)
paths, sizes, ranges = set(), [], defaultdict(list)
for row in rows:
    path = root / row['relative_path']
    assert path.resolve().is_relative_to(root.resolve())
    raw = path.read_bytes()
    assert sha(raw) == row['sha256'], path
    paths.add(path.resolve())
    sizes.append(len(raw))
    metadata, data = {}, []
    for line in raw.decode().splitlines():
        if line.startswith('#'):
            key, _, value = line[1:].partition(':')
            metadata[key.strip()] = value.strip()
        elif line.strip():
            data.append(line)
    assert data[0] == 't,f'
    samples = [tuple(map(float, pair)) for pair in csv.reader(data[1:])]
    assert len(samples) == int(row['sample_count'])
    assert all(len(pair) == 2 and all(map(math.isfinite, pair)) for pair in samples)
    assert metadata['source'] == 'synthetic'
    assert metadata['quantity'] == row['quantity']
    assert metadata['time_unit'] == 'tu'
    assert metadata['frequency_unit'] == ('tu' if row['quantity'] == 'pri' else 'fu')
    assert metadata['sampling'] == 'closed-endpoint'
    period = float(metadata['period'])
    assert samples[0][0] == 0 and samples[-1][0] == period
    assert samples[0][1] == samples[-1][1]
    assert all(a[0] < b[0] for a, b in zip(samples, samples[1:]))
    assert len({f for _, f in samples}) > 1
    if row['quantity'] == 'pri':
        assert min(f for _, f in samples) > 0
    assert len(raw) < 2_000_000
    assert 'generator_form' not in metadata and 'family' not in metadata
    source_splits[row['source_id']].add(row['split'])
    component_splits[row['leakage_group_id']].add(row['split'])
    source_views[row['source_id']].add((row['quantity'], row['condition']))
    ranges['period'].append(period)
    ranges['observed_excursion'].append(float(row['excursion']))

expected_views = {(q, c) for q in ('frequency', 'pri') for c in ('clean', 'noisy', 'sparse-jittered')}
assert all(len(splits) == 1 for splits in source_splits.values())
assert all(len(splits) == 1 for splits in component_splits.values())
assert all(views == expected_views for views in source_views.values())
assert len(source_splits) == 384
assert {p.resolve() for p in (root / 'signals').rglob('*.csv')} == paths
assert len({label['signal_id'] for label in labels}) == len(labels)
assert {label['signal_id'] for label in labels} == {row['signal_id'] for row in rows if row['split'] == 'test'}
assert {row['quantity'] for row in rows} == {'frequency', 'pri'}
ledger = json.loads((root / 'reproducibility' / 'source-ledger.json').read_text())
for source in ledger:
    assert source_splits[source['source_id']] == {source['split']}
    assert component_splits[source['leakage_group_id']] == {source['split']}
    if source['construction_stratum'] == 'unfamiliar-test-only-family':
        assert source['split'] == 'test'

checksums = (root / 'SHA256SUMS.txt').read_text()
for line in checksums.splitlines():
    expected, relative = line.split('  ', 1)
    assert sha((root / relative).read_bytes()) == expected, relative
generation = json.loads((root / 'validation-report.json').read_text())
assert sha(checksums.encode()) == generation['corpusSha256']
assert generation['nearDuplicateAudit']['closePairsAcrossFinalSplits'] == 0
result = {
    'status': 'PASS', 'signals': len(rows), 'sources': len(source_splits),
    'independent_leakage_components': len(component_splits), 'test_labels': len(labels),
    'split_signals': dict(Counter(row['split'] for row in rows)),
    'quantity_signals': dict(Counter(row['quantity'] for row in rows)),
    'condition_signals': dict(Counter(row['condition'] for row in rows)),
    'max_csv_bytes': max(sizes), 'numeric_ranges': {key: [min(values), max(values)] for key, values in ranges.items()},
    'corpus_sha256': generation['corpusSha256'],
    'checks': ['all signal CSV checksums', 'strict cycle boundaries and timestamps', 'positive PRI', 'one split per source and leakage component', 'all six source views', 'labels only for test signals', 'no missing or extra signal files', 'test-only generator forms remain withheld'],
}
(root / 'independent-audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
