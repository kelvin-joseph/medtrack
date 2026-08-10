-- ============================================================================
-- MedTrack — Supabase schema, RLS policies, and helper functions
-- ============================================================================
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query)
-- on a fresh project. Single-hospital deployment — no multi-tenant columns.
--
-- Order matters: extensions → tables → indexes → helper functions →
-- triggers → RLS policies. Run the whole file at once.
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ============================================================================
-- PROFILES  (extends Supabase's built-in auth.users with app-level fields)
-- ============================================================================
-- Supabase Auth already stores email + password in auth.users. This table
-- holds everything MedTrack needs beyond that: display name, role,
-- department, and active/disabled status.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null check (role in (
                'Biomedical Engineer', 'Head of Biomedical Engineering',
                'Hospital Administrator', 'Department Staff', 'System Administrator'
              )),
  department  text,
  active      boolean not null default true,
  last_login  timestamptz,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- Role defaults to 'Department Staff' — a System Administrator should
-- promote real staff accounts after creation (see "Adding users" below).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Department Staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- EQUIPMENT
-- ============================================================================

create table public.equipment (
  id                        text primary key,               -- e.g. 'EQ-001'
  asset_tag                 text not null unique,
  name                      text not null,
  category                  text not null,
  manufacturer              text,
  model                     text,
  serial_number             text,
  department                text,
  location                  text,
  purchase_date             date,
  install_date              date,
  warranty_start            date,
  warranty_expiry           date,
  vendor                    text,
  expected_lifespan_years   numeric,
  operating_hours_per_week  numeric,
  usage_frequency           text,
  status                    text not null default 'Operational',
  condition                 text not null default 'Good',
  assigned_engineer         text,
  last_maintenance_date     date,
  next_maintenance_date     date,
  last_calibration_date     date,
  next_calibration_date     date,
  clinical_criticality      text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index equipment_category_idx on public.equipment (category);
create index equipment_department_idx on public.equipment (department);
create index equipment_next_maintenance_idx on public.equipment (next_maintenance_date);

-- ============================================================================
-- MAINTENANCE RECORDS  (one-to-many with equipment)
-- ============================================================================

create table public.maintenance_records (
  id            uuid primary key default gen_random_uuid(),
  equipment_id  text not null references public.equipment (id) on delete cascade,
  date          date not null,
  type          text not null,
  note          text,
  engineer      text,
  cost          numeric default 0,
  checklist     jsonb default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index maintenance_records_equipment_idx on public.maintenance_records (equipment_id);

-- ============================================================================
-- REPAIR RECORDS  (breakdown/fault repair history, one-to-many with equipment)
-- ============================================================================

create table public.repair_records (
  id                  uuid primary key default gen_random_uuid(),
  equipment_id        text not null references public.equipment (id) on delete cascade,
  date                date not null,
  reported_by         text,
  fault_description   text,
  error_code          text,
  suspected_cause     text,
  diagnosis           text,
  corrective_action   text,
  parts_replaced      text,
  cost                numeric default 0,
  engineer            text,
  repair_start        date,
  repair_completion   date,
  downtime_hours      numeric default 0,
  final_status        text,
  created_at          timestamptz not null default now()
);

create index repair_records_equipment_idx on public.repair_records (equipment_id);

-- ============================================================================
-- EQUIPMENT DOCUMENTS  (manuals, warranty certs, etc.)
-- ============================================================================

create table public.equipment_documents (
  id             uuid primary key default gen_random_uuid(),
  equipment_id   text not null references public.equipment (id) on delete cascade,
  name           text not null,
  type           text,
  file_path      text,                -- Supabase Storage object path, once file upload is wired up
  uploaded_date  date not null default current_date,
  created_at     timestamptz not null default now()
);

create index equipment_documents_equipment_idx on public.equipment_documents (equipment_id);

-- ============================================================================
-- WORK ORDERS  (scheduled/recurring maintenance + corrective work)
-- ============================================================================

create table public.work_orders (
  id                 text primary key,                 -- e.g. 'WO-0001'
  equipment_id       text not null references public.equipment (id) on delete cascade,
  type               text not null,                     -- Preventive | Corrective | Emergency Repair
  title              text,
  description        text,
  priority           text,
  status             text not null default 'Scheduled',
  assigned_engineer  text,
  scheduled_date     date,
  due_date           date,
  completed_date     date,
  recurrence         jsonb default '{"frequency":"none"}'::jsonb,
  checklist          jsonb default '[]'::jsonb,
  notes              text,
  created_by         text,
  created_at         timestamptz not null default now()
);

create index work_orders_equipment_idx on public.work_orders (equipment_id);
create index work_orders_status_idx on public.work_orders (status);
create index work_orders_scheduled_idx on public.work_orders (scheduled_date);

-- ============================================================================
-- FAULT TICKETS  (reported by clinical/department staff)
-- ============================================================================

create table public.fault_tickets (
  id            text primary key,                       -- e.g. 'TCK-0001'
  equipment_id  text not null references public.equipment (id) on delete cascade,
  reported_by   text,
  department    text,
  category      text not null check (category in (
                  'Malfunction', 'Electrical Fault', 'Calibration Issue', 'Accident/Damage', 'Other'
                )),
  description   text not null,
  status        text not null default 'New' check (status in (
                  'New', 'Assigned', 'In Progress', 'Awaiting Spare Parts',
                  'Awaiting Vendor', 'Completed', 'Closed'
                )),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index fault_tickets_equipment_idx on public.fault_tickets (equipment_id);
create index fault_tickets_status_idx on public.fault_tickets (status);

-- ============================================================================
-- SETTINGS  (single row — hospital profile, departments, categories, etc.)
-- ============================================================================

create table public.settings (
  id                   int primary key default 1,
  hospital             jsonb not null default '{}'::jsonb,
  departments          jsonb not null default '[]'::jsonb,
  categories           jsonb not null default '[]'::jsonb,
  maintenance          jsonb not null default '{}'::jsonb,
  risk                 jsonb not null default '{}'::jsonb,
  notifications        jsonb not null default '{}'::jsonb,
  onboarding_complete  boolean not null default false,
  updated_at           timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id) values (1);

-- ============================================================================
-- AUDIT LOG  (append-only — see RLS below; nobody gets UPDATE/DELETE)
-- ============================================================================

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id),
  actor_name  text not null,
  actor_role  text not null,
  action      text not null,
  target      text,
  details     text,
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

-- ============================================================================
-- NOTIFICATION READ STATE  (notifications themselves are computed live from
-- equipment/ticket state — only per-user read/unread state is persisted)
-- ============================================================================

create table public.notification_reads (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  notification_id   text not null,
  read_at           timestamptz not null default now(),
  primary key (user_id, notification_id)
);

-- ============================================================================
-- HELPER FUNCTIONS for RLS policies
-- ============================================================================

-- Current signed-in user's role, or null if not signed in / no profile yet.
create function public.current_role()
returns text
language sql stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- True if the current user's role is in the given list.
create function public.has_role(roles text[])
returns boolean
language sql stable
security definer set search_path = public
as $$
  select public.current_role() = any(roles);
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Read access: any authenticated, active staff member can see everything —
-- this is a single hospital's own operational data, not siloed by role.
-- Write access: gated per role, mirroring src/data/roles.js PERMISSIONS.
-- Adjust the has_role(...) lists below if your PERMISSIONS map differs.

alter table public.profiles              enable row level security;
alter table public.equipment             enable row level security;
alter table public.maintenance_records   enable row level security;
alter table public.repair_records        enable row level security;
alter table public.equipment_documents   enable row level security;
alter table public.work_orders           enable row level security;
alter table public.fault_tickets         enable row level security;
alter table public.settings              enable row level security;
alter table public.audit_log             enable row level security;
alter table public.notification_reads    enable row level security;

-- ---- profiles ----
create policy "profiles: signed-in users can view all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "profiles: users can update their own last_login"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admins can manage users"
  on public.profiles for all
  using (public.has_role(array['System Administrator', 'Head of Biomedical Engineering']));

-- ---- equipment ----
create policy "equipment: signed-in users can view"
  on public.equipment for select
  using (auth.uid() is not null);

create policy "equipment: biomedical staff can write"
  on public.equipment for all
  using (public.has_role(array[
    'Biomedical Engineer', 'Head of Biomedical Engineering', 'System Administrator'
  ]));

-- ---- maintenance_records / repair_records / equipment_documents ----
-- Same pattern for all three: view for everyone signed in, write for
-- biomedical staff.
create policy "maintenance_records: view"
  on public.maintenance_records for select using (auth.uid() is not null);
create policy "maintenance_records: write"
  on public.maintenance_records for all
  using (public.has_role(array['Biomedical Engineer', 'Head of Biomedical Engineering', 'System Administrator']));

create policy "repair_records: view"
  on public.repair_records for select using (auth.uid() is not null);
create policy "repair_records: write"
  on public.repair_records for all
  using (public.has_role(array['Biomedical Engineer', 'Head of Biomedical Engineering', 'System Administrator']));

create policy "equipment_documents: view"
  on public.equipment_documents for select using (auth.uid() is not null);
create policy "equipment_documents: write"
  on public.equipment_documents for all
  using (public.has_role(array['Biomedical Engineer', 'Head of Biomedical Engineering', 'System Administrator']));

-- ---- work_orders ----
create policy "work_orders: view"
  on public.work_orders for select using (auth.uid() is not null);
create policy "work_orders: write"
  on public.work_orders for all
  using (public.has_role(array['Biomedical Engineer', 'Head of Biomedical Engineering', 'System Administrator']));

-- ---- fault_tickets ----
-- Anyone signed in can both view and *report* a fault (Department Staff
-- need this); only biomedical staff can change ticket status.
create policy "fault_tickets: view"
  on public.fault_tickets for select using (auth.uid() is not null);
create policy "fault_tickets: anyone signed in can report a fault"
  on public.fault_tickets for insert with check (auth.uid() is not null);
create policy "fault_tickets: biomedical staff can update status"
  on public.fault_tickets for update
  using (public.has_role(array['Biomedical Engineer', 'Head of Biomedical Engineering', 'System Administrator']));

-- ---- settings ----
create policy "settings: view"
  on public.settings for select using (auth.uid() is not null);
create policy "settings: admins can update"
  on public.settings for update
  using (public.has_role(array['System Administrator', 'Head of Biomedical Engineering', 'Hospital Administrator']));

-- ---- audit_log ----
-- Append-only from the app's perspective: insert allowed for any signed-in
-- user (the row always records their own identity), no update, no delete.
create policy "audit_log: view"
  on public.audit_log for select using (auth.uid() is not null);
create policy "audit_log: insert own actions"
  on public.audit_log for insert
  with check (auth.uid() is not null and actor_id = auth.uid());
-- Deliberately no UPDATE or DELETE policy — even the table owner should
-- only remove old rows via a controlled retention job, not app code.

-- ---- notification_reads ----
create policy "notification_reads: manage own"
  on public.notification_reads for all
  using (auth.uid() = user_id);

-- ============================================================================
-- Adding real users
-- ============================================================================
-- Supabase Auth handles signup/login; this schema only extends it. To add
-- staff accounts for the pilot:
--   1. Supabase Dashboard → Authentication → Users → Add user (set email +
--      temporary password, ask them to change it on first login), OR
--   2. Have the person sign up through MedTrack's own signup flow once it's
--      wired to supabase.auth.signUp().
-- Either way, a matching row appears in public.profiles automatically
-- (see handle_new_user() above) with role 'Department Staff' by default —
-- a System Administrator then updates their role/department from the
-- Users & Roles screen.
