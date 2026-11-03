#!/usr/bin/env python3
"""Build the static course for a deployment URL. Never builds into source folders."""
import argparse
import json
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

from mkdocs.config import load_config
from mkdocs.commands.build import build

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-url', default='https://bioxhaust.github.io/evidence-first-osint/')
    parser.add_argument('--output', type=Path, default=ROOT / 'site')
    args = parser.parse_args()
    url = urlsplit(args.site_url)
    if url.scheme not in {'http', 'https'} or not url.netloc or not url.path.endswith('/') or url.query or url.fragment:
        parser.error('--site-url must be an HTTP(S) URL ending in / without query or fragment')
    output = args.output.resolve()
    if output != ROOT / 'site' and not (output.is_relative_to(ROOT / 'scratch') and output != ROOT / 'scratch'):
        parser.error('--output must be site/ or a subdirectory of scratch/')
    config = load_config(config_file=str(ROOT / 'mkdocs.yml'), strict=True,
                         site_url=args.site_url, site_dir=str(output))
    build(config)
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    metadata = {'commit': revision, 'dirty': dirty, 'site_url': args.site_url}
    (output / 'version.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(output), **metadata}))


if __name__ == '__main__':
    main()
