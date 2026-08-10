import { supabase } from "./supabaseClient.js";

const TABLE = "audit_log";

// `actor` in the old localStorage version was a single pre-formatted string
// ("Jane Doe (System Administrator)"). The Supabase table splits that into
// actor_id / actor_name / actor_role so entries are attributable to a real
// auth user (RLS requires actor_id = auth.uid() on insert — see schema.sql).
// fromDb() re-joins actor_name + actor_role into the same "actor" string so
// existing consumers (ReportsScreen, the recent-activity panel) don't need
// to change.
function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    timestamp: row.created_at,
    actor: row.actor_name
      ? `${row.actor_name} (${row.actor_role || "Unknown role"})`
      : row.actor_role || "Unknown",
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    target: row.target,
    details: row.details,
  };
}

// ---------- no localStorage migration ----------
// Unlike the other services, historical entries in `medtrack:auditLog`
// aren't migrated up. RLS requires every row's actor_id to equal the
// inserting user's own auth.uid(), and the old localStorage log wasn't
// tied to real Supabase auth identities (it predates login) — there's no
// valid actor_id to attach to those old rows. The old data is left in
// localStorage untouched (visible via "Export local data" if it's ever
// needed for reference) and the Supabase log simply starts fresh from
// first real login.

export async function getAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(fromDb);
}

export async function record(actorName, actorRole, action, target, details) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const row = {
    actor_id: userData.user?.id,
    actor_name: actorName || "Unknown",
    actor_role: actorRole || "Unknown",
    action,
    target: target ?? null,
    details: details ?? null,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data);
}

/**
 * Deliberately unsupported. schema.sql gives audit_log no UPDATE or DELETE
 * RLS policy on purpose — it's append-only from the app's side, so old
 * entries can only be pruned via a controlled retention job run with the
 * service_role key, never from client code. Kept as a named export (rather
 * than removed) so any future caller gets this explanation instead of a
 * confusing raw RLS/permission error.
 */
export async function clear() {
  throw new Error(
    "audit_log is append-only — entries can't be cleared from the app. " +
      "Old entries must be pruned via a service_role retention job, not client code.",
  );
}
