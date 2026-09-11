-- User-editable display label for linked account group headers

alter table public.calendar_connections
  add column if not exists display_name text;

alter table public.calendar_connections
  add constraint calendar_connections_display_name_length
  check (display_name is null or char_length(display_name) between 1 and 50);
