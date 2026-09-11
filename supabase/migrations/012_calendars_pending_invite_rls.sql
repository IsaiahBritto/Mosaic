-- Allow pending calendar invitees to read calendar metadata and accept via RPC

create policy calendars_select_pending_invitee on public.calendars
  for select using (
    exists (
      select 1
      from public.calendar_members cm
      where cm.calendar_id = calendars.id
        and cm.invite_status = 'pending'
        and (
          lower(cm.invited_email) = lower(auth.jwt() ->> 'email')
          or cm.user_id = auth.uid()
        )
    )
  );

create or replace function public.accept_calendar_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.calendar_members%rowtype;
  caller_email text;
begin
  caller_email := auth.jwt() ->> 'email';

  select *
  into invite
  from public.calendar_members
  where invite_token = p_token
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if invite.invite_status <> 'pending' then
    raise exception 'Invite not found';
  end if;

  if not (
    invite.user_id = auth.uid()
    or (
      caller_email is not null
      and invite.invited_email is not null
      and lower(invite.invited_email) = lower(caller_email)
    )
  ) then
    raise exception 'Email mismatch';
  end if;

  update public.calendar_members
  set
    user_id = coalesce(invite.user_id, auth.uid()),
    invite_status = 'accepted'
  where invite_token = p_token;

  update public.calendars
  set type = 'shared'
  where id = invite.calendar_id;

  return invite.calendar_id;
end;
$$;
