#!/usr/bin/env python3
"""Verify the shipped synthetic corpus against its manifest. Standard library; MIT."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / 'docs/assets/case'


def check_fixtures(case=CASE):
    case = Path(case)
    data = json.loads((case / 'manifest.json').read_text(encoding='utf-8'))
    errors = []
    if data.get('synthetic') is not True:
        errors.append('Manifest must identify synthetic materials')
    listed = set()
    for entry in data['files']:
        name = entry['path']
        path = case / name
        if name in listed:
            errors.append(f'Duplicate manifest path: {name}')
        listed.add(name)
        if not path.resolve().is_relative_to(case.resolve()):
            errors.append(f'Path outside corpus: {name}')
            continue
        if not path.is_file():
            errors.append(f'Missing asset: {name}')
            continue
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != entry['sha256']:
            errors.append(f'SHA-256 mismatch: {name}')
        if len(content) != entry['bytes']:
            errors.append(f'Byte count mismatch: {name}')
        if entry.get('license') != 'CC-BY-4.0' or not entry.get('origin'):
            errors.append(f'Missing license/origin: {name}')
    actual = {p.relative_to(case).as_posix() for p in case.rglob('*')
              if p.is_file() and p.name not in {'README.md', 'manifest.json'}}
    for name in sorted(actual - listed):
        errors.append(f'Unlisted asset: {name}')
    return {'checked_files': len(listed), 'errors': errors}


def main():
    try:
        result = check_fixtures()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'Fixture check failed: {exc}', file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return bool(result['errors'])


if __name__ == '__main__':
    sys.exit(main())
