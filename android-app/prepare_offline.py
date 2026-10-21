"""Package the exact checked-out web files; fail the build on missing dependencies."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.parse import urlsplit
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parent.parent
REMOTE = {
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js': 'vendor/supabase.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js': 'vendor/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css': 'vendor/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js': 'vendor/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js': 'vendor/pdf.worker.min.js',
}
for name in ('layers.png', 'layers-2x.png', 'marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png'):
    REMOTE['https://unpkg.com/leaflet@1.9.4/dist/images/' + name] = 'vendor/images/' + name


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_apk(filename):
    with zipfile.ZipFile(filename) as apk:
        receipt = json.loads(apk.read('assets/site/offline-manifest.json'))
        for path, expected in receipt['files'].items():
            data = apk.read('assets/site/' + path)
            assert digest(data) == expected, 'APK asset mismatch: ' + path
            if (ROOT / path).is_file():
                assert data == (ROOT / path).read_bytes(), 'Web/APK mismatch: ' + path
        for path in receipt['remote'].values():
            assert path in receipt['files'], 'Missing offline dependency: ' + path
        assert 'index.html' in receipt['files'] and 'v2.0-fixes.js' in receipt['files']
        print('APK verified: %s exact web/dependency files, commit %s' % (len(receipt['files']), receipt['commit']))


def prepare(destination):
    destination = Path(destination)
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    files = {}
    for source in sorted(ROOT.iterdir()):
        if source.suffix not in ('.html', '.js', '.css', '.png', '.svg', '.webmanifest'):
            continue
        if source.name.startswith('_'):
            continue  # Server code is never bundled into the client.
        data = source.read_bytes()
        (destination / source.name).write_bytes(data)
        files[source.name] = digest(data)
    for url, name in REMOTE.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        for attempt in range(3):
            try:
                with urlopen(url, timeout=45) as response:
                    data = response.read()
                if not data or data.lstrip().lower().startswith(b'<!doctype html'):
                    raise ValueError('Invalid dependency: ' + url)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1)
        target.write_bytes(data)
        files[name] = digest(data)
    html = (destination / 'index.html').read_text()
    for ref in re.findall(r'(?:src|href)=["\']([^"\']+)', html):
        parsed = urlsplit(ref)
        if parsed.scheme in ('http', 'https'):
            assert ref in REMOTE, 'Unbundled external reference: ' + ref
        elif not parsed.scheme and parsed.path:
            assert parsed.path.lstrip('./') in files, 'Missing local reference: ' + ref
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    receipt = dict(commit=commit, files=files, remote=REMOTE)
    (destination / 'offline-manifest.json').write_text(json.dumps(receipt, sort_keys=True, indent=2))
    icon = ROOT / 'android-app/app/src/main/res/drawable/app_boi.png'
    icon.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / 'app-boi-512.png', icon)
    print('Prepared %s exact web/dependency files from %s' % (len(files), commit))


if __name__ == '__main__':
    if sys.argv[1] == '--verify-apk':
        verify_apk(sys.argv[2])
    else:
        prepare(sys.argv[1])
