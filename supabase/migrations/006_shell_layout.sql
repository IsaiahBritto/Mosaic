-- Shell layout preference for Week/Month view block ordering

alter table public.user_preferences
  add column if not exists shell_layout text not null default 'nav_first'
  check (shell_layout in ('nav_first', 'calendar_before_period', 'calendar_first'));
