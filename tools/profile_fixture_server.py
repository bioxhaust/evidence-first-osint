#!/usr/bin/env python3
"""Serve original synthetic profile responses on 127.0.0.1:54369 only. MIT."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import time


def fixture_response(path):
    """Return (status, text, delay); no files, redirects or remote resources."""
    if path == '/present/route_lab':
        return 200, 'SYNTHETIC PROFILE: route_lab. LEARNER-A training notes. No real person.', 0
    if path.startswith('/soft404/'):
        return 200, 'SYNTHETIC GENERIC PAGE: no profile exists here; the server returns HTTP 200 for everyone.', 0
    if path.startswith('/missing/'):
        return 200, 'SYNTHETIC PROFILE NOT FOUND', 0
    if path.startswith('/slow/'):
        return 200, 'SYNTHETIC PROFILE: delayed response; existence cannot be decided before timeout.', 1.0
    return 404, 'SYNTHETIC PROFILE NOT FOUND', 0


class Handler(BaseHTTPRequestHandler):
    def handle_fixture(self, include_body):
        status, text, delay = fixture_response(self.path)
        if delay:
            time.sleep(delay)
        body = ('<!doctype html><html lang="en"><meta charset="utf-8">'
                '<title>SYNTHETIC profile fixture</title><body><h1>SYNTHETIC / TRAINING ONLY</h1>'
                f'<p>{text}</p></body></html>').encode('utf-8')
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if include_body:
                self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Expected when the learner tests the deliberately slow endpoint.

    def do_GET(self):
        self.handle_fixture(True)

    def do_HEAD(self):
        self.handle_fixture(False)

    def log_message(self, fmt, *args):
        print('LOCAL FIXTURE:', fmt % args, flush=True)


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    try:
        with ThreadingHTTPServer(('127.0.0.1', 54369), Handler) as server:
            print('Synthetic fixture listening at http://127.0.0.1:54369; stop with Ctrl+C.', flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    except OSError as exc:
        raise SystemExit(f"Cannot start local fixture on 127.0.0.1:54369: {exc}. Do not stop an unknown process using this port.")


if __name__ == '__main__':
    main()
