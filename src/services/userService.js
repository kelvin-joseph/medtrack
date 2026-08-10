import { supabase } from "./supabaseClient.js";

// `profiles` rows are snake_case (matches the SQL schema); the rest of the
// app (UsersScreen, AppDataContext) expects the camelCase shape the old
// localStorage version used. Map at the boundary so nothing else changes.
function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department || "",
    active: row.active,
    lastLogin: row.last_login,
    createdAt: row.created_at,
  };
}

export async function getAll() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

/**
 * Creates a real login: invites the person by email (they set their own
 * password via the link) and creates their `profiles` row. Requires the
 * `admin-create-user` Edge Function to be deployed — see supabase/SETUP.md.
 * Throws on failure (duplicate email, not authorized, etc.) — callers
 * should catch and show the message to the user.
 */
export async function create({ name, email, role, department }) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { name, email, role, department },
  });
  if (error) {
    // supabase-js wraps non-2xx responses in a generic FunctionsHttpError;
    // the real message is in the response body.
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message || "Failed to create user.");
  }
  if (data?.error) throw new Error(data.error);
  return fromRow(data.user);
}

export async function toggleActive(id) {
  const { data, error } = await supabase.rpc("toggle_user_active", { target_id: id });
  if (error) throw error;
  return fromRow(data);
}

export async function update(id, patch) {
  const row = {};
  if ("name" in patch) row.name = patch.name;
  if ("role" in patch) row.role = patch.role;
  if ("department" in patch) row.department = patch.department;
  if ("active" in patch) row.active = patch.active;

  const { data, error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}
