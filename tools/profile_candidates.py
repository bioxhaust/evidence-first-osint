#!/usr/bin/env python3
"""Compare synthetic profile candidates locally; never send network requests. MIT."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

MAX_BYTES = 2 * 1024 * 1024


def canonical_url(value):
    """Only normalize host case and remove fragments in the .example fixture."""
    if not isinstance(value, str) or not value or any(ch.isspace() for ch in value):
        raise ValueError('URL must be a nonempty string without whitespace')
    parts = urlsplit(value)
    hostname = parts.hostname
    if (parts.scheme != 'https' or not hostname or not hostname.endswith('.example')
            or parts.username is not None or parts.password is not None
            or parts.port is not None or parts.query or not parts.path):
        raise ValueError('Only HTTPS .example profile URLs without credentials, ports or queries are accepted')
    return urlunsplit(('https', hostname.lower(), parts.path, '', ''))


def require_object(data, name):
    if (not isinstance(data, dict) or data.get('synthetic') is not True
            or type(data.get('schema_version')) is not int or data['schema_version'] != 1):
        raise ValueError(f'{name}: expected synthetic schema version 1')


def nonempty_string(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'{name}: expected a nonempty string')
    return value


def compare(scanner, corpus):
    require_object(scanner, 'scanner')
    require_object(corpus, 'corpus')
    anchor = corpus.get('anchor')
    if not isinstance(anchor, dict) or anchor.get('ownership_basis') != 'stipulated_by_exercise':
        raise ValueError('The synthetic anchor must be explicitly stipulated by the exercise')
    anchor_id = nonempty_string(anchor.get('source_id'), 'anchor source_id')
    canonical_url(anchor.get('url'))
    self_links = anchor.get('self_links')
    if not isinstance(self_links, list):
        raise ValueError('anchor self_links must be a list')
    linked = {canonical_url(url) for url in self_links}
    profiles = corpus.get('profiles')
    if not isinstance(profiles, list):
        raise ValueError('profiles must be a list')
    profile_by_id = {}
    for profile in profiles:
        if not isinstance(profile, dict):
            raise ValueError('profile must be an object')
        pid = nonempty_string(profile.get('profile_id'), 'profile_id')
        if pid in profile_by_id:
            raise ValueError('duplicate profile_id in corpus')
        profile_by_id[pid] = (canonical_url(profile.get('url')), profile)
    results = scanner.get('results')
    if not isinstance(results, list):
        raise ValueError('results must be a list')
    groups, ledger, seen_ids = {}, [], set()
    for row_number, row in enumerate(results, 1):
        if not isinstance(row, dict):
            raise ValueError('scanner row must be an object')
        result_id = nonempty_string(row.get('result_id'), 'result_id')
        if result_id in seen_ids:
            raise ValueError('duplicate result_id; retain distinct observation IDs')
        seen_ids.add(result_id)
        status = row.get('status')
        if status not in {'found', 'not_found', 'error'}:
            raise ValueError('scanner status must be found, not_found or error')
        url = canonical_url(row.get('url'))
        pid = nonempty_string(row.get('profile_id'), 'scanner profile_id')
        if pid not in profile_by_id or profile_by_id[pid][0] != url:
            raise ValueError('scanner profile_id and URL do not match the corpus')
        duplicate = url in groups
        group = groups.setdefault(url, {'profile_id': pid, 'statuses': set(), 'result_ids': []})
        if group['profile_id'] != pid:
            raise ValueError('same URL has conflicting profile identifiers')
        group['statuses'].add(status)
        group['result_ids'].append(result_id)
        ledger.append({'row': row_number, 'result_id': result_id,
                       'canonical_url': url, 'decision': 'duplicate_url' if duplicate else 'new_url',
                       'raw': dict(row)})
    candidates = []
    for url, group in groups.items():
        statuses = group['statuses']
        profile = profile_by_id[group['profile_id']][1]
        if len(statuses) != 1:
            classification, reason = 'unknown', 'Conflicting scan observations require manual review.'
        elif statuses != {'found'}:
            classification, reason = 'unknown', 'Error or unverified not_found does not establish absence.'
        elif url in linked:
            classification, reason = 'corroborated', 'The stipulated hub links to this profile; only a declared relationship is supported.'
        else:
            classification, reason = 'candidate', 'A matching username is a lead; no stipulated self-link supports merging.'
        candidates.append({'profile_id': group['profile_id'], 'url': url,
                           'classification': classification, 'reason': reason,
                           'result_ids': group['result_ids'],
                           'profile_source': profile.get('source_id'),
                           'anchor_source': anchor_id if url in linked else None})
    counts = Counter(candidate['classification'] for candidate in candidates)
    return {'synthetic': True, 'network_requests': 0,
            'summary': {'input_rows': len(results), 'unique_profiles': len(candidates),
                        'corroborated': counts['corroborated'], 'candidate': counts['candidate'],
                        'unknown': counts['unknown']},
            'candidates': candidates, 'ledger': ledger,
            'limitation': 'Classification is only for the stipulated synthetic corpus. It does not prove legal identity, current ownership or real-world absence.'}


def read_json(path):
    with Path(path).open('rb') as handle:
        raw = handle.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError('Input exceeds the 2 MiB exercise limit')
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def analyze(scanner_path, profiles_path):
    scanner, scanner_hash = read_json(scanner_path)
    corpus, corpus_hash = read_json(profiles_path)
    result = compare(scanner, corpus)
    result['input_sha256'] = {'scanner_results': scanner_hash, 'profiles': corpus_hash}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('scanner_results', type=Path, help='Local synthetic scanner-results.json')
    parser.add_argument('profiles', type=Path, help='Local synthetic profiles.json')
    args = parser.parse_args()
    try:
        result = analyze(args.scanner_results, args.profiles)
    except (OSError, ValueError, TypeError) as exc:
        parser.exit(2, f'Error: {exc}\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
