"""Fetch pinned upstream source and retain source/build files for redistribution."""
import hashlib
import json
import pathlib
import tarfile
import urllib.request
import zipfile
import io

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / '.research' / 'zotero10'
PINS = {
    'worker': ('document-worker', '8fb70af4000873561c82b2f4eb88be190efb9979', 'document-worker'),
    'pdfjs': ('pdf.js', 'f4d05caed86bd38f6ccd2171dbbd5cb832d72912', 'document-worker/pdf.js'),
    'sdt': ('structured-document-text', '7963c11faac4595be3bbe86b7574704a22c67bed', 'document-worker/structured-document-text'),
    'reader': ('reader', '5802d14a76552e10000124d2431e352e92054f01', 'reader'),
}
DOWNLOADS.mkdir(parents=True, exist_ok=True)
records = {}
for key, (repo, commit, target) in PINS.items():
    archive = DOWNLOADS / f'{key}-source.zip'
    url = f'https://codeload.github.com/zotero/{repo}/zip/{commit}'
    if not archive.exists():
        urllib.request.urlretrieve(url, archive)
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            relative = pathlib.PurePosixPath(*entry.filename.split('/')[1:])
            # Test PDFs and demo documents are not needed to build the distributed code.
            if entry.is_dir() or not relative.parts or relative.parts[0] in {'test', 'tests', 'demo', 'examples', '.github'}:
                continue
            if '..' in relative.parts or relative.is_absolute():
                raise ValueError('Unsafe archive path')
            path = ROOT / 'vendor' / 'upstream-sources' / target / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(source.read(entry))
    records[repo] = {'commit': commit, 'url': url, 'archiveSHA256': hashlib.sha256(archive.read_bytes()).hexdigest()}

# Preserve the exact license notices of the npm modules included in the native worker.
worker = ROOT / 'vendor/upstream-sources/document-worker'
lock = json.loads((worker / 'package-lock.json').read_text(encoding='utf-8'))['packages']
modules = ['dom-serializer', 'domelementtype', 'domhandler', 'domutils', 'entities',
           'fastest-levenshtein', 'fflate', 'htmlparser2', 'pako']
for module in modules:
    entry = lock[f'node_modules/{module}']
    archive = DOWNLOADS / f'{module}-{entry["version"]}.tgz'
    if not archive.exists():
        urllib.request.urlretrieve(entry['resolved'], archive)
    with tarfile.open(archive, 'r:gz') as source:
        for member in source.getmembers():
            if not member.isfile() or not any(word in pathlib.PurePosixPath(member.name).name.lower() for word in ['license', 'copying', 'notice']):
                continue
            path = ROOT / 'licenses' / module / pathlib.PurePosixPath(member.name).name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(source.extractfile(member).read())
for name in ['LICENSE', 'ThirdPartyNotices.txt']:
    path = ROOT / 'licenses' / 'onnxruntime' / name
    path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(f'https://raw.githubusercontent.com/microsoft/onnxruntime/v1.27.0/{name}', path)
(ROOT / 'vendor' / 'sources.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')
print('Prepared pinned sources and third-party notices.')
