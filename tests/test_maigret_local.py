"""Checks that accidental fixture edits cannot broaden the Maigret lab scope."""
import importlib.util
import json
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('maigret_local', ROOT / 'tools/run_maigret_local.py')
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


class MaigretLocalScopeTests(unittest.TestCase):
    def data(self):
        return json.loads(local.CONFIG.read_text())

    def test_database_and_offsite_or_extra_instructions(self):
        local.validate_config(self.data())
        for field, value in [('url', 'https://example.com/{username}'),
                             ('urlMain', 'http://127.0.0.1:80'),
                             ('activation', {'url': 'https://example.com'})]:
            with self.subTest(field=field):
                data = self.data()
                data['sites']['SYNTHETIC Present'][field] = value
                with self.assertRaises(ValueError):
                    local.validate_config(data)

    def test_guard_blocks_python_connections_and_restores(self):
        original_connect, original_resolve = socket.socket.connect, socket.getaddrinfo
        with socket.socket() as sock, local.local_socket_guard() as counts:
            for address in [('203.0.113.1', 80), ('127.0.0.1', 54370)]:
                for connect in [sock.connect, sock.connect_ex]:
                    with self.assertRaises(OSError):
                        connect(address)
            with self.assertRaises(socket.gaierror):
                socket.getaddrinfo('example.com', 80)
            self.assertEqual(counts['blocked_connections'], 4)
            self.assertEqual(counts['blocked_dns'], 1)
        self.assertIs(socket.socket.connect, original_connect)
        self.assertIs(socket.getaddrinfo, original_resolve)

    def test_allowed_fixture_connect_reaches_original(self):
        with patch.object(socket.socket, 'connect', return_value=None) as connect:
            with socket.socket() as sock, local.local_socket_guard() as counts:
                sock.connect(('127.0.0.1', 54369))
                self.assertEqual(counts['allowed_connections'], 1)
            connect.assert_called_once_with(sock, ('127.0.0.1', 54369))


if __name__ == '__main__':
    unittest.main()
