import { supabase } from "./supabaseClient.js";
import { readValue } from "./storage.js";
import { DEFAULT_SETTINGS } from "../data/demoData.js";

const TABLE = "settings";
const ROW_ID = "default";
const LOCALSTORAGE_MIGRATION_FLAG = "medtrack_settings_migrated_to_supabase";

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
      .eq("id", ROW_ID)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!row || isEqualToDefaults(row.data)) {
      const { error: updateErr } = await supabase
        .from(TABLE)
        .update({ data: local })
        .eq("id", ROW_ID);
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
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS; // shouldn't happen once 005_settings_table.sql has run
  return mergeWithDefaults(data.data);
}

export async function save(settings) {
  await ensureMigrated();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from(TABLE)
    .update({ data: settings, updated_by: userData.user?.id })
    .eq("id", ROW_ID);
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
