-- Availability display mode: general (status colors) or specific (per-calendar dots)

alter table public.user_preferences
  add column if not exists availability_display_mode text not null default 'general'
  check (availability_display_mode in ('general', 'specific'));
