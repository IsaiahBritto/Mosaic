-- Fix calendar_members RLS: authenticated role cannot read auth.users directly.
-- Use JWT email claim instead.

drop policy if exists calendar_members_select on public.calendar_members;
drop policy if exists calendar_members_update on public.calendar_members;

create policy calendar_members_select on public.calendar_members
  for select using (
    public.is_calendar_member(calendar_id, auth.uid(), 'viewer')
    or invited_email = (auth.jwt() ->> 'email')
  );

create policy calendar_members_update on public.calendar_members
  for update using (
    exists (
      select 1 from public.calendars
      where id = calendar_id and owner_id = auth.uid()
    )
    or (
      invited_email = (auth.jwt() ->> 'email')
      and user_id is null
    )
  );
