import { supabase } from "./supabaseClient.js";
import { readValue } from "./storage.js";
import { recomputeAI } from "../data/equipment.js";
import * as settingsService from "./settingsService.js";

const TABLE = "equipment";
const LOCALSTORAGE_MIGRATION_FLAG = "medtrack_equipment_migrated_to_supabase";

async function currentThresholds() {
  const settings = await settingsService.get();
  return settings?.risk?.thresholds;
}

// Columns promoted out of `details` for filtering/sorting/RLS. Keep this
// list in sync with 003_equipment_table.sql.
const PROMOTED_COLUMNS = [
  "name",
  "category",
  "status",
  "condition",
  "location",
  "department",
  "clinicalCriticality",
  "assignedEngineer",
];

const PROMOTED_TO_SNAKE = {
  clinicalCriticality: "clinical_criticality",
  assignedEngineer: "assigned_engineer",
};

function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    condition: row.condition,
    location: row.location,
    department: row.department,
    clinicalCriticality: row.clinical_criticality,
    assignedEngineer: row.assigned_engineer,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...row.details, // assetTag, manufacturer, model, serialNumber, vendor, dates,
    // expectedLifespanYears, operatingHoursPerWeek, usageFrequency,
    // failureCount, maintenanceRecords, repairRecords, documents
  };
}

// `full` = the complete in-app equipment object (already merged with any
// patch). Splits it back into promoted columns + a `details` jsonb blob.
// Never persists `_ai` — that's derived and recomputed on every read.
function toDb(full) {
  const { id, _ai, createdBy, createdAt, updatedAt, ...rest } = full;
  const row = { details: {} };

  for (const [key, value] of Object.entries(rest)) {
    if (PROMOTED_COLUMNS.includes(key)) {
      row[PROMOTED_TO_SNAKE[key] || key] = value;
    } else {
      row.details[key] = value;
    }
  }
  return row;
}

function nextId(existingIds) {
  const max = existingIds.reduce((m, id) => {
    const n = Number(String(id).replace(/\D/g, "")) || 0;
    return Math.max(m, n);
  }, 0);
  return `EQ-${String(max + 1).padStart(3, "0")}`;
}

// ---------- one-time migration from localStorage ----------

async function migrateFromLocalStorageIfNeeded() {
  try {
    if (localStorage.getItem(LOCALSTORAGE_MIGRATION_FLAG)) return;

    const localRecords = readValue("equipment", []); // reads "medtrack:equipment"
    if (!Array.isArray(localRecords) || localRecords.length === 0) {
      localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
      return;
    }

    const { count, error: countError } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true });
    if (countError) throw countError;

    if (count === 0) {
      // localRecords already exclude `_ai` (the original localStorage
      // service stripped it before every write), but strip defensively
      // in case of stale/manually-edited data.
      const rows = localRecords.map((raw) => {
        const { _ai, ...clean } = raw;
        return { id: clean.id, ...toDb(clean) };
      });
      const { error: insertError } = await supabase.from(TABLE).insert(rows);
      if (insertError) throw insertError;
      console.info(
        `[equipmentService] Migrated ${rows.length} record(s) from localStorage to Supabase.`,
      );
    } else {
      console.info(
        "[equipmentService] Supabase already has equipment — skipping localStorage import to avoid duplicates.",
      );
    }

    localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
    // Raw localStorage data ("medtrack:equipment") is left in place as a
    // backup rather than deleted — safe to clear manually once confirmed.
  } catch (err) {
    console.error("[equipmentService] localStorage migration failed:", err);
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
  const thresholds = await currentThresholds();
  return data.map((row) => recomputeAI(fromDb(row), thresholds));
}

export async function getById(id) {
  await ensureMigrated();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return recomputeAI(fromDb(data), await currentThresholds());
}

const EMPTY_EQUIPMENT = () => ({
  status: "Operational",
  condition: "Good",
  maintenanceRecords: [],
  repairRecords: [],
  documents: [],
  failureCount: 0,
});

export async function create(data) {
  await ensureMigrated();
  let id = data.id;
  if (!id) {
    const { data: rows, error: idErr } = await supabase
      .from(TABLE)
      .select("id");
    if (idErr) throw idErr;
    id = nextId(rows.map((r) => r.id));
  }

  const { data: userData } = await supabase.auth.getUser();
  const full = { ...EMPTY_EQUIPMENT(), ...data, id };
  const row = { id, ...toDb(full), created_by: userData.user?.id };

  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return recomputeAI(fromDb(inserted), await currentThresholds());
}

export async function update(id, patch) {
  await ensureMigrated();
  const { data: existingRow, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existingRow) return null;

  const merged = { ...fromDb(existingRow), ...patch, id };
  const row = toDb(merged);

  const { data: updated, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return recomputeAI(fromDb(updated), await currentThresholds());
}

export async function remove(id) {
  await ensureMigrated();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/** Wipes every equipment row — used by "start empty hospital" / demo reset. */
export async function clear() {
  await ensureMigrated();
  const { error } = await supabase.from(TABLE).delete().neq("id", "");
  if (error) throw error;
}

/** Replaces the whole fleet — used by "Load Demo Data". */
export async function seed(list) {
  await clear();
  const { data: userData } = await supabase.auth.getUser();
  const rows = list.map((eq) => ({
    id: eq.id,
    ...toDb(eq),
    created_by: userData.user?.id,
  }));
  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw error;
  return getAll();
}

export async function addMaintenanceRecord(id, record) {
  const eq = await getById(id);
  if (!eq) return null;
  return update(id, {
    lastMaintenanceDate: record.date,
    maintenanceRecords: [
      { id: `M-${Date.now()}`, ...record },
      ...eq.maintenanceRecords,
    ],
  });
}

export async function addRepairRecord(id, record) {
  const eq = await getById(id);
  if (!eq) return null;
  return update(id, {
    repairRecords: [{ id: `R-${Date.now()}`, ...record }, ...eq.repairRecords],
  });
}

export async function addDocument(id, doc) {
  const eq = await getById(id);
  if (!eq) return null;
  return update(id, {
    documents: [{ id: `D-${Date.now()}`, ...doc }, ...eq.documents],
  });
}
