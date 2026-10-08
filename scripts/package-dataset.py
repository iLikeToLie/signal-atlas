"""Create and verify a deterministic ZIP of the audited CSV corpus."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parents[1] / 'datasets' / 'signal-shapes-v1'
assert json.loads((root / 'independent-audit.json').read_text())['status'] == 'PASS'
sha = lambda data: hashlib.sha256(data).hexdigest()
paths = sorted(path for path in root.rglob('*') if path.is_file() and path.name != 'package-integrity.json')
integrity = {path.relative_to(root).as_posix(): sha(path.read_bytes()) for path in paths}
(root / 'package-integrity.json').write_text(json.dumps(integrity, indent=2) + '\n', encoding='utf-8')
paths.append(root / 'package-integrity.json')
archive = root.with_suffix('.zip')
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as out:
    for path in sorted(paths):
        info = ZipInfo(f'{root.name}/{path.relative_to(root).as_posix()}', (2026, 10, 7, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        out.writestr(info, path.read_bytes(), compresslevel=9)
with ZipFile(archive) as check:
    assert check.testzip() is None
    for relative, expected in integrity.items():
        assert sha(check.read(f'{root.name}/{relative}')) == expected
checksum = sha(archive.read_bytes())
archive.with_suffix('.zip.sha256').write_text(f'{checksum}  {archive.name}\n', encoding='utf-8')
print(json.dumps({'archive': str(archive), 'files': len(paths), 'bytes': archive.stat().st_size, 'sha256': checksum, 'archive_integrity': 'PASS'}, indent=2))
