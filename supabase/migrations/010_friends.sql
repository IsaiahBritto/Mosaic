-- Friends: friend requests, friendships, and helper functions

-- ---------------------------------------------------------------------------
-- Friend requests
-- ---------------------------------------------------------------------------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  recipient_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint friend_requests_no_self
    check (recipient_id is null or requester_id <> recipient_id)
);

create unique index friend_requests_pending_unique_idx
  on public.friend_requests (requester_id, recipient_email)
  where status = 'pending';

create index friend_requests_recipient_email_pending_idx
  on public.friend_requests (recipient_email)
  where status = 'pending';

create index friend_requests_recipient_id_pending_idx
  on public.friend_requests (recipient_id)
  where status = 'pending';

create index friend_requests_requester_id_idx
  on public.friend_requests (requester_id);

-- ---------------------------------------------------------------------------
-- Friendships (ordered pair: user_a_id < user_b_id)
-- ---------------------------------------------------------------------------
create table public.friendships (
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a_id, user_b_id),
  constraint friendships_ordered check (user_a_id < user_b_id),
  constraint friendships_no_self check (user_a_id <> user_b_id)
);

create index friendships_user_b_id_idx on public.friendships (user_b_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.friendship_pair(p_user_id uuid, p_other_id uuid)
returns table (user_a_id uuid, user_b_id uuid)
language sql
immutable
as $$
  select
    least(p_user_id, p_other_id),
    greatest(p_user_id, p_other_id);
$$;

create or replace function public.are_friends(p_user_id uuid, p_other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    cross join public.friendship_pair(p_user_id, p_other_id) fp
    where f.user_a_id = fp.user_a_id
      and f.user_b_id = fp.user_b_id
  );
$$;

create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;
$$;

create or replace function public.get_user_email_by_id(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select email
  from auth.users
  where id = p_user_id
  limit 1;
$$;

create or replace function public.link_pending_friend_requests_for_user(
  p_user_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_requests
  set recipient_id = p_user_id
  where status = 'pending'
    and lower(recipient_email) = lower(p_email)
    and recipient_id is null
    and requester_id <> p_user_id;
end;
$$;

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
  caller_email text;
  pair record;
begin
  caller_email := auth.jwt() ->> 'email';

  select *
  into req
  from public.friend_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Friend request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'Friend request is not pending';
  end if;

  if not (
    req.recipient_id = auth.uid()
    or (
      req.recipient_id is null
      and caller_email is not null
      and lower(req.recipient_email) = lower(caller_email)
    )
  ) then
    raise exception 'Not authorized to accept this request';
  end if;

  if req.requester_id = auth.uid() then
    raise exception 'Cannot accept your own request';
  end if;

  select * into pair
  from public.friendship_pair(req.requester_id, auth.uid());

  insert into public.friendships (user_a_id, user_b_id)
  values (pair.user_a_id, pair.user_b_id)
  on conflict do nothing;

  update public.friend_requests
  set
    status = 'accepted',
    recipient_id = coalesce(req.recipient_id, auth.uid())
  where id = p_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auth bootstrap: link pending friend requests on signup
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

  perform public.link_pending_friend_requests_for_user(new.id, new.email);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

-- Friend requests
create policy friend_requests_select on public.friend_requests
  for select using (
    requester_id = auth.uid()
    or recipient_id = auth.uid()
    or (
      recipient_id is null
      and lower(recipient_email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy friend_requests_insert on public.friend_requests
  for insert with check (requester_id = auth.uid());

create policy friend_requests_update_requester on public.friend_requests
  for update using (
    requester_id = auth.uid()
    and status = 'pending'
  );

create policy friend_requests_update_recipient on public.friend_requests
  for update using (
    status = 'pending'
    and (
      recipient_id = auth.uid()
      or (
        recipient_id is null
        and lower(recipient_email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

-- Friendships
create policy friendships_select on public.friendships
  for select using (
    user_a_id = auth.uid() or user_b_id = auth.uid()
  );

create policy friendships_delete on public.friendships
  for delete using (
    user_a_id = auth.uid() or user_b_id = auth.uid()
  );

-- Profiles: allow reading friend profiles
create policy profiles_select_friends on public.profiles
  for select using (
    exists (
      select 1
      from public.friendships f
      where (f.user_a_id = auth.uid() and f.user_b_id = profiles.id)
         or (f.user_b_id = auth.uid() and f.user_a_id = profiles.id)
    )
  );
