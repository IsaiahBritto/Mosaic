-- Mosaic sync state extensions (Phases 7–8 hardening)
-- Base integration schema is in 003_integrations.sql

-- ---------------------------------------------------------------------------
-- Calendars: incremental sync state + access role
-- ---------------------------------------------------------------------------
alter table public.calendars
  add column if not exists external_sync_token text,
  add column if not exists external_caldav_path text,
  add column if not exists external_calendar_access_role text;

-- ---------------------------------------------------------------------------
-- Events: provider metadata + conflict snapshots
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists external_metadata jsonb,
  add column if not exists conflict_payload jsonb;

-- ---------------------------------------------------------------------------
-- Connections: sync locking
-- ---------------------------------------------------------------------------
alter table public.calendar_connections
  add column if not exists sync_lock_until timestamptz;

-- ---------------------------------------------------------------------------
-- User preferences: daily sync boundary (America/New_York calendar date)
-- ---------------------------------------------------------------------------
alter table public.user_preferences
  add column if not exists last_linked_sync_date date;
