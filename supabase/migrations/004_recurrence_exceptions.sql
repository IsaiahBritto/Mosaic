-- Recurrence exceptions for single-instance overrides (drag reschedule)

create table public.event_recurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  original_start_at timestamptz not null,
  override_start_at timestamptz,
  override_end_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, original_start_at)
);

create index event_recurrence_exceptions_event_id_idx
  on public.event_recurrence_exceptions (event_id);

alter table public.event_recurrence_exceptions enable row level security;

create policy event_recurrence_exceptions_select on public.event_recurrence_exceptions
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'viewer')
    )
  );

create policy event_recurrence_exceptions_insert on public.event_recurrence_exceptions
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'editor')
    )
  );

create policy event_recurrence_exceptions_update on public.event_recurrence_exceptions
  for update using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'editor')
    )
  );

create policy event_recurrence_exceptions_delete on public.event_recurrence_exceptions
  for delete using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'editor')
    )
  );
