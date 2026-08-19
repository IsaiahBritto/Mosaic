-- Mosaic integrations schema (Phases 7–8)

-- ---------------------------------------------------------------------------
-- Calendar connections (Google OAuth + Apple CalDAV)
-- ---------------------------------------------------------------------------
create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google', 'apple')),
  provider_account_id text not null,
  provider_account_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  credentials_encrypted text,
  caldav_url text,
  caldav_username text,
  token_expires_at timestamptz,
  scopes text[],
  last_sync_at timestamptz,
  last_sync_status text check (last_sync_status in ('ok', 'error', 'syncing')),
  last_sync_error text,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

-- ---------------------------------------------------------------------------
-- Extend calendars for linked sources
-- ---------------------------------------------------------------------------
alter table public.calendars
  add column if not exists source text not null default 'native'
    check (source in ('native', 'google', 'apple')),
  add column if not exists connection_id uuid references public.calendar_connections(id) on delete cascade,
  add column if not exists external_calendar_id text,
  add column if not exists sync_enabled boolean not null default true;

create unique index if not exists calendars_external_unique
  on public.calendars (connection_id, external_calendar_id)
  where connection_id is not null;

-- ---------------------------------------------------------------------------
-- Extend events for external sync
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists source text not null default 'native'
    check (source in ('native', 'google', 'apple')),
  add column if not exists external_event_id text,
  add column if not exists external_etag text,
  add column if not exists external_updated_at timestamptz,
  add column if not exists sync_status text default 'synced'
    check (sync_status in ('synced', 'pending_push', 'conflict'));

create unique index if not exists events_external_unique
  on public.events (calendar_id, external_event_id)
  where external_event_id is not null;

-- ---------------------------------------------------------------------------
-- Sync log
-- ---------------------------------------------------------------------------
create table public.sync_log (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.calendar_connections(id) on delete cascade,
  direction text check (direction in ('pull', 'push')),
  entity_type text check (entity_type in ('event', 'calendar')),
  entity_id uuid,
  external_id text,
  action text check (action in ('create', 'update', 'delete', 'skip', 'conflict')),
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.calendar_connections enable row level security;
alter table public.sync_log enable row level security;

create policy calendar_connections_select_own on public.calendar_connections
  for select using (auth.uid() = user_id);

create policy calendar_connections_insert_own on public.calendar_connections
  for insert with check (auth.uid() = user_id);

create policy calendar_connections_update_own on public.calendar_connections
  for update using (auth.uid() = user_id);

create policy calendar_connections_delete_own on public.calendar_connections
  for delete using (auth.uid() = user_id);

create policy sync_log_select_own on public.sync_log
  for select using (
    exists (
      select 1 from public.calendar_connections c
      where c.id = connection_id and c.user_id = auth.uid()
    )
  );

create policy sync_log_insert_own on public.sync_log
  for insert with check (
    exists (
      select 1 from public.calendar_connections c
      where c.id = connection_id and c.user_id = auth.uid()
    )
  );
