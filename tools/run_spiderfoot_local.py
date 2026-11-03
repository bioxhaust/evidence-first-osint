#!/usr/bin/env python3
"""Run three real upstream SpiderFoot modules against original localhost pages.

This is a teaching module-API adapter, not the full sf.py scanner/web UI.
The Python socket guard is not a system sandbox. Original code MIT.
"""
import argparse
from contextlib import contextmanager
import csv
import hashlib
import json
import os
from pathlib import Path
import queue
import socket
import ssl
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
HOST, PORT = '127.0.0.1', 54371
UPSTREAM = ROOT / 'scratch/spiderfoot-upstream'
LOCK = ROOT / 'docs/assets/spiderfoot/upstream-lock.json'

@contextmanager
def local_socket_guard():
    counts = {'allowed_connections': 0, 'blocked_connections': 0, 'blocked_dns': 0}
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_resolve = socket.getaddrinfo
    def connect(sock, address, original):
        if sock.family != socket.AF_INET or address != (HOST, PORT):
            counts['blocked_connections'] += 1
            raise OSError('Only the fixed localhost fixture is allowed by the teaching guard')
        counts['allowed_connections'] += 1
        return original(sock, address)
    def resolve(host, port, *args, **kwargs):
        if host != HOST or str(port) != str(PORT):
            counts['blocked_dns'] += 1
            raise socket.gaierror('Only fixture resolution is allowed by the teaching guard')
        return original_resolve(host, port, *args, **kwargs)
    with patch.object(socket.socket, 'connect', lambda sock, address: connect(sock, address, original_connect)), \
            patch.object(socket.socket, 'connect_ex', lambda sock, address: connect(sock, address, original_connect_ex)), \
            patch.object(socket, 'getaddrinfo', resolve):
        yield counts

def verify_upstream():
    lock = json.loads(LOCK.read_text(encoding='utf-8'))
    for relative, expected in lock['files'].items():
        path = UPSTREAM / relative
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Upstream source does not match tested commit: {relative}')
    return lock

def export_events(events, output):
    rows = []
    for event in events:
        ancestor = event
        while ancestor is not None and not ancestor.actualSource:
            ancestor = ancestor.sourceEvent
        rows.append({'id': event.hash, 'parent_id': event.sourceEventHash or '',
                     'type': event.eventType, 'module': event.module,
                     'data': event.data, 'source_url': ancestor.actualSource if ancestor else '',
                     'upstream_confidence': event.confidence})
    (output/'events.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    with (output/'events.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f, fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    with (output/'edges.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f, fieldnames=['Source','Target','Type','event_type']);writer.writeheader()
        writer.writerows({'Source':r['parent_id'],'Target':r['id'],'Type':'Directed','event_type':r['type']} for r in rows if r['parent_id'])
    return rows

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'scratch/spiderfoot-run-01')
    parser.add_argument('--without-analytics',action='store_true',help='Do not load sfp_webanalytics')
    parser.add_argument('--max-pages',type=int,choices=[1,4],default=4)
    args=parser.parse_args()
    try:
        lock=verify_upstream()
        output=args.output.resolve()
        if not output.is_relative_to(ROOT/'scratch') or output==ROOT/'scratch':
            raise ValueError('Choose a new output directory under scratch/')
        output.mkdir(parents=True,exist_ok=False)
    except (ValueError,OSError) as exc:
        raise SystemExit(f'Cannot start exercise: {exc}')
    sys.path.insert(0,str(UPSTREAM))
    clean_env={k:v for k,v in os.environ.items() if not k.lower().endswith('_proxy')}
    with patch.dict(os.environ,clean_env,clear=True), local_socket_guard() as counts:
        from sflib import SpiderFoot
        from spiderfoot import SpiderFootEvent, SpiderFootTarget
        from modules.sfp_spider import sfp_spider
        from modules.sfp_webserver import sfp_webserver
        from modules.sfp_webanalytics import sfp_webanalytics
        options={'_debug':False,'__logging':True,'_dnsserver':'', '_useragent':'EvidenceFirst-SYNTHETIC-Lab/1.0',
                 '_fetchtimeout':2,'_socks1type':'','_internettlds':['example','localhost'],'__outputfilter':None}
        # Upstream construction changes Python's default HTTPS factory. Restore it
        # immediately; this exercise exclusively uses fixed localhost HTTP.
        default_https=ssl._create_default_https_context
        try: sf=SpiderFoot(options)
        finally: ssl._create_default_https_context=default_https
        event_queue=queue.Queue()
        classes=[sfp_spider,sfp_webserver]+([] if args.without_analytics else [sfp_webanalytics])
        modules=[]
        for cls in classes:
            mod=cls();mod.__name__=cls.__name__;mod.opts=dict(cls.opts)
            mod.outgoingEventQueue=event_queue
            mod.setup(sf,{**options,**({'maxpages':args.max_pages,'maxlevels':1,'usecookies':False} if cls is sfp_spider else {})})
            mod.setTarget(SpiderFootTarget(HOST,'IP_ADDRESS'))
            modules.append(mod)
        root=SpiderFootEvent('ROOT','SYNTHETIC localhost module exercise','',None)
        seed=SpiderFootEvent('LINKED_URL_INTERNAL',f'http://{HOST}:{PORT}/index.html','course_seed',root)
        seed.actualSource=seed.data
        events=[root,seed]
        modules[0].handleEvent(seed)
        while not event_queue.empty():
            event=event_queue.get_nowait();events.append(event)
            for mod in modules:
                if event.eventType in mod.watchedEvents():
                    mod.handleEvent(event)
        if any(mod.errorState for mod in modules):
            raise RuntimeError('An upstream module reported an error; inspect the console')
        rows=export_events(events,output)
        fetched=[r for r in rows if r['type']=='TARGET_WEB_CONTENT']
        if not fetched:
            raise RuntimeError('No content fetched; check that your fixture server is running')
        summary={'synthetic':True,'upstream_commit':lock['commit'],'upstream_version':'4.0.0',
                 'python_version':sys.version.split()[0],'modules':[cls.__name__ for cls in classes],
                 'run_kind':'real upstream module API via course event-queue adapter; not full sf.py scanner',
                 'pages_fetched':len(fetched),'event_count':len(rows),'socket_guard':counts,
                 'limits':{'max_pages':args.max_pages,'max_levels':1},
                 'external_services_tested':False}
        (output/'run.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
