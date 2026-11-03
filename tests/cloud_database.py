#!/usr/bin/env python3
"""MIT. Test the migration/RLS in a disposable local PostgreSQL cluster.

Requires PostgreSQL server binaries, runs without TCP, and never uses an existing
database. Supabase's auth.uid() is simulated; hosted Auth/OAuth is not exercised.
"""
import argparse
from datetime import date
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pg-bin', type=Path)
    parser.add_argument('--date', default=date.today().isoformat())
    parser.add_argument('--output', type=Path, default=ROOT / 'research/evidence/qa-cloud-database.json')
    args = parser.parse_args()
    pg = args.pg_bin
    if pg is None and shutil.which('pg_config'):
        pg = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())
    if pg is None or not all((pg / name).is_file() for name in ['initdb', 'pg_ctl', 'psql', 'postgres']):
        parser.error('Provide --pg-bin with the directory containing PostgreSQL server binaries')
    version = subprocess.check_output([str(pg / 'postgres'), '--version'], text=True).strip()
    state = {'version': 1, 'completed': ['m01-q01'], 'attempts': {'m01-q01': 1},
             'mistakes': [], 'activityDays': ['2026-11-03'],
             'review': {'m01-q01': {'at': '2026-11-03T00:00:00.000Z', 'needed': False}},
             'completedAt': {'m01-q01': '2026-11-03T00:00:00.000Z'}}
    encoded = json.dumps(state, separators=(',', ':'))
    user_a = '11111111-1111-4111-8111-111111111111'
    user_b = '22222222-2222-4222-8222-222222222222'
    results = []
    with tempfile.TemporaryDirectory(prefix='evidence-first-pg-') as folder:
        root = Path(folder)
        data = root / 'data'
        subprocess.run([str(pg / 'initdb'), '-D', str(data), '-A', 'trust', '--no-locale'], capture_output=True, check=True)
        subprocess.run([str(pg / 'pg_ctl'), '-D', str(data), '-l', str(root / 'postgres.log'),
                        '-o', f'-k {root} -p 55492 -c listen_addresses=', '-w', 'start'], capture_output=True, check=True)
        try:
            command = [str(pg / 'psql'), '-h', str(root), '-p', '55492', '-d', 'postgres',
                       '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1']
            def run(sql):
                return subprocess.run(command, input=sql, text=True, capture_output=True)
            setup = run("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; "
                        "CREATE TABLE auth.users(id uuid PRIMARY KEY); "
                        "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ "
                        "SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; "
                        "GRANT USAGE ON SCHEMA auth TO anon,authenticated; "
                        f"INSERT INTO auth.users VALUES('{user_a}'),('{user_b}');")
            if setup.returncode:
                raise RuntimeError(setup.stderr)
            migration = run((ROOT / 'supabase/migrations/202611030001_private_trainer_progress.sql').read_text())
            if migration.returncode:
                raise RuntimeError(migration.stderr)
            results.append({'check': 'migration_applies', 'pass': True})
            def as_user(user, sql):
                return f"SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','{user}',false); {sql}"
            scenarios = [
                ('anonymous_read_denied', 'SET ROLE anon; SELECT * FROM public.trainer_progress;', False, None),
                ('anonymous_rpc_denied', f"SET ROLE anon; SELECT public.save_trainer_progress('{encoded}'::jsonb,0);", False, None),
                ('user_a_create', as_user(user_a, f"SELECT public.save_trainer_progress('{encoded}'::jsonb,0)->>'revision';"), True, '1'),
                ('user_b_cannot_read_a', as_user(user_b, 'SELECT count(*) FROM public.trainer_progress;'), True, '0'),
                ('user_b_cannot_update_a', as_user(user_b, f"UPDATE public.trainer_progress SET revision=7 WHERE user_id='{user_a}' RETURNING user_id;"), True, 'UPDATE 0'),
                ('user_b_cannot_insert_for_a', as_user(user_b, f"INSERT INTO public.trainer_progress(user_id,state) VALUES('{user_a}','{encoded}');"), False, None),
                ('stale_revision_rejected', as_user(user_a, f"SELECT public.save_trainer_progress('{encoded}'::jsonb,0);"), False, None),
                ('current_revision_updates', as_user(user_a, f"SELECT public.save_trainer_progress('{encoded}'::jsonb,1)->>'revision';"), True, '2'),
                ('unknown_state_field_rejected', as_user(user_a, f"SELECT public.save_trainer_progress('{encoded}'::jsonb || '{{\"freeText\":\"not permitted\"}}'::jsonb,2);"), False, None),
                ('invalid_calendar_day_rejected', f"SELECT public.valid_trainer_progress(jsonb_set('{encoded}'::jsonb,'{{activityDays}}','[\"2026-02-30\"]'::jsonb));", True, 'f'),
                ('oversized_json_rejected', f"SELECT public.valid_trainer_progress(jsonb_set('{encoded}'::jsonb,'{{completed}}',jsonb_build_array(repeat('x',131072))));", True, 'f'),
                ('own_record_still_revision_2', as_user(user_a, 'SELECT revision FROM public.trainer_progress;'), True, '2'),
            ]
            for name, sql, success, last_line in scenarios:
                result = run(sql)
                passed = (result.returncode == 0) == success and (last_line is None or result.stdout.strip().splitlines()[-1] == last_line)
                results.append({'check': name, 'pass': passed, 'expected_success': success, 'exit_code': result.returncode})
                if not passed:
                    print(name, result.stdout, result.stderr)
        finally:
            subprocess.run([str(pg / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop'], capture_output=True, check=True)
    report = {'checked_date': args.date, 'postgres_version': version,
              'environment': 'Disposable local cluster, no TCP; simulated Supabase auth.uid() and roles. Hosted Auth/OAuth not tested.',
              'checks': results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'checks': len(results), 'passed': sum(item['pass'] for item in results)}))
    return 0 if all(item['pass'] for item in results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
