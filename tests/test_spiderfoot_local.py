"""Verify the local SpiderFoot adapter's accidental-network guard. MIT."""
import importlib.util
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('spiderfoot_local',ROOT/'tools/run_spiderfoot_local.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)

class SpiderFootGuardTests(unittest.TestCase):
    def test_nonfixture_connections_and_dns_are_blocked_and_restored(self):
        original_connect=socket.socket.connect
        original_resolve=socket.getaddrinfo
        with socket.socket() as sock, local.local_socket_guard() as counts:
            for address in [('203.0.113.1',80),('127.0.0.1',54372)]:
                for connect in [sock.connect,sock.connect_ex]:
                    with self.assertRaises(OSError):connect(address)
            with self.assertRaises(socket.gaierror):socket.getaddrinfo('reference.example',443)
            self.assertEqual(counts,{'allowed_connections':0,'blocked_connections':4,'blocked_dns':1})
        self.assertIs(socket.socket.connect,original_connect)
        self.assertIs(socket.getaddrinfo,original_resolve)

    def test_only_fixed_loopback_connection_reaches_real_socket_api(self):
        with patch.object(socket.socket,'connect',return_value=None) as original:
            with socket.socket() as sock,local.local_socket_guard() as counts:
                sock.connect(('127.0.0.1',54371))
                self.assertEqual(counts['allowed_connections'],1)
            original.assert_called_once_with(sock,('127.0.0.1',54371))

if __name__=='__main__':unittest.main()
