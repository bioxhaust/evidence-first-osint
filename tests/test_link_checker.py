"""Ensure broken local paths/anchors cannot silently pass the site checker. MIT."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from check_project import check_html


class BuiltLinkTests(unittest.TestCase):
    def test_valid_relative_anchor_and_project_root(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder).resolve()
            (site / 'page').mkdir()
            (site / 'page/index.html').write_text('<h1 id="valid">Page</h1>', encoding='utf-8')
            (site / 'index.html').write_text(
                '<a href="page/#valid">Page</a><a href="https://course.test/course">Home</a>', encoding='utf-8')
            counts, errors = check_html(site, 'https://course.test/course/')
            self.assertEqual(errors, [])
            self.assertEqual(counts['html_links'], 2)

    def test_missing_target_and_protocol_relative_anchor_are_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder).resolve()
            (site / 'page').mkdir()
            (site / 'page/index.html').write_text('<h1 id="valid">Page</h1>', encoding='utf-8')
            (site / 'index.html').write_text(
                '<a href="//course.test/course/page/#absent">Page</a>'
                '<a href="missing/">Missing</a><a href="https://elsewhere.test/missing">External</a>', encoding='utf-8')
            counts, errors = check_html(site, 'https://course.test/course/')
            self.assertEqual(counts['html_links'], 2)
            self.assertTrue(any('missing HTML anchor' in error for error in errors))
            self.assertTrue(any('missing HTML target' in error for error in errors))
            self.assertEqual(len(errors), 2)


if __name__ == '__main__':
    unittest.main()
