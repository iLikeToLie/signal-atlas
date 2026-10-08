"""Train one shared curve-image encoder; select on validation, then freeze and test.

Requires CPU PyTorch and NumPy. No family labels, test-label files, generator
parameters, filenames or quantities enter the network. Instance contrastive
negatives mean different sources, not verified semantic nonmatches.
"""
import copy
import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.ml-deps'))
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

SEED, EPOCHS, TEMPERATURE = 20261008, 60, .08
torch.manual_seed(SEED)
torch.set_num_threads(4)
torch.use_deterministic_algorithms(True)
rng = np.random.default_rng(SEED)
data = json.loads((ROOT / 'artifacts/siamese-input.json').read_text())
rows = data['rows']
for key in ('source', 'component'):
    for group in {r[key] for r in rows}:
        assert len({r['split'] for r in rows if r[key] == group}) == 1

def images(grids):
    # Same 128x32 soft raster as src/vision.ts, with conventional NCHW storage.
    y = (.5 - grids[:, None, :]) * 31
    return np.exp(-.5 * ((np.arange(32)[None, :, None] - y) / 1.5) ** 2).astype('float32')[:, None]

class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 4, (3, 9), stride=(2, 4))
        self.conv2 = nn.Conv2d(4, 8, (3, 5), stride=(2, 2))
        self.projection = nn.Linear(64, 16)

    def forward(self, x):
        x = F.relu(self.conv1(F.pad(F.pad(x, (4, 4, 0, 0), mode='circular'), (0, 0, 1, 1))))
        x = F.relu(self.conv2(F.pad(F.pad(x, (2, 2, 0, 0), mode='circular'), (0, 0, 1, 1))))
        return F.normalize(self.projection(x.mean(dim=3).flatten(1)), dim=1)

model = Encoder()
optimizer = torch.optim.AdamW(model.parameters(), lr=.002, weight_decay=.0001)
train = [r for r in rows if r['split'] == 'train']
train_sources = sorted({r['source'] for r in train})
views = {s: [r for r in train if r['source'] == s] for s in train_sources}
components = {s: views[s][0]['component'] for s in train_sources}
train_images = {r['id']: images(np.asarray([r['grid']]))[0] for r in train}

@torch.no_grad()
def encode(selected):
    model.eval()
    tensors = torch.from_numpy(images(np.asarray([r['grid'] for r in selected])))
    return torch.cat([model(batch) for batch in tensors.split(64)]).numpy()

def retrieval(split, embeddings=None, method='cnn'):
    selected = [r for r in rows if r['split'] == split]
    gallery = [r for r in selected if r['condition'] == 'clean']
    queries = [r for r in selected if r['condition'] != 'clean']
    if method == 'cnn':
        vectors = encode(selected) if embeddings is None else embeddings
        lookup = {r['id']: v for r, v in zip(selected, vectors)}
        scores = np.asarray([lookup[q['id']] for q in queries]) @ np.asarray([lookup[g['id']] for g in gallery]).T
    else:
        a = np.asarray([r['grid'] for r in queries])
        b = np.asarray([r['grid'] for r in gallery])
        best = np.full((len(a), len(b)), np.inf)
        shifts = np.zeros(best.shape, dtype=int)
        for k in range(128):
            distances = np.mean((a[:, None, :] - np.roll(b, -k, axis=1)[None]) ** 2, axis=2)
            improves = distances < best
            shifts[improves] = k
            best = np.minimum(best, distances)
        scores = np.exp(-np.sqrt(best))
        if method == 'overlap':
            ai = images(a)[:, 0]
            for j in range(len(gallery)):
                aligned = np.asarray([np.roll(b[j], -shifts[i, j]) for i in range(len(a))])
                bi = images(aligned)[:, 0]
                scores[:, j] = np.minimum(ai, bi).sum((1, 2)) / np.maximum(ai, bi).sum((1, 2))
    outcomes, positive_scores = [], []
    for i, query in enumerate(queries):
        compatible = np.asarray([g['quantity'] == query['quantity'] for g in gallery])
        candidates = np.where(compatible, scores[i], -np.inf)
        winner = gallery[int(candidates.argmax())]
        correct = winner['source'] == query['source']
        positive_scores.append(float(max(scores[i, j] for j, g in enumerate(gallery) if g['source'] == query['source'] and compatible[j])))
        outcomes.append({'id': query['id'], 'source': query['source'], 'component': query['component'], 'quantity': query['quantity'], 'condition': query['condition'], 'correct': correct, 'winner': winner['id'], 'score': float(candidates.max())})
    return {'recallAt1': sum(r['correct'] for r in outcomes) / len(outcomes), 'queries': len(outcomes), 'gallery': len(gallery), 'byQuantity': {q: np.mean([r['correct'] for r in outcomes if r['quantity'] == q]).item() for q in ('frequency', 'pri')}, 'outcomes': outcomes, 'positiveScores': positive_scores}

