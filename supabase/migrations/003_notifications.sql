-- Notifications: email delivery via Resend (see supabase/SETUP.md).
--
-- Two additions:
--   1. fault_tickets.reported_by_id — the existing `reported_by` column is
--      free-typed text (whoever filled in the form typed a name), so there
--      was no reliable way to notify "the person who reported this fault"
--      by email. This links it to a real profiles row when the reporter
--      was a logged-in user. Nullable + ON DELETE SET NULL: reports made
--      before this migration, or by someone since deactivated, just fall
--      back to having no linked reporter rather than breaking.
--   2. notification_log — dedup record of what's already been emailed, so
--      the daily digest doesn't re-send the same "still overdue" alert
--      every single day. Keyed per calendar day: one row per
--      (notification, recipient, channel, day). RLS is enabled with NO
--      policies, deliberately — this table is only ever touched by Edge
--      Functions using the service_role key (which bypasses RLS entirely),
--      never by the app's normal authenticated users.

alter table public.fault_tickets
  add column reported_by_id uuid references public.profiles (id) on delete set null;

create index fault_tickets_reported_by_id_idx on public.fault_tickets (reported_by_id);

create table public.notification_log (
  id               uuid primary key default gen_random_uuid(),
  notification_key text not null,
  recipient_id     uuid not null references public.profiles (id) on delete cascade,
  channel          text not null default 'email' check (channel in ('email')),
  digest_date      date not null default current_date,
  sent_at          timestamptz not null default now()
);

create unique index notification_log_dedup_idx
  on public.notification_log (notification_key, recipient_id, channel, digest_date);

alter table public.notification_log enable row level security;
-- No policies added on purpose — see note above.
