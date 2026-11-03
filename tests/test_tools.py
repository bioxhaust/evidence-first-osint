"""Regression tests for evidence-preserving fixture analysis. MIT."""
import csv
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / 'docs/assets/case'


def load_tool(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


analysis = load_tool('analyze_case')
api = load_tool('read_api')
fixtures = load_tool('check_fixtures')


class AnalysisTests(unittest.TestCase):
    def analyze_rows(self, rows, cutoff='2025-05-18'):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'payments.csv'
            with path.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.writer(handle)
                writer.writerow('payment_id contract_id amount currency paid_at status synthetic'.split())
                writer.writerows(rows)
            return analysis.analyze(path, cutoff)

    def test_dirty_total_and_every_disposition_with_unchanged_input(self):
        path = CASE / 'payments-dirty.csv'
        before = hashlib.sha256(path.read_bytes()).hexdigest()
        result = analysis.analyze(path)
        self.assertEqual(result['total_settled_c17'], 5000000)
        self.assertEqual(result['included_rows'], 2)
        self.assertEqual([row['decision'] for row in result['ledger']],
                         ['included', 'duplicate', 'included', 'not_settled', 'quarantine', 'other_contract'])
        self.assertEqual(result['ledger'][4]['raw']['amount'], 'unknown')
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), before)

    def test_documented_number_formats_and_reject_ambiguous_decimals(self):
        for raw in ('2000000', '2 000 000', '2,000,000'):
            self.assertEqual(analysis.parse_amount(raw), Decimal('2000000'))
        for raw in ('2,00', '2.000.000', '-1', 'NaN', '1e6', None, ''):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                analysis.parse_amount(raw)

    def test_conflicting_identifier_aborts_instead_of_choosing_a_row(self):
        first = ['P1', 'C-17', '10', 'TST', '2025-05-01', 'settled', 'true']
        other = ['P1', 'C-17', '20', 'TST', '2025-05-01', 'settled', 'true']
        with self.assertRaisesRegex(RuntimeError, 'conflicting payment_id'):
            self.analyze_rows([first, other])

    def test_cutoff_is_inclusive_and_future_settled_is_excluded(self):
        result = self.analyze_rows([
            ['P1', 'C-17', '10', 'TST', '2025-05-18', 'settled', 'true'],
            ['P2', 'C-17', '20', 'TST', '2025-05-19', 'settled', 'true'],
        ])
        self.assertEqual(result['total_settled_c17'], 10)
        self.assertEqual(result['ledger'][1]['decision'], 'after_cutoff')

    def test_bad_date_currency_and_missing_or_extra_cells_are_quarantined(self):
        base = ['P1', 'C-17', '10', 'TST', '2025-05-18', 'settled', 'true']
        bad_date = base.copy(); bad_date[4] = '18/05/2025'
        bad_currency = base.copy(); bad_currency[3] = 'EUR'
        for row in (bad_date, bad_currency, base[:-1], base + ['unexpected']):
            with self.subTest(row=row):
                result = self.analyze_rows([row])
                self.assertEqual(result['ledger'][0]['decision'], 'quarantine')
                self.assertEqual(result['total_settled_c17'], 0)

    def test_missing_required_column_rejects_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'bad.csv'
            path.write_text('payment_id,amount\nP1,10\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'missing required'):
                analysis.analyze(path)


class ApiTests(unittest.TestCase):
    def test_local_fixture_has_four_records_without_network(self):
        self.assertEqual(api.read_response(CASE / 'api-response.json'),
                         {'count': 4, 'payment_ids': ['PAY-01', 'PAY-02', 'PAY-03', 'PAY-04']})

    def test_rejects_wrong_schema_shape_ids_and_invalid_json(self):
        bad = [[], {'synthetic': True, 'schema_version': True, 'records': []},
               {'synthetic': False, 'schema_version': 1, 'records': []},
               {'synthetic': True, 'schema_version': 1, 'records': [{'payment_id': 7}]},
               {'synthetic': True, 'schema_version': 1, 'records': [{'payment_id': 'P1'}, {'payment_id': 'P1'}]}]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'api.json'
            for data in bad:
                path.write_text(json.dumps(data), encoding='utf-8')
                with self.subTest(data=data), self.assertRaises(ValueError):
                    api.read_response(path)
            path.write_text('{invalid', encoding='utf-8')
            with self.assertRaises(ValueError):
                api.read_response(path)


class FixtureTests(unittest.TestCase):
    def test_manifest_covers_shipped_assets_and_exact_bytes(self):
        result = fixtures.check_fixtures()
        self.assertGreaterEqual(result['checked_files'], 25)
        self.assertEqual(result['errors'], [])


if __name__ == '__main__':
    unittest.main()
