-- Mosaic initial schema (Phase 1)

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Calendars
-- ---------------------------------------------------------------------------
create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color_hex text not null,
  type text not null default 'native' check (type in ('native', 'shared')),
  is_visible_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Calendar members (sharing — used in Phase 5)
-- ---------------------------------------------------------------------------
create table public.calendar_members (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  invited_email text,
  invite_status text not null default 'pending'
    check (invite_status in ('pending', 'accepted', 'declined')),
  invite_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  unique (calendar_id, user_id),
  unique (calendar_id, invited_email)
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  location text,
  notes text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  timezone text not null default 'America/New_York',
  travel_before_minutes integer not null default 0 check (travel_before_minutes >= 0),
  travel_after_minutes integer not null default 0 check (travel_after_minutes >= 0),
  is_holiday boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Event recurrence
-- ---------------------------------------------------------------------------
create table public.event_recurrence (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count integer not null default 1 check (interval_count >= 1),
  days_of_week integer[] not null default '{}',
  end_date date
);

-- ---------------------------------------------------------------------------
-- User preferences
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  visible_calendar_ids uuid[] not null default '{}',
  default_timezone text not null default 'America/New_York',
  day_view_mode text not null default 'timeline'
    check (day_view_mode in ('timeline', 'agenda')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index events_calendar_id_start_end_idx
  on public.events (calendar_id, start_at, end_at);

create index calendar_members_user_id_invite_status_idx
  on public.calendar_members (user_id, invite_status);

create index calendar_members_invited_email_pending_idx
  on public.calendar_members (invited_email)
  where invite_status = 'pending';

-- ---------------------------------------------------------------------------
-- Updated_at trigger for events
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth bootstrap: profile + default calendar + preferences
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_calendar_id uuid;
  display text;
begin
  display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1),
    'User'
  );

  insert into public.profiles (id, display_name)
  values (new.id, display);

  insert into public.calendars (owner_id, name, color_hex, type, is_visible_default)
  values (new.id, 'Personal', '#9379E0', 'native', true)
  returning id into new_calendar_id;

  insert into public.calendar_members (calendar_id, user_id, role, invite_status)
  values (new_calendar_id, new.id, 'owner', 'accepted');

  insert into public.user_preferences (user_id, visible_calendar_ids)
  values (new.id, array[new_calendar_id]);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------
create or replace function public.calendar_role(p_calendar_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.calendar_members
  where calendar_id = p_calendar_id
    and user_id = p_user_id
    and invite_status = 'accepted'
  union all
  select 'owner'::text
  where exists (
    select 1 from public.calendars
    where id = p_calendar_id and owner_id = p_user_id
  )
  limit 1;
$$;

create or replace function public.is_calendar_member(
  p_calendar_id uuid,
  p_user_id uuid,
  p_min_role text default 'viewer'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_role text;
  role_rank integer;
  min_rank integer;
begin
  user_role := public.calendar_role(p_calendar_id, p_user_id);
  if user_role is null then
    return false;
  end if;

  role_rank := case user_role
    when 'owner' then 3
    when 'editor' then 2
    when 'viewer' then 1
    else 0
  end;

  min_rank := case p_min_role
    when 'owner' then 3
    when 'editor' then 2
    when 'viewer' then 1
    else 0
  end;

  return role_rank >= min_rank;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.calendars enable row level security;
alter table public.calendar_members enable row level security;
alter table public.events enable row level security;
alter table public.event_recurrence enable row level security;
alter table public.user_preferences enable row level security;

-- Profiles
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- Calendars
create policy calendars_select_member on public.calendars
  for select using (
    public.is_calendar_member(id, auth.uid(), 'viewer')
  );

create policy calendars_insert_own on public.calendars
  for insert with check (auth.uid() = owner_id);

create policy calendars_update_owner on public.calendars
  for update using (owner_id = auth.uid());

create policy calendars_delete_owner on public.calendars
  for delete using (owner_id = auth.uid());

-- Calendar members
create policy calendar_members_select on public.calendar_members
  for select using (
    public.is_calendar_member(calendar_id, auth.uid(), 'viewer')
    or invited_email = (select email from auth.users where id = auth.uid())
  );

create policy calendar_members_insert_owner on public.calendar_members
  for insert with check (
    exists (
      select 1 from public.calendars
      where id = calendar_id and owner_id = auth.uid()
    )
  );

create policy calendar_members_update on public.calendar_members
  for update using (
    exists (
      select 1 from public.calendars
      where id = calendar_id and owner_id = auth.uid()
    )
    or (
      invited_email = (select email from auth.users where id = auth.uid())
      and user_id is null
    )
  );

create policy calendar_members_delete_owner on public.calendar_members
  for delete using (
    exists (
      select 1 from public.calendars
      where id = calendar_id and owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- Events
create policy events_select_member on public.events
  for select using (
    public.is_calendar_member(calendar_id, auth.uid(), 'viewer')
  );

create policy events_insert_editor on public.events
  for insert with check (
    public.is_calendar_member(calendar_id, auth.uid(), 'editor')
    and created_by = auth.uid()
  );

create policy events_update_editor on public.events
  for update using (
    public.is_calendar_member(calendar_id, auth.uid(), 'editor')
  );

create policy events_delete_editor on public.events
  for delete using (
    public.is_calendar_member(calendar_id, auth.uid(), 'editor')
  );

-- Event recurrence
create policy event_recurrence_select on public.event_recurrence
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'viewer')
    )
  );

create policy event_recurrence_insert on public.event_recurrence
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'editor')
    )
  );

create policy event_recurrence_update on public.event_recurrence
  for update using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'editor')
    )
  );

create policy event_recurrence_delete on public.event_recurrence
  for delete using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_calendar_member(e.calendar_id, auth.uid(), 'editor')
    )
  );

-- User preferences
create policy user_preferences_select_own on public.user_preferences
  for select using (auth.uid() = user_id);

create policy user_preferences_update_own on public.user_preferences
  for update using (auth.uid() = user_id);

create policy user_preferences_insert_own on public.user_preferences
  for insert with check (auth.uid() = user_id);
