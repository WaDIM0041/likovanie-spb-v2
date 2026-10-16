"""Package the ready-to-serve site; keep source archives and credentials out."""
import argparse
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zipfile import ZIP_DEFLATED, ZipFile


def package(destination):
    root = Path(__file__).resolve().parents[1]
    files = {
        'index.html', 'robots.txt', 'design/style.css', 'design/stage.css',
        'design/experience.css', 'design/motion-bundle.js',
        'design/ribbon-webgl-bundle.js', 'design/v2-experience.js',
        'design/reference-effects.css', 'design/reference-effects.js',
        'design/privacy.html', 'design/soglasie.html', 'design/materials.html',
    }
    media_extensions = {'.svg', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.woff', '.woff2', '.mp4', '.webm'}
    for folder in ['design/fonts', 'research/assets', 'research/videos']:
        for path in (root / folder).rglob('*'):
            if path.is_file() and (path.suffix.lower() in media_extensions or path.name == 'OFL.txt'):
                files.add(path.relative_to(root).as_posix())

    def check_reference(base, reference):
        parsed = urlsplit(reference)
        if not parsed.path or parsed.scheme or parsed.netloc:
            return
        resolved = (base.parent / unquote(parsed.path)).resolve()
        relative = resolved.relative_to(root).as_posix()
        if relative not in files:
            raise ValueError(f'{base.relative_to(root)}: missing packaged resource {reference}')

    class References(HTMLParser):
        def __init__(self, base):
            super().__init__()
            self.base = base

        def handle_starttag(self, tag, attributes):
            for name, value in attributes:
                if name in {'src', 'href', 'poster', 'data-src'} and value:
                    check_reference(self.base, value)
                elif name == 'srcset' and value:
                    for source in value.split(','):
                        check_reference(self.base, source.strip().split()[0])

    for name in files:
        path = root / name
        if path.suffix == '.html':
            References(path).feed(path.read_text())
        elif path.suffix == '.css':
            for reference in re.findall(r'url\([\'\"]?([^\)\'\"]+)', path.read_text()):
                check_reference(path, reference)

    assert 'noindex' in (root / 'index.html').read_text(), 'temporary host must retain noindex'
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
        for name in sorted(files):
            archive.write(root / name, name)
    with ZipFile(destination) as archive:
        assert archive.testzip() is None, 'archive checksum validation failed'
        assert 'index.html' in archive.namelist(), 'index must be at the archive root'
    manifest = {
        'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
        'archive_sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
        'files': [{'path': name, 'sha256': hashlib.sha256((root / name).read_bytes()).hexdigest()} for name in sorted(files)],
    }
    destination.with_suffix('.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f'Hosting package: {destination}; {len(files)} files; {destination.stat().st_size / 1024**2:.1f} MiB; local references and ZIP checksums verified')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    package(args.destination.resolve())
