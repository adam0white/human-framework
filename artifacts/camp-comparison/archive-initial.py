"""Losslessly package original run files; verify Git and archive bytes before removing checkout duplicates."""
from pathlib import Path
import gzip, hashlib, io, json, subprocess, tarfile
base = Path('artifacts/camp-comparison')
source = '2a1eaef'
names = ['first-node26', 'first-node22', 'reserved-first-node26', 'reserved-first-node22']
archive_dir = base / 'initial-archives'
archive_dir.mkdir(exist_ok=True)
sha = lambda data: hashlib.sha256(data).hexdigest()
archives, removable = {}, []
for name in names:
    files = sorted((base / name).glob('*.json'))
    destination = archive_dir / (name + '.tar.gz')
    manifest = {}
    with destination.open('xb') as raw:
        with gzip.GzipFile(fileobj=raw, mode='wb', mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode='w') as archive:
                for path in files:
                    data = path.read_bytes()
                    original = subprocess.check_output(['git', 'show', f'{source}:{path.as_posix()}'])
                    assert data == original, f'Changed original evidence: {path}'
                    entry = f'{name}/{path.name}'
                    info = tarfile.TarInfo(entry)
                    info.size, info.mtime, info.mode = len(data), 0, 0o644
                    archive.addfile(info, io.BytesIO(data))
                    manifest[entry] = {'sha256': sha(data), 'bytes': len(data)}
                    if path.name not in ['manifest.json', 'replay.json']:
                        removable.append(path)
    with tarfile.open(destination, 'r:gz') as archive:
        assert set(archive.getnames()) == set(manifest)
        for entry, expected in manifest.items():
            data = archive.extractfile(entry).read()
            assert sha(data) == expected['sha256'] and len(data) == expected['bytes']
    archives[destination.name] = {'sha256': sha(destination.read_bytes()), 'bytes': destination.stat().st_size, 'files': manifest}
result = {'format': 'camp-comparison-archive-1', 'originalEvidenceCommit': source,
          'originalGitObjectsAndManifestsPreserved': True, 'archives': archives}
with (archive_dir / 'manifest.json').open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
for path in removable:
    path.unlink()
print(json.dumps({'archivedFiles': sum(len(a['files']) for a in archives.values()),
                  'removedCheckoutDuplicates': len(removable),
                  'compressedBytes': sum(a['bytes'] for a in archives.values())}))
