#!/usr/bin/env python3
"""HTTP-check links rendered from course Markdown; save metadata only. MIT.

Requires the Markdown dependency already installed with MkDocs. HTTP success
does not establish that the destination contains the intended source.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urldefrag, urlsplit
from urllib.request import Request, urlopen

import markdown

ROOT = Path(__file__).resolve().parents[1]


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attribute in ('href', 'src', 'poster'):
            if attrs.get(attribute):
                self.links.append(attrs[attribute])


class TitleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, text):
        if self.in_title:
            self.parts.append(text)


def collect_urls():
    sources, excluded = {}, {}
    for path in sorted((ROOT / 'docs').rglob('*.md')):
        rendered = markdown.markdown(path.read_text(encoding='utf-8'),
                                     extensions=['extra', 'pymdownx.superfences'])
        parser = LinkParser()
        parser.feed(rendered)
        for raw_url in parser.links:
            parsed = urlsplit(raw_url)
            if parsed.scheme not in {'http', 'https'}:
                continue
            url = urldefrag(raw_url)[0]
            reason = None
            if parsed.hostname == 'bioxhaust.github.io' or (
                parsed.hostname == 'github.com'
                and parsed.path.startswith('/bioxhaust/evidence-first-osint')
            ):
                reason = 'Project publication checked separately'
            elif (parsed.hostname or '').endswith('.example'):
                reason = 'Reserved synthetic training domain; never request'
            if reason:
                excluded[url] = reason
                continue
            sources.setdefault(url, set()).add(path.relative_to(ROOT).as_posix())
    return sources, excluded


def check_url(item):
    url, sources = item
    result = {'url': url, 'sources': sorted(sources)}
    try:
        request = Request(url, headers={'User-Agent': 'EvidenceFirstCourse-LinkCheck/1.0'})
        try:
            response = urlopen(request, timeout=15)
        except HTTPError as exc:
            response = exc
        with response:
            raw = response.read(4 * 1024 * 1024 + 1)
            result.update(status=response.status, final_url=response.url,
                          bytes=len(raw), body_truncated=len(raw) > 4 * 1024 * 1024)
            parser = TitleParser()
            if 'html' in response.headers.get('Content-Type', ''):
                parser.feed(raw.decode(response.headers.get_content_charset() or 'utf-8', 'replace'))
            result['title'] = ' '.join(' '.join(parser.parts).split())[:300] or None
    except Exception as exc:
        result.update(status=None, error=f'{type(exc).__name__}: {exc}')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', default=date.today().isoformat())
    parser.add_argument('--output', type=Path, default=ROOT / 'research/evidence/qa-all-external-links.json')
    args = parser.parse_args()
    sources, excluded = collect_urls()
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(check_url, sorted(sources.items())))
    report = {
        'checked_date': args.date,
        'method': 'Unauthenticated HTTP GET; timeout 15s; six workers; at most 4 MiB per response; bodies discarded',
        'scope': 'Unique HTTP(S) destinations rendered from all docs/**/*.md, fragments removed; own project checked separately',
        'limitation': 'HTTP success does not establish relevant content or working service features. 403/429 may reflect this environment.',
        'checked_urls': len(results),
        'excluded': [{'url': url, 'reason': reason} for url, reason in sorted(excluded.items())],
        'results': results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {}
    for result in results:
        status = str(result.get('status'))
        counts[status] = counts.get(status, 0) + 1
    print(json.dumps({'checked_urls': len(results), 'status_counts': counts,
                      'attention': [r for r in results if r.get('status') != 200]},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
