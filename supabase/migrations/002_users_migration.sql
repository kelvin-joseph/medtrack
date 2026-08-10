-- ============================================================================
-- 002_users_migration.sql
-- Run this AFTER schema.sql, once, in the SQL Editor.
-- Supports the Users & Roles screen moving off localStorage.
-- ============================================================================

-- handle_new_user() originally only copied name/email/role from signup
-- metadata. The admin-create-user Edge Function also passes `department`
-- (needed when a System Administrator adds a new staff member) — read it
-- here too, and drop the separate "patch department after insert" step
-- the current Edge Function does as a fallback.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Department Staff'),
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$;

-- Used by UsersScreen's "Disable / Activate user" action. A plain
-- `update ... set active = not active` from the client is technically fine
-- given the "admins can manage users" RLS policy, but doing it as an RPC
-- avoids a read-then-write race (two admins toggling at once) and keeps
-- the "what changed" logic in one place server-side.
create or replace function public.toggle_user_active(target_id uuid)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  updated public.profiles;
begin
  if not public.has_role(array['System Administrator', 'Head of Biomedical Engineering']) then
    raise exception 'Not authorized to manage users.';
  end if;

  update public.profiles
  set active = not active
  where id = target_id
  returning * into updated;

  return updated;
end;
$$;
