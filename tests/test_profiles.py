"""Regression tests for profile evidence, duplicates and unknowns. MIT."""
import copy
import importlib.util
import json
from pathlib import Path
import socket
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'docs/assets/profiles'
spec = importlib.util.spec_from_file_location('profile_candidates', ROOT / 'tools/profile_candidates.py')
profiles_tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profiles_tool)


class ProfileTests(unittest.TestCase):
    def setUp(self):
        self.scanner = json.loads((FIXTURE / 'scanner-results.json').read_text())
        self.corpus = json.loads((FIXTURE / 'profiles.json').read_text())

    def test_evidence_classification_preserves_false_match_and_all_rows(self):
        paths = [FIXTURE / 'scanner-results.json', FIXTURE / 'profiles.json']
        before = [p.read_bytes() for p in paths]
        with patch.object(socket, 'socket', side_effect=AssertionError('Network is forbidden')):
            result = profiles_tool.analyze(*paths)
        self.assertEqual(result['summary'], {'input_rows': 6, 'unique_profiles': 5,
                         'corroborated': 2, 'candidate': 1, 'unknown': 2})
        self.assertEqual(len(result['ledger']), 6)
        self.assertEqual(result['ledger'][1]['decision'], 'duplicate_url')
        by_id = {row['profile_id']: row for row in result['candidates']}
        self.assertEqual(by_id['PR01']['result_ids'], ['R01', 'R02'])
        self.assertEqual(by_id['PR03']['classification'], 'candidate')
        self.assertEqual(by_id['PR04']['classification'], 'unknown')
        self.assertEqual(by_id['PR05']['classification'], 'unknown')
        self.assertEqual(before, [p.read_bytes() for p in paths])

    def test_removing_self_links_does_not_merge_by_username(self):
        self.corpus['anchor']['self_links'] = []
        result = profiles_tool.compare(self.scanner, self.corpus)
        self.assertEqual(result['summary']['corroborated'], 0)
        self.assertEqual(result['summary']['candidate'], 3)

    def test_conflicting_duplicate_observations_remain_unknown(self):
        self.scanner['results'][1]['status'] = 'not_found'
        result = profiles_tool.compare(self.scanner, self.corpus)
        self.assertEqual(result['candidates'][0]['classification'], 'unknown')
        self.assertEqual(len(result['ledger']), 6)

    def test_reject_real_network_targets_and_wrong_scope(self):
        for bad in ('https://example.com/user', 'https://notes.example.evil.com/u',
                    'http://notes.example/u', 'https://x@notes.example/u',
                    'https://notes.example:443/u', 'https://notes.example/u?q=x'):
            with self.subTest(url=bad), self.assertRaises(ValueError):
                profiles_tool.canonical_url(bad)
        for key, bad in [('synthetic', False), ('schema_version', True), ('schema_version', 2)]:
            altered = copy.deepcopy(self.scanner)
            altered[key] = bad
            with self.subTest(field=key, value=bad), self.assertRaises(ValueError):
                profiles_tool.compare(altered, self.corpus)

    def test_case_sensitive_paths_and_hyphens_are_not_username_identity_rules(self):
        self.assertNotEqual(profiles_tool.canonical_url('https://notes.example/Route_Lab'),
                            profiles_tool.canonical_url('https://notes.example/route_lab'))
        self.assertNotEqual(profiles_tool.canonical_url('https://notes.example/route-lab'),
                            profiles_tool.canonical_url('https://notes.example/route_lab'))

    def test_unknown_fields_and_identifier_conflicts_fail_explicitly(self):
        mutations = [('status', 'success'), ('profile_id', 'OTHER'), ('result_id', 'R02'),
                     ('url', 'https://notes.example/wrong')]
        for field, value in mutations:
            altered = copy.deepcopy(self.scanner)
            altered['results'][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                profiles_tool.compare(altered, self.corpus)



class LocalSherlockFixtureTests(unittest.TestCase):
    def load_module(self, name):
        module_spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / f'{name}.py')
        module = importlib.util.module_from_spec(module_spec)
        module_spec.loader.exec_module(module)
        return module

    def test_local_config_cannot_select_a_real_site(self):
        launcher = self.load_module('run_sherlock_local')
        sites = launcher.validate_config()
        self.assertEqual(len(sites), 4)
        self.assertTrue(launcher.is_fixture_url('http://127.0.0.1:54369/present/route_lab'))
        for url in ('https://github.com/', 'http://localhost:54369/',
                    'http://127.0.0.1:80/', 'http://user@127.0.0.1:54369/'):
            self.assertFalse(launcher.is_fixture_url(url))

    def test_fixture_distinguishes_response_code_from_profile_presence(self):
        server = self.load_module('profile_fixture_server')
        self.assertEqual(server.fixture_response('/present/route_lab')[0], 200)
        status, content, delay = server.fixture_response('/soft404/route_lab')
        self.assertEqual(status, 200)
        self.assertIn('no profile exists', content)
        self.assertIn('PROFILE NOT FOUND', server.fixture_response('/missing/route_lab')[1])
        self.assertGreater(server.fixture_response('/slow/route_lab')[2], 0.25)


if __name__ == '__main__':
    unittest.main()
