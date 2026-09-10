-- Backfill legacy empty preferences to "all member calendars visible"
-- After this migration, empty visible_calendar_ids means "none visible" in app code.
update public.user_preferences up
set visible_calendar_ids = (
  select coalesce(array_agg(cm.calendar_id), '{}')
  from public.calendar_members cm
  where cm.user_id = up.user_id
    and cm.invite_status = 'accepted'
)
where visible_calendar_ids = '{}';