history, best, best_epoch = [], -1, 0
for epoch in range(1, EPOCHS + 1):
    model.train()
    order = rng.permutation(train_sources)
    losses = []
    for start in range(0, len(order), 48):
        batch_sources = list(order[start:start + 48])
        pair = [rng.choice(len(views[s]), size=2, replace=False) for s in batch_sources]
        a = torch.from_numpy(np.stack([train_images[views[s][int(p[0])]['id']] for s, p in zip(batch_sources, pair)]))
        b = torch.from_numpy(np.stack([train_images[views[s][int(p[1])]['id']] for s, p in zip(batch_sources, pair)]))
        # Roll observations independently: phase is a nuisance, not a class label.
        a = torch.stack([torch.roll(x, int(rng.integers(128)), dims=-1) for x in a])
        b = torch.stack([torch.roll(x, int(rng.integers(128)), dims=-1) for x in b])
        va, vb = model(a), model(b)
        logits = va @ vb.T / TEMPERATURE
        mask = torch.tensor([[i != j and components[s] == components[t] for j, t in enumerate(batch_sources)] for i, s in enumerate(batch_sources)])
        logits = logits.masked_fill(mask, -1e9)
        target = torch.arange(len(batch_sources))
        loss = (F.cross_entropy(logits, target) + F.cross_entropy(logits.T, target)) / 2
        optimizer.zero_grad(); loss.backward(); optimizer.step()
        losses.append(loss.item())
    if epoch == 1 or epoch % 5 == 0:
        score = retrieval('validation')['recallAt1']
        history.append({'epoch': epoch, 'trainingLoss': float(np.mean(losses)), 'validationRecallAt1': score})
        print(json.dumps(history[-1]), flush=True)
        if score > best:
            best, best_epoch, state = score, epoch, copy.deepcopy(model.state_dict())

model.load_state_dict(state); model.eval()
# Calibration is source retrieval evidence, NOT semantic grouping probability.
calibration = retrieval('calibration')
positive_floor = float(np.quantile(calibration['positiveScores'], .05))
weights = {key: value.detach().numpy().flatten().tolist() for key, value in state.items()}
payload = {'version': 1, 'id': 'siamese-curves-v1', 'seed': SEED, 'datasetSha256': data['corpus'], 'trainingSources': len(train_sources), 'selectedEpoch': best_epoch, 'embeddingSize': 16, 'architecture': 'circular-conv-4x3x9-s2x4/relu/conv-8x3x5-s2x2/relu/width-mean/linear-16/l2', 'suggestedThreshold': max(.01, min(.99, (positive_floor + 1) / 2)), 'thresholdMeaning': '5th percentile of calibration same-source cosine, mapped to [0,1]; not validated for semantic group admission.', 'weights': weights}
model_path = ROOT / 'src/data/siamese-model.json'
model_path.write_text(json.dumps(payload, separators=(',', ':')) + '\n')
model_hash = hashlib.sha256(model_path.read_bytes()).hexdigest()
print(f'Frozen checkpoint {best_epoch}; model SHA-256 {model_hash}. Evaluating untouched test signals now.', flush=True)
test = {method: retrieval('test', method=method) for method in ('formula', 'overlap', 'cnn')}
for result in test.values():
    result.pop('positiveScores')
groups = sorted({r['component'] for r in test['cnn']['outcomes']})
bootstrap_rng = np.random.default_rng(SEED)
deltas = []
for _ in range(1000):
    sample = bootstrap_rng.choice(groups, len(groups), replace=True)
    lookup = {method: {r['id']: r for r in result['outcomes']} for method, result in test.items()}
    ids = [r['id'] for group in sample for r in test['cnn']['outcomes'] if r['component'] == group]
    deltas.append(np.mean([lookup['cnn'][i]['correct'] - lookup['overlap'][i]['correct'] for i in ids]))
fixture_rows = [r for r in rows if r['split'] == 'validation'][:3]
fixture_vectors = encode(fixture_rows)
(ROOT / 'tests/siamese-fixture.json').write_text(json.dumps([{'grid': r['grid'], 'embedding': v.tolist()} for r, v in zip(fixture_rows, fixture_vectors)]))
report = {'protocol': 'same-source-retrieval-v1', 'datasetSha256': data['corpus'], 'modelSha256': model_hash, 'seed': SEED, 'torchVersion': torch.__version__, 'selectedEpoch': best_epoch, 'validationRecallAt1': best, 'history': history, 'test': test, 'pairedChangeVersusOverlap': {'value': test['cnn']['recallAt1'] - test['overlap']['recallAt1'], 'componentBootstrap95': np.quantile(deltas, [.025, .975]).tolist()}, 'limitations': ['Source retrieval with clean test support galleries, not unseen-family classification or semantic grouping accuracy.', 'No family labels used for training or selection; negatives are different instances, not verified semantic dissimilarity.', 'One seed and synthetic data only. Existing production defaults remain classical overlap.', 'All conditions and both quantities from each source/leakage component remain in one split. Test labels and generator ledger were never read.']}
(ROOT / 'models').mkdir(exist_ok=True)
(ROOT / 'models/siamese-evaluation.json').write_text(json.dumps(report, indent=2) + '\n')
summary = {key: report[key] for key in ('protocol', 'datasetSha256', 'modelSha256', 'selectedEpoch')}
summary.update({'queries': test['cnn']['queries'], 'gallery': test['cnn']['gallery'], 'testSources': len({r['source'] for r in rows if r['split'] == 'test'}), 'methods': [{'id': method, 'name': {'formula': 'Formula only', 'overlap': 'Curve overlap', 'cnn': 'Siamese CNN'}[method], **{key: result[key] for key in ('recallAt1', 'byQuantity')}} for method, result in test.items()], 'pairedChange': report['pairedChangeVersusOverlap']})
(ROOT / 'src/data/siamese-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({'selectedEpoch': best_epoch, 'testRecallAt1': {m: r['recallAt1'] for m, r in test.items()}, 'pairedChange': report['pairedChangeVersusOverlap']}), flush=True)
