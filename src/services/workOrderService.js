import { supabase } from "./supabaseClient.js";
import { readValue } from "./storage.js";

const TABLE = "work_orders";
const LOCALSTORAGE_MIGRATION_FLAG = "medtrack_work_orders_migrated_to_supabase";

// work_orders has every field as a plain column (recurrence/checklist are
// jsonb, so they round-trip as plain JS objects/arrays with no mapping
// needed) — same shape as fault_tickets, no `details` blob required.
function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    type: row.type,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedEngineer: row.assigned_engineer,
    scheduledDate: row.scheduled_date,
    dueDate: row.due_date,
    completedDate: row.completed_date,
    recurrence: row.recurrence,
    checklist: row.checklist,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    faultTicketId: row.fault_ticket_id,
  };
}

function toDb(wo) {
  const row = {};
  if ("equipmentId" in wo) row.equipment_id = wo.equipmentId;
  if ("type" in wo) row.type = wo.type;
  if ("title" in wo) row.title = wo.title;
  if ("description" in wo) row.description = wo.description;
  if ("priority" in wo) row.priority = wo.priority;
  if ("status" in wo) row.status = wo.status;
  if ("assignedEngineer" in wo) row.assigned_engineer = wo.assignedEngineer;
  if ("scheduledDate" in wo) row.scheduled_date = wo.scheduledDate;
  if ("dueDate" in wo) row.due_date = wo.dueDate;
  if ("completedDate" in wo) row.completed_date = wo.completedDate;
  if ("recurrence" in wo) row.recurrence = wo.recurrence;
  if ("checklist" in wo) row.checklist = wo.checklist;
  if ("notes" in wo) row.notes = wo.notes;
  if ("createdBy" in wo) row.created_by = wo.createdBy;
  if ("faultTicketId" in wo) row.fault_ticket_id = wo.faultTicketId;
  return row;
}

// ---------- one-time migration from localStorage ----------
// Mirrors equipmentService.js / faultService.js. Also FK'd to equipment —
// same ordering dependency as fault_tickets.

async function migrateFromLocalStorageIfNeeded() {
  try {
    if (localStorage.getItem(LOCALSTORAGE_MIGRATION_FLAG)) return;

    const localRecords = readValue("workOrders", []); // reads "medtrack:workOrders"
    if (!Array.isArray(localRecords) || localRecords.length === 0) {
      localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
      return;
    }

    const { count, error: countError } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true });
    if (countError) throw countError;

    if (count === 0) {
      const rows = localRecords.map((w) => ({
        id: w.id,
        ...toDb(w),
        created_at: w.createdAt,
      }));
      const { error: insertError } = await supabase.from(TABLE).insert(rows);
      if (insertError) throw insertError;
      console.info(
        `[workOrderService] Migrated ${rows.length} record(s) from localStorage to Supabase.`,
      );
    } else {
      console.info(
        "[workOrderService] Supabase already has work orders — skipping localStorage import to avoid duplicates.",
      );
    }

    localStorage.setItem(LOCALSTORAGE_MIGRATION_FLAG, "true");
    // Raw localStorage data ("medtrack:workOrders") is left in place as a
    // backup rather than deleted — safe to clear manually once confirmed.
  } catch (err) {
    console.error("[workOrderService] localStorage migration failed:", err);
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

export async function create(workOrder) {
  await ensureMigrated();
  const id = workOrder.id || `WO-${Date.now()}`;
  const row = {
    id,
    status: "Scheduled",
    checklist: [],
    notes: "",
    ...toDb(workOrder),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data);
}

export async function update(id, patch) {
  await ensureMigrated();
  const row = toDb(patch);

  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return fromDb(data);
}

export async function remove(id) {
  await ensureMigrated();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/** Wipes every work order — used by "start empty hospital" / demo reset. */
export async function clear() {
  await ensureMigrated();
  const { error } = await supabase.from(TABLE).delete().neq("id", "");
  if (error) throw error;
}

/**
 * Replaces every work order — used by "Load Demo Data". Callers must seed
 * equipment first: every work order's equipmentId has to already exist in
 * the `equipment` table, or the insert fails on the foreign key.
 */
export async function seed(list) {
  await clear();
  const rows = list.map((w) => ({
    id: w.id,
    status: "Scheduled",
    checklist: [],
    notes: "",
    ...toDb(w),
  }));
  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw error;
  return getAll();
}
