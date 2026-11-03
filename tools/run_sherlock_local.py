#!/usr/bin/env python3
"""Run the installed Sherlock 0.16.2 CLI against the fixed localhost fixture. MIT.

This teaching launcher is not an upstream Sherlock option or a system sandbox.
It constrains Requests' send path, including redirects, and disables environment
proxies for this pinned CLI. No usernames or external databases are accepted.
"""
import argparse
from importlib.metadata import version, PackageNotFoundError
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'docs/assets/profiles/sherlock-local-sites.json'


def is_fixture_url(url):
    parts = urlsplit(url)
    return (parts.scheme == 'http' and parts.hostname == '127.0.0.1'
            and parts.port == 54369 and parts.username is None and parts.password is None)


def validate_config():
    data = json.loads(CONFIG.read_text())
    if not data or not isinstance(data, dict):
        raise ValueError('Local sites configuration is invalid')
    for name, entry in data.items():
        if not name.startswith('SYNTHETIC ') or not isinstance(entry, dict):
            raise ValueError('Only named synthetic fixture sites are accepted')
        if not is_fixture_url(entry.get('urlMain', '')) or not is_fixture_url(entry.get('url', '').replace('{}', 'route_lab')):
            raise ValueError('Local sites configuration contains a non-fixture URL')
        if entry.get('url', '').count('{}') != 1:
            raise ValueError('Every fixture URL must contain one username slot')
    return data


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    try:
        if version('sherlock-project') != '0.16.2':
            raise ValueError('This tested exercise requires sherlock-project==0.16.2')
        validate_config()
    except (PackageNotFoundError, ValueError, OSError) as exc:
        raise SystemExit(f'Cannot run local exercise: {exc}')
    import requests
    original_send = requests.sessions.Session.send
    request_counts = {"local": 0, "blocked": 0}

    def guarded_send(self, request, **kwargs):
        if not is_fixture_url(request.url):
            request_counts['blocked'] += 1
            raise requests.RequestException('Teaching guard blocked a non-local request before network access')
        request_counts['local'] += 1
        kwargs['proxies'] = {}  # Ignore HTTP(S)_PROXY inherited from the environment.
        return original_send(self, request, **kwargs)

    requests.sessions.Session.send = guarded_send
    try:
        from sherlock_project.sherlock import main as sherlock_main
        sys.argv = ['sherlock', '--json', str(CONFIG), '--timeout', '0.25',
                    '--print-all', '--no-color', '--ignore-exclusions', 'route_lab']
        sherlock_main()
    finally:
        requests.sessions.Session.send = original_send
        print(f"LOCAL_GUARD local_requests={request_counts['local']} blocked_external_attempts={request_counts['blocked']}")


if __name__ == '__main__':
    main()
