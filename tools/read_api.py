#!/usr/bin/env python3
"""Read the local synthetic API response. No network or credentials. MIT."""
import argparse
import json
from pathlib import Path


def read_response(path):
    """Validate the minimal local exercise schema and return its record identifiers."""
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if not isinstance(data, dict) or data.get('synthetic') is not True or type(data.get('schema_version')) is not int or data['schema_version'] != 1:
        raise ValueError('Expected synthetic schema version 1')
    records = data.get('records')
    if not isinstance(records, list) or not all(
        isinstance(record, dict) and isinstance(record.get('payment_id'), str)
        and record['payment_id'] for record in records
    ):
        raise ValueError('Expected records with nonempty string payment_id')
    identifiers = [record['payment_id'] for record in records]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError('Duplicate payment_id in local API response')
    return {'count': len(records), 'payment_ids': identifiers}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('json_path',type=Path)
    args=p.parse_args()
    try:
        result = read_response(args.json_path)
    except (OSError, ValueError) as exc:
        p.exit(2, f'Error: {exc}\n')
    print(json.dumps(result, indent=2))


if __name__=='__main__':main()
