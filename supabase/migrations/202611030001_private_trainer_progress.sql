-- MIT. Apply once to the project's Supabase database using the SQL editor.
-- Only exercise IDs, dates and counters are stored here. Auth owns email/password data.
begin;

create function public.valid_trainer_progress(p_state jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  k text;
  item jsonb;
  pair record;
  day_text text;
begin
  if p_state is null or pg_catalog.jsonb_typeof(p_state) <> 'object'
     or pg_catalog.octet_length(p_state::text) > 131072
     or p_state->'version' <> '1'::jsonb then return false; end if;
  if (select count(*) from pg_catalog.jsonb_object_keys(p_state)) <> 7 then return false; end if;
  foreach k in array array['version','completed','attempts','mistakes','activityDays','review','completedAt'] loop
    if not (p_state ? k) then return false; end if;
  end loop;
  foreach k in array array['completed','mistakes','activityDays'] loop
    if pg_catalog.jsonb_typeof(p_state->k) <> 'array' or pg_catalog.jsonb_array_length(p_state->k) > 5000 then return false; end if;
    for item in select value from pg_catalog.jsonb_array_elements(p_state->k) loop
      if pg_catalog.jsonb_typeof(item) <> 'string' then return false; end if;
      if k = 'activityDays' then
        day_text := item #>> '{}';
        if day_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
        perform day_text::date;
      elsif (item #>> '{}') !~ '^[a-z0-9][a-z0-9-]{0,79}$' then return false;
      end if;
    end loop;
  end loop;
  foreach k in array array['attempts','review','completedAt'] loop
    if pg_catalog.jsonb_typeof(p_state->k) <> 'object'
       or (select count(*) from pg_catalog.jsonb_object_keys(p_state->k)) > 5000 then return false; end if;
    for pair in select key, value from pg_catalog.jsonb_each(p_state->k) loop
      if pair.key !~ '^[a-z0-9][a-z0-9-]{0,79}$' then return false; end if;
      if k = 'attempts' then
        if pg_catalog.jsonb_typeof(pair.value) <> 'number'
           or pair.value::text !~ '^(0|[1-9][0-9]{0,5})$'
           or pair.value::text::numeric > 100000 then return false; end if;
      elsif k = 'completedAt' then
        if pg_catalog.jsonb_typeof(pair.value) <> 'string'
           or pg_catalog.length(pair.value #>> '{}') > 40
           or (pair.value #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then return false; end if;
        perform (pair.value #>> '{}')::timestamptz;
      else
        if pg_catalog.jsonb_typeof(pair.value) <> 'object'
           or (select count(*) from pg_catalog.jsonb_object_keys(pair.value)) <> 2
           or not (pair.value ? 'at' and pair.value ? 'needed')
           or pg_catalog.jsonb_typeof(pair.value->'needed') <> 'boolean'
           or pg_catalog.jsonb_typeof(pair.value->'at') <> 'string'
           or pg_catalog.length(pair.value->>'at') > 40
           or (pair.value->>'at') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then return false; end if;
        perform (pair.value->>'at')::timestamptz;
      end if;
    end loop;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

create table public.trainer_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (public.valid_trainer_progress(state)),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.trainer_progress enable row level security;
alter table public.trainer_progress force row level security;

revoke all on table public.trainer_progress from public, anon, authenticated;
grant select, insert, update on table public.trainer_progress to authenticated;

create policy own_progress_read on public.trainer_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy own_progress_insert on public.trainer_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_progress_update on public.trainer_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- A compare-and-swap revision prevents silent overwrites by two devices. The
-- frontend must pull and merge again after SQLSTATE 40001 (PostgREST HTTP 409).
create function public.save_trainer_progress(p_state jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved public.trainer_progress%rowtype;
begin
  if owner_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.valid_trainer_progress(p_state) or p_expected_revision is null
     or p_expected_revision < 0 or p_expected_revision >= 9007199254740991 then
    raise exception using errcode = '22023', message = 'Invalid progress state or revision';
  end if;
  if p_expected_revision = 0 then
    insert into public.trainer_progress (user_id, state, revision)
    values (owner_id, p_state, 1)
    on conflict (user_id) do nothing
    returning * into saved;
  else
    update public.trainer_progress set state = p_state,
      revision = revision + 1, updated_at = pg_catalog.now()
    where user_id = owner_id and revision = p_expected_revision
    returning * into saved;
  end if;
  if saved.user_id is null then
    raise exception using errcode = '40001', message = 'Progress changed; pull and merge before retrying';
  end if;
  return pg_catalog.jsonb_build_object('state', saved.state, 'revision', saved.revision);
end;
$$;

-- Functions otherwise default to PUBLIC execution in PostgreSQL.
revoke all on function public.valid_trainer_progress(jsonb) from public, anon;
grant execute on function public.valid_trainer_progress(jsonb) to authenticated;
revoke all on function public.save_trainer_progress(jsonb, bigint) from public, anon;
grant execute on function public.save_trainer_progress(jsonb, bigint) to authenticated;

commit;
