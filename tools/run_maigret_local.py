#!/usr/bin/env python3
"""Run Maigret 0.6.6 on four synthetic localhost pages and export JSON + CSV.

The teaching guard constrains Python socket connections for this pinned path.
It is not a system sandbox and must not be generalized to arbitrary programs.
Original launcher MIT; upstream Maigret remains a separate installed package.
"""
import argparse
import asyncio
from contextlib import contextmanager
from importlib.metadata import PackageNotFoundError, version
import hashlib
import json
import os
from pathlib import Path
import socket
import sys
from urllib.parse import urlsplit
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'docs/assets/profiles/maigret-local-sites.json'
HOST, PORT = '127.0.0.1', 54369
NAMES = {'SYNTHETIC Present', 'SYNTHETIC Soft404', 'SYNTHETIC Missing', 'SYNTHETIC Slow'}
ALLOWED_FIELDS = {'url', 'urlMain', 'usernameClaimed', 'usernameUnclaimed',
                  'checkType', 'presenseStrs', 'absenceStrs', 'tags', 'requestHeadOnly'}


def is_fixture_url(url):
    try:
        parts = urlsplit(url)
        return (parts.scheme == 'http' and parts.hostname == HOST and parts.port == PORT
                and parts.username is None and parts.password is None)
    except (ValueError, TypeError):
        return False


def validate_config(data):
    if not isinstance(data, dict) or set(data) != {'sites', 'engines', 'tags'}:
        raise ValueError('Expected the fixed synthetic Maigret database')
    if (data['engines'] != {} or data['tags'] != ['synthetic']
            or not isinstance(data['sites'], dict) or set(data['sites']) != NAMES):
        raise ValueError('Expected exactly four synthetic sites without external engines')
    for name, site in data['sites'].items():
        if not isinstance(site, dict) or not set(site).issubset(ALLOWED_FIELDS):
            raise ValueError(f'Unexpected site fields: {name}')
        url = site.get('url', '')
        if (not isinstance(url, str) or url.count('{username}') != 1
                or not is_fixture_url(url.replace('{username}', 'route_lab'))):
            raise ValueError(f'Non-fixture profile URL: {name}')
        if not is_fixture_url(site.get('urlMain', '')):
            raise ValueError(f'Non-fixture main URL: {name}')
        if site.get('checkType') not in {'message', 'status_code'}:
            raise ValueError(f'Unexpected detection method: {name}')
    return data


@contextmanager
def local_socket_guard():
    """Constrain Python TCP connects and resolution; restore all changes on exit."""
    counts = {'allowed_connections': 0, 'blocked_connections': 0, 'blocked_dns': 0}
    real_connect, real_connect_ex = socket.socket.connect, socket.socket.connect_ex
    real_getaddrinfo = socket.getaddrinfo

    def checked_connect(sock, address, original):
        if sock.family != socket.AF_INET or address != (HOST, PORT):
            counts['blocked_connections'] += 1
            raise OSError('Teaching guard blocked a non-fixture Python socket connection')
        counts['allowed_connections'] += 1
        return original(sock, address)

    def checked_getaddrinfo(host, port, *args, **kwargs):
        if host != HOST or str(port) != str(PORT):
            counts['blocked_dns'] += 1
            raise socket.gaierror('Teaching guard blocked non-fixture resolution')
        return real_getaddrinfo(host, port, *args, **kwargs)

    with patch.object(socket.socket, 'connect', lambda sock, address: checked_connect(sock, address, real_connect)), \
            patch.object(socket.socket, 'connect_ex', lambda sock, address: checked_connect(sock, address, real_connect_ex)), \
            patch.object(socket, 'getaddrinfo', checked_getaddrinfo):
        yield counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=CONFIG,
                        help='Fixed course database or a validated copy inside scratch/')
    parser.add_argument('--output', type=Path, default=ROOT / 'scratch/maigret-run-01',
                        help='New output directory inside this repository scratch/')
    args = parser.parse_args()
    try:
        if version('maigret') != '0.6.6':
            raise ValueError('This tested exercise requires maigret==0.6.6')
        database = args.database.resolve()
        if database != CONFIG or not database.is_file():
            if not database.is_relative_to(ROOT / 'scratch'):
                raise ValueError('An edited database must be a local copy inside scratch/')
        database_bytes = database.read_bytes()
        validate_config(json.loads(database_bytes))
        output = args.output.resolve()
        if not output.is_relative_to(ROOT / 'scratch') or output == ROOT / 'scratch':
            raise ValueError('Output must be a new directory inside scratch/')
        output.mkdir(parents=True, exist_ok=False)
    except (PackageNotFoundError, ValueError, OSError) as exc:
        raise SystemExit(f'Cannot run local exercise: {exc}')

    cli = ['maigret', 'route_lab', '--db', str(database), '--no-autoupdate',
           '--no-recursion', '--no-extracting', '--dns-resolver', 'threaded',
           '--timeout', '0.25', '--retries', '0', '--max-connections', '4',
           '--print-not-found', '--print-errors', '--no-color', '--no-progressbar',
           '--json', 'simple', '--csv', '--folderoutput', str(output)]
    # Do not inherit proxy environment or personal/system settings. Only bundled
    # defaults and the fixed CLI above are used; package files stay unchanged.
    clean_env = {key: value for key, value in os.environ.items() if not key.lower().endswith('_proxy')}
    with patch.dict(os.environ, clean_env, clear=True), local_socket_guard() as counts:
        import maigret.settings as settings_module
        from maigret.maigret import main as maigret_main
        bundled_settings = str(Path(settings_module.__file__).parent / 'resources/settings.json')
        try:
            with patch.object(settings_module, 'SETTINGS_FILES_PATHS', [bundled_settings]), \
                    patch.object(sys, 'argv', cli):
                print('SYNTHETIC LOCAL RUN: four pages, route_lab; no real platform search.', flush=True)
                asyncio.run(maigret_main())
        finally:
            summary = {'synthetic': True, 'maigret_version': '0.6.6',
                       'python_version': sys.version.split()[0], 'socket_guard': counts,
                       'database_sha256': hashlib.sha256(database_bytes).hexdigest(),
                       'scope': 'Python sockets only; not a system sandbox',
                       'cli_arguments': [arg.replace(str(ROOT) + '/', '') for arg in cli]}
            (output / 'local-run.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print('LOCAL_GUARD ' + json.dumps(counts), flush=True)
            print(f'Reports: {output}', flush=True)


if __name__ == '__main__':
    main()
