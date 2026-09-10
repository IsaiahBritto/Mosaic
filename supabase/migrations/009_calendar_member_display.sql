-- Per-member display overrides for shared calendars
alter table public.calendar_members
  add column if not exists name_override text,
  add column if not exists color_hex_override text;

-- Allow members to update their own row (overrides, invite accept)
drop policy if exists calendar_members_update on public.calendar_members;

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
    or user_id = auth.uid()
  );
