#!/usr/bin/env python3
"""Check course structure, local links and built HTML anchors. Standard library; MIT.

Run after `python -m mkdocs build --strict`. This is a local integrity check,
not an assessment of external service availability or instructional quality.
"""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

from check_fixtures import check_fixtures

ROOT = Path(__file__).resolve().parents[1]
HEADINGS = ('Результат', 'До начала', 'Метод', 'Разобранный пример',
            'Самостоятельная работа', 'Критерии успеха', 'Ошибки и ограничения',
            'Самопроверка', 'Источники')


class HTMLDocument(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.missing_alt = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('name'):
            self.ids.add(attrs['name'])
        for key in ('href', 'src', 'poster'):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == 'img' and 'alt' not in attrs:
            self.missing_alt += 1


def prose_only(text):
    text = re.sub(r'(?ms)^\s*(`{3,}|~{3,})[^\n]*\n.*?^\s*\1\s*$', '', text)
    return re.sub(r'`[^`\n]+`', '', text)


def check_structure(root):
    errors, counts = [], {}
    docs = root / 'docs'
    lessons = sorted((docs / 'lessons').glob('[0-9][0-9]-*.md'))
    counts['lessons'] = len(lessons)
    ids = [p.name[:2] for p in lessons]
    if ids != [f'{i:02}' for i in range(1, 19)]:
        errors.append('Expected one lesson for each identifier 01–18')
    for path in lessons:
        source = path.read_text(encoding='utf-8')
        headings = set(re.findall(r'^## (.+)$', source, re.M))
        for heading in HEADINGS:
            if heading not in headings:
                errors.append(f'{path.relative_to(root)}: missing lesson section {heading}')
        if len(prose_only(source).split()) < 350:
            errors.append(f'{path.relative_to(root)}: unusually short lesson; editorial review needed')
    for category, total in [('labs', 18), ('projects', 3)]:
        for section in ('practice', 'solutions'):
            paths = list((docs / section / category).glob('[0-9][0-9].md'))
            counts[f'{section}_{category}'] = len(paths)
            for number in range(1, total + 1):
                expected = docs / section / category / f'{number:02}.md'
                if not expected.is_file():
                    errors.append(f'Missing {expected.relative_to(root)}')
    required = ['README.md', 'README.ru.md', 'CONTRIBUTING.md',
                'docs/lessons/index.md', 'docs/en/index.md',
                'docs/practice/capstone.md', 'docs/solutions/capstone.md',
                'docs/resources/30-days.md', 'docs/resources/challenge.md']
    for name in ('quickstart', 'search', 'decision-tree', 'media-checklist', 'course-map'):
        required.extend(f'docs/resources/{name}{suffix}.md' for suffix in ('', '.en'))
    for name in ('journal', 'report', 'confidence'):
        required.extend(f'docs/templates/{name}{suffix}.md' for suffix in ('', '.en'))
    for name in required:
        if not (root / name).is_file():
            errors.append(f'Missing required resource: {name}')
    placeholders = re.compile(r'\b(?:TODO|TBD|FIXME|coming soon)\b|здесь будет (?:текст|урок)|скоро появится урок', re.I)
    for path in docs.rglob('*.md'):
        if placeholders.search(prose_only(path.read_text(encoding='utf-8'))):
            errors.append(f'{path.relative_to(root)}: unfinished-content marker')
    return counts, errors


def check_markdown_paths(root):
    errors, checked = [], 0
    paths = list((root / 'docs').rglob('*.md')) + list(root.glob('*.md'))
    paths += list((root / 'launch').rglob('*.md')) + list((root / 'research').glob('*.md'))
    for path in paths:
        source = prose_only(path.read_text(encoding='utf-8'))
        links = re.findall(r'!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)', source)
        links += re.findall(r'^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)', source, re.M)
        for link in links:
            parsed = urlsplit(link.strip('<>'))
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = (root if parsed.path.startswith('/') else path.parent) / unquote(parsed.path).lstrip('/')
            checked += 1
            if not target.exists():
                errors.append(f'{path.relative_to(root)}: missing Markdown target {link}')
    return checked, errors


def check_html(site, site_url):
    errors, checked = [], 0
    documents = {path.resolve(): HTMLDocument(path.read_text(encoding='utf-8'))
                 for path in site.rglob('*.html')}
    base = urlsplit(site_url)
    prefix = base.path.rstrip('/') + '/'
    if not documents:
        return {'html_pages': 0, 'html_links': 0}, ['No built HTML found; run mkdocs build --strict first']
    for path, document in documents.items():
        if document.missing_alt:
            errors.append(f'{path.relative_to(site)}: {document.missing_alt} image(s) without alt attribute')
        for link in document.links:
            parsed = urlsplit(link)
            target_path = unquote(parsed.path)
            if parsed.scheme or parsed.netloc:
                if parsed.scheme not in {'', 'http', 'https'} or parsed.netloc.lower() != base.netloc.lower():
                    continue
                if target_path.rstrip('/') == base.path.rstrip('/'):
                    target = site
                elif target_path.startswith(prefix):
                    target = site / target_path[len(prefix):]
                else:
                    continue
            elif target_path.startswith('/'):
                if target_path.rstrip('/') == base.path.rstrip('/'):
                    target = site
                elif target_path.startswith(prefix):
                    target = site / target_path[len(prefix):]
                else:
                    errors.append(f'{path.relative_to(site)}: root URL escapes project site: {link}')
                    continue
            else:
                target = path.parent / target_path if target_path else path
            checked += 1
            target = target.resolve()
            if target.is_dir():
                target /= 'index.html'
            if not target.is_relative_to(site):
                errors.append(f'{path.relative_to(site)}: target outside build: {link}')
            elif not target.is_file():
                errors.append(f'{path.relative_to(site)}: missing HTML target: {link}')
            elif parsed.fragment and target in documents:
                fragment = unquote(parsed.fragment)
                if fragment not in documents[target].ids:
                    errors.append(f'{path.relative_to(site)}: missing HTML anchor: {link}')
    return {'html_pages': len(documents), 'html_links': checked}, errors


def check_known_secret_patterns(root):
    """Flag common credential formats without printing their values.

    This bounded check complements review; it is not a general PII detector.
    """
    patterns = {
        'private key': re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'),
        'GitHub credential': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})'),
        'AWS access key': re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
    }
    files = list(root.glob('*'))
    for folder in ('docs', 'tools', 'tests', 'research', 'launch', '.github'):
        files.extend((root / folder).rglob('*'))
    checked, errors = 0, []
    for path in files:
        if not path.is_file() or path.suffix not in {'.md', '.py', '.json', '.yml', '.yaml', '.csv', '.txt', '.svg', '.js', '.css'}:
            continue
        checked += 1
        for line_number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
            for label, pattern in patterns.items():
                if pattern.search(line):
                    errors.append(f'{path.relative_to(root)}:{line_number}: possible {label}')
    return checked, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=ROOT / 'site')
    parser.add_argument('--site-url', default='https://bioxhaust.github.io/evidence-first-osint/')
    args = parser.parse_args()
    counts, errors = check_structure(ROOT)
    count, found = check_markdown_paths(ROOT)
    counts['markdown_links'] = count
    errors.extend(found)
    html_counts, found = check_html(args.site.resolve(), args.site_url)
    counts.update(html_counts)
    errors.extend(found)
    count, found = check_known_secret_patterns(ROOT)
    counts['files_scanned_for_known_secret_patterns'] = count
    errors.extend(found)
    fixture_result = check_fixtures()
    counts['fixture_files'] = fixture_result['checked_files']
    errors.extend(fixture_result['errors'])
    errors = sorted(set(errors))
    print(json.dumps({'counts': counts, 'errors': errors, 'result': 'FAIL' if errors else 'PASS'},
                     ensure_ascii=False, indent=2))
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
