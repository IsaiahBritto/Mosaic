-- User notifications for calendar member remove/leave events

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'calendar_member_removed',
    'calendar_member_left'
  )),
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index user_notifications_user_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

create policy user_notifications_select_own on public.user_notifications
  for select using (user_id = auth.uid());

create policy user_notifications_update_own on public.user_notifications
  for update using (user_id = auth.uid());

create or replace function public.insert_user_notification(
  p_user_id uuid,
  p_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_id uuid;
begin
  insert into public.user_notifications (user_id, type, payload)
  values (p_user_id, p_type, p_payload)
  returning id into notification_id;

  return notification_id;
end;
$$;

-- Allow calendar co-members to read each other's profiles for sharing UI
create policy profiles_select_calendar_co_members on public.profiles
  for select using (
    exists (
      select 1
      from public.calendar_members mine
      join public.calendar_members theirs
        on mine.calendar_id = theirs.calendar_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
        and mine.invite_status = 'accepted'
        and theirs.invite_status = 'accepted'
    )
  );
