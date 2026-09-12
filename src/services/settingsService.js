import { supabase } from "./supabaseClient.js";
import { readValue } from "./storage.js";
import { DEFAULT_SETTINGS } from "../data/demoData.js";

const TABLE = "settings";
const LOCALSTORAGE_MIGRATION_FLAG = "medtrack_settings_migrated_to_supabase";

// Settings is now one row per hospital (hospital_id, not the old fixed
// id='default' row). We never filter by id/hospital_id from the client —
// RLS already restricts every query on this table to the current user's
// own hospital_id, so a plain select/update always resolves to exactly
// one row: theirs.

// Defensive merge so a stored row that predates a newly-added settings
// section (e.g. you add a new tab later) doesn't come back missing keys
// the UI expects.
function mergeWithDefaults(data) {
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    hospital: { ...DEFAULT_SETTINGS.hospital, ...data?.hospital },
    maintenance: { ...DEFAULT_SETTINGS.maintenance, ...data?.maintenance },
    risk: { ...DEFAULT_SETTINGS.risk, ...data?.risk },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...data?.notifications,
    },
  };
}

function isEqualToDefaults(data) {
  try {
    return JSON.stringify(data) === JSON.stringify(DEFAULT_SETTINGS);
  } catch {
    return false;
  }
}

// Settings is a whole-hospital singleton, not per-browser — so unlike
// equipment, we only migrate local data up if the Supabase row is STILL
// the untouched seed default. If it's already been customized (by this
// browser or another admin), local data is presumed stale and is left
// alone rather than silently overwriting a real config someone set.
async function migrateFromLocalStorageIfNeeded() {
  try {
    if (localStorage.getItem(LOCALSTORAGE_MIGRATION_FLAG)) return;

    const local = readValue("settings", null); // reads "medtrack:settings"
    if (!local || isEqualToDefaults(local)) {
      localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
      return;
    }

    const { data: row, error: fetchErr } = await supabase
      .from(TABLE)
      .select("data")
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!row || isEqualToDefaults(row.data)) {
      const { error: updateErr } = await supabase
        .from(TABLE)
        .update({ data: local });
      if (updateErr) throw updateErr;
      console.info(
        "[settingsService] Migrated customized settings from localStorage to Supabase.",
      );
    } else {
      console.info(
        "[settingsService] Supabase settings already customized — leaving as-is, not overwriting with local copy.",
      );
    }

    localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
  } catch (err) {
    console.error("[settingsService] localStorage migration failed:", err);
  }
}

let migrationPromise = null;
function ensureMigrated() {
  if (!migrationPromise) migrationPromise = migrateFromLocalStorageIfNeeded();
  return migrationPromise;
}

export async function get() {
  await ensureMigrated();
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS; // shouldn't happen once every hospital has a settings row
  return mergeWithDefaults(data.data);
}

export async function save(settings) {
  await ensureMigrated();
  const { data: userData } = await supabase.auth.getUser();

  // PostgREST refuses any UPDATE with no filter at all in the request,
  // independent of RLS — "UPDATE requires a WHERE clause". RLS already
  // restricts this to exactly the caller's own hospital's row, so this
  // filter doesn't change what's allowed; it just states that same
  // restriction explicitly, in the syntax PostgREST requires.
  const { data: hospitalId, error: hospitalIdErr } = await supabase.rpc("get_user_hospital_id");
  if (hospitalIdErr) throw hospitalIdErr;

  const { error } = await supabase
    .from(TABLE)
    .update({ data: settings, updated_by: userData.user?.id })
    .eq("hospital_id", hospitalId);
  if (error) throw error;
  return settings;
}

export async function update(patch) {
  const current = await get();
  const next = { ...current, ...patch };
  return save(next);
}

/** Deep-merge helper for nested sections like `maintenance` or `risk`. */
export async function updateSection(section, patch) {
  const current = await get();
  const next = { ...current, [section]: { ...current[section], ...patch } };
  return save(next);
}

export async function reset() {
  return save(DEFAULT_SETTINGS);
}
