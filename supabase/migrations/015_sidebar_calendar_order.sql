-- User-defined sidebar calendar display order (global interleaved list + group child order)

alter table public.user_preferences
  add column if not exists sidebar_calendar_order jsonb;
