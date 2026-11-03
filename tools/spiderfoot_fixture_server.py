#!/usr/bin/env python3
"""Serve only original SpiderFoot teaching pages on localhost. MIT."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST, PORT = '127.0.0.1', 54371

class Handler(SimpleHTTPRequestHandler):
    server_version = 'SYNTHETIC-Lab/1.0'
    sys_version = ''

    def end_headers(self):
        self.send_header('X-Powered-By', 'SYNTHETIC-Template/2')
        self.send_header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
        super().end_headers()

    def log_message(self, fmt, *args):
        print('LOCAL SPIDERFOOT FIXTURE:', fmt % args, flush=True)

def main():
    handler = partial(Handler, directory=str(ROOT / 'docs/assets/spiderfoot/pages'))
    try:
        with ThreadingHTTPServer((HOST, PORT), handler) as server:
            print(f'SYNTHETIC: http://{HOST}:{PORT}/index.html; Ctrl+C stops this server.', flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    except OSError as exc:
        raise SystemExit(f'Cannot use localhost:{PORT}: {exc}. Do not stop an unknown process.')

if __name__ == '__main__':
    main()
