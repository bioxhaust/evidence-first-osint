#!/usr/bin/env python3
"""Audit the documented synthetic CSV format without altering input. MIT."""
import argparse
import csv
from datetime import date
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path
import re


def parse_amount(raw):
    # This fixture specifies spaces/commas as thousands separators, never decimals.
    if not isinstance(raw, str) or not re.fullmatch(r'(?:[0-9]+|[0-9]{1,3}(?: [0-9]{3})+|[0-9]{1,3}(?:,[0-9]{3})+)',raw):
        raise ValueError('invalid amount for documented integer-TST schema')
    try:
        return Decimal(raw.replace(' ','').replace(',',''))
    except InvalidOperation as exc:
        raise ValueError('invalid amount') from exc


def analyze(path, cutoff='2025-05-18'):
    cutoff_date = date.fromisoformat(cutoff)
    seen, ledger, accepted = {}, [], []
    required={'payment_id','contract_id','amount','currency','paid_at','status','synthetic'}
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f)
        if not required.issubset(reader.fieldnames or []):
            raise ValueError('CSV is missing required fields')
        for line,row in enumerate(reader,2):
            entry={'line':line,'payment_id':row['payment_id'],'raw':dict(row)}
            try:
                if None in row or any(row.get(field) is None for field in required):
                    raise ValueError('row has missing or extra CSV cells')
                if row['synthetic'] != 'true' or row['currency'] != 'TST':
                    raise ValueError('only the synthetic TST fixture is accepted')
                if not row['payment_id'] or row['status'] not in {'settled','scheduled'}:
                    raise ValueError('missing id or unknown status')
                amount=parse_amount(row['amount'])
                paid=date.fromisoformat(row['paid_at'])
                normalized=(row['contract_id'],amount,row['currency'],paid,row['status'])
                if row['payment_id'] in seen:
                    if seen[row['payment_id']] != normalized:
                        # Conflicting identifiers invalidate the run; never silently pick a winner.
                        raise RuntimeError(f'conflicting payment_id at line {line}: {row["payment_id"]}')
                    entry['decision']='duplicate'
                else:
                    seen[row['payment_id']]=normalized
                    if row['contract_id'] != 'C-17':entry['decision']='other_contract'
                    elif row['status'] != 'settled':entry['decision']='not_settled'
                    elif paid > cutoff_date:entry['decision']='after_cutoff'
                    else:
                        entry['decision']='included'
                        accepted.append(amount)
            except ValueError as exc:
                entry.update(decision='quarantine',reason=str(exc))
            ledger.append(entry)
    return {'synthetic':True,'cutoff_date_inclusive':cutoff,'currency':'TST',
        'total_settled_c17':int(sum(accepted,Decimal(0))),
        'included_rows':len(accepted),'ledger':ledger,
        'limitation':'Result covers supplied ledger only; no external completeness claim.'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('csv_path',type=Path)
    p.add_argument('--cutoff',default='2025-05-18')
    args=p.parse_args()
    try:
        print(json.dumps(analyze(args.csv_path,args.cutoff),ensure_ascii=False,indent=2))
    except (OSError,ValueError,RuntimeError) as exc:
        p.exit(2,f'Error: {exc}\n')


if __name__=='__main__':main()
