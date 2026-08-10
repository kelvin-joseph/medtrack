import { supabase } from "./supabaseClient.js";
import { readValue } from "./storage.js";

const TABLE = "fault_tickets";
const LOCALSTORAGE_MIGRATION_FLAG = "medtrack_tickets_migrated_to_supabase";

// `fault_tickets` (unlike `equipment`) already has every field as a plain
// column in schema.sql — no `details` jsonb blob needed here.
function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    reportedBy: row.reported_by,
    department: row.department,
    category: row.category,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(ticket) {
  const row = {};
  if ("equipmentId" in ticket) row.equipment_id = ticket.equipmentId;
  if ("reportedBy" in ticket) row.reported_by = ticket.reportedBy;
  if ("department" in ticket) row.department = ticket.department;
  if ("category" in ticket) row.category = ticket.category;
  if ("description" in ticket) row.description = ticket.description;
  if ("status" in ticket) row.status = ticket.status;
  return row;
}

// ---------- one-time migration from localStorage ----------
// Mirrors equipmentService.js. Depends on equipment already being migrated
// (fault_tickets.equipment_id is a foreign key to equipment.id) — running
// this against a project where equipment hasn't been seeded yet will fail
// per-row on the FK constraint rather than silently dropping tickets.

async function migrateFromLocalStorageIfNeeded() {
  try {
    if (localStorage.getItem(LOCALSTORAGE_MIGRATION_FLAG)) return;

    const localRecords = readValue("tickets", []); // reads "medtrack:tickets"
    if (!Array.isArray(localRecords) || localRecords.length === 0) {
      localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
      return;
    }

    const { count, error: countError } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true });
    if (countError) throw countError;

    if (count === 0) {
      const rows = localRecords.map((t) => ({
        id: t.id,
        ...toDb(t),
        created_at: t.createdAt,
      }));
      const { error: insertError } = await supabase.from(TABLE).insert(rows);
      if (insertError) throw insertError;
      console.info(
        `[faultService] Migrated ${rows.length} record(s) from localStorage to Supabase.`,
      );
    } else {
      console.info(
        "[faultService] Supabase already has fault tickets — skipping localStorage import to avoid duplicates.",
      );
    }

    localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
    // Raw localStorage data ("medtrack:tickets") is left in place as a
    // backup rather than deleted — safe to clear manually once confirmed.
  } catch (err) {
    console.error("[faultService] localStorage migration failed:", err);
    // Flag intentionally NOT set — retried on next load.
  }
}

let migrationPromise = null;
function ensureMigrated() {
  if (!migrationPromise) migrationPromise = migrateFromLocalStorageIfNeeded();
  return migrationPromise;
}

// ---------- public API (same shape as the localStorage version, now async) ----------

export async function getAll() {
  await ensureMigrated();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(fromDb);
}

export async function create(ticket) {
  await ensureMigrated();
  const id = ticket.id || `TCK-${Date.now()}`;
  const row = { id, status: "New", ...toDb(ticket) };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data);
}

export async function updateStatus(id, status) {
  await ensureMigrated();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return fromDb(data);
}

/** Wipes every ticket — used by "start empty hospital" / demo reset. */
export async function clear() {
  await ensureMigrated();
  const { error } = await supabase.from(TABLE).delete().neq("id", "");
  if (error) throw error;
}

/**
 * Replaces every ticket — used by "Load Demo Data". Callers must seed
 * equipment first: every ticket's equipmentId has to already exist in
 * the `equipment` table, or the insert fails on the foreign key.
 */
export async function seed(list) {
  await clear();
  const rows = list.map((t) => ({
    id: t.id,
    ...toDb(t),
    ...(t.createdAt ? { created_at: t.createdAt } : {}),
  }));
  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw error;
  return getAll();
}
