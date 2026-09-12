// supabase/functions/admin-create-user/index.ts
//
// Admin-only "add user" endpoint. This is the ONLY place the service_role
// key is used — it never ships to the browser. The frontend calls this via
// `supabase.functions.invoke("admin-create-user", { body: {...} })`, which
// automatically forwards the caller's own auth token in the Authorization
// header; we use that token to verify the caller is really an admin before
// doing anything privileged.
//
// Flow: verify caller (role + active + THEIR OWN hospital_id, all read
// server-side from their own profiles row — never accepted from the
// request body) -> create the auth user via inviteUserByEmail, carrying
// the inviter's hospital_id in the invite metadata so the invited
// colleague lands in the SAME hospital, not the self-serve-signup
// placeholder -> the existing `handle_new_user` trigger auto-creates the
// `profiles` row from that metadata (including hospital_id, as of the
// handle_new_user_hospital_id_from_invite migration) -> patch the
// `department` field, which the trigger doesn't set.
//
// hospital_id is NEVER read from the request body here — only from the
// caller's own already-authenticated profiles row, fetched with the
// service_role client after verifying who they are. There is no code path
// for the browser to supply or influence it.
//
// Deploy with: supabase functions deploy admin-create-user
// (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set as
// function secrets — see supabase/SETUP.md)

import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_ROLES = ["System Administrator", "Head of Biomedical Engineering"];
const VALID_ROLES = [
  "Biomedical Engineer",
  "Head of Biomedical Engineering",
  "Hospital Administrator",
  "Department Staff",
  "System Administrator",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Client scoped to the CALLER's own token — used only to find out who's calling.
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) {
    return json({ error: "Not authenticated." }, 401);
  }

  // Admin client — service_role, bypasses RLS. Only used after the caller
  // has been verified as an admin below.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // hospital_id is read here, from the CALLER's own server-side profile row
  // — the same trusted lookup already used to check role/active. This is
  // the only source of truth for which hospital the invite belongs to.
  const { data: callerProfile, error: profileErr } = await adminClient
    .from("profiles")
    .select("role, active, hospital_id")
    .eq("id", caller.id)
    .single();

  if (profileErr || !callerProfile || !callerProfile.active || !ADMIN_ROLES.includes(callerProfile.role)) {
    return json({ error: "Not authorized to manage users." }, 403);
  }
  if (!callerProfile.hospital_id) {
    // Shouldn't happen (hospital_id is NOT NULL on profiles) — defensive only.
    return json({ error: "Your account has no associated hospital." }, 500);
  }

  let body: { name?: string; email?: string; role?: string; department?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  // Note: the request body is only ever read for name/email/role/department.
  // Even if a caller tried to add a hospital_id field here, it would simply
  // be ignored — it's never destructured or forwarded below.
  const { name, email, role, department } = body;
  if (!name || !email || !role) {
    return json({ error: "name, email, and role are required." }, 400);
  }
  if (!VALID_ROLES.includes(role)) {
    return json({ error: `Invalid role: ${role}` }, 400);
  }

  // Sends an invite email with a link for the new user to set their own
  // password — nobody ever has to generate or hand over a temp password.
  // hospital_id here is the inviter's own server-derived value from above.
  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role, department: department || null, hospital_id: callerProfile.hospital_id },
  });

  if (inviteErr) {
    // Most common case: email already registered.
    return json({ error: inviteErr.message }, 400);
  }

  const newUserId = invited.user.id;

  // The `handle_new_user` trigger creates the profiles row from name/role
  // (and now hospital_id) in the metadata above, but doesn't know about
  // `department`. Patch it.
  if (department) {
    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({ department })
      .eq("id", newUserId);
    if (updateErr) {
      // The account exists at this point; don't fail the whole request
      // over a non-critical field.
      console.error("Failed to set department for new user:", updateErr.message);
    }
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", newUserId)
    .single();

  return json({ user: profile }, 200);
});
